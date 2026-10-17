# Shared recovery catalog. Domain journals remain authoritative for actual restore.
$script:BackupDirectory = Join-Path $env:LOCALAPPDATA 'Tweaker\Backups'
$script:PerformanceStateDirectory = Join-Path $env:LOCALAPPDATA 'Tweaker\Performance'

function Assert-BackupStore {
    $current = [IO.Path]::GetFullPath($script:BackupDirectory)
    while ($current) {
        if ((Test-Path -LiteralPath $current) -and ((Get-Item -LiteralPath $current -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'backup_link_not_allowed' }
        $parent = [IO.Path]::GetDirectoryName($current)
        if ($parent -eq $current) { break }
        $current = $parent
    }
}

function Get-RecoveryPayload($State) {
    if ($State.id -in @((Get-TweakerCatalog).id)) {
        $created = ([DateTimeOffset]$State.createdUtc).ToUniversalTime().ToString('o')
        $payload = [ordered]@{version=[int]$State.version;kind='tweak';id=[string]$State.id;createdUtc=$created}
        if ($State.id.StartsWith('keyboard.')) {
            $payload.entries = @($State.entries | Sort-Object field | ForEach-Object {
                [pscustomobject]@{field=[string]$_.field;before=[int]$_.before;target=[int]$_.target}
            })
        } elseif ($State.id -eq 'windows.power.high') { $payload.before = [string]$State.before }
        else {
            $payload.before = @($State.before | Sort-Object pid,started | ForEach-Object {
                [pscustomobject]@{pid=[int]$_.pid;started=[string]$_.started;priority=[string]$_.priority}
            })
        }
        return [pscustomobject]$payload
    }
    if ($State.PSObject.Properties.Name -contains 'root') {
        return [pscustomobject][ordered]@{version=[int]$State.version;kind='cache';id=[string]$State.id;root=[string]$State.root
            createdUtc=([DateTimeOffset]$State.createdUtc).ToUniversalTime().ToString('o')
            entries=@($State.entries | Sort-Object relative | ForEach-Object {
                [pscustomobject]@{relative=[string]$_.relative;bytes=[long]$_.bytes;fileCount=[int]$_.fileCount}
            })}
    }
    return $null
}

function Get-RecoveryHash([string]$Text) {
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($Text)))).Replace('-','').ToLowerInvariant() }
    finally { $sha.Dispose() }
}

function New-RecoveryRecord($State, [string]$Source) {
    # SafeMode has no id, and its growing evidence is not an unsafe rollback target.
    if ($State.PSObject.Properties.Name -contains 'changes' -and $State.PSObject.Properties.Name -contains 'enabled') {
        if (@($State.changes).Count -eq 0) { return $null }
        $payload = [pscustomobject][ordered]@{version=1;kind='services';id='safemode';changes=@($State.changes | Sort-Object name | ForEach-Object {
            [pscustomobject]@{name=[string]$_.name;originalStartMode=[string]$_.originalStartMode;originalState=[string]$_.originalState;originalDelayedAutoStart=[bool]$_.originalDelayedAutoStart}
        })}
        $created = ([DateTimeOffset]$State.changes[0].recordedUtc).ToUniversalTime().ToString('o')
    } else {
        $payload = Get-RecoveryPayload $State
        if ($null -eq $payload) { return $null }
        $created = $payload.createdUtc
    }
    $sourcePath = [IO.Path]::GetFullPath($Source)
    $fingerprint = Get-RecoveryHash ($payload | ConvertTo-Json -Depth 10 -Compress)
    $id = (Get-RecoveryHash ($sourcePath.ToUpperInvariant() + '|' + $fingerprint)).Substring(0,32)
    [pscustomobject]@{version=1;backupId=$id;createdUtc=$created;kind=$payload.kind;source=$sourcePath;fingerprint=$fingerprint;payload=$payload}
}

function Register-TweakerBackup($State, [string]$Source) {
    $record = New-RecoveryRecord $State $Source
    if ($null -eq $record) { return }
    Assert-BackupStore
    $records = Join-Path $script:BackupDirectory 'records'
    if ((Test-Path -LiteralPath $records) -and ((Get-Item -LiteralPath $records -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'backup_link_not_allowed' }
    $null = New-Item -ItemType Directory -Path $records -Force
    $path = Join-Path $records ($record.backupId + '.json')
    if (Test-Path -LiteralPath $path) {
        $existing = Read-RecoveryRecord $path
        if ($existing.fingerprint -ne $record.fingerprint -or $existing.source -ne $record.source) { throw 'backup_record_collision' }
        return
    }
    # Archive immutable originals BEFORE updating the mutable domain journal.
    Write-AtomicJson $record $path
}

function Read-RecoveryRecord([string]$Path) {
    if (((Get-Item -LiteralPath $Path -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'backup_link_not_allowed' }
    $record = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    $canonical = if ($record.kind -eq 'services') { $record.payload } else { Get-RecoveryPayload $record.payload }
    if ($record.version -ne 1 -or $record.kind -ne $canonical.kind -or $record.backupId -notmatch '^[a-f0-9]{32}$' -or
        [IO.Path]::GetFileNameWithoutExtension($Path) -ne $record.backupId -or
        (Get-RecoveryHash ($canonical | ConvertTo-Json -Depth 10 -Compress)) -ne $record.fingerprint -or
        (Get-RecoveryHash ($record.source.ToUpperInvariant() + '|' + $record.fingerprint)).Substring(0,32) -ne $record.backupId) { throw 'invalid_backup_record' }
    $record.payload=$canonical
    $record.createdUtc=([DateTimeOffset]$record.createdUtc).ToUniversalTime().ToString('o')
    return $record
}

function Read-RecoverySource($Record) {
    switch ($Record.kind) {
        'tweak' {
            if ($Record.payload.id -notin @((Get-TweakerCatalog).id)) { throw 'invalid_tweak_id' }
            $expected = Join-Path $script:PerformanceStateDirectory ($Record.payload.id + '.json')
            if ([IO.Path]::GetFullPath($expected) -ne $Record.source) { throw 'invalid_backup_source' }
            $null = Assert-CachePath $Record.source $script:PerformanceStateDirectory
        }
        'cache' {
            $root = Resolve-FiveMRoot $Record.payload.root
            $expected = Join-Path $root ('.tweaker-cache-backups\' + $Record.payload.id + '\manifest.json')
            if ([IO.Path]::GetFullPath($expected) -ne $Record.source) { throw 'invalid_backup_source' }
            return Read-CacheManifest $root $Record.payload.id
        }
        'services' {
            Assert-SafeModePaths
            if ((Join-Path $script:SafeModeDirectory 'state.json') -ne $Record.source) { throw 'invalid_backup_source' }
            return Read-SafeModeState
        }
        default { throw 'invalid_backup_kind' }
    }
    if (-not (Test-Path -LiteralPath $Record.source -PathType Leaf)) { throw 'backup_source_missing' }
    return Get-Content -LiteralPath $Record.source -Raw | ConvertFrom-Json
}

function Assert-ExpectedRecovery($State, [string]$Source, [string]$ExpectedRecoveryId) {
    if ($ExpectedRecoveryId -and ($null -eq $State -or (New-RecoveryRecord $State $Source).backupId -ne $ExpectedRecoveryId)) { throw 'backup_superseded' }
}

function Test-RecoveryReady($Record) {
    $state = Read-RecoverySource $Record
    if ($Record.kind -eq 'services') { return 'service_evidence_only' }
    Assert-ExpectedRecovery $state $Record.source $Record.backupId
    if ($state.status -eq 'restored') { return 'already_restored' }
    if ($Record.kind -eq 'cache') {
        if ($state.status -in @('purging','purged')) { return 'cache_backup_purged' }
        Assert-FiveMClosed
        foreach ($entry in $state.entries) {
            $original = Assert-CachePath (Join-Path $state.root $entry.relative) $state.root
            $saved = Assert-CachePath (Join-Path ([IO.Path]::GetDirectoryName($Record.source)) ('payload\' + $entry.relative)) $state.root
            $null = @(Get-CacheTree $saved $state.root)
            if (Test-Path -LiteralPath $saved) {
                if (Test-Path -LiteralPath $original) { return 'cache_restore_conflict' }
            } elseif (-not (Test-Path -LiteralPath $original)) { return 'cache_backup_incomplete' }
        }
        return ''
    }
    if ($state.version -ne 1 -or $state.status -notin @('pending','applied')) { throw 'invalid_backup' }
    if ($state.id -eq 'windows.power.high') {
        $null = [guid]$state.before
        $current = Get-PowerState
        if ($current -ne $state.before -and $current -ne $script:HighPerformance) { return 'external_change_detected' }
    } elseif ($state.id.StartsWith('keyboard.')) {
        $fields = @(Get-KeyboardFields $state.id)
        if (@($state.entries).Count -ne $fields.Count) { throw 'invalid_backup' }
        foreach ($field in $fields) {
            $entries = @($state.entries | Where-Object field -eq $field)
            if ($entries.Count -ne 1) { throw 'invalid_backup' }
            $entry=$entries[0]
            Assert-KeyboardValue $field $entry.before
            Assert-KeyboardValue $field $entry.target
            if ($entry.target -ne (Get-KeyboardTarget $field $entry.before)) { throw 'invalid_backup' }
            if ($entry.before -eq $entry.target) { continue }
            $current = Get-KeyboardValue $field
            if ($current -ne $entry.before -and $current -ne $entry.target) { return 'external_change_detected' }
        }
    } else {
        $running = @(Get-FiveMProcesses)
        foreach ($entry in $state.before) {
            $match = @($running | Where-Object { $_.pid -eq $entry.pid -and $_.started -eq $entry.started })
            if ($match.Count -and $match[0].priority -notin @('High',$entry.priority)) { return 'external_change_detected' }
        }
    }
    return ''
}

function Get-RecoveryInventory([string]$FiveMPath) {
    Assert-BackupStore
    $records=@{}; $warnings=@()
    $directory = Join-Path $script:BackupDirectory 'records'
    if (Test-Path -LiteralPath $directory) {
        if (((Get-Item -LiteralPath $directory -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'backup_link_not_allowed' }
        foreach ($file in @(Get-ChildItem -LiteralPath $directory -File -Filter '*.json')) {
            try { $record=Read-RecoveryRecord $file.FullName; $records[$record.backupId]=$record }
            catch { $warnings += [pscustomobject]@{file=$file.Name;error=$_.Exception.Message} }
        }
    }
    # Read-only discovery keeps journals created by earlier versions recoverable.
    $sources = @((Get-TweakerCatalog).id | ForEach-Object { Join-Path $script:PerformanceStateDirectory ($_ + '.json') })
    $sources += Join-Path $script:SafeModeDirectory 'state.json'
    $candidate = if ($FiveMPath) {$FiveMPath} else {Join-Path $env:LOCALAPPDATA 'FiveM\FiveM.app'}
    if (Test-Path -LiteralPath $candidate) {
        try {
            $root = Resolve-FiveMRoot $candidate
            $backupRoot = Assert-CachePath (Join-Path $root '.tweaker-cache-backups') $root
            if (Test-Path -LiteralPath $backupRoot) {
                foreach ($folder in @(Get-ChildItem -LiteralPath $backupRoot -Directory -Force)) {
                    $null=Read-CacheManifest $root $folder.Name
                    $sources += Join-Path $folder.FullName 'manifest.json'
                }
            }
        } catch { $warnings += [pscustomobject]@{file='cache';error=$_.Exception.Message} }
    }
    foreach ($source in $sources) {
        if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { continue }
        try {
            $null=Assert-CachePath $source ([IO.Path]::GetDirectoryName($source))
            $state=Get-Content -LiteralPath $source -Raw | ConvertFrom-Json
            $record=New-RecoveryRecord $state $source
            if ($null -ne $record) { $records[$record.backupId]=$record }
        } catch { $warnings += [pscustomobject]@{file=[IO.Path]::GetFileName($source);error=$_.Exception.Message} }
    }
    $items = @($records.Values | Sort-Object createdUtc -Descending | ForEach-Object {
        $record=$_; $reason=''; $status='unknown'
        try { $sourceState=Read-RecoverySource $record; $status=if ($record.kind -eq 'services') {'evidence'} else {$sourceState.status}; $reason=Test-RecoveryReady $record }
        catch { $reason=$_.Exception.Message; if ($reason -eq 'backup_superseded') {$status='superseded'} }
        [pscustomobject]@{backupId=$record.backupId;kind=$record.kind;tweakId=$record.payload.id;createdUtc=$record.createdUtc
            status=$status;canRestore=($reason -eq '');reason=$reason;record=$record}
    })
    [pscustomobject]@{items=$items;warnings=$warnings}
}

function Restore-RecoveryRecord($Record) {
    $reason = Test-RecoveryReady $Record
    if ($reason) { throw $reason }
    if ($Record.kind -eq 'tweak') {
        return Invoke-TweakerPerformance -Action restore -Id $Record.payload.id -StateDirectory $script:PerformanceStateDirectory -ExpectedRecoveryId $Record.backupId -Confirm:$false
    }
    if ($Record.kind -eq 'cache') {
        return Invoke-TweakerCache -Action cache-restore -FiveMPath $Record.payload.root -BackupId $Record.payload.id -ExpectedRecoveryId $Record.backupId -Confirm:$false
    }
    throw 'service_evidence_only'
}

function Invoke-TweakerBackup {
    [CmdletBinding(SupportsShouldProcess=$true)]
    param([Parameter(Mandatory)][ValidateSet('backup-list','backup-preview','backup-export','backup-restore','backup-restore-all')][string]$Action,
        [string]$BackupId, [string]$FiveMPath)
    if ($Action -in @('backup-preview','backup-export','backup-restore') -and $BackupId -notmatch '^[a-f0-9]{32}$') { throw 'invalid_backup_id' }
    $inventory = Get-RecoveryInventory $FiveMPath
    $items = @($inventory.items)
    if ($Action -in @('backup-preview','backup-export','backup-restore')) {
        $items=@($items | Where-Object backupId -eq $BackupId)
        if ($items.Count -ne 1) { throw 'backup_not_found' }
    }
    $public = @($items | Select-Object backupId,kind,tweakId,createdUtc,status,canRestore,reason)
    if ($Action -eq 'backup-list') { return [pscustomobject]@{ok=$true;backups=$public;warnings=$inventory.warnings} }
    if ($Action -eq 'backup-preview') { return [pscustomobject]@{ok=$true;backup=$public[0];snapshot=$items[0].record.payload;warnings=$inventory.warnings} }
    if ($Action -eq 'backup-export') { return [pscustomobject]@{ok=$true;format='tweaker-recovery-export-v1';record=$items[0].record;importSupported=$false} }
    if (-not $PSCmdlet.ShouldProcess('Tweaker recovery backups', $Action)) { return }
    $null = New-Item -ItemType Directory -Path $script:BackupDirectory -Force
    $lockPath=Join-Path $script:BackupDirectory 'restore.lock'
    $null=Assert-CachePath $lockPath $script:BackupDirectory
    $lock=[IO.File]::Open($lockPath,'OpenOrCreate','ReadWrite','None')
    try {
        $results=@()
        foreach ($item in $items) {
            $terminal = $item.reason -in @('already_restored','backup_superseded','service_evidence_only','cache_backup_purged')
            if ($Action -eq 'backup-restore-all' -and $terminal) {
                $results += [pscustomobject]@{backupId=$item.backupId;status='skipped';reason=$item.reason}
                continue
            }
            try {
                $null = Restore-RecoveryRecord $item.record
                $results += [pscustomobject]@{backupId=$item.backupId;status='restored';reason=''}
            } catch { $results += [pscustomobject]@{backupId=$item.backupId;status='failed';reason=$_.Exception.Message} }
        }
        $failed=@($results | Where-Object status -eq 'failed').Count
        $result=[pscustomobject]@{ok=($failed -eq 0 -and @($inventory.warnings).Count -eq 0);status=$(if ($failed -or @($inventory.warnings).Count) {'partial'} else {'completed'})
            results=$results;warnings=$inventory.warnings;restartRequired=$false}
        if (-not $result.ok) { $result | Add-Member -NotePropertyName error -NotePropertyValue 'restore_incomplete' }
        return $result
    } finally { $lock.Dispose() }
}
