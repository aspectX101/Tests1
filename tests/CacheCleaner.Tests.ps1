$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot '../Tweaker.psm1') -Force
$module = Get-Module Tweaker
& $module {
    function Assert($Condition, [string]$Message) { if (-not $Condition) { throw $Message } }
    function Expect-Error([scriptblock]$Operation, [string]$Code) {
        $actual = $null
        try { $null = & $Operation } catch { $actual = $_.Exception.Message }
        Assert ($actual -eq $Code) "Expected $Code; got $actual"
    }
    $script:gameRunning = $false
    $script:failMoveAt = 0
    $script:moveCount = 0
    $script:simulateLinkPath = ''
    function Get-Item([string]$LiteralPath, [switch]$Force) {
        if ($LiteralPath -eq $script:simulateLinkPath) { return [pscustomobject]@{Attributes=[IO.FileAttributes]::ReparsePoint} }
        Microsoft.PowerShell.Management\Get-Item -LiteralPath $LiteralPath -Force:$Force
    }
    function Assert-FiveMClosed { if ($script:gameRunning) { throw 'close_fivem_first' } }
    $script:originalMove = ${function:Move-CacheEntry}
    function Move-CacheEntry([string]$Source, [string]$Destination, [string]$Root) {
        $script:moveCount++
        if ($script:failMoveAt -eq $script:moveCount) { throw 'simulated_move_failure' }
        & $script:originalMove $Source $Destination $Root
    }
    # Keep fixtures short enough for Windows PowerShell 5.1/.NET path limits.
    $testParent = [IO.Path]::GetFullPath((Join-Path (Get-Location) 'work'))
    $base = Join-Path $testParent ('cache-' + [guid]::NewGuid().ToString('N').Substring(0,8))
    $junction = $null
    function New-Fixture([string]$Name) {
        $root = Join-Path $base $Name
        foreach ($relative in @('data\cache\game','data\cache\browser\nested','data\server-cache','data\server-cache-priv','data\game-storage','data\nui-storage','citizen')) {
            $null = New-Item -ItemType Directory -Path (Join-Path $root $relative) -Force
        }
        foreach ($relative in @('CitizenFX.ini','data\cache\game\keep.bin','data\game-storage\keep.bin','data\nui-storage\settings.json','citizen\mod.rpf','fivem.cfg')) {
            [IO.File]::WriteAllText((Join-Path $root $relative), 'PRESERVE')
        }
        [IO.File]::WriteAllText((Join-Path $root 'data\cache\browser\nested\file.bin'), '12345')
        [IO.File]::WriteAllText((Join-Path $root 'data\server-cache\file.bin'), '1234567')
        [IO.File]::WriteAllText((Join-Path $root 'data\server-cache-priv\file.bin'), '123')
        return $root
    }
    function Assert-Preserved([string]$Root) {
        foreach ($relative in @('CitizenFX.ini','data\cache\game\keep.bin','data\game-storage\keep.bin','data\nui-storage\settings.json','citizen\mod.rpf','fivem.cfg')) {
            Assert ([IO.File]::ReadAllText((Join-Path $Root $relative)) -eq 'PRESERVE') "Must preserve $relative"
        }
    }
    try {
        $root = New-Fixture 'main'
        $preview = Invoke-TweakerCache cache-info -FiveMPath $root
        Assert ($preview.totalBytes -eq 15 -and @($preview.candidates).Count -eq 3) 'Exact preview'
        Assert (-not (Test-Path (Join-Path $root '.tweaker-cache-backups'))) 'Preview must not write'
        $null = Invoke-TweakerCache cache-clean -FiveMPath $root -WhatIf
        Assert (-not (Test-Path (Join-Path $root '.tweaker-cache-backups'))) 'Dry-run must not write'
        $script:gameRunning = $true
        Expect-Error { Invoke-TweakerCache cache-clean -FiveMPath $root } 'close_fivem_first'
        Assert (-not (Test-Path (Join-Path $root '.tweaker-cache-backups'))) 'Running game must block before writes'
        $script:gameRunning = $false
        $cleaned = Invoke-TweakerCache cache-clean -FiveMPath $root
        Assert ($cleaned.removedFromActiveCacheBytes -eq 15 -and $cleaned.freedBytes -eq 0) 'Quarantine must not claim free disk space'
        Assert (-not (Test-Path (Join-Path $root 'data\server-cache'))) 'Active server cache removed'
        Assert-Preserved $root
        $again = Invoke-TweakerCache cache-clean -FiveMPath $root
        Assert ($again.status -eq 'unchanged') 'Empty cache is a no-op'
        $info = Invoke-TweakerCache cache-info -FiveMPath $root
        Assert ($info.totalBytes -eq 0 -and $info.backups[0].status -eq 'cleaned') 'Backup discovery and current preview'
        $null = New-Item -ItemType Directory -Path (Join-Path $root 'data\server-cache')
        Expect-Error { Invoke-TweakerCache cache-restore -FiveMPath $root -BackupId $cleaned.backupId } 'cache_restore_conflict'
        Assert (-not (Test-Path (Join-Path $root 'data\cache\browser'))) 'Restore preflight prevents partial mutation'
        [IO.Directory]::Delete((Join-Path $root 'data\server-cache'), $false)
        $null = Invoke-TweakerCache cache-restore -FiveMPath $root -BackupId $cleaned.backupId
        Assert ([IO.File]::ReadAllText((Join-Path $root 'data\server-cache\file.bin')) -eq '1234567') 'Restore original contents'
        Assert-Preserved $root
        $null = Invoke-TweakerCache cache-restore -FiveMPath $root -BackupId $cleaned.backupId
        $cleaned = Invoke-TweakerCache cache-clean -FiveMPath $root
        Expect-Error { Invoke-TweakerCache cache-purge -FiveMPath $root -BackupId $cleaned.backupId } 'explicit_purge_confirmation_required'
        $purged = Invoke-TweakerCache cache-purge -FiveMPath $root -BackupId $cleaned.backupId -ConfirmPurge
        Assert ($purged.freedBytes -eq 15) 'Purge reports logical bytes actually removed'
        Expect-Error { Invoke-TweakerCache cache-restore -FiveMPath $root -BackupId $cleaned.backupId } 'cache_backup_purged'
        $again = Invoke-TweakerCache cache-purge -FiveMPath $root -BackupId $cleaned.backupId -ConfirmPurge
        Assert ($again.freedBytes -eq 0) 'Repeated purge does not double count'
        Assert-Preserved $root
        Expect-Error { Invoke-TweakerCache cache-restore -FiveMPath $root -BackupId '..\outside' } 'invalid_backup_id'

        # Interrupted clean has a journal before any move and can be restored.
        $partial = New-Fixture 'partial'
        $script:moveCount = 0; $script:failMoveAt = 2
        Expect-Error { Invoke-TweakerCache cache-clean -FiveMPath $partial } 'simulated_move_failure'
        $info = Invoke-TweakerCache cache-info -FiveMPath $partial
        Assert ($info.backups[0].status -eq 'pending') 'Interrupted clean is discoverable'
        Expect-Error { Invoke-TweakerCache cache-clean -FiveMPath $partial } 'pending_cache_operation'
        $script:failMoveAt = 0
        $null = Invoke-TweakerCache cache-restore -FiveMPath $partial -BackupId $info.backups[0].backupId
        Assert ((Invoke-TweakerCache cache-info -FiveMPath $partial).totalBytes -eq 15) 'Partial clean recovery'
        Assert-Preserved $partial

        # Flat files and hidden files inside cache are selected literally, too.
        $flatRoot = New-Fixture 'flat'
        $flatFile = Join-Path $flatRoot 'data\cache\[temp].bin'
        [IO.File]::WriteAllText($flatFile, '1234')
        [IO.File]::SetAttributes($flatFile, [IO.FileAttributes]::Hidden)
        $flatClean = Invoke-TweakerCache cache-clean -FiveMPath $flatRoot
        Assert ($flatClean.removedFromActiveCacheBytes -eq 19 -and -not (Test-Path -LiteralPath $flatFile)) 'Literal hidden-file cleanup'
        $null = Invoke-TweakerCache cache-restore -FiveMPath $flatRoot -BackupId $flatClean.backupId
        Assert ([IO.File]::ReadAllText($flatFile) -eq '1234') 'Literal filename restored'
        Assert-Preserved $flatRoot

        # Link traversal is rejected; the destination file must survive.
        $linked = New-Fixture 'linked'
        $outside = Join-Path $base 'outside'
        $null = New-Item -ItemType Directory -Path $outside
        [IO.File]::WriteAllText((Join-Path $outside 'precious.txt'), 'KEEP')
        $junction = Join-Path $linked 'data\server-cache\escape'
        $physicalLink = $true
        try { $null = New-Item -ItemType Junction -Path $junction -Target $outside -ErrorAction Stop }
        catch {
            $physicalLink = $false
            $null = New-Item -ItemType Directory -Path $junction -Force
            $script:simulateLinkPath = $junction
            Write-Output 'NOTE: physical junction creation denied by environment; testing reparse-point rejection with simulated metadata'
        }
        Expect-Error { Invoke-TweakerCache cache-info -FiveMPath $linked } 'cache_link_not_allowed'
        Expect-Error { Invoke-TweakerCache cache-clean -FiveMPath $linked } 'cache_link_not_allowed'
        Assert ([IO.File]::ReadAllText((Join-Path $outside 'precious.txt')) -eq 'KEEP') 'Link destination untouched'
        $script:simulateLinkPath = ''
        [IO.Directory]::Delete($junction, $false); $junction = $null

        # A manipulated manifest cannot name game data or escape the whitelist.
        $badRoot = New-Fixture 'bad-manifest'
        $badClean = Invoke-TweakerCache cache-clean -FiveMPath $badRoot
        $manifest = Join-Path $badRoot ('.tweaker-cache-backups\' + $badClean.backupId + '\manifest.json')
        $bad = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json
        $bad.entries[0].relative = 'data\game-storage'
        Save-Journal $bad $manifest
        Expect-Error { Invoke-TweakerCache cache-purge -FiveMPath $badRoot -BackupId $badClean.backupId -ConfirmPurge } 'invalid_cache_manifest_path'
        Assert-Preserved $badRoot
        Write-Output 'PASS: cache preview, game guard, quarantine, restore, purge, exact byte counts, partial failure, conflicts, preservation, junction and manifest safety'
    } finally {
        if ($junction -and (Test-Path -LiteralPath $junction)) { [IO.Directory]::Delete($junction, $false) }
        $absolute = [IO.Path]::GetFullPath($base)
        $parent = $testParent + [IO.Path]::DirectorySeparatorChar
        if (-not $absolute.StartsWith($parent, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe test cleanup path' }
        if (Test-Path -LiteralPath $absolute) { Remove-Item -LiteralPath $absolute -Recurse -Force }
    }
}
