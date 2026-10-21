# Allowlisted Windows settings with exact original-value recovery.
. (Join-Path $PSScriptRoot 'OptimizationNative.ps1')
function Get-OptimizationCatalog {
    Get-ExtendedOptimizationCatalog
    @(
        [pscustomobject]@{id='windows.capture.off';category='performance';scope='user';risk='medium';bulkSafe=$false;requiresAdmin=$true;restart=$true
            name=@{de='Game-DVR-Aufzeichnung deaktivieren';en='Disable Game DVR recording';it='Disattiva registrazione Game DVR'}
            description=@{de='Deaktiviert Windows-Spielaufnahmen einschliesslich Hintergrundclips. Kann Aufnahme-Last vermeiden, wenn diese vorher aktiv war. Manuelle Game-Bar-Aufnahmen sind ebenfalls aus. Bestehende Videos bleiben erhalten. Neustart erforderlich; kein garantierter FPS-Gewinn.';en='Disables Windows game capture including background clips. Can avoid recording overhead when capture was active. Manual Game Bar recording is also disabled. Existing videos are preserved. Restart required; no guaranteed FPS gain.';it='Disattiva le acquisizioni Windows, incluse le clip in background e le registrazioni manuali di Game Bar. Puo eliminare il carico delle registrazioni prima attive. Conserva i video esistenti. Riavvio necessario; nessun aumento FPS garantito.'}}
        [pscustomobject]@{id='windows.gamemode.on';category='performance';scope='user';risk='low';bulkSafe=$false;requiresAdmin=$true;restart=$true
            name=@{de='Windows-Spielmodus aktivieren';en='Enable Windows Game Mode';it='Attiva Modalita gioco Windows'}
            description=@{de='Aktiviert den Windows-Spielmodus fuer erkannte Spiele. Kann unter Hintergrundlast helfen; ist auf vielen PCs bereits aktiv. Neustart erforderlich. Kein garantierter FPS-Gewinn.';en='Enables Windows Game Mode for recognized games. May help under background load; already enabled on many PCs. Restart required. No guaranteed FPS gain.';it='Attiva Modalita gioco per i giochi riconosciuti. Puo aiutare con carichi in background; spesso e gia attiva. Riavvio necessario. Nessun aumento FPS garantito.'}}
        [pscustomobject]@{id='windows.audio.ducking.off';category='performance';scope='user';risk='low';bulkSafe=$false;requiresAdmin=$true;restart=$true
            name=@{de='Lautstaerkeabsenkung bei Sprachchats aus';en='Disable communications audio ducking';it='Disattiva attenuazione audio nelle chiamate'}
            description=@{de='Verhindert, dass Windows andere Audioquellen bei erkannten Anrufen automatisch leiser stellt. Audio-Komfort, kein FPS- oder Latenz-Tweak. Eigene Lautstaerkeregeln von Discord bleiben separat. Neustart erforderlich.';en='Stops Windows automatically lowering other audio during detected calls. Audio convenience, not an FPS or latency tweak. Discord attenuation settings are separate. Restart required.';it='Impedisce a Windows di abbassare altri suoni durante le chiamate rilevate. Comodita audio, senza benefici FPS o latenza. Le impostazioni Discord sono separate. Riavvio necessario.'}}
    )
}

function Get-OptimizationFields([string]$Id) {
    switch ($Id) {
        'windows.capture.off' { 'capture'; 'historicalCapture'; 'gameDvr' }
        'windows.gamemode.on' { 'gameMode' }
        'windows.audio.ducking.off' { 'ducking' }
        default {
            $entry=@($script:ExtendedOptimization.tweaks | Where-Object id -eq $Id)
            if ($entry.Count -ne 1) {throw 'invalid_tweak_id'}
            $entry[0].fields
        }
    }
}

function Get-OptimizationDefinition([string]$Field) {
    $result = switch ($Field) {
        'capture' { @{path='Software\Microsoft\Windows\CurrentVersion\GameDVR';name='AppCaptureEnabled';target=0;maximum=1} }
        'historicalCapture' { @{path='Software\Microsoft\Windows\CurrentVersion\GameDVR';name='HistoricalCaptureEnabled';target=0;maximum=1} }
        'gameDvr' { @{path='System\GameConfigStore';name='GameDVR_Enabled';target=0;maximum=1} }
        'gameMode' { @{path='Software\Microsoft\GameBar';name='AutoGameModeEnabled';target=1;maximum=1} }
        'ducking' { @{path='Software\Microsoft\Multimedia\Audio';name='UserDuckingPreference';target=3;maximum=3} }
        default { Get-ExtendedOptimizationDefinition $Field }
    }
    if (-not $result.ContainsKey('adapter')) {$result.adapter='registry';$result.hive='CurrentUser';$result.kind='DWord'}
    return $result
}

function Assert-OptimizationPlatform {
    $platform = Get-SafeModePlatform
    if (-not $platform.supported) { throw 'unsupported_optimization_platform' }
}

function Assert-OptimizationValue([string]$Field, $Value) {
    $d=Get-OptimizationDefinition $Field
    if ($null -eq $Value -or $Value.exists -isnot [bool]) {throw 'invalid_optimization_backup'}
    if (-not $Value.exists) {
        if ($null -ne $Value.value -or $null -ne $Value.kind -or $d.adapter -notin @('registry','task')) {throw 'invalid_optimization_backup'}
        return
    }
    if ($Value.kind -cne $d.kind) {throw 'unsupported_optimization_value'}
    $valid=switch ($d.kind) {
        'DWord' {$Value.value -is [ValueType] -and $Value.value -isnot [bool] -and [decimal]$Value.value -ge 0 -and [decimal]$Value.value -le $d.maximum -and [decimal]$Value.value -eq [long]$Value.value}
        'String' {$Value.value -is [string] -and $Value.value.Length -le 1024 -and $Value.value -notmatch '[\x00-\x1f]'}
        'ServiceStart' {$Value.value -is [string] -and $Value.value -cmatch '^[234]\|[x01]$'}
        'Power' {$Value.value -is [string] -and $Value.value -cmatch '^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\|[0-9]{1,10}$' -and [decimal]$Value.value.Split('|')[1] -le 4294967295}
        {$_ -in @('Interfaces','Dns')} {Test-NetworkValue $d $Value.value}
        'QosSet' {$Value.value -in @('on','off')}
        'Hibernate' {$Value.value -is [string] -and $Value.value -cmatch '^[01]\|[x01]\|[x012]\|(x|[0-9]{1,3})$' -and ($Value.value.Split('|')[3] -eq 'x' -or [int]$Value.value.Split('|')[3] -le 100)}
        default {$false}
    }
    if (-not $valid) {throw 'unsupported_optimization_value'}
    if ($d.adapter -eq 'service' -and $d.part -eq 'running' -and $Value.value -notin @(0,1,2)) {throw 'unsupported_optimization_value'}
}

function Get-OptimizationValue([string]$Field) {
    $d=Get-OptimizationDefinition $Field
    try {$result=if ($d.adapter -eq 'registry') {Get-OptimizationRegistryValue $d} else {Get-OptimizationNativeValue $d}}
    catch {
        if ($_.Exception.Message -cmatch '^[a-z][a-z_]+$') {throw}
        throw 'optimization_state_unavailable'
    }
    Assert-OptimizationValue $Field $result
    return $result
}

function Get-OptimizationTarget([string]$Field,$Reference=$null) {
    $d=Get-OptimizationDefinition $Field
    if ($d.adapter -eq 'registry') {return [pscustomobject]@{exists=$true;kind=$d.kind;value=$d.target}}
    if ($null -eq $Reference) {$Reference=Get-OptimizationValue $Field}
    Get-OptimizationNativeTarget $d $Reference
}

function Test-OptimizationValueEqual($Left,$Right) {
    $Left.exists -eq $Right.exists -and $Left.kind -ceq $Right.kind -and $Left.value -eq $Right.value
}

function Set-OptimizationValue([string]$Field,$Value) {
    Assert-OptimizationValue $Field $Value
    $d=Get-OptimizationDefinition $Field
    if ($d.adapter -eq 'registry') {Set-OptimizationRegistryValue $d $Value}
    else {Set-OptimizationNativeValue $d $Value}
    if (-not (Test-OptimizationValueEqual (Get-OptimizationValue $Field) $Value)) {throw 'optimization_verification_failed'}
}

function Set-OptimizationTrackedValue($Entry,$Value,$State,[string]$Path) {
    try {Set-OptimizationValue $Entry.field $Value}
    catch {
        $failure=$_
        # Native Windows operations may consist of several API calls. Preserve
        # the observed partial state so normal recovery can recognize our write.
        try {
            $observed=Get-OptimizationValue $Entry.field
            Assert-OptimizationValue $Entry.field $observed
            if (Test-OptimizationIntermediate $Entry $observed) {
                $Entry | Add-Member -NotePropertyName interrupted -NotePropertyValue $observed -Force
                Save-Journal $State $Path
            }
        } catch { # Original journal is already durable even if this read/save fails.
        }
        throw $failure
    }
}

function Test-OptimizationIntermediate($Entry,$Value) {
    $d=Get-OptimizationDefinition $Entry.field
    # Per network card values: every card is either still original or already at the target.
    if ($Value.kind -in @('Interfaces','Dns')) {return Test-NetworkIntermediate $Entry $Value}
    # A single registry/task/power write is atomic. An unexpected third value
    # must remain a conflict, never become owned merely because a write failed.
    if ($d.adapter -ne 'hibernate' -or $Value.kind -ne 'Hibernate') {return $false}
    $before=$Entry.before.value.Split('|');$target=$Entry.target.value.Split('|');$now=$Value.value.Split('|')
    # powercfg can recreate a default full hiberfile before setting type/size.
    $now[0] -in @($before[0],$target[0]) -and $now[1] -in @($before[1],$target[1]) -and
        $now[2] -in @($before[2],$target[2],'2') -and $now[3] -in @($before[3],$target[3],'0')
}

function Test-OptimizationOwnedValue($Entry,$Current) {
    if ((Test-OptimizationValueEqual $Current $Entry.before) -or (Test-OptimizationValueEqual $Current $Entry.target)) {return $true}
    if ($Entry.PSObject.Properties['interrupted']) {
        Assert-OptimizationValue $Entry.field $Entry.interrupted
        return ((Test-OptimizationIntermediate $Entry $Entry.interrupted) -and (Test-OptimizationValueEqual $Current $Entry.interrupted))
    }
    return $false
}

function Test-TweakerOptimizationApplied([string]$Id) {
    Assert-OptimizationPlatform
    Assert-OptimizationAvailable $Id
    $applied=$true
    foreach ($field in @(Get-OptimizationFields $Id)) {
        $current=Get-OptimizationValue $field
        if (-not (Test-OptimizationValueEqual $current (Get-OptimizationTarget $field $current))) {$applied=$false}
    }
    return $applied
}

function Assert-OptimizationRestore($State) {
    if ($State.version -ne 1 -or $State.status -notin @('pending','applied','restored')) { throw 'invalid_optimization_backup' }
    $fields = @(Get-OptimizationFields $State.id)
    if (@($State.entries).Count -ne $fields.Count) { throw 'invalid_optimization_backup' }
    foreach ($field in $fields) {
        $entries = @($State.entries | Where-Object field -eq $field)
        if ($entries.Count -ne 1) { throw 'invalid_optimization_backup' }
        $entry = $entries[0]
        Assert-OptimizationValue $field $entry.before
        Assert-OptimizationValue $field $entry.target
        if (-not (Test-OptimizationValueEqual $entry.target (Get-OptimizationTarget $field $entry.before))) { throw 'invalid_optimization_backup' }
        if (Test-OptimizationValueEqual $entry.before $entry.target) { continue }
        $d=Get-OptimizationDefinition $field
        if ($d.adapter -eq 'service' -and (Read-SafeModeState).enabled) {
            if (($d.part -eq 'start' -and $entry.before.value.StartsWith('4|')) -or ($d.part -eq 'running' -and $entry.before.value -ne 1)) {throw 'safemode_protects_service'}
        }
        $current = Get-OptimizationValue $field
        if (-not (Test-OptimizationOwnedValue $entry $current)) { throw 'external_change_detected' }
    }
}

function Restore-OptimizationEntries($State,[string]$Path) {
    Assert-OptimizationRestore $State
    $entries=@($State.entries); [array]::Reverse($entries)
    # Restore startup configuration before attempting to resume a service.
    $entries=@($entries | Sort-Object {if ((Get-OptimizationDefinition $_.field).adapter -eq 'service' -and (Get-OptimizationDefinition $_.field).part -eq 'start') {0} else {1}})
    foreach ($entry in $entries) {
        if (Test-OptimizationValueEqual $entry.before $entry.target) {continue}
        $current=Get-OptimizationValue $entry.field
        if (Test-OptimizationValueEqual $current $entry.before) {continue}
        if (-not (Test-OptimizationOwnedValue $entry $current)) {throw 'external_change_detected'}
        Set-OptimizationTrackedValue $entry $entry.before $State $Path
    }
}

# Windows default for a field, used to switch a tweak off when no backup exists (setting was already active before).
# Registry and per-card values without a listed default return to "not set"; tasks return to enabled.
function Get-OptimizationDefault([string]$Field,$Current) {
    $d=Get-OptimizationDefinition $Field
    if ($d.adapter -in @('ifreg','dns')) {
        $empty=if ($d.adapter -eq 'dns') {''} else {'x'}
        $now=ConvertFrom-NetworkValue $Current.value
        $parts=foreach ($key in $now.Keys) {$key+'='+$(if (($d.ContainsKey('onlyExisting') -and $d.onlyExisting) -and $now[$key] -ne 'x') {[string]$d.default} else {$empty})}
        return [pscustomobject]@{exists=$true;kind=$d.kind;value=($parts -join '|')}
    }
    if ($d.adapter -eq 'task') {
        if (-not $Current.exists) {return $Current}
        return [pscustomobject]@{exists=$true;kind='DWord';value=1}
    }
    if (-not $d.ContainsKey('default')) {
        if ($d.adapter -eq 'registry') {return [pscustomobject]@{exists=$false;kind=$null;value=$null}}
        throw 'original_value_unknown'
    }
    $value=$d.default
    if ($d.kind -eq 'Power') {$value=($Current.value.Split('|')[0]+'|'+$d.default)}
    return [pscustomobject]@{exists=$true;kind=$d.kind;value=$value}
}

# Switch off without a backup: write the Windows defaults (restore point first, every write verified).
function Reset-OptimizationDefaults([string]$Id,[string[]]$Fields) {
    $plan=@(foreach ($field in $Fields) {$current=Get-OptimizationValue $field;[pscustomobject]@{field=$field;current=$current;default=(Get-OptimizationDefault $field $current)}})
    $changes=@($plan | Where-Object {-not (Test-OptimizationValueEqual $_.current $_.default)})
    if ($changes.Count -eq 0) {return [pscustomobject]@{id=$Id;status='restored'}}
    New-TweakerRestorePoint
    foreach ($entry in $changes) {Set-OptimizationValue $entry.field $entry.default}
    return [pscustomobject]@{id=$Id;status='restored'}
}

function Invoke-TweakerOptimization([string]$Action,[string]$Id,[string]$StateDirectory,[string]$ExpectedRecoveryId) {
    Assert-Administrator
    Assert-OptimizationPlatform
    $fields = @(Get-OptimizationFields $Id)
    if ($Action -eq 'apply') {Assert-OptimizationAvailable $Id}
    if ($Action -notin @('apply','restore')) { throw 'invalid_action' }
    $path = Join-Path $StateDirectory ($Id + '.json')
    # Validate existing ancestors/files before any elevated filesystem writes.
    foreach ($candidate in @($path,($path + '.previous'),(Join-Path $StateDirectory 'operation.lock'))) {
        $null = Assert-CachePath $candidate $StateDirectory
    }
    $null = New-Item -ItemType Directory -Path $StateDirectory -Force
    $lock = [IO.File]::Open((Join-Path $StateDirectory 'operation.lock'),'OpenOrCreate','ReadWrite','None')
    $safeLock=$null
    try {
        if (@($fields | Where-Object {(Get-OptimizationDefinition $_).adapter -eq 'service'}).Count -gt 0) {
            Initialize-SafeModeStorage
            $safeLock=[IO.File]::Open((Join-Path $script:SafeModeDirectory 'operation.lock'),'OpenOrCreate','ReadWrite','None')
            if ($Action -eq 'apply') {Assert-OptimizationServiceGuard $fields}
        }
        $state = if (Test-Path -LiteralPath $path) {Get-Content -LiteralPath $path -Raw | ConvertFrom-Json} else {$null}
        if ($ExpectedRecoveryId) { Assert-ExpectedRecovery $state $path $ExpectedRecoveryId }
        if ($Action -eq 'apply') {
            if ($null -ne $state -and $state.status -ne 'restored') { throw 'existing_backup_restore_first' }
            # Fastest public DNS is measured once per apply and then fixed for this backup.
            if (@($fields | Where-Object {(Get-OptimizationDefinition $_).adapter -eq 'dns'}).Count -gt 0) {Update-NetworkDnsChoice}
            $entries = @($fields | ForEach-Object { $before=Get-OptimizationValue $_; [pscustomobject]@{field=$_;before=$before;target=(Get-OptimizationTarget $_ $before)} })
            foreach ($entry in $entries) {
                $d=Get-OptimizationDefinition $entry.field
                if ($d.adapter -eq 'service' -and $d.part -eq 'start' -and $entry.before.value.StartsWith('4|')) {
                    $runtime=@($entries | Where-Object {(Get-OptimizationDefinition $_.field).adapter -eq 'service' -and (Get-OptimizationDefinition $_.field).part -eq 'running'})
                    if ($runtime.Count -ne 1 -or $runtime[0].before.value -ne 0) {throw 'unsupported_optimization_value'}
                }
            }
            $changed = @($entries | Where-Object { -not (Test-OptimizationValueEqual $_.before $_.target) })
            if ($changed.Count -eq 0) { return [pscustomobject]@{id=$Id;status='unchanged'} }
            New-TweakerRestorePoint
            foreach ($entry in $entries) {
                if (-not (Test-OptimizationValueEqual (Get-OptimizationValue $entry.field) $entry.before)) { throw 'external_change_detected' }
            }
            $state = [pscustomobject]@{version=1;id=$Id;status='pending';createdUtc=[DateTime]::UtcNow.ToString('o');entries=$entries}
            Save-Journal $state $path
            try {
                foreach ($entry in $changed) {
                    if (-not (Test-OptimizationValueEqual (Get-OptimizationValue $entry.field) $entry.before)) { throw 'external_change_detected' }
                    Set-OptimizationTrackedValue $entry $entry.target $state $path
                }
                if (-not (Test-TweakerOptimizationApplied $Id)) { throw 'optimization_verification_failed' }
            } catch {
                $failure=$_
                try {
                    Restore-OptimizationEntries $state $path
                    $state.status='restored'
                    Save-Journal $state $path
                } catch { # Keep durable pending backup if rollback itself is blocked.
                }
                throw $failure
            }
            $state.status = 'applied'
        } else {
            # No backup: the setting was already active before Tweaker - switch off to the Windows default.
            if ($null -eq $state -and -not $ExpectedRecoveryId) { return Reset-OptimizationDefaults $Id $fields }
            if ($null -eq $state) { throw 'backup_not_found' }
            if ($state.id -ne $Id) { throw 'invalid_optimization_backup' }
            Assert-OptimizationRestore $state
            if ($state.status -eq 'restored') { return [pscustomobject]@{id=$Id;status='restored'} }
            Register-TweakerBackup $state $path
            Restore-OptimizationEntries $state $path
            $state.status = 'restored'
        }
        Save-Journal $state $path
        [pscustomobject]@{id=$Id;status=$state.status}
    } finally { if ($null -ne $safeLock) {$safeLock.Dispose()}; $lock.Dispose() }
}
