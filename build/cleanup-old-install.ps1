# Läuft im Installer (mit Adminrechten) direkt vor dem Entfernen der alten Version.
# Räumt eine alte Installation pro Benutzer (bis 0.5.1, %LOCALAPPDATA%\Programs) selbst weg, statt deren
# Deinstallationsprogramm aufzurufen – das brach nach abgebrochenen Updates ab ("kann nicht geschlossen werden").
# Entfernt nur Einträge mit unserer App-GUID und nur Ordner unter %LOCALAPPDATA%\Programs. Protokoll: %TEMP%\undcc-tweaker-setup.log
$ErrorActionPreference = 'SilentlyContinue'
$log = Join-Path $env:TEMP 'undcc-tweaker-setup.log'
function L($m) { Add-Content -LiteralPath $log -Value ('{0} {1}' -f (Get-Date -Format s), $m) }
$guid = '5246f961-f301-56f6-8f48-e15034ba27bf'
$uninstallKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$guid"
$installKey = "HKCU:\Software\$guid"
$programs = Join-Path $env:LOCALAPPDATA 'Programs'
L "cleanup start user=$env:USERNAME"

$names = 'Tweaker', 'UND.CC Tweaker'
Get-Process -Name $names | ForEach-Object { L "stop pid=$($_.Id) $($_.Path)"; Stop-Process -Id $_.Id -Force }
Start-Sleep -Milliseconds 1000
if (Get-Process -Name $names) { L 'WARN still running after stop' }

$dirs = @()
foreach ($key in $uninstallKey, $installKey) {
  $p = Get-ItemProperty -LiteralPath $key
  if ($p.InstallLocation) { $dirs += $p.InstallLocation }
  if ($p.UninstallString -match '^"([^"]+)"') { $dirs += (Split-Path $Matches[1]) }
}
$dirs = $dirs | Where-Object { $_ -and $_.StartsWith($programs, [StringComparison]::OrdinalIgnoreCase) } | Select-Object -Unique
L "old per-user dirs: $($dirs -join '; ')"

# Alte Verknüpfungen, die in diesen Ordner zeigen, entfernen (neue legt der Installer an).
$shell = New-Object -ComObject WScript.Shell
$linkDirs = [Environment]::GetFolderPath('Desktop'), (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs')
foreach ($ld in $linkDirs) {
  Get-ChildItem -LiteralPath $ld -Filter '*.lnk' | ForEach-Object {
    $target = $shell.CreateShortcut($_.FullName).TargetPath
    foreach ($d in $dirs) { if ($target -and $target.StartsWith($d, [StringComparison]::OrdinalIgnoreCase)) { Remove-Item -LiteralPath $_.FullName -Force; L "removed shortcut $($_.FullName)" } }
  }
}

foreach ($d in $dirs) {
  if (Test-Path -LiteralPath $d) { Remove-Item -LiteralPath $d -Recurse -Force; L "removed dir $d ok=$(-not (Test-Path -LiteralPath $d))" }
}
foreach ($key in $uninstallKey, $installKey) {
  if (Test-Path -LiteralPath $key) { Remove-Item -LiteralPath $key -Recurse -Force; L "removed key $key ok=$(-not (Test-Path -LiteralPath $key))" }
}
L 'cleanup done'
exit 0
