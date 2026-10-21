# Windows desktop Spotify media session. No account, network requests or tokens.
# Output: one JSON line per poll (status, title, artist, art, playing, position, duration, controls).
# Song changes are emitted immediately; the cover is loaded afterwards (short timeout, max 5 tries per song)
# and sent as a second line once available. Cover failures are logged to %APPDATA%\UND.CC Tweaker\logs\spotify.log.
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
    $asTask=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    } | Select-Object -First 1
    function Await($operation,[Type]$resultType,[int]$timeout=5000) {
        $task=$asTask.MakeGenericMethod($resultType).Invoke($null,@($operation))
        if (-not $task.Wait($timeout)) { throw 'media_timeout' }
        return $task.GetAwaiter().GetResult()
    }

    # Cover bytes, way 1: WinRT stream as .NET stream.
    function Read-CoverStream($stream) {
        try { $stream.Seek(0) } catch { }
        $net=[System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead([Windows.Storage.Streams.IInputStream]$stream)
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
        } finally { $memory.Dispose() }
    }
    # Cover bytes, way 2: DataReader over the whole stream.
    function Read-CoverReader($stream) {
        $size=[uint64]$stream.Size
        if ($size -le 0 -or $size -gt 1048576) { throw ('bad_size ' + $size) }
        $stream.Seek(0)
        $reader=New-Object $readerType -ArgumentList ([Windows.Storage.Streams.IInputStream]$stream.GetInputStreamAt(0))
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
                if ($bytes.Length -lt 8) { throw ('empty type=' + $stream.ContentType) }
                $mime=$null
                if ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xD8 -and $bytes[2] -eq 0xFF) { $mime='image/jpeg' }
                elseif ($bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x4E -and $bytes[3] -eq 0x47) { $mime='image/png' }
                if (-not $mime) { throw ('unknown_format type=' + $stream.ContentType + ' head=' + (($bytes[0..7] | ForEach-Object { $_.ToString('X2') }) -join '')) }
                return 'data:' + $mime + ';base64,' + [Convert]::ToBase64String($bytes)
            } catch {
                $reasons+=($way + ': ' + $_.Exception.Message)
            } finally { if ($stream) { try { $stream.Dispose() } catch { } } }
        }
        throw ($reasons -join ' | ')
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
        if ($Watch) { Start-Sleep -Milliseconds 1500 }
    } while ($Watch -and $Action -eq 'status')
} catch { Log ('session error: ' + $_.Exception.Message); Emit @{status='unavailable';ok=$false} }
