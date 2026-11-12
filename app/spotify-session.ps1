# Windows desktop Spotify media session. No account, network requests or tokens.
# Output: one JSON line per poll (status, title, artist, art, playing, position, duration, controls).
# Song changes are emitted immediately; the cover is loaded afterwards (short timeout, max 5 tries per song)
# and sent as a second line once available. With -Watch also the Spotify volume of the Windows volume mixer
# (volume 0-100, muted; only Spotify's own audio session, not the PC volume) and commands on stdin:
# "volume <0-100>" and "mute <0|1>", answered at once with a fresh status line. Cover failures are logged to %APPDATA%\UND.CC Tweaker\logs\spotify.log.
param([ValidateSet('status','playpause','next','previous')][string]$Action='status',[switch]$Watch)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
function Emit($value) { [Console]::Out.WriteLine(($value | ConvertTo-Json -Depth 5 -Compress)); [Console]::Out.Flush() }

$script:logFile=$null
try { $script:logFile=Join-Path $env:APPDATA 'UND.CC Tweaker\logs\spotify.log' } catch { }
function Log([string]$message) {
    if (-not $script:logFile) { return }
    try {
        $dir=[IO.Path]::GetDirectoryName($script:logFile)
        if (-not (Test-Path -LiteralPath $dir)) { $null=New-Item -ItemType Directory -Path $dir -Force }
        if ((Test-Path -LiteralPath $script:logFile) -and (Get-Item -LiteralPath $script:logFile).Length -gt 200KB) { Remove-Item -LiteralPath $script:logFile -Force }
        Add-Content -LiteralPath $script:logFile -Value ('{0} {1}' -f (Get-Date -Format s), $message) -Encoding UTF8
    } catch { }
}

try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $managerType=[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
    $propertiesType=[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties,Windows.Media.Control,ContentType=WindowsRuntime]
    $streamType=[Windows.Storage.Streams.IRandomAccessStreamWithContentType,Windows.Storage.Streams,ContentType=WindowsRuntime]
    $readerType=[Windows.Storage.Streams.DataReader,Windows.Storage.Streams,ContentType=WindowsRuntime]
    # The thumbnail stream arrives as a bare System.__ComObject: Windows PowerShell 5.1 can neither cast it to a WinRT
    # interface nor read its members. .NET reflection can (the CLR queries the interface), so all stream access goes through it.
    $inputType=[Windows.Storage.Streams.IInputStream,Windows.Storage.Streams,ContentType=WindowsRuntime]
    $randomType=[Windows.Storage.Streams.IRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]
    $contentTypeProvider=[Windows.Storage.Streams.IContentTypeProvider,Windows.Storage.Streams,ContentType=WindowsRuntime]
    $asStream=[System.IO.WindowsRuntimeStreamExtensions].GetMethod('AsStreamForRead',[type[]]@($inputType))
    $asTask=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    } | Select-Object -First 1
    function Await($operation,[Type]$resultType,[int]$timeout=5000) {
        $task=$asTask.MakeGenericMethod($resultType).Invoke($null,@($operation))
        if (-not $task.Wait($timeout)) { throw 'media_timeout' }
        return $task.GetAwaiter().GetResult()
    }

    function Get-CoverContentType($stream) { try { return [string]$contentTypeProvider.GetProperty('ContentType').GetValue($stream) } catch { return '?' } }
    # Cover bytes, way 1: WinRT stream as .NET stream.
    function Read-CoverStream($stream) {
        try { $null=$randomType.GetMethod('Seek').Invoke($stream,@([uint64]0)) } catch { }
        $net=$asStream.Invoke($null,@($stream))
        $memory=New-Object IO.MemoryStream
        try {
            $buffer=New-Object byte[] 65536
            while ($true) {
                $readTask=$net.ReadAsync($buffer,0,$buffer.Length)
                if (-not $readTask.Wait(1500)) { throw 'read_timeout' }
                $read=$readTask.Result
                if ($read -le 0) { break }
                $memory.Write($buffer,0,$read)
                if ($memory.Length -gt 1048576) { throw 'too_large' }
            }
            return ,$memory.ToArray()
        } finally { $memory.Dispose(); $net.Dispose() }
    }
    # Cover bytes, way 2: DataReader over the whole stream.
    function Read-CoverReader($stream) {
        $size=[uint64]$randomType.GetProperty('Size').GetValue($stream)
        if ($size -le 0 -or $size -gt 1048576) { throw ('bad_size ' + $size) }
        $inStream=$randomType.GetMethod('GetInputStreamAt').Invoke($stream,@([uint64]0))
        $reader=$readerType.GetConstructor([type[]]@($inputType)).Invoke(@($inStream))
        try {
            $loaded=Await ($reader.LoadAsync([uint32]$size)) ([uint32]) 1500
            if ($loaded -le 0) { throw 'nothing_loaded' }
            $bytes=New-Object byte[] ([int]$loaded)
            $reader.ReadBytes($bytes)
            return ,$bytes
        } finally { try { $null=$reader.DetachStream() } catch { }; $reader.Dispose() }
    }
    # Cover as data URI (JPEG/PNG by magic bytes, max 1 MB). Tries both ways; throws with every reason.
    function Read-Cover($properties,[string[]]$ways=@('stream','reader')) {
        if (-not $properties.Thumbnail) { throw 'no_thumbnail' }
        $reasons=@()
        foreach ($way in $ways) {
            $stream=$null
            try {
                $stream=Await ($properties.Thumbnail.OpenReadAsync()) $streamType 1500
                $bytes=if ($way -eq 'stream') { Read-CoverStream $stream } else { Read-CoverReader $stream }
                if ($bytes.Length -lt 8) { throw ('empty type=' + (Get-CoverContentType $stream)) }
                $mime=$null
                if ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xD8 -and $bytes[2] -eq 0xFF) { $mime='image/jpeg' }
                elseif ($bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x4E -and $bytes[3] -eq 0x47) { $mime='image/png' }
                if (-not $mime) { throw ('unknown_format type=' + (Get-CoverContentType $stream) + ' head=' + (($bytes[0..7] | ForEach-Object { $_.ToString('X2') }) -join '')) }
                return 'data:' + $mime + ';base64,' + [Convert]::ToBase64String($bytes)
            } catch {
                $reasons+=($way + ': ' + $_.Exception.Message)
            } finally { if ($stream) { try { $null=[IDisposable].GetMethod('Dispose').Invoke($stream,$null) } catch { } } }
        }
        throw ($reasons -join ' | ')
    }

    # Spotify's audio session in the Windows volume mixer (Core Audio) and a stdin reader thread. Compiled only for the
    # dashboard worker; if it cannot be compiled the card simply shows no volume control.
    $script:mixer=$false
    if ($Watch) {
        try {
            Add-Type -Language CSharp -TypeDefinition @'
using System; using System.Diagnostics; using System.Runtime.InteropServices; using System.Threading; using System.Collections.Concurrent;
namespace H1TSpotify {
  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class DeviceEnumeratorCo {}
  [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IDeviceEnumerator { [PreserveSig] int EnumAudioEndpoints(int flow, int mask, out IDeviceCollection devices); }
  [ComImport, Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IDeviceCollection { [PreserveSig] int GetCount(out int count); [PreserveSig] int Item(int index, out IDevice device); }
  [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IDevice { [PreserveSig] int Activate(ref Guid iid, int ctx, IntPtr p, [MarshalAs(UnmanagedType.IUnknown)] out object o); }
  [ComImport, Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface ISessionManager2 { [PreserveSig] int A(); [PreserveSig] int B(); [PreserveSig] int GetSessionEnumerator(out ISessionEnumerator e); }
  [ComImport, Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface ISessionEnumerator { [PreserveSig] int GetCount(out int count); [PreserveSig] int GetSession(int i, out ISessionControl2 s); }
  [ComImport, Guid("BFB7FF88-7239-4FC9-8FA2-07C950BE9C6D"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface ISessionControl2 {
    [PreserveSig] int GetState(out int state); [PreserveSig] int A2(); [PreserveSig] int A3(); [PreserveSig] int A4(); [PreserveSig] int A5();
    [PreserveSig] int A6(); [PreserveSig] int A7(); [PreserveSig] int A8(); [PreserveSig] int A9(); [PreserveSig] int B1(); [PreserveSig] int B2();
    [PreserveSig] int GetProcessId(out uint pid); }
  [ComImport, Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface ISimpleVolume { [PreserveSig] int SetMasterVolume(float v, ref Guid ctx); [PreserveSig] int GetMasterVolume(out float v);
    [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool m, ref Guid ctx); [PreserveSig] int GetMute([MarshalAs(UnmanagedType.Bool)] out bool m); }
  public static class Mixer {
    // Every audio session of a Spotify process on an active playback device; the playing one first.
    static System.Collections.Generic.List<ISimpleVolume> Sessions() {
      var found = new System.Collections.Generic.List<ISimpleVolume>(); var idle = new System.Collections.Generic.List<ISimpleVolume>();
      var en = (IDeviceEnumerator)new DeviceEnumeratorCo(); IDeviceCollection list; int n;
      if (en.EnumAudioEndpoints(0, 1, out list) != 0 || list.GetCount(out n) != 0) return found;
      var iid = typeof(ISessionManager2).GUID;
      for (int d = 0; d < n; d++) {
        IDevice dev; object o; ISessionEnumerator se; int count;
        if (list.Item(d, out dev) != 0 || dev.Activate(ref iid, 23, IntPtr.Zero, out o) != 0) continue;
        if (((ISessionManager2)o).GetSessionEnumerator(out se) != 0 || se.GetCount(out count) != 0) continue;
        for (int i = 0; i < count; i++) {
          ISessionControl2 c; uint pid; int state;
          if (se.GetSession(i, out c) != 0 || c.GetProcessId(out pid) != 0 || pid == 0) continue;
          string name; try { name = Process.GetProcessById((int)pid).ProcessName; } catch { continue; }
          if (!string.Equals(name, "Spotify", StringComparison.OrdinalIgnoreCase)) continue;
          var v = c as ISimpleVolume; if (v == null) continue;
          if (c.GetState(out state) == 0 && state == 1) found.Add(v); else idle.Add(v);
        }
      }
      found.AddRange(idle); return found;
    }
    // -1: Spotify has no audio session (not started or nothing played yet)
    public static int Volume() { foreach (var v in Sessions()) { float f; if (v.GetMasterVolume(out f) == 0) return (int)Math.Round(f * 100); } return -1; }
    public static bool Muted() { foreach (var v in Sessions()) { bool m; if (v.GetMute(out m) == 0) return m; } return false; }
    public static int SetVolume(int level) { var g = Guid.Empty; int ok = 0; float f = Math.Max(0, Math.Min(100, level)) / 100f;
      foreach (var v in Sessions()) if (v.SetMasterVolume(f, ref g) == 0) ok++; return ok; }
    public static int SetMute(bool on) { var g = Guid.Empty; int ok = 0; foreach (var v in Sessions()) if (v.SetMute(on, ref g) == 0) ok++; return ok; }
  }
  public static class Input {
    static readonly BlockingCollection<string> lines = new BlockingCollection<string>(); static bool started;
    public static void Start() { if (started) return; started = true;
      var t = new Thread(() => { try { string l; while ((l = Console.In.ReadLine()) != null) lines.Add(l); } catch { } lines.Add("eof"); });
      t.IsBackground = true; t.Start(); }
    // Next command line, or null after the timeout.
    public static string Next(int ms) { string l; return lines.TryTake(out l, ms) ? l : null; }
  }
}
'@
            [H1TSpotify.Input]::Start()
            $script:mixer=$true
        } catch { Log ('mixer unavailable: ' + $_.Exception.Message) }
    }
    function Get-Mixer {
        if (-not $script:mixer) { return @{volume=$null;muted=$false} }
        try { $v=[H1TSpotify.Mixer]::Volume(); if ($v -lt 0) { return @{volume=$null;muted=$false} }; return @{volume=$v;muted=[H1TSpotify.Mixer]::Muted()} }
        catch { return @{volume=$null;muted=$false} }
    }
    # Waits up to $ms for a command from the app; applies "volume N" / "mute 0|1". $false when the app closed stdin.
    function Wait-Command([int]$ms) {
        if (-not $script:mixer) { Start-Sleep -Milliseconds $ms; return $true }
        $line=[H1TSpotify.Input]::Next($ms)
        if ($line -eq 'eof') { return $false }
        if ($line -match '^volume (\d{1,3})$' -and [int]$Matches[1] -le 100) { try { $null=[H1TSpotify.Mixer]::SetVolume([int]$Matches[1]) } catch { Log ('volume: ' + $_.Exception.Message) } }
        elseif ($line -match '^mute ([01])$') { try { $null=[H1TSpotify.Mixer]::SetMute($Matches[1] -eq '1') } catch { Log ('mute: ' + $_.Exception.Message) } }
        return $true
    }

    $manager=Await ($managerType::RequestAsync()) $managerType
    $artKey='';$art=$null;$artTries=0
    do {
        try {
            $sessions=@($manager.GetSessions() | Where-Object { $_.SourceAppUserModelId -match '^(Spotify(?:\.exe)?|SpotifyAB\.SpotifyMusic_[^!]+!Spotify)$' })
            $session=$sessions | Where-Object { $_.GetPlaybackInfo().PlaybackStatus.ToString() -eq 'Playing' } | Select-Object -First 1
            if (-not $session) { $session=$sessions | Select-Object -First 1 }
            if (-not $session) { $artKey='';$art=$null;$artTries=0;Emit @{status='empty'} }
            elseif ($Action -ne 'status') {
                $operation=switch ($Action) {
                    playpause { $session.TryTogglePlayPauseAsync() }
                    next { $session.TrySkipNextAsync() }
                    previous { $session.TrySkipPreviousAsync() }
                }
                Emit @{ok=[bool](Await $operation ([bool]))}
            } else {
                $properties=Await ($session.TryGetMediaPropertiesAsync()) $propertiesType
                $playback=$session.GetPlaybackInfo();$timeline=$session.GetTimelineProperties()
                $key=$session.SourceAppUserModelId+'|'+$properties.Title+'|'+$properties.Artist+'|'+$properties.AlbumTitle
                if ($artKey -cne $key) { $artKey=$key;$art=$null;$artTries=0 }
                $playing=$playback.PlaybackStatus.ToString() -eq 'Playing'
                $start=$timeline.StartTime.TotalSeconds
                $duration=[Math]::Max(0,$timeline.EndTime.TotalSeconds-$start)
                $position=[Math]::Max(0,$timeline.Position.TotalSeconds-$start)
                if ($playing) { $position+=[Math]::Max(0,([DateTimeOffset]::Now-$timeline.LastUpdatedTime).TotalSeconds) }
                if ($duration -gt 0) {$position=[Math]::Min($position,$duration)}
                $out=@{status='ready';title=[string]$properties.Title;artist=[string]$properties.Artist;art=$art;playing=$playing;position=$position;duration=$duration;controls=@{playpause=($playback.Controls.IsPlayEnabled -or $playback.Controls.IsPauseEnabled);next=$playback.Controls.IsNextEnabled;previous=$playback.Controls.IsPreviousEnabled}}
                $mix=Get-Mixer;$out.volume=$mix.volume;$out.muted=$mix.muted
                # 1) Song sofort melden
                Emit $out
                # 2) Cover nachladen (nur Status-Abfrage, nur solange es fehlt)
                if ($Action -eq 'status' -and -not $art -and $artTries -lt 5) {
                    $artTries++
                    try {
                        $art=Read-Cover $properties
                        $out.art=$art
                        Emit $out
                    } catch {
                        $reason=[string]$_.Exception.Message
                        if ($artTries -eq 1 -or $artTries -eq 5) { Log ('cover try ' + $artTries + ' for "' + $properties.Title + '": ' + $reason) }
                    }
                }
            }
        } catch { Emit @{status='unavailable';ok=$false} }
        $more=$true
        if ($Watch) { $more=Wait-Command 1500 }
    } while ($Watch -and $Action -eq 'status' -and $more)
} catch { Log ('session error: ' + $_.Exception.Message); Emit @{status='unavailable';ok=$false} }
