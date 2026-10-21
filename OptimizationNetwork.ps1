# Network tab adapters: per network card settings (Nagle, power saving, DNS).
# Values cover all physical Ethernet/Wi-Fi cards, sorted by interface GUID, so a backup restores every card exactly.
# All persistence, rollback and locks stay in Optimization.ps1.
$script:NetworkClassKey='SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}'
$script:NetworkTcpipKey='SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces'
$script:NetworkGuidPattern='\{[0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12}\}'
$script:NetworkDnsProviders=[ordered]@{cloudflare='1.1.1.1,1.0.0.1';google='8.8.8.8,8.8.4.4'}

function Get-NetworkAdapters {
    # Physical Ethernet and Wi-Fi only (no Bluetooth, VPN, Hyper-V switches or loopback).
    $list=@(Get-NetAdapter -Physical -ErrorAction Stop | Where-Object { $_.MediaType -eq '802.3' -and $_.InterfaceDescription -notmatch 'Bluetooth' } | ForEach-Object {
        [pscustomobject]@{guid=([string]$_.InterfaceGuid).ToUpperInvariant();index=[int]$_.ifIndex;up=($_.Status -eq 'Up')}
    })
    $list=@($list | Where-Object { $_.guid -cmatch ('^'+$script:NetworkGuidPattern+'$') })
    if ($list.Count -eq 0) {throw 'network_adapter_missing'}
    if ($list.Count -gt 16) {throw 'unsupported_optimization_value'}
    return @($list | Sort-Object guid)
}

function Get-NetworkClassSubkeys {
    # Map interface GUID -> driver class subkey (0000, 0001, ...) for PnPCapabilities.
    $map=@{}
    $hive=[Microsoft.Win32.RegistryKey]::OpenBaseKey('LocalMachine','Registry64');$class=$null
    try {
        $class=$hive.OpenSubKey($script:NetworkClassKey,$false)
        if ($null -eq $class) {return $map}
        foreach ($name in $class.GetSubKeyNames()) {
            if ($name -notmatch '^[0-9]{4}$') {continue}
            $sub=$null
            try {
                $sub=$class.OpenSubKey($name,$false)
                $id=[string]$sub.GetValue('NetCfgInstanceId')
                if ($id) {$map[$id.ToUpperInvariant()]=$name}
            } catch { # Some subkeys (e.g. Properties) are not readable; they are never adapters.
            } finally {if ($sub) {$sub.Dispose()}}
        }
    } finally {if ($class) {$class.Dispose()};$hive.Dispose()}
    return $map
}

function Get-NetworkRegistryDefinition($D,[string]$Guid,$ClassMap) {
    if ($D.scope -eq 'class') {
        if (-not $ClassMap.ContainsKey($Guid)) {throw 'network_adapter_missing'}
        return @{hive='LocalMachine';path=($script:NetworkClassKey+'\'+$ClassMap[$Guid]);name=$D.name}
    }
    return @{hive='LocalMachine';path=($script:NetworkTcpipKey+'\'+$Guid);name=$D.name}
}

function ConvertFrom-NetworkValue([string]$Value) {
    $result=[ordered]@{}
    if ($Value) {foreach ($part in $Value.Split('|')) {$i=$part.IndexOf('=');$result[$part.Substring(0,$i)]=$part.Substring($i+1)}}
    return $result
}

function ConvertTo-NetworkDnsList([string]$Servers) {
    $items=@($Servers -split '[ ,;]+' | Where-Object { $_ })
    return ($items -join ',')
}

function Test-NetworkValue($D,$Value) {
    if ($Value -isnot [string] -or $Value.Length -gt 2048) {return $false}
    $g=$script:NetworkGuidPattern
    if ($D.kind -eq 'Interfaces') {
        if ($Value -cnotmatch ('^'+$g+'=(?:x|[0-9]{1,10})(?:\|'+$g+'=(?:x|[0-9]{1,10})){0,15}$')) {return $false}
        foreach ($v in (ConvertFrom-NetworkValue $Value).Values) {if ($v -ne 'x' -and [decimal]$v -gt $D.maximum) {return $false}}
        return $true
    }
    $ip='(?:25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])(?:\.(?:25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])){3}'
    $servers='(?:'+$ip+'(?:,'+$ip+'){0,3})?'
    return $Value -cmatch ('^'+$g+'='+$servers+'(?:\|'+$g+'='+$servers+'){0,15}$')
}

function Get-NetworkNativeValue($D) {
    if ($D.adapter -eq 'qos') {return [pscustomobject]@{exists=$true;kind='QosSet';value=$(if (Test-NetworkQosPolicies) {'on'} else {'off'})}}
    $adapters=Get-NetworkAdapters
    $map=if ($D.adapter -eq 'ifreg' -and $D.scope -eq 'class') {Get-NetworkClassSubkeys} else {$null}
    $parts=foreach ($a in $adapters) {
        if ($D.adapter -eq 'dns') {
            $v=Get-OptimizationRegistryValue @{hive='LocalMachine';path=($script:NetworkTcpipKey+'\'+$a.guid);name='NameServer'}
            if ($v.exists -and $v.kind -ne 'String') {throw 'unsupported_optimization_value'}
            $a.guid+'='+(ConvertTo-NetworkDnsList ([string]$v.value))
        } else {
            $v=Get-OptimizationRegistryValue (Get-NetworkRegistryDefinition $D $a.guid $map)
            $kind=if ($D.valueKind -eq 'String') {'String'} else {'DWord'}
            if ($v.exists -and $v.kind -ne $kind) {throw 'unsupported_optimization_value'}
            if ($v.exists -and $kind -eq 'String' -and [string]$v.value -cnotmatch '^[0-9]{1,9}$') {throw 'unsupported_optimization_value'}
            $a.guid+'='+$(if ($v.exists) {[string]$v.value} else {'x'})
        }
    }
    return [pscustomobject]@{exists=$true;kind=$D.kind;value=($parts -join '|')}
}

function Get-NetworkNativeTarget($D,$Current) {
    if ($D.adapter -eq 'qos') {return [pscustomobject]@{exists=$true;kind='QosSet';value='on'}}
    $wanted=if ($D.adapter -eq 'dns') {Get-NetworkDnsChoice} else {[string]$D.target}
    $now=ConvertFrom-NetworkValue $Current.value
    # Driver keywords: only cards whose driver offers the setting are changed.
    $parts=foreach ($key in $now.Keys) {$key+'='+$(if ($D.onlyExisting -and $now[$key] -eq 'x') {'x'} else {$wanted})}
    return [pscustomobject]@{exists=$true;kind=$D.kind;value=($parts -join '|')}
}

function Set-NetworkNativeValue($D,$Value) {
    if ($D.adapter -eq 'qos') {Set-NetworkQosPolicies ($Value.value -eq 'on'); return}
    $wanted=ConvertFrom-NetworkValue $Value.value
    $current=ConvertFrom-NetworkValue (Get-NetworkNativeValue $D).value
    # Same cards as when the backup was taken; otherwise this is an external change.
    if (@($wanted.Keys) -join '|' -cne (@($current.Keys) -join '|')) {throw 'external_change_detected'}
    $adapters=Get-NetworkAdapters
    $map=if ($D.adapter -eq 'ifreg' -and $D.scope -eq 'class') {Get-NetworkClassSubkeys} else {$null}
    foreach ($guid in $wanted.Keys) {
        if ($current[$guid] -ceq $wanted[$guid]) {continue}
        if ($D.adapter -eq 'dns') {Set-NetworkDnsServers @($adapters | Where-Object guid -eq $guid)[0] $wanted[$guid]}
        else {
            $v=[pscustomobject]@{exists=($wanted[$guid] -ne 'x');kind=$null;value=$null}
            if ($v.exists) {if ($D.valueKind -eq 'String') {$v.kind='String';$v.value=[string]$wanted[$guid]} else {$v.kind='DWord';$v.value=[long]$wanted[$guid]}}
            Set-OptimizationRegistryValue (Get-NetworkRegistryDefinition $D $guid $map) $v
        }
    }
    if ($D.adapter -eq 'dns') {$null=& "$env:SystemRoot\System32\ipconfig.exe" /flushdns 2>&1}
}

function Invoke-NetworkNetsh([string[]]$Arguments) {
    $output=& "$env:SystemRoot\System32\netsh.exe" @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {throw ('netsh_failed: '+(($output | Out-String).Trim()))}
}

function Set-NetworkDnsServers($Adapter,[string]$Servers) {
    # IPv4 only; IPv6 DNS settings stay untouched. Empty means automatic (DHCP).
    $list=@($Servers.Split(',') | Where-Object { $_ })
    try {
        if ($list.Count -eq 0) {Invoke-NetworkNetsh @('interface','ipv4','set','dnsservers',('name='+$Adapter.index),'source=dhcp')}
        else {
            Invoke-NetworkNetsh @('interface','ipv4','set','dnsservers',('name='+$Adapter.index),'source=static',('address='+$list[0]),'register=primary','validate=no')
            for ($i=1;$i -lt $list.Count;$i++) {Invoke-NetworkNetsh @('interface','ipv4','add','dnsservers',('name='+$Adapter.index),('address='+$list[$i]),('index='+($i+1)),'validate=no')}
        }
    } catch {
        # Disabled cards reject netsh; their stored setting is applied when they come back.
        if ($Adapter.up) {throw 'network_dns_write_failed'}
        $v=[pscustomobject]@{exists=$true;kind='String';value=($list -join ',')}
        Set-OptimizationRegistryValue @{hive='LocalMachine';path=($script:NetworkTcpipKey+'\'+$Adapter.guid);name='NameServer'} $v
    }
}

function Get-NetworkDnsChoicePath {Join-Path $script:PerformanceStateDirectory 'network-dns.txt'}

function Get-NetworkDnsChoice {
    # The provider measured at apply time; fixed afterwards so a backup's target never changes.
    $path=Get-NetworkDnsChoicePath
    if (Test-Path -LiteralPath $path) {
        $name=(Get-Content -LiteralPath $path -Raw).Trim()
        if ($script:NetworkDnsProviders.Contains($name)) {return $script:NetworkDnsProviders[$name]}
    }
    return $script:NetworkDnsProviders['cloudflare']
}

function Measure-NetworkDnsProvider([string]$Server) {
    $times=foreach ($name in @('www.google.com','www.cloudflare.com','www.microsoft.com','www.fivem.net','www.rockstargames.com')) {
        $sw=[Diagnostics.Stopwatch]::StartNew()
        try {$null=Resolve-DnsName -Name $name -Server $Server -Type A -DnsOnly -NoHostsFile -QuickTimeout -ErrorAction Stop;$sw.ElapsedMilliseconds}
        catch {}
    }
    $times=@($times | Sort-Object)
    if ($times.Count -lt 3) {return [double]::PositiveInfinity}
    return [double]$times[[int][Math]::Floor($times.Count/2)]
}

function Update-NetworkDnsChoice {
    # Median of five lookups per provider; Cloudflare wins ties.
    $best=$null;$bestTime=[double]::PositiveInfinity
    foreach ($name in $script:NetworkDnsProviders.Keys) {
        $time=Measure-NetworkDnsProvider ($script:NetworkDnsProviders[$name].Split(',')[0])
        if ($time -lt $bestTime) {$best=$name;$bestTime=$time}
    }
    if ($null -eq $best) {throw 'network_dns_unreachable'}
    $null=New-Item -ItemType Directory -Path $script:PerformanceStateDirectory -Force
    Set-Content -LiteralPath (Get-NetworkDnsChoicePath) -Value $best -Encoding ASCII
}

function Test-NetworkIntermediate($Entry,$Value) {
    $before=ConvertFrom-NetworkValue $Entry.before.value;$target=ConvertFrom-NetworkValue $Entry.target.value;$now=ConvertFrom-NetworkValue $Value.value
    if ((@($now.Keys) -join '|') -cne (@($before.Keys) -join '|')) {return $false}
    foreach ($key in $now.Keys) {if ($now[$key] -cne $before[$key] -and $now[$key] -cne $target[$key]) {return $false}}
    return $true
}

# ---------- Hitreg: QoS priority (DSCP 46) for the FiveM game processes ----------
# One policy-based QoS rule per FiveM game executable (default build and the game builds FiveM offers).
# Only our own keys ("H1T FiveM ...") are created or removed; other QoS policies stay untouched.
$script:QosRoot='SOFTWARE\Policies\Microsoft\Windows\QoS'
$script:FiveMBuilds=@('', '_b1604', '_b2060', '_b2189', '_b2372', '_b2545', '_b2612', '_b2699', '_b2802', '_b2944', '_b3095', '_b3258', '_b3323', '_b3407', '_b3570')
function Get-NetworkQosPolicies {
    foreach ($b in $script:FiveMBuilds) {
        $app='FiveM' + $b + '_GTAProcess.exe'
        [pscustomobject]@{key=('H1T FiveM' + $b); values=[ordered]@{'Version'='1.0';'Application Name'=$app;'Protocol'='*';'Local Port'='*';'Local IP'='*';'Local IP Prefix Length'='*';'Remote Port'='*';'Remote IP'='*';'Remote IP Prefix Length'='*';'DSCP Value'='46';'Throttle Rate'='-1'}}
    }
}
function Test-NetworkQosPolicies {
    $hive=[Microsoft.Win32.RegistryKey]::OpenBaseKey('LocalMachine','Registry64')
    try {
        foreach ($p in Get-NetworkQosPolicies) {
            $key=$hive.OpenSubKey($script:QosRoot + '\' + $p.key,$false)
            if ($null -eq $key) {return $false}
            try {foreach ($name in $p.values.Keys) {if ([string]$key.GetValue($name) -cne $p.values[$name]) {return $false}}} finally {$key.Dispose()}
        }
        return $true
    } finally {$hive.Dispose()}
}
function Set-NetworkQosPolicies([bool]$On) {
    $hive=[Microsoft.Win32.RegistryKey]::OpenBaseKey('LocalMachine','Registry64')
    try {
        if ($On) {
            foreach ($p in Get-NetworkQosPolicies) {
                $key=$hive.CreateSubKey($script:QosRoot + '\' + $p.key)
                try {foreach ($name in $p.values.Keys) {$key.SetValue($name,$p.values[$name],[Microsoft.Win32.RegistryValueKind]::String)}; $key.Flush()} finally {$key.Dispose()}
            }
        } else {
            $root=$hive.OpenSubKey($script:QosRoot,$true)
            if ($root) {try {foreach ($name in @($root.GetSubKeyNames() | Where-Object {$_ -like 'H1T FiveM*'})) {$root.DeleteSubKeyTree($name,$false)}} finally {$root.Dispose()}}
        }
    } finally {$hive.Dispose()}
    $gp=Join-Path $env:SystemRoot 'System32\gpupdate.exe'
    if (Test-Path -LiteralPath $gp) {$null=& $gp /target:computer /force 2>&1}
}
