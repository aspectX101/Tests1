# Extra > Energie (Power.ps1) through the real JSON CLI on Windows: read, change a timeout, reset to the original,
# refuse invalid values and values an applied tweak owns. Backups go to a temporary LOCALAPPDATA.
$ErrorActionPreference='Stop'
$entry=Join-Path $PSScriptRoot '..\tweaker.ps1'
$tempProfile=Join-Path ([IO.Path]::GetTempPath()) ('h1t-power-' + [guid]::NewGuid().ToString('N').Substring(0,8))
$null=New-Item -ItemType Directory -Path $tempProfile -Force
function Assert($Condition,[string]$Message) { if (-not $Condition) { throw $Message } }
function Invoke-Cli([string]$Arguments) {
    $start=[Diagnostics.ProcessStartInfo]::new()
    $start.FileName=(Get-Process -Id $PID).Path
    $start.Arguments='-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + $entry + '" ' + $Arguments
    $start.UseShellExecute=$false; $start.CreateNoWindow=$true
    $start.EnvironmentVariables['LOCALAPPDATA']=$tempProfile
    $start.RedirectStandardOutput=$true; $start.RedirectStandardError=$true
    $start.StandardOutputEncoding=[Text.UTF8Encoding]::new($false)
    $p=[Diagnostics.Process]::Start($start)
    $out=$p.StandardOutput.ReadToEnd(); $null=$p.StandardError.ReadToEnd(); $p.WaitForExit()
    $lines=@($out.Trim() -split "`r?`n" | Where-Object { $_ })
    Assert ($lines.Count -eq 1) "exactly one JSON line expected: $out"
    return ($lines[0] | ConvertFrom-Json)
}
try {
    $get=Invoke-Cli '-Action power-get'
    Assert ($get.ok -and $get.active -match '^[0-9a-f-]{36}$') 'power-get answers with the active plan'
    Assert (@($get.plans).Count -ge 1 -and @($get.plans | Where-Object active).Count -eq 1) 'plans with exactly one active'
    Assert ($get.timeouts.monitor.ac -ge 0 -and $get.timeouts.sleep.dc -ge 0) 'timeouts are read'
    Assert (-not $get.hasBackup) 'nothing saved before a change'
    $before=[long]$get.timeouts.monitor.ac
    $target=if ($before -eq 300) { 600 } else { 300 }
    $set=Invoke-Cli ("-Action power-timeout -Name monitor -Extra ac -Seconds $target")
    Assert ($set.ok -and $set.timeouts.monitor.ac -eq $target -and $set.hasBackup) 'timeout changed and original saved'
    $bad=Invoke-Cli '-Action power-timeout -Name monitor -Extra ac -Seconds 7'
    Assert (-not $bad.ok -and $bad.error -eq 'invalid_power_value') 'values outside the offered list are refused'
    $badPlan=Invoke-Cli '-Action power-plan -Id 00000000-0000-0000-0000-000000000000'
    Assert (-not $badPlan.ok -and $badPlan.error -eq 'invalid_power_plan') 'unknown plans are refused'
    # A tweak that owns the AC sleep time blocks changing it here.
    $perf=Join-Path $tempProfile 'Tweaker\Performance'; $null=New-Item -ItemType Directory -Path $perf -Force
    [IO.File]::WriteAllText((Join-Path $perf 'windows.power.extras.json'),'{"version":1,"id":"windows.power.extras","status":"applied"}')
    $owned=Invoke-Cli ('-Action power-timeout -Name sleep -Extra ac -Seconds ' + $(if ($get.timeouts.sleep.ac -eq 1800) {3600} else {1800}))
    Assert (-not $owned.ok -and $owned.error -eq 'power_owned_by_tweak') 'owned value refused'
    Assert (@((Invoke-Cli '-Action power-get').owners.sleepAc) -contains 'windows.power.extras') 'owner reported'
    Remove-Item -LiteralPath (Join-Path $perf 'windows.power.extras.json') -Force
    $reset=Invoke-Cli '-Action power-reset'
    Assert ($reset.ok -and $reset.timeouts.monitor.ac -eq $before -and -not $reset.hasBackup) 'reset restores the original and clears the backup'
    $again=Invoke-Cli '-Action power-reset'
    Assert (-not $again.ok -and $again.error -eq 'power_backup_not_found') 'nothing left to reset'
    Write-Output 'PASS: power plan/timeouts read, change, reset, invalid values, tweak ownership'
} finally {
    if ($tempProfile.StartsWith([IO.Path]::GetTempPath()) -and (Test-Path -LiteralPath $tempProfile)) { Remove-Item -LiteralPath $tempProfile -Recurse -Force }
}
