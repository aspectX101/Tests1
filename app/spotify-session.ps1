# Windows desktop Spotify media session. No account, network requests or tokens.
param([ValidateSet('status','playpause','next','previous')][string]$Action='status',[switch]$Watch)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
function Emit($value) { [Console]::Out.WriteLine(($value | ConvertTo-Json -Depth 5 -Compress)); [Console]::Out.Flush() }
try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $managerType=[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
    $propertiesType=[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties,Windows.Media.Control,ContentType=WindowsRuntime]
    $streamType=[Windows.Storage.Streams.IRandomAccessStreamWithContentType,Windows.Storage.Streams,ContentType=WindowsRuntime]
    $readerType=[Windows.Storage.Streams.DataReader,Windows.Storage.Streams,ContentType=WindowsRuntime]
    $asTask=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    } | Select-Object -First 1
    function Await($operation,[Type]$resultType) {
        $task=$asTask.MakeGenericMethod($resultType).Invoke($null,@($operation))
        if (-not $task.Wait(5000)) { throw 'media_timeout' }
        return $task.GetAwaiter().GetResult()
    }
    $manager=Await ($managerType::RequestAsync()) $managerType
    $artKey='';$art=$null;$artTries=0
    do {
        try {
            $sessions=@($manager.GetSessions() | Where-Object { $_.SourceAppUserModelId -match '^(Spotify(?:\.exe)?|SpotifyAB\.SpotifyMusic_[^!]+!Spotify)$' })
            $session=$sessions | Where-Object { $_.GetPlaybackInfo().PlaybackStatus.ToString() -eq 'Playing' } | Select-Object -First 1
            if (-not $session) { $session=$sessions | Select-Object -First 1 }
            if (-not $session) { $artKey='';$art=$null;Emit @{status='empty'} }
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
                # Cover: Spotify liefert Titel/Interpret oft vor dem Bild. Fehlt es, bei jeder Abfrage erneut versuchen
                # (max. 15 Versuche pro Song). Bildtyp zusaetzlich an den Bytes erkennen, Groesse ggf. unbekannt.
                if ($artKey -cne $key) { $artKey=$key;$art=$null;$artTries=0 }
                if (-not $art -and $artTries -lt 15 -and $properties.Thumbnail) {
                    $artTries++
                    $stream=$null;$reader=$null
                    try {
                        $stream=Await ($properties.Thumbnail.OpenReadAsync()) $streamType
                        $want=if ($stream.Size -gt 0) { [uint32][Math]::Min([double]$stream.Size,1048576) } else { [uint32]1048576 }
                        if ($stream.Size -le 1048576) {
                            $reader=$readerType::new($stream.GetInputStreamAt(0))
                            $reader.InputStreamOptions=[Windows.Storage.Streams.InputStreamOptions,Windows.Storage.Streams,ContentType=WindowsRuntime]::Partial
                            $size=Await ($reader.LoadAsync($want)) ([uint32])
                            if ($size -gt 0) {
                                $bytes=New-Object byte[] ([int]$size);$reader.ReadBytes($bytes)
                                $mime=$null
                                if ($bytes.Length -gt 3 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xD8 -and $bytes[2] -eq 0xFF) { $mime='image/jpeg' }
                                elseif ($bytes.Length -gt 7 -and $bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x4E -and $bytes[3] -eq 0x47) { $mime='image/png' }
                                if ($mime) { $art='data:'+$mime+';base64,'+[Convert]::ToBase64String($bytes) }
                            }
                        }
                    } catch { $art=$null } finally { if ($reader) {$reader.Dispose()};if ($stream) {$stream.Dispose()} }
                }
                $playing=$playback.PlaybackStatus.ToString() -eq 'Playing'
                $start=$timeline.StartTime.TotalSeconds
                $duration=[Math]::Max(0,$timeline.EndTime.TotalSeconds-$start)
                $position=[Math]::Max(0,$timeline.Position.TotalSeconds-$start)
                if ($playing) { $position+=[Math]::Max(0,([DateTimeOffset]::Now-$timeline.LastUpdatedTime).TotalSeconds) }
                if ($duration -gt 0) {$position=[Math]::Min($position,$duration)}
                Emit @{status='ready';title=[string]$properties.Title;artist=[string]$properties.Artist;art=$art;playing=$playing;position=$position;duration=$duration;controls=@{playpause=($playback.Controls.IsPlayEnabled -or $playback.Controls.IsPauseEnabled);next=$playback.Controls.IsNextEnabled;previous=$playback.Controls.IsPreviousEnabled}}
            }
        } catch { Emit @{status='unavailable';ok=$false} }
        if ($Watch) { Start-Sleep -Milliseconds 2000 }
    } while ($Watch -and $Action -eq 'status')
} catch { Emit @{status='unavailable';ok=$false} }
