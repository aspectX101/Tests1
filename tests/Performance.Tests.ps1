$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../Tweaker.psm1') -Force
$module = Get-Module Tweaker
& $module {
    function Register-TweakerBackup {} # Central registration is covered in Backup.Tests.ps1.
    function Assert($Condition, $Message) { if (-not $Condition) { throw $Message } }
    $script:fakePower = '381b4222-f694-41f0-9685-ff5bb260df2e'
    $script:restorePoints = 0
    $script:failCheckpoint = $false
    $script:failPriority = $false
    $script:processes = @([pscustomobject]@{pid=123;started='100';priority='Normal'})
    function Assert-Administrator {}
    function New-TweakerRestorePoint {
        if ($script:failCheckpoint) { throw 'checkpoint_failed' }
        $script:restorePoints++
    }
    function Get-PowerState { $script:fakePower }
    function Invoke-PowerCfg([string[]]$Arguments) {
        if ($Arguments[0] -eq '/list') { return $script:HighPerformance }
        if ($Arguments[0] -eq '/setactive') { $script:fakePower = $Arguments[1] }
    }
    function Get-FiveMProcesses { @($script:processes | Select-Object pid,started,priority) }
    function Set-FiveMPriority($Entry, [string]$Priority) {
        if ($script:failPriority) { throw 'simulated_access_denied' }
        foreach ($p in $script:processes) {
            if ($p.pid -eq $Entry.pid -and $p.started -eq $Entry.started) { $p.priority = $Priority; return $true }
        }
        return $false
    }
    $dir = Join-Path $PSScriptRoot ('tweaker-tests-' + [guid]::NewGuid().ToString('N'))
    try {
        $null = Invoke-TweakerPerformance apply windows.power.high -StateDirectory $dir -WhatIf
        Assert (-not (Test-Path $dir)) 'WhatIf must not write files'
        $null = Invoke-TweakerPerformance apply windows.power.high -StateDirectory $dir
        Assert ($script:fakePower -eq $script:HighPerformance) 'Apply power'
        Assert ($script:restorePoints -eq 1) 'Checkpoint required'
        $blocked = $false
        try { Invoke-TweakerPerformance apply windows.power.high -StateDirectory $dir } catch { $blocked = $true }
        Assert $blocked 'Repeat apply must preserve original backup'
        $script:fakePower = 'a1841308-3541-4fab-bc81-f71556f20b4a'
        $blocked = $false
        try { Invoke-TweakerPerformance restore windows.power.high -StateDirectory $dir } catch { $blocked = $true }
        Assert $blocked 'External change must block restore'
        $script:fakePower = $script:HighPerformance
        $null = Invoke-TweakerPerformance restore windows.power.high -StateDirectory $dir
        Assert ($script:fakePower -eq '381b4222-f694-41f0-9685-ff5bb260df2e') 'Original plan restored'
        $script:failCheckpoint = $true
        $blocked = $false
        try { Invoke-TweakerPerformance apply windows.power.high -StateDirectory $dir } catch { $blocked = $true }
        Assert $blocked 'Checkpoint failure must abort'
        Assert ($script:fakePower -ne $script:HighPerformance) 'No mutation after checkpoint failure'
        $script:failPriority = $true
        try { Invoke-TweakerPerformance apply fivem.priority.high -StateDirectory $dir } catch {}
        $journal = Get-Content (Join-Path $dir 'fivem.priority.high.json') -Raw | ConvertFrom-Json
        Assert ($journal.status -eq 'pending' -and $journal.before[0].priority -eq 'Normal') 'Failure keeps original journal'
        $script:failPriority = $false
        $null = Invoke-TweakerPerformance restore fivem.priority.high -StateDirectory $dir
        $null = Invoke-TweakerPerformance apply fivem.priority.high -StateDirectory $dir
        Assert ($script:processes[0].priority -eq 'High') 'Apply priority'
        $null = Invoke-TweakerPerformance restore fivem.priority.high -StateDirectory $dir
        Assert ($script:processes[0].priority -eq 'Normal') 'Restore priority'
        $null = Invoke-TweakerPerformance apply fivem.priority.high -StateDirectory $dir
        $script:processes = @([pscustomobject]@{pid=123;started='200';priority='High'})
        $null = Invoke-TweakerPerformance restore fivem.priority.high -StateDirectory $dir
        Assert ($script:processes[0].priority -eq 'High') 'Reused PID must not be changed'
        foreach ($item in Get-TweakerCatalog) {
            foreach ($language in @('de','en','it')) { Assert ($item.name.ContainsKey($language) -and $item.description.ContainsKey($language)) 'Missing translation' }
        }
        Write-Output 'PASS: dry-run, backup, restore, checkpoint failure, repeat apply, conflict, crash recovery, PID reuse, translations'
    } finally {
        # Only remove this test-owned, randomly named directory.
        if (Test-Path -LiteralPath $dir) { Remove-Item -LiteralPath $dir -Recurse -Force }
    }
}
