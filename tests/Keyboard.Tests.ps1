# All writes, privilege checks and restore points are simulated; no user settings change.
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../Tweaker.psm1') -Force
$module = Get-Module Tweaker
& $module {
    function Assert($Condition, [string]$Message) { if (-not $Condition) { throw $Message } }
    function Expect-Error([scriptblock]$Operation, [string]$Code) {
        $caught = $null
        try { $null = & $Operation } catch { $caught = $_.Exception.Message }
        Assert ($caught -eq $Code) ("Expected $Code; got $caught")
    }
    $script:values = @{}
    $script:writeCount = 0
    $script:checkpointCount = 0
    $script:admin = $true
    $script:checkpointFails = $false
    $script:checkpointChangesInput = $false
    $script:failField = ''
    $script:journalFails = $false
    function Assert-Administrator { if (-not $script:admin) { throw 'admin_required' } }
    function New-TweakerRestorePoint {
        if ($script:checkpointFails) { throw 'restore_point_not_created' }
        if ($script:checkpointChangesInput) { $script:values.delay = 2 }
        $script:checkpointCount++
    }
    function Get-KeyboardValue([string]$Field) { return $script:values[$Field] }
    function Set-KeyboardValue([string]$Field, [int]$Value) {
        Assert-KeyboardValue $Field $Value
        if ($script:failField -eq $Field) { throw 'simulated_write_failure' }
        $script:values[$Field] = $Value
        $script:writeCount++
    }
    # Keep real atomic journal writer, but allow a write-failure injection.
    $script:originalSave = ${function:Save-Journal}
    function Save-Journal($State, [string]$Path) {
        if ($script:journalFails) { throw 'simulated_disk_failure' }
        & $script:originalSave $State $Path
    }
    $root = Join-Path $PSScriptRoot ('tweaker-tests-' + [guid]::NewGuid().ToString('N'))
    $dir = Join-Path $root 'main'
    try {
        $script:values = @{delay=3;speed=8;filterFlags=127;stickyFlags=511}
        $null = Invoke-TweakerPerformance apply keyboard.repeat.fast -StateDirectory $dir -WhatIf
        Assert (-not (Test-Path -LiteralPath $dir)) 'WhatIf must not create a journal directory'
        $script:admin = $false
        Expect-Error { Invoke-TweakerPerformance apply keyboard.repeat.fast -StateDirectory $dir } 'admin_required'
        Assert ($script:writeCount -eq 0) 'Admin rejection must not change values'
        $script:admin = $true
        $script:checkpointFails = $true
        Expect-Error { Invoke-TweakerPerformance apply keyboard.repeat.fast -StateDirectory $dir } 'restore_point_not_created'
        Assert ($script:writeCount -eq 0) 'Checkpoint failure must not change values'
        $script:checkpointFails = $false
        $script:journalFails = $true
        Expect-Error { Invoke-TweakerPerformance apply keyboard.repeat.fast -StateDirectory $dir } 'simulated_disk_failure'
        Assert ($script:writeCount -eq 0) 'Backup failure must not change values'
        $script:journalFails = $false
        $script:checkpointChangesInput = $true
        Expect-Error { Invoke-TweakerPerformance apply keyboard.repeat.fast -StateDirectory $dir } 'external_change_detected'
        Assert ($script:writeCount -eq 0) 'Conflict during checkpoint must abort before mutation'
        $script:checkpointChangesInput = $false
        $script:values.delay = 3
        $null = Invoke-TweakerPerformance apply keyboard.repeat.fast -StateDirectory $dir
        Assert ($script:values.delay -eq 0 -and $script:values.speed -eq 31) 'Fast repeat target'
        Assert (Test-TweakerKeyboardApplied keyboard.repeat.fast) 'Live status must reflect target'
        $journalPath = Join-Path $dir 'keyboard.repeat.fast.json'
        $originalJournal = [IO.File]::ReadAllText($journalPath)
        $backup = $originalJournal | ConvertFrom-Json
        Assert ($backup.entries[0].before -eq 3 -and $backup.entries[1].before -eq 8) 'Original settings retained'
        Expect-Error { Invoke-TweakerPerformance apply keyboard.repeat.fast -StateDirectory $dir } 'existing_backup_restore_first'
        Assert ([IO.File]::ReadAllText($journalPath) -eq $originalJournal) 'Repeat apply must not overwrite backup'
        $script:values.speed = 12
        Assert (-not (Test-TweakerKeyboardApplied keyboard.repeat.fast)) 'Live status must ignore recorded applied status'
        $writesBefore = $script:writeCount
        Expect-Error { Invoke-TweakerPerformance restore keyboard.repeat.fast -StateDirectory $dir } 'external_change_detected'
        Assert ($script:writeCount -eq $writesBefore -and $script:values.delay -eq 0) 'Conflict preflight must avoid partial restore'
        $script:values.speed = 31
        $null = Invoke-TweakerPerformance restore keyboard.repeat.fast -StateDirectory $dir
        Assert ($script:values.delay -eq 3 -and $script:values.speed -eq 8) 'Exact restore, not Windows defaults'
        $writesBefore = $script:writeCount
        $null = Invoke-TweakerPerformance restore keyboard.repeat.fast -StateDirectory $dir
        Assert ($writesBefore -eq $script:writeCount) 'Repeated restore must not write'

        # Failure on the second field leaves a recoverable pending journal.
        $script:failField = 'speed'
        Expect-Error { Invoke-TweakerPerformance apply keyboard.repeat.fast -StateDirectory $dir } 'simulated_write_failure'
        $backup = Get-Content -LiteralPath $journalPath -Raw | ConvertFrom-Json
        Assert ($backup.status -eq 'pending' -and $script:values.delay -eq 0 -and $script:values.speed -eq 8) 'Partial apply is recoverable'
        $script:failField = ''
        $null = Invoke-TweakerPerformance restore keyboard.repeat.fast -StateDirectory $dir
        Assert ($script:values.delay -eq 3 -and $script:values.speed -eq 8) 'Partial apply recovery'

        # Failed restore can also be resumed.
        $null = Invoke-TweakerPerformance apply keyboard.repeat.fast -StateDirectory $dir
        $script:failField = 'speed'
        Expect-Error { Invoke-TweakerPerformance restore keyboard.repeat.fast -StateDirectory $dir } 'simulated_write_failure'
        Assert ($script:values.delay -eq 3 -and $script:values.speed -eq 31) 'Restore partially completed'
        $script:failField = ''
        $null = Invoke-TweakerPerformance restore keyboard.repeat.fast -StateDirectory $dir
        Assert ($script:values.delay -eq 3 -and $script:values.speed -eq 8) 'Retry restores remaining field'

        # Unchanged fields are not owned by this tweak, even after external edits.
        $script:values.delay = 0
        $null = Invoke-TweakerPerformance apply keyboard.repeat.fast -StateDirectory $dir
        $script:values.delay = 2
        $null = Invoke-TweakerPerformance restore keyboard.repeat.fast -StateDirectory $dir
        Assert ($script:values.delay -eq 2 -and $script:values.speed -eq 8) 'Leave unmodified original field alone'

        foreach ($case in @(
            @{id='keyboard.filterkeys.off';field='filterFlags';before=127;target=122},
            @{id='keyboard.stickykeys.off';field='stickyFlags';before=511;target=506}
        )) {
            $null = Invoke-TweakerPerformance apply $case.id -StateDirectory $dir
            Assert ($script:values[$case.field] -eq $case.target) 'Clear only ON and activation hotkey flags'
            Assert (Test-TweakerKeyboardApplied $case.id) 'Accessibility live status'
            $null = Invoke-TweakerPerformance restore $case.id -StateDirectory $dir
            Assert ($script:values[$case.field] -eq $case.before) 'Restore all original persistent flags'
        }
        # Already configured: do not fabricate a backup or create a checkpoint.
        $script:values = @{delay=0;speed=31;filterFlags=122;stickyFlags=506}
        $checkpointBefore = $script:checkpointCount
        $fresh = Join-Path $root 'fresh'
        $result = Invoke-TweakerPerformance apply keyboard.repeat.fast -StateDirectory $fresh
        Assert ($result.status -eq 'unchanged' -and $checkpointBefore -eq $script:checkpointCount) 'Already applied is a no-op'
        Assert (-not (Test-Path -LiteralPath (Join-Path $fresh 'keyboard.repeat.fast.json'))) 'No invented backup'
        Expect-Error { Invoke-TweakerPerformance restore keyboard.repeat.fast -StateDirectory $fresh } 'backup_not_found'
        # No simultaneous mutations from separate CLI processes.
        $held = [IO.File]::Open((Join-Path $dir 'operation.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
        try {
            $blocked = $false
            try { $null = Invoke-TweakerPerformance apply keyboard.stickykeys.off -StateDirectory $dir } catch { $blocked = $true }
            Assert $blocked 'Exclusive operation lock'
        } finally { $held.Dispose() }
        # Corrupt backup must not reach a setter.
        $bad = @{version=1;id='keyboard.repeat.fast';status='pending';entries=@(
            @{field='delay';before=99;target=0},@{field='speed';before=8;target=31})}
        & $script:originalSave $bad $journalPath
        $writesBefore = $script:writeCount
        Expect-Error { Invoke-TweakerPerformance restore keyboard.repeat.fast -StateDirectory $dir } 'invalid_keyboard_value'
        Assert ($writesBefore -eq $script:writeCount) 'Invalid backup must not mutate settings'
        Write-Output 'PASS: keyboard dry-run, admin, checkpoint, disk failure, conflicts, live state, exact restore, partial apply/restore, no-op, flags, lock and corrupt backup'
    } finally {
        $resolvedRoot = [IO.Path]::GetFullPath($root)
        $testParent = [IO.Path]::GetFullPath($PSScriptRoot) + [IO.Path]::DirectorySeparatorChar
        if (-not $resolvedRoot.StartsWith($testParent, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe test cleanup path' }
        if (Test-Path -LiteralPath $resolvedRoot) { Remove-Item -LiteralPath $resolvedRoot -Recurse -Force }
    }
}
