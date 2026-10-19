# Execute the real adapter logic against simulated Windows service/task providers.
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot '../Tweaker.psm1') -Force
& (Get-Module Tweaker) {
    function Assert($c,[string]$m) {if (-not $c) {throw $m}}
    function Expect([scriptblock]$f,[string]$code) {$msg=$null;try {$null=&$f} catch {$msg=$_.Exception.Message};Assert ($msg -eq $code) "Expected $code; got $msg"}
    $script:safe=$false;$script:mode='Automatic';$script:delay=[pscustomobject]@{exists=$true;kind='DWord';value=1}
    $script:controller=[pscustomobject]@{Status='Running';DependentServices=@()}
    $script:controller | Add-Member ScriptMethod Refresh {}
    $script:controller | Add-Member ScriptMethod Dispose {}
    $script:controller | Add-Member ScriptMethod Start {$this.Status='Running'}
    $script:controller | Add-Member ScriptMethod Continue {$this.Status='Running'}
    $script:controller | Add-Member ScriptMethod Stop {$this.Status='Stopped'}
    $script:controller | Add-Member ScriptMethod Pause {$this.Status='Paused'}
    $script:controller | Add-Member ScriptMethod WaitForStatus {param($status,$timeout);if ($this.Status -ne $status) {throw 'simulated_timeout'}}
    function New-OptimizationServiceController([string]$Name) {return $script:controller}
    function Read-SafeModeState {[pscustomobject]@{enabled=$script:safe}}
    function Get-SafeModeService([string]$Name) {[pscustomobject]@{exists=$true;state=$script:controller.Status;startMode=$script:mode}}
    function Get-OptimizationRegistryValue($Definition) {$script:delay}
    function Set-OptimizationRegistryValue($Definition,$Value) {$script:delay=$Value}
    function Set-Service {param($Name,$StartupType,$ErrorAction);$script:mode=$StartupType}
    $start=Get-OptimizationDefinition sysmain_start;$running=Get-OptimizationDefinition sysmain_running
    $beforeStart=Get-OptimizationNativeValue $start;$beforeRun=Get-OptimizationNativeValue $running
    Set-OptimizationNativeValue $start (Get-OptimizationNativeTarget $start $beforeStart)
    Set-OptimizationNativeValue $running (Get-OptimizationNativeTarget $running $beforeRun)
    Assert ($script:mode -eq 'Disabled' -and $script:controller.Status -eq 'Stopped') 'Service disabled and stopped'
    Set-OptimizationNativeValue $start $beforeStart
    Set-OptimizationNativeValue $running $beforeRun
    Assert ($script:mode -eq 'Automatic' -and $script:controller.Status -eq 'Running' -and $script:delay.value -eq 1) 'Delayed automatic and running state restored'
    $script:safe=$true
    Expect {Set-OptimizationNativeValue $start (Get-OptimizationNativeTarget $start $beforeStart)} 'safemode_protects_service'
    Expect {Set-OptimizationNativeValue $running (Get-OptimizationNativeTarget $running $beforeRun)} 'safemode_protects_service'
    $script:safe=$false
    $script:controller.DependentServices=@([pscustomobject]@{Status='Running'})
    Expect {Set-OptimizationNativeValue $running (Get-OptimizationNativeTarget $running $beforeRun)} 'service_has_running_dependents'
    Assert ($script:controller.Status -eq 'Running') 'Never force dependent services off'
    $script:controller.DependentServices=@();$script:controller.Status='Paused'
    $paused=Get-OptimizationNativeValue $running
    Set-OptimizationNativeValue $running ([pscustomobject]@{exists=$true;kind='DWord';value=0})
    Set-OptimizationNativeValue $running $paused
    Assert ($script:controller.Status -eq 'Paused') 'Paused runtime restored'
    $script:taskEnabled=$true;$script:missing=$false
    function Get-ScheduledTask {param($TaskPath,$TaskName,$ErrorAction);if (-not $script:missing) {[pscustomobject]@{Settings=[pscustomobject]@{Enabled=$script:taskEnabled}}}}
    function Disable-ScheduledTask {param($TaskPath,$TaskName,$ErrorAction);$script:taskEnabled=$false}
    function Enable-ScheduledTask {param($TaskPath,$TaskName,$ErrorAction);$script:taskEnabled=$true}
    $task=Get-OptimizationDefinition ceipConsolidator;$before=Get-OptimizationNativeValue $task
    Set-OptimizationNativeValue $task (Get-OptimizationNativeTarget $task $before)
    Assert (-not $script:taskEnabled) 'Task disabled'
    Set-OptimizationNativeValue $task $before
    Assert $script:taskEnabled 'Task enabled state restored'
    $script:missing=$true;$missing=Get-OptimizationNativeValue $task
    Assert (-not $missing.exists -and -not (Get-OptimizationNativeTarget $task $missing).exists) 'Missing optional tasks are not created'
    Write-Output 'PASS: native service/task adapters, delayed start, paused state, SafeMode and dependent-service guard'
}
