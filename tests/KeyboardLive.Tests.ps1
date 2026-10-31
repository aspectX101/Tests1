# Windows only (CI runner or a test PC as administrator): reads every keyboard tab setting through the real
# SystemParametersInfo calls and writes the live ones forward and back to the exact original.
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot '../Tweaker.psm1') -Force
& (Get-Module Tweaker) {
    function Assert($c,[string]$m) {if (-not $c) {throw $m}}
    foreach ($tweak in @(Get-TweakerCatalog | Where-Object { $_.category -in @('keyboard','mouse') })) {
        if ($tweak.id -in @((Get-OptimizationCatalog).id)) {
            foreach ($field in @(Get-OptimizationFields $tweak.id)) {$v=Get-OptimizationValue $field;Write-Host ('PASS read {0}/{1}: {2}' -f $tweak.id,$field,$(if ($v.exists) {$v.value} else {'(not set)'}))}
            continue
        }
        foreach ($field in @(Get-KeyboardFields $tweak.id)) {
            $value=Get-KeyboardValue $field
            Assert-KeyboardValue $field $value
            Assert-KeyboardValue $field (Get-KeyboardTarget $field $value)
            Write-Host ('PASS read {0}/{1}: {2}' -f $tweak.id,$field,$value)
        }
    }
    foreach ($field in @('toggleFlags','mouseKeysFlags','mouseAccel','mouseSpeed','doubleClick','wheelLines','snapDefault','mouseTrails','clickLock','mouseVanish','swapButtons')) {
        $before=Get-KeyboardValue $field
        $target=Get-KeyboardTarget $field $before
        # Fields already at the tweak target (e.g. Windows defaults) are written to another valid value and back.
        if ($target -eq $before) { $target = switch ($field) { 'doubleClick' {[Math]::Max(200,$before-50)} 'wheelLines' {if ($before -eq 7) {6} else {7}} 'mouseTrails' {if ($before -eq 0) {2} else {0}} default {if ($field -in @('snapDefault','clickLock','mouseVanish','swapButtons')) {1-$before} else {$before}} } }
        try {
            Set-KeyboardValue $field $target
            Assert ((Get-KeyboardValue $field) -eq $target) ('target written '+$field)
        } finally { Set-KeyboardValue $field $before }
        Assert ((Get-KeyboardValue $field) -eq $before) ('original restored '+$field)
        Write-Host ('PASS round trip {0}: {1} -> {2} -> {1}' -f $field,$before,$target)
    }
}
