# Explicit per-user app removal. Journals contain inventory, NOT application data.
$script:DebloatDirectory=Join-Path $env:LOCALAPPDATA 'Tweaker\Debloat'
$script:StartupDirectory=Join-Path $script:DebloatDirectory 'Startup'
$script:DebloatApps=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'DebloatApps.json') -Raw | ConvertFrom-Json

function Get-DebloatUser { [Security.Principal.WindowsIdentity]::GetCurrent().User.Value }
function Get-DebloatPackages { try {@(Get-AppxPackage -ErrorAction Stop)} catch {throw 'debloat_inventory_unavailable'} }
function Get-DebloatOneDrive {
    $registration='HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\OneDriveSetup.exe'
    $installed=Test-Path -LiteralPath $registration
    $machineInstalled=@('HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\OneDriveSetup.exe','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\OneDriveSetup.exe') | Where-Object {Test-Path -LiteralPath $_}
    $candidate=$null
    if ($installed) {
        $text=(Get-ItemProperty -LiteralPath $registration -ErrorAction Stop).UninstallString
        # Only the vendor's per-user uninstall syntax, never a shell command.
        if ($text -match '^"([^"\r\n]+\\OneDriveSetup\.exe)"\s+/uninstall\s*$') {
            $path=[IO.Path]::GetFullPath($Matches[1])
            foreach ($root in @((Join-Path $env:LOCALAPPDATA 'Microsoft\OneDrive'),(Join-Path $env:SystemRoot 'System32'),(Join-Path $env:SystemRoot 'SysWOW64'))) {
                if ($path.StartsWith([IO.Path]::GetFullPath($root)+'\',[StringComparison]::OrdinalIgnoreCase)) {
                    $null=Assert-CachePath $path $root
                    if (Test-Path -LiteralPath $path -PathType Leaf) {
                        $signature=Get-AuthenticodeSignature -LiteralPath $path -ErrorAction Stop
                        if ($signature.Status -eq 'Valid' -and $signature.SignerCertificate.Subject -match 'O=Microsoft Corporation(?:,|$)') {$candidate=$path}
                    }
                }
            }
        }
    }
    [pscustomobject]@{installed=($installed -or @($machineInstalled).Count -gt 0);path=$(if (@($machineInstalled).Count) {$null} else {$candidate});hash=$(if ($candidate) {(Get-FileHash -LiteralPath $candidate -Algorithm SHA256).Hash.ToLowerInvariant()} else {$null})}
}
function Get-DebloatInventory {
    $packages=Get-DebloatPackages
    foreach ($definition in $script:DebloatApps) {
        if ($definition.id -eq 'onedrive') {
            $one=Get-DebloatOneDrive
            [pscustomobject]@{id=$definition.id;group=$definition.group;name=$definition.name;installed=$one.installed;removable=($one.installed -and $null -ne $one.path);reason=$(if ($one.installed -and -not $one.path) {'onedrive_manual_uninstall'} else {''});packages=@();installerHash=$one.hash}
            continue
        }
        $matches=@($packages | Where-Object Name -CEQ $definition.package)
        $safe=@($matches | Where-Object { -not $_.IsFramework -and -not $_.IsResourcePackage -and -not $_.NonRemovable -and -not $_.IsDevelopmentMode -and $_.SignatureKind.ToString() -eq 'Store' })
        [pscustomobject]@{id=$definition.id;group=$definition.group;name=$definition.name;installed=($matches.Count -gt 0);removable=($matches.Count -gt 0 -and $safe.Count -eq $matches.Count);reason=$(if ($matches.Count -gt $safe.Count) {'protected_package'} else {''});installerHash=$null
            packages=@($safe | Sort-Object PackageFullName | ForEach-Object {[pscustomobject]@{name=$_.Name;fullName=$_.PackageFullName;version=$_.Version.ToString();publisher=$_.Publisher}})}
    }
}
function Get-DebloatSelection([string]$AppIds) {
    if (-not $AppIds -or $AppIds.Length -gt 600 -or $AppIds -cnotmatch '^[a-z0-9-]+(?:,[a-z0-9-]+)*$') {throw 'invalid_debloat_selection'}
    $ids=@($AppIds.Split(','))
    if ($ids.Count -gt 24 -or @($ids | Select-Object -Unique).Count -ne $ids.Count) {throw 'invalid_debloat_selection'}
    foreach ($id in $ids) {if ($id -cnotin @($script:DebloatApps.id)) {throw 'invalid_debloat_selection'}}
    $inventory=@(Get-DebloatInventory)
    $selected=@($inventory | Where-Object id -in $ids | Sort-Object id)
    if (@($selected | Where-Object {-not $_.removable}).Count) {throw 'debloat_selection_unavailable'}
    return $selected
}
function Get-DebloatToken($Items) {
    Get-RecoveryHash (([ordered]@{user=(Get-DebloatUser);items=@($Items)} | ConvertTo-Json -Depth 8 -Compress))
}
function Initialize-DebloatStorage([string]$Directory) {
    foreach ($path in @($Directory,(Join-Path $Directory 'operation.lock'))) {$null=Assert-CachePath $path $script:DebloatDirectory}
    $null=New-Item -ItemType Directory -Path $Directory -Force
}
function Remove-DebloatPackage([string]$FullName) {
    Remove-AppxPackage -Package $FullName -ErrorAction Stop
}
function Remove-DebloatOneDrive([string]$ExpectedHash) {
    if (@(Get-Process -Name OneDrive -ErrorAction SilentlyContinue).Count) {throw 'close_onedrive_first'}
    $one=Get-DebloatOneDrive
    if (-not $one.installed -or -not $one.path -or $one.hash -cne $ExpectedHash) {throw 'debloat_preview_changed'}
    $handle=[IO.File]::Open($one.path,'Open','Read','Read')
    try {
        # Keep the signed binary locked against replacement while it is loaded.
        $check=Get-DebloatOneDrive
        if ($check.path -cne $one.path -or $check.hash -cne $ExpectedHash) {throw 'debloat_preview_changed'}
        $start=[Diagnostics.ProcessStartInfo]::new();$start.FileName=$one.path;$start.Arguments='/uninstall'
        $start.UseShellExecute=$false;$start.CreateNoWindow=$true
        $process=[Diagnostics.Process]::Start($start)
        try {
            if (-not $process.WaitForExit(120000)) {throw 'onedrive_uninstall_in_progress'}
            if ($process.ExitCode -ne 0) {throw 'onedrive_uninstall_failed'}
        } finally {$process.Dispose()}
    } finally {$handle.Dispose()}
    if ((Get-DebloatOneDrive).installed) {throw 'onedrive_uninstall_incomplete'}
}
function Invoke-TweakerDebloat([string]$Action,[string]$AppIds,[string]$PreviewToken,[bool]$ConfirmDataLoss) {
    Assert-OptimizationPlatform
    if ($Action -eq 'debloat-list') {return [pscustomobject]@{ok=$true;apps=@(Get-DebloatInventory);scope='current_user';dataBackup=$false}}
    if ($Action -notin @('debloat-preview','debloat-remove')) {throw 'invalid_action'}
    $selected=@(Get-DebloatSelection $AppIds)
    $token=Get-DebloatToken $selected
    if ($Action -eq 'debloat-preview') {return [pscustomobject]@{ok=$true;apps=$selected;previewToken=$token;scope='current_user';dataBackup=$false;recovery='reinstall_only'}}
    Assert-Administrator
    if (-not $ConfirmDataLoss) {throw 'explicit_debloat_confirmation_required'}
    if ($PreviewToken -cnotmatch '^[a-f0-9]{64}$' -or $PreviewToken -cne $token) {throw 'debloat_preview_changed'}
    Initialize-DebloatStorage $script:DebloatDirectory
    $lock=[IO.File]::Open((Join-Path $script:DebloatDirectory 'operation.lock'),'OpenOrCreate','ReadWrite','None')
    try {
        $selected=@(Get-DebloatSelection $AppIds)
        if ((Get-DebloatToken $selected) -cne $PreviewToken) {throw 'debloat_preview_changed'}
        New-TweakerRestorePoint
        # Recheck after the possibly slow checkpoint; never remove an updated package silently.
        if ((Get-DebloatToken @(Get-DebloatSelection $AppIds)) -cne $PreviewToken) {throw 'debloat_preview_changed'}
        $state=[pscustomobject]@{version=1;kind='debloat';id=[guid]::NewGuid().ToString('N');userSid=(Get-DebloatUser);createdUtc=[DateTime]::UtcNow.ToString('o');status='pending';apps=$selected;results=@()}
        $path=Join-Path $script:DebloatDirectory ($state.id+'.json');foreach ($p in @($path,($path+'.previous'))) {$null=Assert-CachePath $p $script:DebloatDirectory}
        Save-Journal $state $path
        foreach ($item in $selected) {
            try {
                if ($item.id -eq 'onedrive') {Remove-DebloatOneDrive $item.installerHash}
                else {
                    foreach ($package in $item.packages) {
                        $current=@(Get-DebloatPackages | Where-Object {$_.Name -ceq $package.name})
                        if ($package.fullName -cnotin @($current.PackageFullName)) {throw 'debloat_preview_changed'}
                        Remove-DebloatPackage $package.fullName
                        if (@(Get-DebloatPackages | Where-Object PackageFullName -CEQ $package.fullName).Count) {throw 'debloat_removal_incomplete'}
                    }
                }
                $state.results += [pscustomobject]@{id=$item.id;status='removed';error=$null}
            } catch {
                $state.results += [pscustomobject]@{id=$item.id;status='failed';error=$_.Exception.Message}
                # No rollback claim: a package or its data may already be gone.
                $state.status='partial';Save-Journal $state $path
                break
            }
            Save-Journal $state $path
        }
        $complete=($state.results.Count -eq $selected.Count -and @($state.results | Where-Object status -eq failed).Count -eq 0)
        $state.status=if ($complete) {'removed'} else {'partial'};Save-Journal $state $path
        $record=New-RecoveryRecord $state $path
        [pscustomobject]@{ok=$complete;status=$state.status;results=$state.results;backupId=$record.backupId;dataBackup=$false;recovery='reinstall_only';error=$(if ($complete) {$null} else {'debloat_partial'})}
    } finally {$lock.Dispose()}
}

function Get-StartupDefinition([string]$Name) {
    if (-not $Name -or $Name.Length -gt 255 -or $Name -match '[\x00-\x1f]') {throw 'invalid_startup_entry'}
    @{hive='CurrentUser';path='Software\Microsoft\Windows\CurrentVersion\Run';name=$Name}
}
function Get-StartupId([string]$Name) {(Get-RecoveryHash ((Get-DebloatUser)+'|Run|'+$Name)).Substring(0,32)}
function Assert-StartupValue($Value) {
    if ($null -eq $Value -or $Value.exists -isnot [bool]) {throw 'invalid_startup_backup'}
    if ($Value.exists) {
        if ($Value.kind -notin @('String','ExpandString') -or $Value.value -isnot [string] -or $Value.value.Length -gt 32767 -or $Value.value.Contains([char]0)) {throw 'invalid_startup_backup'}
    } elseif ($null -ne $Value.kind -or $null -ne $Value.value) {throw 'invalid_startup_backup'}
}
function Get-StartupValue([string]$Name) {
    $d=Get-StartupDefinition $Name
    $hive=[Microsoft.Win32.RegistryKey]::OpenBaseKey('CurrentUser','Registry64');$key=$null
    try {
        $key=$hive.OpenSubKey($d.path,$false)
        if ($null -eq $key -or $Name -cnotin @($key.GetValueNames())) {return [pscustomobject]@{exists=$false;kind=$null;value=$null}}
        # Preserve environment-variable tokens instead of expanding and changing the command.
        $v=[pscustomobject]@{exists=$true;kind=$key.GetValueKind($Name).ToString();value=$key.GetValue($Name,$null,[Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)}
        Assert-StartupValue $v;return $v
    } finally {if ($key) {$key.Dispose()};$hive.Dispose()}
}
function Get-StartupNames {
    $hive=[Microsoft.Win32.RegistryKey]::OpenBaseKey('CurrentUser','Registry64');$key=$null
    try {$key=$hive.OpenSubKey('Software\Microsoft\Windows\CurrentVersion\Run',$false);if ($key) {$key.GetValueNames()}}
    finally {if ($key) {$key.Dispose()};$hive.Dispose()}
}
function Get-StartupToken([string]$Name,$Value) {Get-RecoveryHash (([ordered]@{sid=(Get-DebloatUser);name=$Name;value=$Value} | ConvertTo-Json -Compress))}
function Assert-StartupRestore($State) {
    if ($State.version -ne 1 -or $State.kind -ne 'startup' -or $State.userSid -cne (Get-DebloatUser) -or $State.id -cne (Get-StartupId $State.name) -or $State.status -notin @('pending','applied','restored')) {throw 'invalid_startup_backup'}
    $null=Get-StartupDefinition $State.name;Assert-StartupValue $State.before
    if (-not $State.before.exists) {throw 'invalid_startup_backup'}
    $current=Get-StartupValue $State.name
    if ($current.exists -and -not (Test-OptimizationValueEqual $current $State.before)) {throw 'external_change_detected'}
}
function Get-StartupInventory {
    $items=@{}
    foreach ($name in @(Get-StartupNames)) {
        $id=Get-StartupId $name
        try {
            $value=Get-StartupValue $name
            $items[$id]=[pscustomobject]@{id=$id;name=$name;managed=$false;disabled=$false;available=$true;token=(Get-StartupToken $name $value);error=$null}
        } catch {$items[$id]=[pscustomobject]@{id=$id;name=$name;managed=$false;disabled=$false;available=$false;token=$null;error='invalid_startup_entry'}}
    }
    if (Test-Path -LiteralPath $script:StartupDirectory) {
        $null=Assert-CachePath $script:StartupDirectory $script:DebloatDirectory
        foreach ($file in @(Get-ChildItem -LiteralPath $script:StartupDirectory -Filter '*.json' -File)) {
            $null=Assert-CachePath $file.FullName $script:StartupDirectory
            $s=Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
            if ($s.status -eq 'restored') {continue}
            Assert-StartupRestore $s
            $items[$s.id]=[pscustomobject]@{id=$s.id;name=$s.name;managed=$true;disabled=(-not (Get-StartupValue $s.name).exists);available=$true;token=$null;error=$null}
        }
    }
    @($items.Values | Sort-Object name)
}
function Invoke-TweakerStartup([string]$Action,[string]$Id,[string]$PreviewToken,[string]$ExpectedRecoveryId) {
    if ($Action -eq 'startup-list') {return [pscustomobject]@{ok=$true;entries=@(Get-StartupInventory);scope='current_user_run_entries'}}
    if ($Action -notin @('startup-disable','startup-restore') -or $Id -cnotmatch '^[a-f0-9]{32}$') {throw 'invalid_startup_entry'}
    Assert-Administrator;Initialize-DebloatStorage $script:StartupDirectory
    $path=Join-Path $script:StartupDirectory ($Id+'.json')
    foreach ($p in @($path,($path+'.previous'))) {$null=Assert-CachePath $p $script:StartupDirectory}
    $lock=[IO.File]::Open((Join-Path $script:StartupDirectory 'operation.lock'),'OpenOrCreate','ReadWrite','None')
    try {
        $state=if (Test-Path -LiteralPath $path) {Get-Content -LiteralPath $path -Raw | ConvertFrom-Json} else {$null}
        if ($ExpectedRecoveryId) {Assert-ExpectedRecovery $state $path $ExpectedRecoveryId}
        if ($Action -eq 'startup-disable') {
            if ($state -and $state.status -ne 'restored') {throw 'existing_backup_restore_first'}
            $names=@(Get-StartupNames | Where-Object {(Get-StartupId $_) -ceq $Id})
            if ($names.Count -ne 1) {throw 'invalid_startup_entry'}
            $name=$names[0];$before=Get-StartupValue $name
            if ($PreviewToken -cnotmatch '^[a-f0-9]{64}$' -or $PreviewToken -cne (Get-StartupToken $name $before)) {throw 'debloat_preview_changed'}
            New-TweakerRestorePoint
            if (-not (Test-OptimizationValueEqual (Get-StartupValue $name) $before)) {throw 'external_change_detected'}
            $state=[pscustomobject]@{version=1;kind='startup';id=$Id;userSid=(Get-DebloatUser);createdUtc=[DateTime]::UtcNow.ToString('o');status='pending';name=$name;before=$before}
            Save-Journal $state $path
            Set-OptimizationRegistryValue (Get-StartupDefinition $name) ([pscustomobject]@{exists=$false;kind=$null;value=$null})
            if ((Get-StartupValue $name).exists) {throw 'startup_verification_failed'}
            $state.status='applied'
        } else {
            if (-not $state) {throw 'backup_not_found'}
            Assert-StartupRestore $state
            if ($state.id -cne $Id) {throw 'invalid_startup_backup'}
            Register-TweakerBackup $state $path
            if (-not (Get-StartupValue $state.name).exists) {Set-OptimizationRegistryValue (Get-StartupDefinition $state.name) $state.before}
            if (-not (Test-OptimizationValueEqual (Get-StartupValue $state.name) $state.before)) {throw 'startup_verification_failed'}
            $state.status='restored'
        }
        Save-Journal $state $path
        [pscustomobject]@{ok=$true;id=$Id;status=$state.status}
    } finally {$lock.Dispose()}
}
