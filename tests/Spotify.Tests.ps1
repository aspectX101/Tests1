# Parse and read-only smoke check. Never sends playback commands.
$ErrorActionPreference='Stop'
$script=Join-Path $PSScriptRoot '../app/spotify-session.ps1'
$tokens=$null;$errors=$null
$null=[Management.Automation.Language.Parser]::ParseFile($script,[ref]$tokens,[ref]$errors)
if ($errors.Count) {throw ($errors | Out-String)}
$output=& powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $script -Action status
$value=($output -join "`n") | ConvertFrom-Json
if ($value.status -notin @('empty','ready','unavailable')) {throw 'Invalid Spotify status'}
'Spotify adapter: valid PowerShell and a single read-only JSON response.'

# The volume mixer helper (C# in the script) compiles and answers without Spotify (-1 = no Spotify audio session).
$source=Get-Content -LiteralPath $script -Raw
$start=$source.IndexOf("Add-Type -Language CSharp -TypeDefinition @'")
if ($start -lt 0) { throw 'mixer source not found' }
$begin=$source.IndexOf("`n",$start)+1
$end=$source.IndexOf("`n'@",$begin)
Add-Type -Language CSharp -TypeDefinition $source.Substring($begin,$end-$begin)
$volume=[H1TSpotify.Mixer]::Volume()
if ($volume -lt -1 -or $volume -gt 100) { throw "Invalid mixer volume $volume" }
$null=[H1TSpotify.Mixer]::Muted()
"Spotify mixer: compiled, volume=$volume."
# The dashboard worker ends cleanly when the app closes its stdin.
$psi=New-Object Diagnostics.ProcessStartInfo 'powershell.exe',('-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + $script + '" -Action status -Watch')
$psi.UseShellExecute=$false;$psi.RedirectStandardInput=$true;$psi.RedirectStandardOutput=$true;$psi.CreateNoWindow=$true
$p=[Diagnostics.Process]::Start($psi)
$first=$p.StandardOutput.ReadLine()
$p.StandardInput.WriteLine('volume 999'); $p.StandardInput.WriteLine('next')
$p.StandardInput.Close()
if (-not $p.WaitForExit(15000)) { $p.Kill(); throw 'worker did not stop after stdin closed' }
if (($first | ConvertFrom-Json).status -notin @('empty','ready','unavailable')) { throw 'Invalid worker status' }
'Spotify worker: status line, ignores invalid commands, stops when stdin closes.'
