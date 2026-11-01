@echo off
rem H1T.CC GPU-Hilfe: Doppelklick, Administrator bestaetigen. Erzeugt aus tools/support/H1T-GPU-Hilfe.ps1.
net session >nul 2>&1 || (powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs" & exit /b)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=[IO.File]::ReadAllText('%~f0'); iex $s.Substring($s.LastIndexOf('#PS'+'START'))"
echo.
pause
exit /b
#PSSTART
# H1T.CC GPU-Hilfe (Support-Werkzeug, unabhaengig vom Tweaker): setzt die GPU-Tweaks des Tweakers auf den
# Windows-Standard zurueck, schaltet Hardware-GPU-Scheduling aus (haeufiger Ausloeser von DXGI_ERROR_DEVICE_HUNG)
# und sammelt die Infos, die zeigen, ob der Absturz eine andere Ursache hat. Nur Werte, die exakt dem
# Tweaker-Zielwert entsprechen, werden entfernt. -ReportOnly aendert nichts und schreibt nur den Bericht.
$ReportOnly = $false; $OutFile = ''
$ErrorActionPreference = 'Continue'
$lines = New-Object System.Collections.Generic.List[string]
function Say([string]$Text) { $lines.Add($Text); Write-Host $Text }
function Get-RegValue([string]$Path, [string]$Name) {
    try { return (Get-ItemProperty -LiteralPath $Path -Name $Name -ErrorAction Stop).$Name } catch { return $null }
}
function Get-EventCount([hashtable]$Filter) {
    try { return @(Get-WinEvent -FilterHashtable $Filter -ErrorAction Stop).Count } catch { return 0 }
}
$gd = 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers'
$pw = 'HKLM:\SYSTEM\CurrentControlSet\Control\Power'

Say ("H1T.CC GPU-Hilfe  " + (Get-Date -Format 'dd.MM.yyyy HH:mm') + $(if ($ReportOnly) { '  (nur Bericht)' } else { '' }))
Say ''
Say '--- Aenderungen ---'
if (-not $ReportOnly) {
    try { Checkpoint-Computer -Description 'H1T.CC GPU-Hilfe' -RestorePointType MODIFY_SETTINGS -ErrorAction Stop; Say 'Wiederherstellungspunkt erstellt.' }
    catch { Say ('Hinweis: kein neuer Wiederherstellungspunkt (' + $_.Exception.Message + ')') }
}
$targets = New-Object System.Collections.Generic.List[object]
$targets.Add(@{ Path = $gd; Name = 'DpiMapIommuContiguous'; Value = 1; Label = 'GPU-Speicherzuordnung zusammenhaengend' })
$targets.Add(@{ Path = $gd; Name = 'TdrDelay'; Value = 8; Label = 'GPU-TDR-Wartezeit 8 Sekunden' })
foreach ($n in @('ExitLatency','ExitLatencyCheckEnabled','Latency','LatencyToleranceDefault','LatencyToleranceFSVP','LatencyTolerancePerfOverride','LatencyToleranceScreenOffIR','LatencyToleranceVSyncEnabled','RtlCapabilityCheckLatency')) {
    $targets.Add(@{ Path = $pw; Name = $n; Value = 1; Label = ('GPU-/Energie-Latenz ' + $n) })
}
$changed = 0
foreach ($t in $targets) {
    $v = Get-RegValue $t.Path $t.Name
    if ($null -ne $v -and [int64]$v -eq $t.Value) {
        $changed++
        if ($ReportOnly) { Say ('Wuerde zuruecksetzen: ' + $t.Label) }
        else { Remove-ItemProperty -LiteralPath $t.Path -Name $t.Name -ErrorAction SilentlyContinue; Say ('Zurueckgesetzt: ' + $t.Label) }
    }
}
$hags = Get-RegValue $gd 'HwSchMode'
if ($hags -ne 1) {
    $changed++
    if ($ReportOnly) { Say ('Wuerde Hardware-GPU-Scheduling ausschalten (aktuell: ' + $(if ($null -eq $hags) { 'Windows-Standard' } else { $hags }) + ')') }
    else { New-ItemProperty -LiteralPath $gd -Name 'HwSchMode' -Value 1 -PropertyType DWord -Force | Out-Null; Say 'Hardware-GPU-Scheduling ausgeschaltet.' }
}
if ($changed -eq 0) { Say 'Keine GPU-Tweaks aktiv, nichts zu aendern.' }

Say ''
Say '--- System (letzte 30 Tage) ---'
$cards = @(Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue)
$gpu = @($cards | Where-Object { $_.Name -match 'NVIDIA|AMD|Radeon|Arc' })[0]
if (-not $gpu) { $gpu = $cards[0] }
if ($gpu) {
    Say ('Grafikkarte: ' + $gpu.Name)
    $date = if ($gpu.DriverDate) { ([datetime]$gpu.DriverDate).ToString('dd.MM.yyyy') } else { 'unbekannt' }
    Say ('Grafiktreiber: ' + $gpu.DriverVersion + ' vom ' + $date)
}
$since = (Get-Date).AddDays(-30)
Say ('Grafiktreiber-Resets: ' + (Get-EventCount @{ LogName = 'System'; ProviderName = 'Display'; Id = 4101; StartTime = $since }))
Say ('Ploetzlich ausgegangen (Kernel-Power 41): ' + (Get-EventCount @{ LogName = 'System'; ProviderName = 'Microsoft-Windows-Kernel-Power'; Id = 41; StartTime = $since }))
Say ('Hardware-Fehler (WHEA): ' + (Get-EventCount @{ LogName = 'System'; ProviderName = 'Microsoft-Windows-WHEA-Logger'; Id = 18,19,20,47; StartTime = $since }))
$oc = @(Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -match '^(MSIAfterburner|RTSS|PrecisionX.*|EVGA ?Precision.*|GPUTweak.*|ThunderMaster|AORUS.*|RadeonSoftware|AMDRSServ)$' } | Select-Object -ExpandProperty ProcessName -Unique)
Say ('Tuning-/Uebertaktungs-Tools aktiv: ' + $(if ($oc.Count) { $oc -join ', ' } else { 'keine gefunden' }))
$pf = @(Get-CimInstance Win32_PageFileUsage -ErrorAction SilentlyContinue)
Say ('Auslagerungsdatei: ' + $(if ($pf.Count) { ($pf | ForEach-Object { $_.Name + ' ' + $_.AllocatedBaseSize + ' MB' }) -join ', ' } else { 'KEINE - kann Grafik-Abstuerze verursachen, bitte wieder aktivieren' }))
$ram = (Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue).TotalPhysicalMemory
if ($ram) { Say ('RAM: ' + [math]::Round($ram / 1GB) + ' GB') }
$mods = Join-Path $env:LOCALAPPDATA 'FiveM\FiveM.app\mods'
Say ('FiveM-Mods: ' + $(if (Test-Path -LiteralPath $mods) { [string]@(Get-ChildItem -LiteralPath $mods -ErrorAction SilentlyContinue).Count + ' Eintraege im mods-Ordner' } else { 'keine' }))

Say ''
if (-not $ReportOnly) { Say 'Fertig. Bitte den PC jetzt NEU STARTEN, erst dann wirken die Aenderungen.' }
$target = if ($OutFile) { $OutFile } else { Join-Path ([Environment]::GetFolderPath('Desktop')) 'H1T-GPU-Hilfe.txt' }
$lines | Set-Content -LiteralPath $target -Encoding UTF8
Write-Host ('Bericht gespeichert: ' + $target)
