# Central archive + actual domain journals, fake Windows adapters, disposable files.
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot '../Tweaker.psm1') -Force
& (Get-Module Tweaker) {
    function Assert($Condition,[string]$Message) { if (-not $Condition) { throw $Message } }
    function Expect-Error([scriptblock]$Operation,[string]$Code) {
        $actual=$null
        try { $null=& $Operation } catch { $actual=$_.Exception.Message }
        Assert ($actual -eq $Code) "Expected $Code; got $actual"
    }
    $parent=[IO.Path]::GetFullPath((Join-Path (Get-Location) 'work'))
    $base=Join-Path $parent ('b-' + [guid]::NewGuid().ToString('N').Substring(0,8))
    $script:BackupDirectory=Join-Path $base 'backups'
    $script:PerformanceStateDirectory=Join-Path $base 'performance'
    $script:SafeModeDirectory=Join-Path $base 'services'
    $script:fakePower='381b4222-f694-41f0-9685-ff5bb260df2e'
    $script:keyboard=@{delay=3;speed=8;filterFlags=127;stickyFlags=511}
    $script:writes=0; $script:failRegistration=$false
    function Assert-Administrator {}
    function New-TweakerRestorePoint {}
    function Assert-FiveMClosed {}
    function Get-PowerState { $script:fakePower }
    function Get-FiveMProcesses { @() }
    function Invoke-PowerCfg([string[]]$Arguments) {
        if ($Arguments[0] -eq '/list') { return $script:HighPerformance }
        if ($Arguments[0] -eq '/setactive') { $script:fakePower=$Arguments[1]; $script:writes++ }
    }
    function Get-KeyboardValue([string]$Field) { $script:keyboard[$Field] }
    function Set-KeyboardValue([string]$Field,[int]$Value) { $script:keyboard[$Field]=$Value; $script:writes++ }
    $script:originalRegister=${function:Register-TweakerBackup}
    function Register-TweakerBackup($State,[string]$Source) {
        if ($script:failRegistration) { throw 'simulated_archive_failure' }
        & $script:originalRegister $State $Source
    }
    try {
        $empty=Invoke-TweakerBackup backup-list
        Assert ($empty.ok -and @($empty.backups).Count -eq 0 -and -not (Test-Path -LiteralPath $base)) 'Empty catalog must not write'
        $script:failRegistration=$true
        Expect-Error { Invoke-TweakerPerformance apply keyboard.repeat.fast } 'simulated_archive_failure'
        Assert ($script:writes -eq 0 -and -not (Test-Path (Join-Path $script:PerformanceStateDirectory 'keyboard.repeat.fast.json'))) 'Central archive failure blocks mutation'
        $script:failRegistration=$false
        $null=Invoke-TweakerPerformance apply windows.power.high
        $null=Invoke-TweakerPerformance apply keyboard.repeat.fast
        $inventory=Invoke-TweakerBackup backup-list
        Assert (@($inventory.backups).Count -eq 2 -and @($inventory.warnings).Count -eq 0) 'Auto-registration across modules'
        $power=@($inventory.backups | Where-Object tweakId -eq 'windows.power.high')[0]
        $keyboard=@($inventory.backups | Where-Object tweakId -eq 'keyboard.repeat.fast')[0]
        Assert ($power.canRestore -and $keyboard.canRestore) 'Live preflight'
        $export=Invoke-TweakerBackup backup-export -BackupId $power.backupId
        Assert ($export.record.payload.before -eq '381b4222-f694-41f0-9685-ff5bb260df2e' -and -not $export.importSupported) 'Export contains immutable original, not executable import'
        $archivePath=Join-Path $script:BackupDirectory ('records\' + $power.backupId + '.json')
        $immutable=[IO.File]::ReadAllText($archivePath)
        $script:keyboard.speed=12
        $preview=Invoke-TweakerBackup backup-preview -BackupId $keyboard.backupId
        Assert (-not $preview.backup.canRestore -and $preview.backup.reason -eq 'external_change_detected') 'Preview detects external changes'
        $writesBefore=$script:writes
        $null=Invoke-TweakerBackup backup-restore -BackupId $power.backupId -WhatIf
        Assert ($script:writes -eq $writesBefore) 'Dry-run cannot restore'
        Expect-Error { Invoke-TweakerPerformance restore windows.power.high -ExpectedRecoveryId ('a'*32) } 'backup_superseded'
        Assert ($script:writes -eq $writesBefore) 'Identity checked under source lock'
        $script:failRegistration=$true
        $blockedRestore=Invoke-TweakerBackup backup-restore -BackupId $power.backupId
        Assert (-not $blockedRestore.ok -and $script:fakePower -eq $script:HighPerformance) 'Archive failure also blocks restoration before mutation'
        $script:failRegistration=$false
        $restored=Invoke-TweakerBackup backup-restore -BackupId $power.backupId
        Assert ($restored.ok -and $script:fakePower -eq '381b4222-f694-41f0-9685-ff5bb260df2e') 'Single restore uses original module'
        Assert ([IO.File]::ReadAllText($archivePath) -eq $immutable) 'History is immutable after restore'

        # Central overview includes reversible cache payload and service evidence.
        $root=Join-Path $base 'FiveM.app'
        $null=New-Item -ItemType Directory -Path (Join-Path $root 'data\server-cache') -Force
        [IO.File]::WriteAllText((Join-Path $root 'CitizenFX.ini'),'fixture')
        [IO.File]::WriteAllText((Join-Path $root 'data\server-cache\file.bin'),'12345')
        $cleaned=Invoke-TweakerCache cache-clean -FiveMPath $root
        $null=New-Item -ItemType Directory -Path $script:SafeModeDirectory -Force
        $serviceState=[pscustomobject]@{version=1;enabled=$true;checkpointVerified=$true;lastCheckUtc=$null;changes=@(
            [pscustomobject]@{name='EventLog';originalStartMode='Disabled';originalState='Stopped';originalDelayedAutoStart=$false;recordedUtc=[DateTime]::UtcNow.ToString('o')})}
        Save-SafeModeState $serviceState
        $inventory=Invoke-TweakerBackup backup-list -FiveMPath $root
        Assert (@($inventory.backups | Where-Object kind -eq 'cache').Count -eq 1) 'Cache has a shared recovery ID'
        $service=@($inventory.backups | Where-Object kind -eq 'services')[0]
        Assert (-not $service.canRestore -and $service.reason -eq 'service_evidence_only') 'Safety policy cannot be rolled back to disabled services'
        $singleService=Invoke-TweakerBackup backup-restore -BackupId $service.backupId
        Assert (-not $singleService.ok -and $singleService.results[0].reason -eq 'service_evidence_only') 'Unsafe service restore refused'
        $partial=Invoke-TweakerBackup backup-restore-all -FiveMPath $root
        Assert (-not $partial.ok -and $partial.status -eq 'partial') 'Partial result must not claim all restored'
        Assert ([IO.File]::ReadAllText((Join-Path $root 'data\server-cache\file.bin')) -eq '12345') 'Bulk restores cache'
        Assert ($script:keyboard.speed -eq 12 -and (Read-SafeModeState).enabled) 'Bulk preserves newer input and SafeMode'
        $script:keyboard.speed=31
        $retry=Invoke-TweakerBackup backup-restore-all -FiveMPath $root
        Assert ($retry.ok -and $script:keyboard.delay -eq 3 -and $script:keyboard.speed -eq 8) 'Retry restores remaining compatible item'
        $writesBefore=$script:writes
        $again=Invoke-TweakerBackup backup-restore-all -FiveMPath $root
        Assert ($again.ok -and $script:writes -eq $writesBefore) 'Idempotent bulk restore'

        # New operations never make a historical recovery ID apply to a new journal.
        $null=Invoke-TweakerPerformance apply windows.power.high
        $old=Invoke-TweakerBackup backup-preview -BackupId $power.backupId
        Assert (-not $old.backup.canRestore -and $old.backup.reason -eq 'backup_superseded') 'Superseded history is not replayed over newer operations'

        # Read-only migration discovers a pre-manager journal without moving it.
        $legacy=[pscustomobject]@{version=1;id='fivem.priority.high';status='pending';createdUtc=[DateTime]::UtcNow.ToString('o');before=@()}
        $legacyPath=Join-Path $script:PerformanceStateDirectory 'fivem.priority.high.json'
        Write-AtomicJson $legacy $legacyPath
        $legacyList=Invoke-TweakerBackup backup-list
        Assert (@($legacyList.backups | Where-Object tweakId -eq 'fivem.priority.high').Count -eq 1) 'Legacy discovery'
        $legacyId=(New-RecoveryRecord $legacy $legacyPath).backupId
        Assert (-not (Test-Path (Join-Path $script:BackupDirectory ('records\'+$legacyId+'.json')))) 'Listing does not migrate by writing'
        # Corruption is visible and does not hide other valid recovery records.
        $bad=Get-Content -LiteralPath $archivePath -Raw | ConvertFrom-Json
        $bad.source='C:\outside\untrusted.json'
        Write-AtomicJson $bad $archivePath
        $damaged=Invoke-TweakerBackup backup-list
        Assert (@($damaged.warnings).Count -eq 1 -and @($damaged.backups).Count -gt 1) 'Corrupt archive isolated and reported'
        Write-Output 'PASS: unified automatic archives, archive failure, immutable originals, preview, single/bulk restore, partial retry, SafeMode safety, source identity, legacy discovery and corruption'
    } finally {
        $absolute=[IO.Path]::GetFullPath($base)
        if (-not $absolute.StartsWith($parent+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe test path' }
        if (Test-Path -LiteralPath $absolute) { Remove-Item -LiteralPath $absolute -Recurse -Force }
    }
}
