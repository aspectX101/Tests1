# Windows only (CI runner or a test PC as administrator): reads every keyboard tab setting through the real
# SystemParametersInfo calls and writes the live ones forward and back to the exact original.
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot '../Tweaker.psm1') -Force
& (Get-Module Tweaker) {
    function Assert($c,[string]$m) {if (-not $c) {throw $m}}
    foreach ($tweak in @(Get-TweakerCatalog | Where-Object category -eq keyboard)) {
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
    foreach ($field in @('toggleFlags','mouseKeysFlags','mouseAccel','mouseSpeed')) {
        $before=Get-KeyboardValue $field
        $target=Get-KeyboardTarget $field $before
        try {
            Set-KeyboardValue $field $target
            Assert ((Get-KeyboardValue $field) -eq $target) ('target written '+$field)
        } finally { Set-KeyboardValue $field $before }
        Assert ((Get-KeyboardValue $field) -eq $before) ('original restored '+$field)
        Write-Host ('PASS round trip {0}: {1} -> {2} -> {1}' -f $field,$before,$target)
    }
}
