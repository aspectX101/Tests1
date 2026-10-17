# Private keyboard implementation, loaded by Tweaker.psm1.
function Initialize-KeyboardNative {
    if (-not ('Tweaker.Native.Keyboard' -as [type])) {
        Add-Type -Path (Join-Path $PSScriptRoot 'native/Keyboard.cs') -ErrorAction Stop
    }
}

function Get-KeyboardFields([string]$Id) {
    switch ($Id) {
        'keyboard.repeat.fast' { @('delay','speed') }
        'keyboard.filterkeys.off' { @('filterFlags') }
        'keyboard.stickykeys.off' { @('stickyFlags') }
        default { throw 'invalid_tweak_id' }
    }
}

function Get-KeyboardValue([string]$Field) {
    Initialize-KeyboardNative
    switch ($Field) {
        'delay' { [Tweaker.Native.Keyboard]::Read(0x16, 1)[0] }
        'speed' { [Tweaker.Native.Keyboard]::Read(0x0A, 1)[0] }
        'filterFlags' { [Tweaker.Native.Keyboard]::Read(0x32, 6)[1] -band 0x7F }
        # Ignore transient modifier latch/lock state: Windows does not restore it.
        'stickyFlags' { [Tweaker.Native.Keyboard]::Read(0x3A, 2)[1] -band 0x1FF }
        default { throw 'invalid_keyboard_field' }
    }
}

function Assert-KeyboardValue([string]$Field, $Value) {
    if ($null -eq $Value -or $Value -is [bool] -or $Value.ToString() -notmatch '^\d+$') { throw 'invalid_keyboard_value' }
    $maximum = switch ($Field) { 'delay' {3} 'speed' {31} 'filterFlags' {127} 'stickyFlags' {511} default {throw 'invalid_keyboard_field'} }
    if ([long]$Value -gt $maximum) { throw 'invalid_keyboard_value' }
}

function Set-KeyboardValue([string]$Field, [int]$Value) {
    Assert-KeyboardValue $Field $Value
    Initialize-KeyboardNative
    switch ($Field) {
        'delay' { [Tweaker.Native.Keyboard]::WriteScalar(0x17, $Value) }
        'speed' { [Tweaker.Native.Keyboard]::WriteScalar(0x0B, $Value) }
        'filterFlags' { [Tweaker.Native.Keyboard]::WriteFlags(0x32, 0x33, 6, $Value) }
        'stickyFlags' { [Tweaker.Native.Keyboard]::WriteFlags(0x3A, 0x3B, 2, $Value) }
    }
    if ((Get-KeyboardValue $Field) -ne $Value) { throw 'keyboard_verification_failed' }
}

function Get-KeyboardTarget([string]$Field, [int]$Before) {
    switch ($Field) {
        'delay' { 0 }
        'speed' { 31 }
        # Clear ON and HOTKEYACTIVE only. Keep AVAILABLE and all other preferences.
        'filterFlags' { $Before -band 0x7A }
        'stickyFlags' { $Before -band 0x1FA }
        default { throw 'invalid_keyboard_field' }
    }
}

function Test-TweakerKeyboardApplied([string]$Id) {
    foreach ($field in @(Get-KeyboardFields $Id)) {
        $value = Get-KeyboardValue $field
        if ($value -ne (Get-KeyboardTarget $field $value)) { return $false }
    }
    return $true
}

function Invoke-TweakerKeyboard([string]$Action, [string]$Id, [string]$StateDirectory, [string]$ExpectedRecoveryId) {
    Assert-Administrator
    $null = New-Item -ItemType Directory -Path $StateDirectory -Force
    $path = Join-Path $StateDirectory ($Id + '.json')
    $lock = [IO.File]::Open((Join-Path $StateDirectory 'operation.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    try {
        $state = if (Test-Path -LiteralPath $path) { Get-Content -LiteralPath $path -Raw | ConvertFrom-Json } else { $null }
        if ($ExpectedRecoveryId) { Assert-ExpectedRecovery $state $path $ExpectedRecoveryId }
        $fields = @(Get-KeyboardFields $Id)
        if ($Action -eq 'apply') {
            if ($null -ne $state -and $state.status -ne 'restored') { throw 'existing_backup_restore_first' }
            $entries = @($fields | ForEach-Object {
                $value = Get-KeyboardValue $_
                Assert-KeyboardValue $_ $value
                [pscustomobject]@{field=$_;before=$value;target=(Get-KeyboardTarget $_ $value)}
            })
            if (@($entries | Where-Object { $_.before -ne $_.target }).Count -eq 0) {
                return [pscustomobject]@{id=$Id;status='unchanged'}
            }
            New-TweakerRestorePoint
            # Creating a restore point takes time: detect intervening user changes.
            foreach ($entry in $entries) {
                if ((Get-KeyboardValue $entry.field) -ne $entry.before) { throw 'external_change_detected' }
            }
            $state = [pscustomobject]@{version=1;id=$Id;status='pending';createdUtc=[DateTime]::UtcNow.ToString('o');entries=$entries}
            Save-Journal $state $path
            foreach ($entry in $entries) {
                if ($entry.before -eq $entry.target) { continue }
                if ((Get-KeyboardValue $entry.field) -ne $entry.before) { throw 'external_change_detected' }
                Set-KeyboardValue $entry.field $entry.target
            }
            if (-not (Test-TweakerKeyboardApplied $Id)) { throw 'keyboard_verification_failed' }
            $state.status = 'applied'
        } elseif ($Action -eq 'restore') {
            if ($null -eq $state) { throw 'backup_not_found' }
            if ($state.version -ne 1 -or $state.id -ne $Id -or $state.status -notin @('pending','applied','restored')) { throw 'invalid_backup' }
            if ($state.status -eq 'restored') { return [pscustomobject]@{id=$Id;status='restored'} }
            Register-TweakerBackup $state $path
            if (@($state.entries).Count -ne $fields.Count) { throw 'invalid_backup' }
            # Validate every entry and preflight all conflicts before restoring any field.
            foreach ($field in $fields) {
                $matches = @($state.entries | Where-Object { $_.field -eq $field })
                if ($matches.Count -ne 1) { throw 'invalid_backup' }
                $entry = $matches[0]
                Assert-KeyboardValue $field $entry.before
                Assert-KeyboardValue $field $entry.target
                if ($entry.target -ne (Get-KeyboardTarget $field $entry.before)) { throw 'invalid_backup' }
                if ($entry.before -eq $entry.target) { continue }
                $current = Get-KeyboardValue $field
                if ($current -ne $entry.before -and $current -ne $entry.target) { throw 'external_change_detected' }
            }
            foreach ($entry in $state.entries) {
                # Entries unchanged by this tweak are never written during restore.
                if ($entry.before -eq $entry.target) { continue }
                $current = Get-KeyboardValue $entry.field
                if ($current -eq $entry.before) { continue }
                if ($current -ne $entry.target) { throw 'external_change_detected' }
                Set-KeyboardValue $entry.field $entry.before
            }
            $state.status = 'restored'
        } else { throw 'invalid_action' }
        Save-Journal $state $path
        [pscustomobject]@{id=$Id;status=$state.status}
    } finally { $lock.Dispose() }
}
