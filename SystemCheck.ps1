# Read-only system check for the "Recommended" profile. Changes nothing, sends nothing anywhere.
# Every fact is $null when Windows cannot answer; the UI treats unknown facts conservatively.
function Get-SystemCheckFact([scriptblock]$Read) {
    try { return & $Read } catch { return $null }
}

function Get-TweakerSystemCheck {
    $laptop = Get-SystemCheckFact {
        # Portable chassis types (SMBIOS) or a battery.
        $portable = @(8,9,10,11,12,14,18,21,30,31,32)
        $chassis = @(Get-CimInstance Win32_SystemEnclosure -ErrorAction Stop | ForEach-Object { $_.ChassisTypes })
        $battery = @(Get-CimInstance Win32_Battery -ErrorAction Stop).Count -gt 0
        $battery -or (@($chassis | Where-Object { $_ -in $portable }).Count -gt 0)
    }
    $cpu = Get-SystemCheckFact {
        $p = @(Get-CimInstance Win32_Processor -ErrorAction Stop)[0]
        [pscustomobject]@{ name = ([string]$p.Name).Trim(); cores = [int]$p.NumberOfCores; threads = [int]$p.NumberOfLogicalProcessors }
    }
    $gpu = Get-SystemCheckFact { @(Get-CimInstance Win32_VideoController -ErrorAction Stop | ForEach-Object { [string]$_.Name }) }
    $ramGB = Get-SystemCheckFact { [math]::Round((Get-CimInstance Win32_ComputerSystem -ErrorAction Stop).TotalPhysicalMemory / 1GB, 1) }
    $systemDisk = Get-SystemCheckFact {
        # 'SSD' or 'HDD' for the disk holding the Windows drive.
        $number = (Get-Partition -DriveLetter $env:SystemDrive.Substring(0,1) -ErrorAction Stop).DiskNumber
        $disk = @(Get-PhysicalDisk -ErrorAction Stop | Where-Object { [string]$_.DeviceId -eq [string]$number })[0]
        if ($disk.MediaType -in @('SSD','HDD')) { [string]$disk.MediaType } elseif ($disk.BusType -eq 'NVMe') { 'SSD' } else { $null }
    }
    $adapters = Get-SystemCheckFact { @(Get-NetAdapter -Physical -ErrorAction Stop | Where-Object { $_.MediaType -eq '802.3' -and $_.InterfaceDescription -notmatch 'Bluetooth' }) }
    $wifi = if ($null -eq $adapters) { $null } else { @($adapters | Where-Object { $_.NdisPhysicalMedium -eq 9 }).Count -gt 0 }
    $ethernetUp = if ($null -eq $adapters) { $null } else { @($adapters | Where-Object { $_.NdisPhysicalMedium -ne 9 -and $_.Status -eq 'Up' }).Count -gt 0 }
    $customDns = Get-SystemCheckFact {
        # Static IPv4 DNS on a card (Pi-hole, company DNS, ...) that is not one of our public providers.
        $ours = @('1.1.1.1','1.0.0.1','8.8.8.8','8.8.4.4')
        $found = $false
        if ($null -eq $adapters) { return $null }
        foreach ($a in @($adapters)) {
            $key = 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\' + ([string]$a.InterfaceGuid)
            $item = Get-ItemProperty -LiteralPath $key -ErrorAction SilentlyContinue
            $value = if ($item -and $item.PSObject.Properties['NameServer']) { [string]$item.NameServer } else { '' }
            $servers = @($value -split '[ ,;]+' | Where-Object { $_ })
            if (@($servers | Where-Object { $_ -notin $ours }).Count -gt 0) { $found = $true }
        }
        $found
    }
    $xboxApp = Get-SystemCheckFact { @(Get-AppxPackage -Name 'Microsoft.GamingApp' -ErrorAction Stop).Count -gt 0 }
    $build = Get-SystemCheckFact { [int][Environment]::OSVersion.Version.Build }
    [pscustomobject]@{ ok = $true; facts = [pscustomobject]@{
        laptop = $laptop; cpu = $cpu; gpu = $gpu; ramGB = $ramGB; systemDisk = $systemDisk
        wifi = $wifi; ethernetUp = $ethernetUp; customDns = $customDns; xboxApp = $xboxApp; build = $build } }
}
