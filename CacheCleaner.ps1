# FiveM utility: quarantine first; permanent purge is a separate explicit action.
function Assert-CachePath([string]$Path, [string]$Root) {
    $full = [IO.Path]::GetFullPath($Path).TrimEnd('\')
    $base = [IO.Path]::GetFullPath($Root).TrimEnd('\')
    if ($full -ne $base -and -not $full.StartsWith($base + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'unsafe_cache_path' }
    # Check every existing ancestor, including the selected installation itself.
    $current = $full
    while ($current) {
        if (Test-Path -LiteralPath $current) {
            $item = Get-Item -LiteralPath $current -Force
            if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'cache_link_not_allowed' }
        }
        $parent = [IO.Path]::GetDirectoryName($current)
        if ($parent -eq $current) { break }
        $current = $parent
    }
    return $full
}

function Get-CacheTree([string]$Path, [string]$Root) {
    $safe = Assert-CachePath $Path $Root
    if (-not (Test-Path -LiteralPath $safe)) { return }
    $item = Get-Item -LiteralPath $safe -Force
    $item
    if ($item.PSIsContainer) {
        foreach ($child in @(Get-ChildItem -LiteralPath $safe -Force)) { Get-CacheTree $child.FullName $Root }
    }
}

function Assert-FiveMClosed {
    if (@(Get-Process | Where-Object { $_.ProcessName -match '^(FiveM($|[_ -])|GTA5($|_))' }).Count -gt 0) { throw 'close_fivem_first' }
}

function Resolve-FiveMRoot([string]$FiveMPath) {
    if (-not $FiveMPath) { $FiveMPath = Join-Path $env:LOCALAPPDATA 'FiveM\FiveM.app' }
    if ($FiveMPath -notmatch '^[a-zA-Z]:[\\/]') { throw 'local_absolute_fivem_path_required' }
    $root = Assert-CachePath $FiveMPath $FiveMPath
    if (-not (Test-Path -LiteralPath $root -PathType Container)) { throw 'fivem_not_found' }
    $null = Assert-CachePath (Join-Path $root 'CitizenFX.ini') $root
    $null = Assert-CachePath (Join-Path $root 'data') $root
    if (-not (Test-Path -LiteralPath (Join-Path $root 'CitizenFX.ini') -PathType Leaf) -or
        -not (Test-Path -LiteralPath (Join-Path $root 'data') -PathType Container)) { throw 'invalid_fivem_installation' }
    return $root
}

function Get-CacheCandidates([string]$Root) {
    $cache = Assert-CachePath (Join-Path $Root 'data\cache') $Root
    if (Test-Path -LiteralPath $cache) {
        if (-not (Test-Path -LiteralPath $cache -PathType Container)) { throw 'invalid_cache_directory' }
        foreach ($child in @(Get-ChildItem -LiteralPath $cache -Force)) {
            # Retain legacy game assets to avoid unnecessary large game downloads.
            if ($child.Name -ne 'game') { $child.FullName }
        }
    }
    foreach ($name in @('server-cache','server-cache-priv')) {
        $path = Assert-CachePath (Join-Path $Root ('data\' + $name)) $Root
        if (Test-Path -LiteralPath $path) {
            if (-not (Test-Path -LiteralPath $path -PathType Container)) { throw 'invalid_cache_directory' }
            $path
        }
    }
}

function Assert-CacheRelative([string]$Relative) {
    if ($Relative -match '^data\\server-cache(-priv)?$') { return }
    if ($Relative -match '^data\\cache\\([^\\/:]+)$') {
        if ($Matches[1] -notin @('.','..','game') -and $Matches[1].TrimEnd(' .') -eq $Matches[1]) { return }
    }
    throw 'invalid_cache_manifest_path'
}

function Get-CachePlan([string]$Root) {
    @(@(Get-CacheCandidates $Root) | ForEach-Object {
        $candidate = $_
        $tree = @(Get-CacheTree $candidate $Root)
        $files = @($tree | Where-Object { -not $_.PSIsContainer })
        $bytes = [long]0
        foreach ($file in $files) { $bytes += $file.Length }
        $relative = $candidate.Substring($Root.Length + 1)
        Assert-CacheRelative $relative
        [pscustomobject]@{relative=$relative;bytes=$bytes;fileCount=$files.Count}
    })
}

function Read-CacheManifest([string]$Root, [string]$BackupId) {
    if ($BackupId -notmatch '^[a-f0-9]{32}$') { throw 'invalid_backup_id' }
    $folder = Assert-CachePath (Join-Path $Root ('.tweaker-cache-backups\' + $BackupId)) $Root
    $path = Assert-CachePath (Join-Path $folder 'manifest.json') $Root
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw 'cache_backup_not_found' }
    $state = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    if ($state.version -ne 1 -or $state.id -ne $BackupId -or $state.root -ne $Root -or
        $state.status -notin @('pending','cleaned','restored','purging','purged')) { throw 'invalid_cache_manifest' }
    $seen = @{}
    foreach ($entry in @($state.entries)) {
        Assert-CacheRelative $entry.relative
        if ($seen.ContainsKey($entry.relative)) { throw 'invalid_cache_manifest' }
        $seen[$entry.relative] = $true
    }
    return $state
}

function Move-CacheEntry([string]$Source, [string]$Destination, [string]$Root) {
    $null = Assert-CachePath $Source $Root
    $null = Assert-CachePath $Destination $Root
    if (Test-Path -LiteralPath $Destination) { throw 'cache_restore_conflict' }
    $parent = [IO.Path]::GetDirectoryName($Destination)
    $null = New-Item -ItemType Directory -Path $parent -Force
    # Same-volume rename; no recursive shell move and no overwrite.
    if (Test-Path -LiteralPath $Source -PathType Container) { [IO.Directory]::Move($Source, $Destination) }
    else { [IO.File]::Move($Source, $Destination) }
}

function Invoke-TweakerCache {
    [CmdletBinding(SupportsShouldProcess=$true)]
    param(
        [Parameter(Mandatory)][ValidateSet('cache-info','cache-clean','cache-restore','cache-purge')][string]$Action,
        [string]$FiveMPath, [string]$BackupId, [switch]$ConfirmPurge
    )
    $root = Resolve-FiveMRoot $FiveMPath
    $backupRoot = Assert-CachePath (Join-Path $root '.tweaker-cache-backups') $root
    if ($Action -eq 'cache-info') {
        $plan = @(Get-CachePlan $root)
        $backups = @()
        if (Test-Path -LiteralPath $backupRoot) {
            $backups = @(Get-ChildItem -LiteralPath $backupRoot -Directory -Force | ForEach-Object {
                $state = Read-CacheManifest $root $_.Name
                [pscustomobject]@{backupId=$state.id;status=$state.status;createdUtc=$state.createdUtc}
            })
        }
        $bytes = [long]0
        foreach ($entry in $plan) { $bytes += $entry.bytes }
        return [pscustomobject]@{ok=$true;root=$root;candidates=$plan;totalBytes=$bytes;backups=$backups;requiresClosedGame=$true}
    }
    if ($Action -eq 'cache-purge' -and -not $ConfirmPurge) { throw 'explicit_purge_confirmation_required' }
    if (-not $PSCmdlet.ShouldProcess($root, $Action)) { return }
    Assert-FiveMClosed
    $null = New-Item -ItemType Directory -Path $backupRoot -Force
    $lockPath = Assert-CachePath (Join-Path $backupRoot 'operation.lock') $root
    $lock = [IO.File]::Open($lockPath, 'OpenOrCreate', 'ReadWrite', 'None')
    try {
        if ($Action -eq 'cache-clean') {
            # Finish or restore an interrupted clean before starting another.
            foreach ($directory in @(Get-ChildItem -LiteralPath $backupRoot -Directory -Force)) {
                $old = Read-CacheManifest $root $directory.Name
                if ($old.status -in @('pending','purging')) { throw 'pending_cache_operation' }
            }
            $plan = @(Get-CachePlan $root)
            if ($plan.Count -eq 0) { return [pscustomobject]@{ok=$true;status='unchanged';freedBytes=0;removedFromActiveCacheBytes=0;backupId=$null} }
            $BackupId = [guid]::NewGuid().ToString('N')
            $folder = Assert-CachePath (Join-Path $backupRoot $BackupId) $root
            $null = New-Item -ItemType Directory -Path $folder
            $state = [pscustomobject]@{version=1;id=$BackupId;root=$root;status='pending';createdUtc=[DateTime]::UtcNow.ToString('o');entries=$plan}
            $manifest = Join-Path $folder 'manifest.json'
            try { Save-Journal $state $manifest }
            catch {
                # No cache has moved yet. Remove only our empty run directory.
                if (-not (Test-Path -LiteralPath $manifest)) { [IO.Directory]::Delete($folder, $false) }
                throw
            }
            $bytes = [long]0
            foreach ($entry in $plan) {
                Assert-FiveMClosed
                $source = Join-Path $root $entry.relative
                $null = @(Get-CacheTree $source $root)
                Move-CacheEntry $source (Join-Path $folder ('payload\' + $entry.relative)) $root
                $bytes += $entry.bytes
            }
            $state.status = 'cleaned'
            Save-Journal $state $manifest
            return [pscustomobject]@{ok=$true;status='cleaned';backupId=$BackupId;removedFromActiveCacheBytes=$bytes;freedBytes=0}
        }
        $state = Read-CacheManifest $root $BackupId
        $folder = Join-Path $backupRoot $BackupId
        $manifest = Join-Path $folder 'manifest.json'
        if ($Action -eq 'cache-restore') {
            if ($state.status -in @('purging','purged')) { throw 'cache_backup_purged' }
            if ($state.status -eq 'restored') { return [pscustomobject]@{ok=$true;status='restored';backupId=$BackupId} }
            # Preflight every path before the first restore. Never overwrite regenerated data.
            foreach ($entry in $state.entries) {
                $original = Assert-CachePath (Join-Path $root $entry.relative) $root
                $saved = Assert-CachePath (Join-Path $folder ('payload\' + $entry.relative)) $root
                $null = @(Get-CacheTree $saved $root)
                if (Test-Path -LiteralPath $saved) {
                    if (Test-Path -LiteralPath $original) { throw 'cache_restore_conflict' }
                } elseif (-not (Test-Path -LiteralPath $original)) { throw 'cache_backup_incomplete' }
            }
            foreach ($entry in $state.entries) {
                Assert-FiveMClosed
                $saved = Join-Path $folder ('payload\' + $entry.relative)
                if (Test-Path -LiteralPath $saved) { Move-CacheEntry $saved (Join-Path $root $entry.relative) $root }
            }
            $state.status = 'restored'
            Save-Journal $state $manifest
            return [pscustomobject]@{ok=$true;status='restored';backupId=$BackupId}
        }
        if ($state.status -eq 'purged') { return [pscustomobject]@{ok=$true;status='purged';backupId=$BackupId;freedBytes=0} }
        if ($state.status -eq 'restored') { throw 'cache_backup_already_restored' }
        # Preflight all whitelisted trees; do not traverse or delete any other payload.
        $trees = @($state.entries | ForEach-Object { Get-CacheTree (Join-Path $folder ('payload\' + $_.relative)) $root })
        $state.status = 'purging'
        Save-Journal $state $manifest
        $bytes = [long]0
        foreach ($item in @($trees | Sort-Object { $_.FullName.Length } -Descending)) {
            Assert-FiveMClosed
            $safe = Assert-CachePath $item.FullName $root
            if ($item.PSIsContainer) { [IO.Directory]::Delete($safe, $false) }
            elseif (Test-Path -LiteralPath $safe -PathType Leaf) {
                $length = (Get-Item -LiteralPath $safe -Force).Length
                [IO.File]::Delete($safe)
                $bytes += $length
            }
        }
        $state.status = 'purged'
        Save-Journal $state $manifest
        # Logical bytes removed in this call, not a guarantee of physical disk-space delta.
        [pscustomobject]@{ok=$true;status='purged';backupId=$BackupId;freedBytes=$bytes}
    } finally { $lock.Dispose() }
}
