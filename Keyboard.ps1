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
        'keyboard.togglekeys.off' { @('toggleFlags') }
        'keyboard.mousekeys.off' { @('mouseKeysFlags') }
        'keyboard.mouse.accel.off' { @('mouseAccel') }
        'keyboard.mouse.speed.native' { @('mouseSpeed') }
        # More Tools > Mouse
        'keyboard.mouse.doubleclick.fast' { @('doubleClick') }
        'keyboard.mouse.wheel.fast' { @('wheelLines') }
        'keyboard.mouse.snap.off' { @('snapDefault') }
        'keyboard.mouse.trails.off' { @('mouseTrails') }
        'keyboard.mouse.clicklock.off' { @('clickLock') }
        'keyboard.mouse.vanish.off' { @('mouseVanish') }
        'keyboard.mouse.buttons.normal' { @('swapButtons') }
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
        # TOGGLEKEYS / MOUSEKEYS: persistent preference bits only (no button or lock state).
        'toggleFlags' { [Tweaker.Native.Keyboard]::Read(0x34, 2)[1] -band 0x3F }
        'mouseKeysFlags' { [Tweaker.Native.Keyboard]::Read(0x36, 7)[1] -band 0xFF }
        # Pointer acceleration as one number: threshold1 * 65536 + threshold2 * 256 + acceleration.
        'mouseAccel' {
            $m = [Tweaker.Native.Keyboard]::ReadMouse()
            if ($m[0] -lt 0 -or $m[0] -gt 255 -or $m[1] -lt 0 -or $m[1] -gt 255 -or $m[2] -lt 0 -or $m[2] -gt 2) { throw 'invalid_keyboard_value' }
            ($m[0] * 65536) + ($m[1] * 256) + $m[2]
        }
        'mouseSpeed' { [Tweaker.Native.Keyboard]::Read(0x70, 1)[0] }
        'doubleClick' { [Tweaker.Native.Keyboard]::ReadDoubleClickTime() }
        # WHEEL_PAGESCROLL (one page per notch) reads as -1 and is stored as 0xFFFFFFFF.
        'wheelLines' { [long][uint32][Tweaker.Native.Keyboard]::Read(0x68, 1)[0] }
        'snapDefault' { [int]([Tweaker.Native.Keyboard]::Read(0x5F, 1)[0] -ne 0) }
        # 0 and 1 both mean no trails; Windows may report either, so both read as 0.
        'mouseTrails' { $t = [Tweaker.Native.Keyboard]::Read(0x5E, 1)[0]; if ($t -le 1) { 0 } else { $t } }
        'clickLock' { [int]([Tweaker.Native.Keyboard]::Read(0x101E, 1)[0] -ne 0) }
        'mouseVanish' { [int]([Tweaker.Native.Keyboard]::Read(0x1020, 1)[0] -ne 0) }
        'swapButtons' { [Tweaker.Native.Keyboard]::ReadSwapButtons() }
        default { throw 'invalid_keyboard_field' }
    }
}

function Assert-KeyboardValue([string]$Field, $Value) {
    if ($null -eq $Value -or $Value -is [bool] -or $Value.ToString() -notmatch '^\d+$') { throw 'invalid_keyboard_value' }
    $maximum = switch ($Field) { 'delay' {3} 'speed' {31} 'filterFlags' {127} 'stickyFlags' {511} 'toggleFlags' {63} 'mouseKeysFlags' {255} 'mouseAccel' {16777215} 'mouseSpeed' {20}
        'doubleClick' {5000} 'wheelLines' {4294967295} 'snapDefault' {1} 'mouseTrails' {16} 'clickLock' {1} 'mouseVanish' {1} 'swapButtons' {1} default {throw 'invalid_keyboard_field'} }
    if ([long]$Value -gt $maximum) { throw 'invalid_keyboard_value' }
    if ($Field -eq 'wheelLines' -and [long]$Value -gt 100 -and [long]$Value -ne 4294967295) { throw 'invalid_keyboard_value' }
    if ($Field -eq 'mouseSpeed' -and [long]$Value -lt 1) { throw 'invalid_keyboard_value' }
    if ($Field -eq 'mouseAccel' -and ([long]$Value -band 255) -gt 2) { throw 'invalid_keyboard_value' }
}

function Set-KeyboardValue([string]$Field, [long]$Value) {
    Assert-KeyboardValue $Field $Value
    Initialize-KeyboardNative
    switch ($Field) {
        'delay' { [Tweaker.Native.Keyboard]::WriteScalar(0x17, $Value) }
        'speed' { [Tweaker.Native.Keyboard]::WriteScalar(0x0B, $Value) }
        'filterFlags' { [Tweaker.Native.Keyboard]::WriteFlags(0x32, 0x33, 6, $Value) }
        'stickyFlags' { [Tweaker.Native.Keyboard]::WriteFlags(0x3A, 0x3B, 2, $Value) }
        'toggleFlags' { [Tweaker.Native.Keyboard]::WriteFlags(0x34, 0x35, 2, $Value) }
        'mouseKeysFlags' { [Tweaker.Native.Keyboard]::WriteFlags(0x36, 0x37, 7, $Value) }
        'mouseAccel' { [Tweaker.Native.Keyboard]::WriteMouse(($Value -shr 16) -band 255, ($Value -shr 8) -band 255, $Value -band 255) }
        'mouseSpeed' { [Tweaker.Native.Keyboard]::WritePointerValue(0x71, $Value) }
        'doubleClick' { [Tweaker.Native.Keyboard]::WriteScalar(0x20, $Value) }
        'wheelLines' { [Tweaker.Native.Keyboard]::WriteScalar(0x69, [uint32]$Value) }
        'snapDefault' { [Tweaker.Native.Keyboard]::WriteScalar(0x60, $Value) }
        'mouseTrails' { [Tweaker.Native.Keyboard]::WriteScalar(0x5D, $Value) }
        # ClickLock and "hide pointer while typing" take the BOOL itself in pvParam.
        'clickLock' { [Tweaker.Native.Keyboard]::WritePointerValue(0x101F, $Value) }
        'mouseVanish' { [Tweaker.Native.Keyboard]::WritePointerValue(0x1021, $Value) }
        'swapButtons' { [Tweaker.Native.Keyboard]::WriteScalar(0x21, $Value) }
    }
    if ((Get-KeyboardValue $Field) -ne $Value) { throw 'keyboard_verification_failed' }
}

function Get-KeyboardTarget([string]$Field, [long]$Before) {
    switch ($Field) {
        'delay' { 0 }
        'speed' { 31 }
        # Clear ON and HOTKEYACTIVE only. Keep AVAILABLE and all other preferences.
        'filterFlags' { $Before -band 0x7A }
        'stickyFlags' { $Before -band 0x1FA }
        # Clear ON and HOTKEYACTIVE; keep AVAILABLE and the other preferences.
        'toggleFlags' { $Before -band 0x3A }
        'mouseKeysFlags' { $Before -band 0xFA }
        # Enhance pointer precision off: thresholds and acceleration 0.
        'mouseAccel' { 0 }
        # 10 = 6th notch of 11, the 1:1 pointer speed.
        'mouseSpeed' { 10 }
        # Never slower or fewer lines than the user already has.
        'doubleClick' { [Math]::Min($Before, 300) }
        'wheelLines' { if ($Before -eq 4294967295 -or $Before -ge 5) { $Before } else { 5 } }
        'snapDefault' { 0 }
        'mouseTrails' { 0 }
        'clickLock' { 0 }
        'mouseVanish' { 0 }
        'swapButtons' { 0 }
        default { throw 'invalid_keyboard_field' }
    }
}

# Windows defaults (fresh user profile), used to switch off a tweak that was already active without a backup.
function Get-KeyboardDefault([string]$Field) {
    switch ($Field) {
        'delay' { 1 } 'speed' { 31 } 'filterFlags' { 126 } 'stickyFlags' { 510 } 'toggleFlags' { 62 } 'mouseKeysFlags' { 62 }
        'mouseAccel' { (6 * 65536) + (10 * 256) + 1 } 'mouseSpeed' { 10 }
        'doubleClick' { 500 } 'wheelLines' { 3 } 'mouseVanish' { 1 }
        # Windows already ships these as the tweak target; switching off without a backup leaves them unchanged.
        'snapDefault' { 0 } 'mouseTrails' { 0 } 'clickLock' { 0 } 'swapButtons' { 0 }
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
            if ($null -eq $state -and -not $ExpectedRecoveryId) {
                # No backup: the setting was already active before Tweaker - switch off to the Windows default.
                $changes = @($fields | Where-Object { (Get-KeyboardValue $_) -ne (Get-KeyboardDefault $_) })
                if ($changes.Count -gt 0) { New-TweakerRestorePoint; foreach ($field in $changes) { Set-KeyboardValue $field (Get-KeyboardDefault $field) } }
                return [pscustomobject]@{id=$Id;status='restored'}
            }
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
