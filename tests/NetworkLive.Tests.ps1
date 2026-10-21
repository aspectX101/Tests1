# Windows only (CI runner or a test PC as administrator): reads the real network cards with the
# network tab adapters and writes one per-card registry value forward and back. DNS is only read.
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot '../Tweaker.psm1') -Force
& (Get-Module Tweaker) {
    function Assert($c,[string]$m) {if (-not $c) {throw $m}}
    # CI runs on Windows Server, which the app itself does not support; only the edition check is skipped here.
    function Assert-OptimizationPlatform {}
    $adapters=@(Get-NetworkAdapters)
    Write-Host ('PASS adapters: ' + (($adapters | ForEach-Object { $_.guid + ' up=' + $_.up }) -join ', '))
    foreach ($tweak in @(Get-OptimizationCatalog | Where-Object category -eq network)) {
        foreach ($field in @(Get-OptimizationFields $tweak.id)) {
            $value=Get-OptimizationValue $field
            $target=Get-OptimizationTarget $field $value
            Assert-OptimizationValue $field $target
            Write-Host ('PASS read {0}/{1}: {2}' -f $tweak.id,$field,$(if ($value.exists) {$value.value} else {'(not set)'}))
        }
        $null=Test-TweakerOptimizationApplied $tweak.id
    }
    # Real write round trip on every card, restoring the exact original.
    $before=Get-OptimizationValue 'nagleNoDelay'
    $target=Get-OptimizationTarget 'nagleNoDelay' $before
    try {
        Set-OptimizationValue 'nagleNoDelay' $target
        Assert (Test-OptimizationValueEqual (Get-OptimizationValue 'nagleNoDelay') $target) 'target written'
        Write-Host ('PASS write nagleNoDelay: ' + $target.value)
    } finally {
        Set-OptimizationValue 'nagleNoDelay' $before
    }
    Assert (Test-OptimizationValueEqual (Get-OptimizationValue 'nagleNoDelay') $before) 'original restored'
    Write-Host ('PASS restore nagleNoDelay: ' + $before.value)
}
