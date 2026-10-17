# All service/control/ACL/checkpoint operations are mocked. Journals use test files.
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../Tweaker.psm1') -Force
& (Get-Module Tweaker) {
    function Register-TweakerBackup {} # Central registration is covered in Backup.Tests.ps1.
    function Assert($Condition, [string]$Message) { if (-not $Condition) { throw $Message } }
    function Expect-Error([scriptblock]$Operation, [string]$Code) {
        $actual = $null
        try { $null = & $Operation } catch { $actual = $_.Exception.Message }
        Assert ($actual -eq $Code) "Expected $Code; got $actual"
    }
    $testParent = [IO.Path]::GetFullPath((Join-Path (Get-Location) 'work'))
    $script:SafeModeDirectory = Join-Path $testParent ('safe-' + [guid]::NewGuid().ToString('N').Substring(0,8))
    $script:admin = $true; $script:supported = $true; $script:checkpointFails = $false
    $script:checkpoints=0; $script:sets=0; $script:starts=0; $script:denyService=''
    $script:services=@{}
    function Assert-Administrator { if (-not $script:admin) { throw 'admin_required' } }
    function Initialize-SafeModeStorage { $null = New-Item -ItemType Directory -Path $script:SafeModeDirectory -Force }
    function Get-SafeModePlatform { [pscustomobject]@{build=26100;edition='Professional';supported=$script:supported} }
    function New-TweakerRestorePoint { if ($script:checkpointFails) { throw 'checkpoint_failed' }; $script:checkpoints++ }
    function Get-SafeModeService([string]$Name) { $script:services[$Name] | Select-Object * }
    function Set-SafeModeServiceStart([string]$Name, [string]$Mode) {
        Assert-TweakerServiceChangeAllowed $Name $Mode 'Running'
        if ($Name -eq $script:denyService) { throw 'simulated_access_denied' }
        $script:services[$Name].startMode = $Mode
        $script:sets++
    }
    function Start-SafeModeService([string]$Name) {
        Assert-TweakerServiceChangeAllowed $Name '' 'Running'
        if ($Name -eq $script:denyService) { throw 'simulated_access_denied' }
        $script:services[$Name].state='Running'; $script:starts++
    }
    foreach ($policy in Get-SafeModePolicy) {
        $script:services[$policy.name] = [pscustomobject]@{name=$policy.name;exists=$true;displayName=$policy.name
            state=$(if ($policy.keepRunning) {'Running'} else {'Stopped'})
            startMode=$(if ($policy.keepRunning) {'Automatic'} else {'Manual'});delayedAutoStart=$false}
    }
    try {
        $scan = Invoke-TweakerSafeMode safemode-scan
        Assert (-not $scan.enabled -and $scan.health -eq 'green') 'Read-only healthy scan; demand services may stop'
        Assert (-not (Test-Path -LiteralPath $script:SafeModeDirectory)) 'Scan must not create state'
        $null = Invoke-TweakerSafeMode safemode-enable -WhatIf
        Assert (-not (Test-Path -LiteralPath $script:SafeModeDirectory)) 'WhatIf must not write'
        $script:admin = $false
        Expect-Error { Invoke-TweakerSafeMode safemode-enable } 'admin_required'
        $script:admin = $true; $script:checkpointFails=$true
        Expect-Error { Invoke-TweakerSafeMode safemode-enable } 'checkpoint_failed'
        Assert (-not (Read-SafeModeState).enabled -and $script:starts -eq 0) 'Checkpoint failure leaves protection off and services untouched'
        $script:checkpointFails=$false; $script:supported=$false
        Expect-Error { Invoke-TweakerSafeMode safemode-enable } 'unsupported_safemode_platform'
        $script:supported=$true
        $script:services.EventLog.state='Stopped'; $script:services.EventLog.startMode='Disabled'
        $script:services.wuauserv.startMode='Disabled'
        $script:services.SysMain.startMode='Disabled'
        $enabled = Invoke-TweakerSafeMode safemode-enable
        Assert ($enabled.enabled -and $script:services.EventLog.state -eq 'Running' -and $script:services.EventLog.startMode -eq 'Automatic') 'Repair core disabled/stopped service'
        Assert ($script:services.wuauserv.startMode -eq 'Manual' -and $script:services.wuauserv.state -eq 'Stopped') 'Keep update trigger service enabled without forcing running'
        Assert ($script:services.SysMain.startMode -eq 'Disabled' -and $enabled.health -eq 'yellow') 'Observe optional defaults instead of guessing'
        $state = Read-SafeModeState
        Assert ($state.changes[0].originalStartMode -eq 'Disabled') 'Save original service configuration before changes'
        Expect-Error { Assert-TweakerServiceChangeAllowed EventLog Disabled Stopped } 'safemode_protects_service'
        Expect-Error { Assert-TweakerServiceChangeAllowed WSearch Disabled '' } 'safemode_protects_service'
        Expect-Error { Assert-TweakerServiceChangeAllowed Untrusted Automatic Running } 'service_not_allowlisted'
        $script:services.EventLog.state='Stopped'
        $repaired = Invoke-TweakerSafeMode safemode-enforce
        Assert ($script:services.EventLog.state -eq 'Running' -and $script:checkpoints -eq 1) 'Watchdog repairs without exhausting restore-point limits'
        Assert (@((Read-SafeModeState).changes | Where-Object name -eq 'EventLog').Count -eq 1) 'Keep first original backup'
        $script:services.EventLog.state='Stopped'; $script:denyService='EventLog'
        $failed = Invoke-TweakerSafeMode safemode-enforce
        Assert ($failed.enabled -and $failed.health -eq 'red') 'Enabled does not imply healthy when repair denied'
        Assert (@($failed.repairs | Where-Object { $_.name -eq 'EventLog' -and -not $_.ok }).Count -eq 1) 'Expose failed repairs individually'
        $script:denyService=''
        $null = Invoke-TweakerSafeMode safemode-enforce
        $startsBefore = $script:starts; $setsBefore=$script:sets
        $disabled = Invoke-TweakerSafeMode safemode-disable
        Assert (-not $disabled.enabled -and $script:services.EventLog.state -eq 'Running') 'Disable mode must not disable repaired services'
        $null = Invoke-TweakerSafeMode safemode-enforce
        Assert ($script:starts -eq $startsBefore -and $script:sets -eq $setsBefore) 'Disabled enforcement is read-only for services'
        $report = Invoke-TweakerSafeMode safemode-report
        Assert ($report.monitorScope -eq 'while_app_running' -and @($report.services).Count -eq 22) 'Exportable report and explicit scope'
        # Unknown/unreadable state must never silently turn off the guard.
        [IO.File]::WriteAllText((Join-Path $script:SafeModeDirectory 'state.json'), '{"version":1,"enabled":"false"}')
        Expect-Error { Read-SafeModeState } 'invalid_safemode_state'
        Write-Output 'PASS: SafeMode read-only scan, dry-run, admin/checkpoint, critical repair, demand services, optional audit, protection guard, restart, denied repair, disable and state validation'
    } finally {
        $absolute = [IO.Path]::GetFullPath($script:SafeModeDirectory)
        if (-not $absolute.StartsWith($testParent + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe test cleanup path' }
        if (Test-Path -LiteralPath $absolute) { Remove-Item -LiteralPath $absolute -Recurse -Force }
    }
}
