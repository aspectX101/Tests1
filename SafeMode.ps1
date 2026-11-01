# Tweaker SafeMode, not Windows Safe Boot. No service stop/delete operation exists here.
$script:SafeModeDirectory = Join-Path $env:ProgramData 'Tweaker\SafeMode'

function Get-SafeModePolicy {
    foreach ($name in @('RpcSs','RpcEptMapper','DcomLaunch','EventLog','Schedule','Winmgmt','BFE','MpsSvc','Dhcp','Dnscache','nsi','SamSs')) {
        [pscustomobject]@{name=$name;keepEnabled=$true;keepRunning=$true;repairMode='Automatic';critical=$true}
    }
    foreach ($name in @('PlugPlay','wuauserv','BITS')) {
        [pscustomobject]@{name=$name;keepEnabled=$true;keepRunning=$false;repairMode='Manual';critical=$true}
    }
    # OEM/edition/security-provider-dependent services: observe, do not guess defaults.
    foreach ($name in @('SysMain','WSearch','DPS','DiagTrack','WinDefend','wscsvc','SecurityHealthService')) {
        [pscustomobject]@{name=$name;keepEnabled=$false;keepRunning=$false;repairMode=$null;critical=$false}
    }
}

function Get-SafeModePlatform {
    $version = Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
    [pscustomobject]@{build=[int]$version.CurrentBuildNumber;edition=$version.EditionID
        supported=($version.InstallationType -eq 'Client' -and [int]$version.CurrentBuildNumber -ge 19041)}
}

function Assert-SafeModePaths {
    # Do not follow user-created junctions into an elevated state directory.
    $current = [IO.Path]::GetFullPath($script:SafeModeDirectory)
    while ($current) {
        if (Test-Path -LiteralPath $current) {
            if (((Get-Item -LiteralPath $current -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'unsafe_safemode_state_path' }
        }
        $parent = [IO.Path]::GetDirectoryName($current)
        if ($parent -eq $current) { break }
        $current = $parent
    }
    foreach ($name in @('state.json','state.json.previous','operation.lock')) {
        $path = Join-Path $script:SafeModeDirectory $name
        if ((Test-Path -LiteralPath $path) -and ((Get-Item -LiteralPath $path -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'unsafe_safemode_state_path' }
    }
}

function Initialize-SafeModeStorage {
    Assert-SafeModePaths
    $null = New-Item -ItemType Directory -Path $script:SafeModeDirectory -Force
    $admins = [Security.Principal.SecurityIdentifier]::new('S-1-5-32-544')
    $system = [Security.Principal.SecurityIdentifier]::new('S-1-5-18')
    $users = [Security.Principal.SecurityIdentifier]::new('S-1-5-32-545')
    $acl = [Security.AccessControl.DirectorySecurity]::new()
    $acl.SetAccessRuleProtection($true, $false)
    $acl.SetOwner($admins)
    foreach ($principal in @($admins,$system)) {
        $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($principal,'FullControl','ContainerInherit, ObjectInherit','None','Allow'))
    }
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($users,'ReadAndExecute','ContainerInherit, ObjectInherit','None','Allow'))
    Set-Acl -LiteralPath $script:SafeModeDirectory -AclObject $acl
    # Repair explicit ACLs on pre-existing files as well as directory inheritance.
    foreach ($file in @(Get-ChildItem -LiteralPath $script:SafeModeDirectory -File -Force)) {
        if (($file.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'unsafe_safemode_state_path' }
        $fileAcl = [Security.AccessControl.FileSecurity]::new()
        $fileAcl.SetAccessRuleProtection($true, $false)
        $fileAcl.SetOwner($admins)
        foreach ($principal in @($admins,$system)) { $fileAcl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($principal,'FullControl','Allow')) }
        $fileAcl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($users,'ReadAndExecute','Allow'))
        Set-Acl -LiteralPath $file.FullName -AclObject $fileAcl
    }
}

function Read-SafeModeState {
    Assert-SafeModePaths
    $path = Join-Path $script:SafeModeDirectory 'state.json'
    if (-not (Test-Path -LiteralPath $path)) {
        return [pscustomobject]@{version=1;enabled=$false;checkpointVerified=$false;changes=@();lastCheckUtc=$null}
    }
    $state = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    if ($state.version -ne 1 -or $state.enabled -isnot [bool] -or $state.checkpointVerified -isnot [bool]) { throw 'invalid_safemode_state' }
    return $state
}

function Save-SafeModeState($State) { Save-Journal $State (Join-Path $script:SafeModeDirectory 'state.json') }

function Get-SafeModeService([string]$Name) {
    $service = $null
    try {
        $service = Get-Service -Name $Name -ErrorAction Stop
        $config = Get-ItemProperty -LiteralPath ('HKLM:\SYSTEM\CurrentControlSet\Services\' + $Name)
        $mode = switch ([int]$config.Start) { 2 {'Automatic'} 3 {'Manual'} 4 {'Disabled'} default {'Unknown'} }
        $delayed = $config.PSObject.Properties.Name -contains 'DelayedAutoStart' -and $config.DelayedAutoStart -eq 1
        [pscustomobject]@{name=$Name;exists=$true;displayName=$service.DisplayName;state=$service.Status.ToString();startMode=$mode;delayedAutoStart=$delayed}
    } catch {
        if ($_.FullyQualifiedErrorId -like 'NoServiceFoundForGivenName*') {
            return [pscustomobject]@{name=$Name;exists=$false;displayName=$Name;state='Missing';startMode='Unknown';delayedAutoStart=$false}
        }
        throw
    } finally { if ($null -ne $service) { $service.Dispose() } }
}

function Assert-TweakerServiceChangeAllowed([string]$Name, [string]$StartMode, [string]$State) {
    $protected = @((Get-SafeModePolicy).name)
    if ($Name -notin $protected) { throw 'service_not_allowlisted' }
    if ((Read-SafeModeState).enabled -and ($StartMode -eq 'Disabled' -or $State -in @('Stopped','Paused'))) { throw 'safemode_protects_service' }
}

function Set-SafeModeServiceStart([string]$Name, [string]$Mode) {
    Assert-TweakerServiceChangeAllowed $Name $Mode 'Running'
    if ($Mode -notin @('Automatic','Manual')) { throw 'unsafe_service_start_mode' }
    Set-Service -Name $Name -StartupType $Mode -ErrorAction Stop
    if ((Get-SafeModeService $Name).startMode -ne $Mode) { throw 'service_configuration_verification_failed' }
}

function Start-SafeModeService([string]$Name) {
    Assert-TweakerServiceChangeAllowed $Name '' 'Running'
    $service = [ServiceProcess.ServiceController]::new($Name)
    try {
        $service.Refresh()
        if ($service.Status -eq 'Paused') { $service.Continue() }
        elseif ($service.Status -eq 'Stopped') { $service.Start() }
        $service.WaitForStatus([ServiceProcess.ServiceControllerStatus]::Running, [TimeSpan]::FromSeconds(20))
    } finally { $service.Dispose() }
}

function Get-SafeModeReport {
    $state = Read-SafeModeState
    $rows = @(foreach ($policy in Get-SafeModePolicy) {
        try {
            $service = Get-SafeModeService $policy.name
            $health='green'; $reason='available'
            if (-not $service.exists) { $health=if ($policy.critical) {'red'} else {'yellow'}; $reason='service_missing' }
            elseif ($service.startMode -eq 'Unknown') { $health=if ($policy.critical) {'red'} else {'yellow'}; $reason='unknown_start_mode' }
            elseif ($service.startMode -eq 'Disabled') { $health=if ($policy.keepEnabled) {'red'} else {'yellow'}; $reason='service_disabled' }
            elseif ($policy.keepRunning -and $service.state -ne 'Running') { $health='red'; $reason='required_service_not_running' }
            elseif ($service.state -ne 'Running') { $reason='on_demand_or_inactive' }
            [pscustomobject]@{name=$policy.name;displayName=$service.displayName;exists=$service.exists;state=$service.state
                startMode=$service.startMode;delayedAutoStart=$service.delayedAutoStart;health=$health;reason=$reason
                protected=$true;autoRepair=$policy.keepEnabled;mustRun=$policy.keepRunning}
        } catch {
            [pscustomobject]@{name=$policy.name;displayName=$policy.name;exists=$null;state='Unknown';startMode='Unknown'
                delayedAutoStart=$null;health=$(if ($policy.critical) {'red'} else {'yellow'});reason='service_read_failed'
                protected=$true;autoRepair=$policy.keepEnabled;mustRun=$policy.keepRunning;error=$_.Exception.Message}
        }
    })
    $health = if (@($rows | Where-Object health -eq 'red').Count) {'red'} elseif (@($rows | Where-Object health -eq 'yellow').Count) {'yellow'} else {'green'}
    [pscustomobject]@{ok=$true;enabled=$state.enabled;health=$health;checkedUtc=[DateTime]::UtcNow.ToString('o')
        platform=(Get-SafeModePlatform);services=$rows;monitorScope='while_app_running';intervalSeconds=30
        lastCheckUtc=$state.lastCheckUtc;changedServices=@($state.changes | ForEach-Object { $_.name });affectedTweaks=@()
        baseline='keep_enabled_policy_not_factory_defaults'}
}

function Invoke-TweakerSafeMode {
    [CmdletBinding(SupportsShouldProcess=$true)]
    param([Parameter(Mandatory)][ValidateSet('safemode-scan','safemode-report','safemode-enable','safemode-disable','safemode-enforce')][string]$Action)
    if ($Action -in @('safemode-scan','safemode-report')) { return Get-SafeModeReport }
    if (-not $PSCmdlet.ShouldProcess('Tweaker SafeMode', $Action)) { return }
    Assert-Administrator
    Initialize-SafeModeStorage
    $lock = [IO.File]::Open((Join-Path $script:SafeModeDirectory 'operation.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    try {
        $state = Read-SafeModeState
        if ($Action -eq 'safemode-disable') {
            # Never undo repairs by stopping/re-disabling a critical service.
            $state.enabled = $false
            Save-SafeModeState $state
            return Get-SafeModeReport
        }
        if (-not (Get-SafeModePlatform).supported) { throw 'unsupported_safemode_platform' }
        if ($Action -eq 'safemode-enforce' -and -not $state.enabled) { return Get-SafeModeReport }
        if (-not $state.enabled) {
            New-TweakerRestorePoint
            $state.checkpointVerified = $true
            $state.enabled = $true
            Save-SafeModeState $state
        }
        if (-not $state.checkpointVerified) { throw 'safemode_checkpoint_missing' }
        $repairs = @()
        foreach ($policy in @(Get-SafeModePolicy | Where-Object keepEnabled)) {
            try {
                $before = Get-SafeModeService $policy.name
                if (-not $before.exists) { continue }
                $changeStart = $before.startMode -eq 'Disabled'
                $changeState = $policy.keepRunning -and $before.state -ne 'Running'
                if (-not $changeStart -and -not $changeState) { continue }
                if (@($state.changes | Where-Object name -eq $policy.name).Count -eq 0) {
                    $state.changes = @($state.changes) + @([pscustomobject]@{name=$policy.name;originalStartMode=$before.startMode
                        originalState=$before.state;originalDelayedAutoStart=$before.delayedAutoStart;recordedUtc=[DateTime]::UtcNow.ToString('o')})
                }
                # Record attempted action before mutation; useful after interrupted repair.
                Save-SafeModeState $state
                $current = Get-SafeModeService $policy.name
                if ($changeStart -and $current.startMode -eq 'Disabled') { Set-SafeModeServiceStart $policy.name $policy.repairMode }
                if ($policy.keepRunning) {
                    $current = Get-SafeModeService $policy.name
                    if ($current.startMode -ne 'Disabled' -and $current.state -ne 'Running') { Start-SafeModeService $policy.name }
                }
                $repairs += [pscustomobject]@{name=$policy.name;ok=$true}
            } catch { $repairs += [pscustomobject]@{name=$policy.name;ok=$false;error=$_.Exception.Message} }
        }
        $state.lastCheckUtc = [DateTime]::UtcNow.ToString('o')
        Save-SafeModeState $state
        $report = Get-SafeModeReport
        $report | Add-Member -NotePropertyName repairs -NotePropertyValue $repairs
        return $report
    } finally { $lock.Dispose() }
}
