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
