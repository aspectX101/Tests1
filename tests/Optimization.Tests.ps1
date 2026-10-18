# Real journals and shared recovery, simulated Windows settings. No real registry writes.
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot '../Tweaker.psm1') -Force
& (Get-Module Tweaker) {
    function Assert($Condition,[string]$Message) { if (-not $Condition) {throw $Message} }
    function Expect-Error([scriptblock]$Operation,[string]$Code) {
        $actual=$null
        try {$null=& $Operation} catch {$actual=$_.Exception.Message}
        Assert ($actual -eq $Code) "Expected $Code; got $actual"
    }
    function Value([int]$Number) { [pscustomobject]@{exists=$true;kind='DWord';value=$Number} }
    function Missing { [pscustomobject]@{exists=$false;kind=$null;value=$null} }
    $parent=[IO.Path]::GetFullPath((Join-Path (Get-Location) 'work'))
    $base=Join-Path $parent ('o-' + [guid]::NewGuid().ToString('N').Substring(0,8))
    $script:PerformanceStateDirectory=Join-Path $base 'state'
    $script:BackupDirectory=Join-Path $base 'backup'
    $script:SafeModeDirectory=Join-Path $base 'safe'
    $script:values=@{capture=(Value 1);historicalCapture=(Missing);gameDvr=(Value 1);gameMode=(Value 0);ducking=(Value 1)}
    $script:writes=0; $script:failField=''; $script:admin=$true; $script:platform=$true
    $script:archiveFails=$false; $script:checkpointFails=$false; $script:changeDuringCheckpoint=$false
    function Assert-Administrator { if (-not $script:admin) {throw 'admin_required'} }
    function Assert-OptimizationPlatform { if (-not $script:platform) {throw 'unsupported_optimization_platform'} }
    function New-TweakerRestorePoint {
        if ($script:checkpointFails) {throw 'restore_point_not_created'}
        if ($script:changeDuringCheckpoint) {$script:values.capture=Missing}
    }
    function Get-OptimizationValue([string]$Field) { $script:values[$Field] }
    function Set-OptimizationValue([string]$Field,$Value) {
        Assert-OptimizationValue $Field $Value
        if ($script:failField -eq $Field) {throw 'simulated_write_failure'}
        $script:values[$Field]=$Value; $script:writes++
    }
    $script:register=${function:Register-TweakerBackup}
    function Register-TweakerBackup($State,[string]$Path) {
        if ($script:archiveFails) {throw 'simulated_archive_failure'}
        & $script:register $State $Path
    }
    try {
        $null=Invoke-TweakerPerformance apply windows.capture.off -WhatIf
        Assert (-not (Test-Path $base)) 'WhatIf must not create backup files'
        $script:admin=$false
        Expect-Error {Invoke-TweakerPerformance apply windows.capture.off} 'admin_required'
        $script:admin=$true; $script:platform=$false
        Expect-Error {Invoke-TweakerPerformance apply windows.capture.off} 'unsupported_optimization_platform'
        $script:platform=$true; $script:checkpointFails=$true
        Expect-Error {Invoke-TweakerPerformance apply windows.capture.off} 'restore_point_not_created'
        $script:checkpointFails=$false; $script:archiveFails=$true
        Expect-Error {Invoke-TweakerPerformance apply windows.capture.off} 'simulated_archive_failure'
        Assert ($script:writes -eq 0) 'Failed prerequisites block writes'
        $script:archiveFails=$false; $script:changeDuringCheckpoint=$true
        Expect-Error {Invoke-TweakerPerformance apply windows.capture.off} 'external_change_detected'
        Assert ($script:writes -eq 0) 'Recheck after checkpoint'
        $script:changeDuringCheckpoint=$false; $script:values.capture=Value 1
        $null=Invoke-TweakerPerformance apply windows.capture.off
        Assert (Test-TweakerOptimizationApplied windows.capture.off) 'Actual target state'
        $path=Join-Path $script:PerformanceStateDirectory 'windows.capture.off.json'
        $saved=[IO.File]::ReadAllText($path)
        Expect-Error {Invoke-TweakerPerformance apply windows.capture.off} 'existing_backup_restore_first'
        Assert ([IO.File]::ReadAllText($path) -eq $saved) 'Repeated apply retains originals'
        $inventory=Invoke-TweakerBackup backup-list
        $record=@($inventory.backups | Where-Object tweakId -eq 'windows.capture.off')[0]
        Assert ($record.canRestore -and @($inventory.warnings).Count -eq 0) 'Common recovery discovers new tweaks'
        $script:values.capture=Missing
        Assert (-not (Test-TweakerOptimizationApplied windows.capture.off)) 'Status ignores recorded flag'
        $writes=$script:writes
        Expect-Error {Invoke-TweakerPerformance restore windows.capture.off} 'external_change_detected'
        Assert ($script:writes -eq $writes) 'Conflict preflight avoids partial restore'
        $script:values.capture=Value 0
        $restored=Invoke-TweakerBackup backup-restore -BackupId $record.backupId
        Assert ($restored.ok -and $restored.restartRequired) 'Shared restore reports restart'
        Assert ($script:values.capture.value -eq 1 -and -not $script:values.historicalCapture.exists -and $script:values.gameDvr.value -eq 1) 'Exact originals including absent values'
        $script:failField='gameDvr'
        Expect-Error {Invoke-TweakerPerformance apply windows.capture.off} 'simulated_write_failure'
        Assert ((Get-Content $path -Raw | ConvertFrom-Json).status -eq 'pending') 'Partial apply remains recoverable'
        $script:failField=''
        $null=Invoke-TweakerPerformance restore windows.capture.off
        Assert (-not $script:values.historicalCapture.exists -and $script:values.capture.value -eq 1) 'Partial apply recovery'
        $null=Invoke-TweakerPerformance apply windows.capture.off
        $script:failField='gameDvr'
        Expect-Error {Invoke-TweakerPerformance restore windows.capture.off} 'simulated_write_failure'
        $script:failField=''
        $null=Invoke-TweakerPerformance restore windows.capture.off
        Assert ($script:values.gameDvr.value -eq 1) 'Partial restore retry'
        $script:values.capture=Value 0
        $null=Invoke-TweakerPerformance apply windows.capture.off
        $script:values.capture=Missing
        $null=Invoke-TweakerPerformance restore windows.capture.off
        Assert (-not $script:values.capture.exists) 'Unowned original fields stay untouched'
        foreach ($id in @('windows.gamemode.on','windows.audio.ducking.off')) {
            $null=Invoke-TweakerPerformance apply $id
            Assert (Test-TweakerOptimizationApplied $id) 'Single-field tweak target'
        }
        $all=Invoke-TweakerBackup backup-restore-all
        Assert ($all.ok -and $all.restartRequired -and $script:values.gameMode.value -eq 0 -and $script:values.ducking.value -eq 1) 'Restore-all covers new tweaks'
        $null=Invoke-TweakerPerformance apply windows.capture.off
        $state=Get-Content $path -Raw | ConvertFrom-Json
        $state.entries[0].field='arbitrary.registry.path'
        Write-AtomicJson $state $path
        $writes=$script:writes
        Expect-Error {Invoke-TweakerPerformance restore windows.capture.off} 'invalid_optimization_backup'
        Assert ($script:writes -eq $writes) 'Tampered journals cannot expand allowlist'
        Expect-Error {Assert-OptimizationValue capture ([pscustomobject]@{exists=$true;kind='String';value='0'})} 'unsupported_optimization_value'
        Expect-Error {Assert-OptimizationValue gameMode (Value 2)} 'unsupported_optimization_value'
        Expect-Error {Invoke-TweakerPerformance apply 'arbitrary.path'} 'invalid_tweak_id'
        $script:values.ducking=Value 3
        $fresh=Join-Path $base 'fresh'
        $result=Invoke-TweakerPerformance apply windows.audio.ducking.off -StateDirectory $fresh
        Assert ($result.status -eq 'unchanged' -and -not (Test-Path (Join-Path $fresh 'windows.audio.ducking.off.json'))) 'No invented backup for no-op'
        Write-Output 'Optimization tests passed'
    } finally {
        $resolved=[IO.Path]::GetFullPath($base)
        if ($resolved.StartsWith($parent + '\',[StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolved)) {Remove-Item -LiteralPath $resolved -Recurse -Force}
    }
}
