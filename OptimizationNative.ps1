# Fixed adapters only. All persistence and operation locks live in Optimization.ps1.
$script:ExtendedOptimization = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'OptimizationCatalog.json') -Raw | ConvertFrom-Json
$script:ExtendedCatalogCache=@()
. (Join-Path $PSScriptRoot 'OptimizationNetwork.ps1')

function Get-ExtendedOptimizationCatalog {
    if ($script:ExtendedCatalogCache.Count -gt 0) {return $script:ExtendedCatalogCache}
    $script:ExtendedCatalogCache=@(foreach ($entry in $script:ExtendedOptimization.tweaks) {
        $result=@{}
        foreach ($property in $entry.PSObject.Properties) {$result[$property.Name]=$property.Value}
        foreach ($key in @('name','description')) {
            $result[$key]=@{}
            foreach ($language in @('de','en','it')) {$result[$key][$language]=$entry.$key.$language}
        }
        [pscustomobject]$result
    })
    return $script:ExtendedCatalogCache
}
function Get-ExtendedOptimizationDefinition([string]$Field) {
    $property=$script:ExtendedOptimization.fields.PSObject.Properties[$Field]
    if ($null -eq $property) {throw 'invalid_optimization_field'}
    $result=@{}
    foreach ($p in $property.Value.PSObject.Properties) {$result[$p.Name]=$p.Value}
    if ($result.adapter -eq 'service' -and $result.part -eq 'start') {$result.kind='ServiceStart'}
    return $result
}
function Assert-OptimizationAvailable([string]$Id) {
    $entry=@($script:ExtendedOptimization.tweaks | Where-Object id -eq $Id)
    if ($entry.Count -eq 0) {return}
    $e=$entry[0]
    if ($e.PSObject.Properties['unavailable']) {throw $e.unavailable}
    if ($e.PSObject.Properties['feature']) {
        if ($e.feature -eq 'recall') {
            $platform=Get-SafeModePlatform
            $version=Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
            if ($platform.build -lt 26100 -or ($platform.build -eq 26100 -and [int]$version.UBR -lt 3915) -or $platform.edition -notmatch '^(Professional|Enterprise|Education|IoTEnterprise)') {throw 'recall_policy_unavailable'}
        }
        if ($e.feature -eq 'legacyCopilot' -and (Get-SafeModePlatform).build -ge 26100) {throw 'legacy_feature_unavailable'}
        if ($e.feature -eq 'office' -and -not (Test-Path 'HKLM:\SOFTWARE\Microsoft\Office\16.0') -and -not (Test-Path 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Office\16.0')) {throw 'optional_component_missing'}
    }
    if ($Id -eq 'windows.ceip.off') {
        $found=$false
        foreach ($f in $e.fields) {if ((Get-OptimizationValue $f).exists) {$found=$true}}
        if (-not $found) {throw 'optional_component_missing'}
    }
}
function Assert-OptimizationServiceGuard([string[]]$Fields) {
    foreach ($field in $Fields) {
        $d=Get-OptimizationDefinition $field
        if ($d.adapter -eq 'service' -and $d.service -ne 'MMCSS' -and (Read-SafeModeState).enabled) {throw 'safemode_protects_service'}
    }
}
function Initialize-OptimizationPowerApi {
    if ('Tweaker.PowerSettings' -as [type]) {return}
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
namespace Tweaker {
 public static class PowerSettings {
  [DllImport("powrprof.dll")] public static extern uint PowerReadACValueIndex(IntPtr root, ref Guid scheme, ref Guid subgroup, ref Guid setting, out uint value);
  [DllImport("powrprof.dll")] public static extern uint PowerWriteACValueIndex(IntPtr root, ref Guid scheme, ref Guid subgroup, ref Guid setting, uint value);
  [DllImport("powrprof.dll")] public static extern uint PowerSetActiveScheme(IntPtr root, ref Guid scheme);
  [DllImport("powrprof.dll")] [return:MarshalAs(UnmanagedType.U1)] static extern bool GetPwrCapabilities(IntPtr caps);
  public static bool HiberFilePresent() {
   var p=Marshal.AllocHGlobal(128);
   try { if(!GetPwrCapabilities(p)) throw new InvalidOperationException("power_state_unavailable"); return Marshal.ReadByte(p,8)!=0; }
   finally {Marshal.FreeHGlobal(p);}
  }
 }
}
'@ -ErrorAction Stop
}
function Get-OptimizationRegistryValue($Definition) {
    $hive=[Microsoft.Win32.RegistryKey]::OpenBaseKey($Definition.hive,'Registry64');$key=$null
    try {
        $key=$hive.OpenSubKey($Definition.path,$false)
        if ($null -eq $key -or $Definition.name -notin @($key.GetValueNames())) {return [pscustomobject]@{exists=$false;kind=$null;value=$null}}
        $kind=$key.GetValueKind($Definition.name).ToString();$value=$key.GetValue($Definition.name)
        if ($kind -eq 'DWord') {$value=[long]$value -band 4294967295L}
        [pscustomobject]@{exists=$true;kind=$kind;value=$value}
    } finally {if ($key) {$key.Dispose()};$hive.Dispose()}
}
function Set-OptimizationRegistryValue($Definition,$Value) {
    $hive=[Microsoft.Win32.RegistryKey]::OpenBaseKey($Definition.hive,'Registry64');$key=$null
    try {
        if ($Value.exists) {
            $key=$hive.CreateSubKey($Definition.path)
            $data=$Value.value
            if ($Value.kind -eq 'DWord') {$data=[BitConverter]::ToInt32([BitConverter]::GetBytes([uint32]$Value.value),0)}
            $key.SetValue($Definition.name,$data,[Microsoft.Win32.RegistryValueKind]::$($Value.kind))
        } else {
            $key=$hive.OpenSubKey($Definition.path,$true)
            if ($key) {$key.DeleteValue($Definition.name,$false)}
        }
        if ($key) {$key.Flush()}
    } finally {if ($key) {$key.Dispose()};$hive.Dispose()}
}
function Get-OptimizationHiberDefinition([string]$Name) {
    @{hive='LocalMachine';path='SYSTEM\CurrentControlSet\Control\Power';name=$Name}
}
function New-OptimizationServiceController([string]$Name) {
    [ServiceProcess.ServiceController]::new($Name)
}
function Get-OptimizationNativeValue($D) {
    switch ($D.adapter) {
        {$_ -in @('ifreg','dns','qos')} {return Get-NetworkNativeValue $D}
        'service' {
            $service=Get-SafeModeService $D.service
            if (-not $service.exists) {throw 'optional_component_missing'}
            if ($service.state -notin @('Running','Stopped','Paused')) {throw 'service_transition_in_progress'}
            if ($D.part -eq 'start') {
                $start=switch ($service.startMode) {'Automatic' {2} 'Manual' {3} 'Disabled' {4} default {throw 'unsupported_optimization_value'}}
                $delayed=Get-OptimizationRegistryValue @{hive='LocalMachine';path=('SYSTEM\CurrentControlSet\Services\'+$D.service);name='DelayedAutoStart'}
                $delay='x'
                if ($delayed.exists) {
                    if ($delayed.kind -ne 'DWord' -or $delayed.value -notin @(0,1)) {throw 'unsupported_optimization_value'}
                    $delay=[string]$delayed.value
                }
                $value="$start|$delay"
            } else {$value=switch ($service.state) {'Stopped' {0} 'Running' {1} 'Paused' {2}}}
            return [pscustomobject]@{exists=$true;kind=$D.kind;value=$value}
        }
        'task' {
            $tasks=@()
            try {$tasks=@(Get-ScheduledTask -TaskPath $D.path -TaskName $D.name -ErrorAction Stop)}
            catch {if ($_.CategoryInfo.Category -ne 'ObjectNotFound') {throw}}
            if ($tasks.Count -eq 0) {return [pscustomobject]@{exists=$false;kind=$null;value=$null}}
            if ($tasks.Count -ne 1) {throw 'task_state_unavailable'}
            return [pscustomobject]@{exists=$true;kind='DWord';value=[int][bool]$tasks[0].Settings.Enabled}
        }
        'power' {
            Initialize-OptimizationPowerApi
            $scheme=[guid](Get-PowerState);$sub=[guid]$D.subgroup;$setting=[guid]$D.setting;$index=[uint32]0
            if ([Tweaker.PowerSettings]::PowerReadACValueIndex([IntPtr]::Zero,[ref]$scheme,[ref]$sub,[ref]$setting,[ref]$index) -ne 0) {throw 'power_setting_unavailable'}
            return [pscustomobject]@{exists=$true;kind='Power';value=($scheme.ToString()+'|'+$index)}
        }
        'hibernate' {
            Initialize-OptimizationPowerApi
            $parts=@([string][int][Tweaker.PowerSettings]::HiberFilePresent())
            foreach ($name in @('HibernateEnabled','HiberFileType','HiberFileSizePercent')) {
                $v=Get-OptimizationRegistryValue (Get-OptimizationHiberDefinition $name)
                if ($v.exists) {
                    if ($v.kind -ne 'DWord' -or $v.value -gt 100) {throw 'unsupported_optimization_value'}
                    $parts += [string]$v.value
                } else {$parts += 'x'}
            }
            if ($parts[0] -eq '1' -and $parts[2] -notin @('1','2')) {throw 'unsupported_optimization_value'}
            return [pscustomobject]@{exists=$true;kind='Hibernate';value=($parts -join '|')}
        }
        default {throw 'invalid_optimization_field'}
    }
}
function Get-OptimizationNativeTarget($D,$Current) {
    if ($D.adapter -in @('ifreg','dns','qos')) {return Get-NetworkNativeTarget $D $Current}
    if ($D.adapter -eq 'task' -and -not $Current.exists) {return $Current}
    $value=$D.target
    switch ($D.kind) {
        'ServiceStart' {$value=([string]$D.target+'|'+$Current.value.Split('|')[1])}
        'Power' {$value=($Current.value.Split('|')[0]+'|'+$D.target)}
        'Hibernate' {$p=$Current.value.Split('|');$value='0|0|'+$p[2]+'|'+$p[3]}
    }
    [pscustomobject]@{exists=$true;kind=$D.kind;value=$value}
}
function Set-OptimizationNativeValue($D,$Value) {
    switch ($D.adapter) {
        {$_ -in @('ifreg','dns','qos')} {Set-NetworkNativeValue $D $Value}
        'service' {
            # Critical services are never members of this fixed adapter allowlist.
            $protected=@((Get-SafeModePolicy | Where-Object critical).name)
            if ($D.service -in $protected) {throw 'safemode_protects_service'}
            $disables=($D.part -eq 'start' -and $Value.value.StartsWith('4|')) -or ($D.part -eq 'running' -and $Value.value -ne 1)
            if ($disables -and (Read-SafeModeState).enabled) {throw 'safemode_protects_service'}
            if ($D.part -eq 'start') {
                $parts=$Value.value.Split('|');$mode=switch ($parts[0]) {'2' {'Automatic'} '3' {'Manual'} '4' {'Disabled'}}
                Set-Service -Name $D.service -StartupType $mode -ErrorAction Stop
                $delay=[pscustomobject]@{exists=($parts[1] -ne 'x');kind=$null;value=$null}
                if ($delay.exists) {$delay.kind='DWord';$delay.value=[int]$parts[1]}
                Set-OptimizationRegistryValue @{hive='LocalMachine';path=('SYSTEM\CurrentControlSet\Services\'+$D.service);name='DelayedAutoStart'} $delay
            } else {
                $controller=New-OptimizationServiceController $D.service
                try {
                    $controller.Refresh()
                    if ($Value.value -eq 0) {
                        if (@($controller.DependentServices | Where-Object Status -ne Stopped).Count -gt 0) {throw 'service_has_running_dependents'}
                        $controller.Stop();$target='Stopped'
                    } else {
                        if ($controller.Status -eq 'Stopped') {$controller.Start()}
                        elseif ($controller.Status -eq 'Paused') {$controller.Continue()}
                        $controller.WaitForStatus('Running',[TimeSpan]::FromSeconds(20));$target='Running'
                        if ($Value.value -eq 2) {$controller.Pause();$target='Paused'}
                    }
                    $controller.WaitForStatus($target,[TimeSpan]::FromSeconds(20))
                } finally {$controller.Dispose()}
            }
        }
        'task' {
            if (-not $Value.exists) {throw 'optional_component_missing'}
            if ($Value.value -eq 1) {$null=Enable-ScheduledTask -TaskPath $D.path -TaskName $D.name -ErrorAction Stop}
            else {$null=Disable-ScheduledTask -TaskPath $D.path -TaskName $D.name -ErrorAction Stop}
        }
        'power' {
            Initialize-OptimizationPowerApi
            $parts=$Value.value.Split('|');$scheme=[guid]$parts[0];$sub=[guid]$D.subgroup;$setting=[guid]$D.setting
            if ((Get-PowerState) -ne $scheme.ToString()) {throw 'power_plan_changed'}
            if ([Tweaker.PowerSettings]::PowerWriteACValueIndex([IntPtr]::Zero,[ref]$scheme,[ref]$sub,[ref]$setting,[uint32]$parts[1]) -ne 0) {throw 'power_setting_write_failed'}
            if ([Tweaker.PowerSettings]::PowerSetActiveScheme([IntPtr]::Zero,[ref]$scheme) -ne 0) {throw 'power_setting_write_failed'}
        }
        'hibernate' {
            $p=$Value.value.Split('|')
            if ($p[0] -eq '0') {$null=Invoke-PowerCfg @('/hibernate','off')}
            else {
                $null=Invoke-PowerCfg @('/hibernate','on')
                if ($p[2] -eq '1') {$null=Invoke-PowerCfg @('/hibernate','/type','reduced')}
                elseif ($p[2] -eq '2') {$null=Invoke-PowerCfg @('/hibernate','/type','full')}
                if ($p[3] -ne 'x' -and [int]$p[3] -gt 0) {$null=Invoke-PowerCfg @('/hibernate','/size',$p[3])}
            }
            # Restore presence as well as values, including default-size metadata.
            $i=1
            foreach ($name in @('HibernateEnabled','HiberFileType','HiberFileSizePercent')) {
                $v=[pscustomobject]@{exists=($p[$i] -ne 'x');kind=$null;value=$null}
                if ($v.exists) {$v.kind='DWord';$v.value=[int]$p[$i]}
                Set-OptimizationRegistryValue (Get-OptimizationHiberDefinition $name) $v
                $i++
            }
        }
        default {throw 'invalid_optimization_field'}
    }
}
