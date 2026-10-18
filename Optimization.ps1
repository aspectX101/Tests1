# Small, fixed allowlist of useful Windows gaming preferences. No service changes.
function Get-OptimizationCatalog {
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
        default { throw 'invalid_tweak_id' }
    }
}

function Get-OptimizationDefinition([string]$Field) {
    switch ($Field) {
        'capture' { @{path='Software\Microsoft\Windows\CurrentVersion\GameDVR';name='AppCaptureEnabled';target=0;maximum=1} }
        'historicalCapture' { @{path='Software\Microsoft\Windows\CurrentVersion\GameDVR';name='HistoricalCaptureEnabled';target=0;maximum=1} }
        'gameDvr' { @{path='System\GameConfigStore';name='GameDVR_Enabled';target=0;maximum=1} }
        'gameMode' { @{path='Software\Microsoft\GameBar';name='AutoGameModeEnabled';target=1;maximum=1} }
        'ducking' { @{path='Software\Microsoft\Multimedia\Audio';name='UserDuckingPreference';target=3;maximum=3} }
        default { throw 'invalid_optimization_field' }
    }
}

function Assert-OptimizationPlatform {
    $platform = Get-SafeModePlatform
    if (-not $platform.supported) { throw 'unsupported_optimization_platform' }
}

function Assert-OptimizationValue([string]$Field, $Value) {
    $definition = Get-OptimizationDefinition $Field
    if ($null -eq $Value -or $Value.exists -isnot [bool]) { throw 'invalid_optimization_backup' }
    if ($Value.exists) {
        if ($Value.kind -ne 'DWord' -or $Value.value -isnot [ValueType] -or
            [long]$Value.value -lt 0 -or [long]$Value.value -gt $definition.maximum -or
            [double]$Value.value -ne [long]$Value.value) { throw 'unsupported_optimization_value' }
    } elseif ($null -ne $Value.value -or $null -ne $Value.kind) { throw 'invalid_optimization_backup' }
}

function Get-OptimizationValue([string]$Field) {
    $definition = Get-OptimizationDefinition $Field
    $hive = [Microsoft.Win32.RegistryKey]::OpenBaseKey('CurrentUser','Registry64')
    $key = $null
    try {
        $key = $hive.OpenSubKey($definition.path, $false)
        if ($null -eq $key -or $definition.name -notin @($key.GetValueNames())) {
            return [pscustomobject]@{exists=$false;kind=$null;value=$null}
        }
        $result = [pscustomobject]@{exists=$true;kind=$key.GetValueKind($definition.name).ToString();value=$key.GetValue($definition.name)}
        Assert-OptimizationValue $Field $result
        return $result
    } finally { if ($null -ne $key) {$key.Dispose()}; $hive.Dispose() }
}

function Get-OptimizationTarget([string]$Field) {
    [pscustomobject]@{exists=$true;kind='DWord';value=[int](Get-OptimizationDefinition $Field).target}
}

function Test-OptimizationValueEqual($Left,$Right) {
    $Left.exists -eq $Right.exists -and $Left.kind -ceq $Right.kind -and $Left.value -eq $Right.value
}

function Set-OptimizationValue([string]$Field,$Value) {
    Assert-OptimizationValue $Field $Value
    $definition = Get-OptimizationDefinition $Field
    $hive = [Microsoft.Win32.RegistryKey]::OpenBaseKey('CurrentUser','Registry64')
    $key = $null
    try {
        if ($Value.exists) {
            $key = $hive.CreateSubKey($definition.path)
            $key.SetValue($definition.name,[int]$Value.value,[Microsoft.Win32.RegistryValueKind]::DWord)
        } else {
            $key = $hive.OpenSubKey($definition.path,$true)
            if ($null -ne $key) { $key.DeleteValue($definition.name,$false) }
        }
        if ($null -ne $key) { $key.Flush() }
    } finally { if ($null -ne $key) {$key.Dispose()}; $hive.Dispose() }
    if (-not (Test-OptimizationValueEqual (Get-OptimizationValue $Field) $Value)) { throw 'optimization_verification_failed' }
}

function Test-TweakerOptimizationApplied([string]$Id) {
    Assert-OptimizationPlatform
    foreach ($field in @(Get-OptimizationFields $Id)) {
        if (-not (Test-OptimizationValueEqual (Get-OptimizationValue $field) (Get-OptimizationTarget $field))) { return $false }
    }
    return $true
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
        if (-not (Test-OptimizationValueEqual $entry.target (Get-OptimizationTarget $field))) { throw 'invalid_optimization_backup' }
        if (Test-OptimizationValueEqual $entry.before $entry.target) { continue }
        $current = Get-OptimizationValue $field
        if (-not (Test-OptimizationValueEqual $current $entry.before) -and -not (Test-OptimizationValueEqual $current $entry.target)) { throw 'external_change_detected' }
    }
}

function Invoke-TweakerOptimization([string]$Action,[string]$Id,[string]$StateDirectory,[string]$ExpectedRecoveryId) {
    Assert-Administrator
    Assert-OptimizationPlatform
    $fields = @(Get-OptimizationFields $Id)
    if ($Action -notin @('apply','restore')) { throw 'invalid_action' }
    $path = Join-Path $StateDirectory ($Id + '.json')
    # Validate existing ancestors/files before any elevated filesystem writes.
    foreach ($candidate in @($path,($path + '.previous'),(Join-Path $StateDirectory 'operation.lock'))) {
        $null = Assert-CachePath $candidate $StateDirectory
    }
    $null = New-Item -ItemType Directory -Path $StateDirectory -Force
    $lock = [IO.File]::Open((Join-Path $StateDirectory 'operation.lock'),'OpenOrCreate','ReadWrite','None')
    try {
        $state = if (Test-Path -LiteralPath $path) {Get-Content -LiteralPath $path -Raw | ConvertFrom-Json} else {$null}
        if ($ExpectedRecoveryId) { Assert-ExpectedRecovery $state $path $ExpectedRecoveryId }
        if ($Action -eq 'apply') {
            if ($null -ne $state -and $state.status -ne 'restored') { throw 'existing_backup_restore_first' }
            $entries = @($fields | ForEach-Object { [pscustomobject]@{field=$_;before=(Get-OptimizationValue $_);target=(Get-OptimizationTarget $_)} })
            $changed = @($entries | Where-Object { -not (Test-OptimizationValueEqual $_.before $_.target) })
            if ($changed.Count -eq 0) { return [pscustomobject]@{id=$Id;status='unchanged'} }
            New-TweakerRestorePoint
            foreach ($entry in $entries) {
                if (-not (Test-OptimizationValueEqual (Get-OptimizationValue $entry.field) $entry.before)) { throw 'external_change_detected' }
            }
            $state = [pscustomobject]@{version=1;id=$Id;status='pending';createdUtc=[DateTime]::UtcNow.ToString('o');entries=$entries}
            Save-Journal $state $path
            foreach ($entry in $changed) {
                if (-not (Test-OptimizationValueEqual (Get-OptimizationValue $entry.field) $entry.before)) { throw 'external_change_detected' }
                Set-OptimizationValue $entry.field $entry.target
            }
            if (-not (Test-TweakerOptimizationApplied $Id)) { throw 'optimization_verification_failed' }
            $state.status = 'applied'
        } else {
            if ($null -eq $state) { throw 'backup_not_found' }
            if ($state.id -ne $Id) { throw 'invalid_optimization_backup' }
            Assert-OptimizationRestore $state
            if ($state.status -eq 'restored') { return [pscustomobject]@{id=$Id;status='restored'} }
            Register-TweakerBackup $state $path
            foreach ($entry in $state.entries) {
                if (Test-OptimizationValueEqual $entry.before $entry.target) { continue }
                $current = Get-OptimizationValue $entry.field
                if (Test-OptimizationValueEqual $current $entry.before) { continue }
                if (-not (Test-OptimizationValueEqual $current $entry.target)) { throw 'external_change_detected' }
                Set-OptimizationValue $entry.field $entry.before
            }
            $state.status = 'restored'
        }
        Save-Journal $state $path
        [pscustomobject]@{id=$Id;status=$state.status}
    } finally { $lock.Dispose() }
}
