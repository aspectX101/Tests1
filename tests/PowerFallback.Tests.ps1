# Power API refusals: powercfg gets one second attempt, otherwise the Windows reason becomes a stable code.
# Simulated only; never changes real power settings.
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot '../Tweaker.psm1') -Force
& (Get-Module Tweaker) {
    function Assert($c,[string]$m) {if (-not $c) {throw $m}}
    function Expect([scriptblock]$f,[string]$code) {
        $actual=$null; try {$null=&$f} catch {$actual=$_.Exception.Message}
        Assert ($actual -eq $code) "Expected $code, got $actual"
    }
    $script:calls=@();$script:powercfgOk=$true
    function Invoke-PowerCfg([string[]]$Arguments) {$script:calls+=,($Arguments -join ' '); if (-not $script:powercfgOk) {throw 'powercfg_failed'}; ''}

    Invoke-OptimizationPowerFallback 5 @('/setacvalueindex','s','g','x','100')
    Assert ($script:calls.Count -eq 1 -and $script:calls[0] -eq '/setacvalueindex s g x 100') 'fallback must call powercfg once with the same value'
    'PASS fallback succeeds through powercfg'

    $script:powercfgOk=$false
    Expect {Invoke-OptimizationPowerFallback 5 @('/setactive','s')} 'power_setting_access_denied'
    Expect {Invoke-OptimizationPowerFallback 87 @('/setactive','s')} 'power_setting_rejected'
    Expect {Invoke-OptimizationPowerFallback 1168 @('/setactive','s')} 'power_setting_write_failed'
    'PASS refusals keep the Windows reason'
}
