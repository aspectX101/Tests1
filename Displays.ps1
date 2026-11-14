# Display actions are separate from game resolution settings.
# Registry value or $null when the key or value does not exist. Get-ItemPropertyValue throws on a missing value
# even with -ErrorAction SilentlyContinue in Windows PowerShell 5.1, which broke the whole display page on PCs
# where OverlayTestMode/HwSchMode were never set (the Windows default).
function Get-DisplayRegistryValue([string]$Key,[string]$Name) {
    try { return [Microsoft.Win32.Registry]::GetValue($Key,$Name,$null) } catch { return $null }
}
function Invoke-Displays {
    param([string]$Action,[string]$LayoutJson,[string]$Extra,[string]$Lang='de')
    Add-Type -AssemblyName System.Windows.Forms
    if (-not ('TweakerDisplays.Native' -as [type])) { Add-Type -Path (Join-Path $PSScriptRoot 'native/Displays.cs') -ReferencedAssemblies System.Windows.Forms }
    $displays=[TweakerDisplays.Native]::Read()
    if ($Action -in @('display-max','display-layout')) {
        $mutex=[Threading.Mutex]::new($false,'Local\UNDCC-Displays')
        if (-not $mutex.WaitOne(0)) { $mutex.Dispose(); throw 'display_busy' }
        try {
            $displays=[TweakerDisplays.Native]::Read()
            $modes=[TweakerDisplays.Mode[]]@($displays | ForEach-Object { $_.mode })
            if ($Action -eq 'display-max') {
                $modes=[TweakerDisplays.Mode[]]@($displays | ForEach-Object { $_.maximum })
            } else {
                $parsed=ConvertFrom-Json -InputObject $LayoutJson
                $layout=@($parsed)
                if ($layout.Count -ne $displays.Count -or @($layout.id | Select-Object -Unique).Count -ne $layout.Count) { throw 'display_layout_invalid' }
                for($i=0;$i -lt $displays.Count;$i++) {
                    $entry=@($layout | Where-Object id -eq $displays[$i].id)
                    if ($entry.Count -ne 1) { throw 'display_layout_changed' }
                    foreach($axis in @('x','y')) {
                        $v=$entry[0].$axis
                        if ($null -eq $v -or $v -is [string] -or [double]$v -ne [math]::Truncate([double]$v) -or [math]::Abs([double]$v) -gt 32767) { throw 'display_layout_invalid' }
                    }
                    # DEVMODE is a value type: write the modified copy back.
                    $mode=$modes[$i]
                    $mode.x=[int]$entry[0].x; $mode.y=[int]$entry[0].y
                    $mode.fields=$mode.fields -bor 0x20
                    $modes[$i]=$mode
                    if ($displays[$i].primary -and ($modes[$i].x -ne 0 -or $modes[$i].y -ne 0)) { throw 'display_layout_invalid' }
                }
                # Reject overlaps and disconnected layouts before asking the driver.
                $connected=@(0)
                for($i=0;$i -lt $modes.Count;$i++) { for($j=$i+1;$j -lt $modes.Count;$j++) {
                    $a=$modes[$i];$b=$modes[$j]
                    $ox=[math]::Min($a.x+$a.width,$b.x+$b.width)-[math]::Max($a.x,$b.x)
                    $oy=[math]::Min($a.y+$a.height,$b.y+$b.height)-[math]::Max($a.y,$b.y)
                    if ($ox -gt 0 -and $oy -gt 0) { throw 'display_layout_overlap' }
                }}
                do {
                    $count=$connected.Count
                    for($i=0;$i -lt $modes.Count;$i++) { if($i -in $connected){continue}; foreach($j in @($connected)) {
                        $a=$modes[$i];$b=$modes[$j]
                        $ox=[math]::Min($a.x+$a.width,$b.x+$b.width)-[math]::Max($a.x,$b.x)
                        $oy=[math]::Min($a.y+$a.height,$b.y+$b.height)-[math]::Max($a.y,$b.y)
                        if (($ox -eq 0 -and $oy -gt 0) -or ($oy -eq 0 -and $ox -gt 0)) {$connected+= $i;break}
                    }}
                } while($connected.Count -gt $count)
                if($connected.Count -ne $modes.Count) {throw 'display_layout_disconnected'}
            }
            $words=@{de=@('Anzeigeeinstellungen beibehalten?','Beibehalten','Zuruecksetzen');en=@('Keep display settings?','Keep','Revert');it=@('Mantenere le impostazioni?','Mantieni','Ripristina')}[$Lang]
            $accepted=[TweakerDisplays.Native]::Apply($displays,$modes,$words[0],$words[1],$words[2])
            return @{ok=$true;reverted=(-not $accepted)}
        } finally {$mutex.ReleaseMutex();$mutex.Dispose()}
    }
    # Share the existing gaming journals and recovery catalogue, including license-expiry recovery.
    Import-Module (Join-Path $PSScriptRoot 'Tweaker.psm1') -Force -WarningAction Stop
    $inventory=Invoke-TweakerBackup -Action backup-list -Confirm:$false
    $hagsBackup=@($inventory.backups | Where-Object { $_.tweakId -eq 'gaming.gpu.hags' -and $_.canRestore })
    $mpoBackup=@($inventory.backups | Where-Object { $_.tweakId -eq 'gaming.mpo.off' -and $_.canRestore })
    if($Action -eq 'display-extra') {
        if($Extra -notin @('mpo-off','mpo-restore','hags-on','hags-off','hags-restore')) {throw 'display_extra_unsupported'}
        $isHags=$Extra.StartsWith('hags-')
        $id=if($isHags){'gaming.gpu.hags'}else{'gaming.mpo.off'}
        if($Extra -in @('hags-on','mpo-off')) {
            $null=Invoke-TweakerPerformance -Action apply -Id $id -Confirm:$false
        } else {
            $records=if($isHags){$hagsBackup}else{$mpoBackup}
            if(-not $records.Count){throw 'display_backup_missing'}
            $result=Invoke-TweakerBackup -Action backup-restore -BackupId $records[0].backupId -Confirm:$false
            if(-not $result.ok -or @($result.results | Where-Object status -ne 'restored').Count){throw 'display_restore_failed'}
        }
        return @{ok=$true;restartRequired=$true}
    }
    if($Action -ne 'display-list') {throw 'invalid_action'}
    $mpo=Get-DisplayRegistryValue 'HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\Dwm' 'OverlayTestMode'
    $hags=Get-DisplayRegistryValue 'HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' 'HwSchMode'
    return @{ok=$true;displays=@($displays | ForEach-Object {@{id=$_.id;name=$_.name;primary=$_.primary;x=$_.x;y=$_.y;width=$_.width;height=$_.height;hz=$_.hz;maxHz=$_.maxHz}});mpoOff=($mpo -eq 5);mpoCanRestore=($mpoBackup.Count -gt 0);hagsPreference=if($hags -eq 2){'on'}elseif($hags -eq 1){'off'}else{'default'};hagsConfigurable=([Environment]::OSVersion.Version.Build -ge 19041);hagsCanRestore=($hagsBackup.Count -gt 0)}
}
