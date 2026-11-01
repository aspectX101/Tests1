# Simulated app/registry adapters only. No Windows app is removed by this test.
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot '../Tweaker.psm1') -Force
& (Get-Module Tweaker) {
    function Assert($c,[string]$m) {if (-not $c) {throw $m}}
    function Expect([scriptblock]$f,[string]$code) {
        $actual=$null;try {$null=&$f} catch {$actual=$_.Exception.Message}
        Assert ($actual -eq $code) "Expected $code; got $actual"
    }
    $parent=[IO.Path]::GetFullPath((Join-Path (Get-Location) 'work'))
    $base=Join-Path $parent ('debloat-test-'+[guid]::NewGuid().ToString('N'))
    $script:DebloatDirectory=Join-Path $base 'debloat';$script:StartupDirectory=Join-Path $script:DebloatDirectory 'startup'
    $script:BackupDirectory=Join-Path $base 'backups';$script:PerformanceStateDirectory=Join-Path $base 'performance';$script:SafeModeDirectory=Join-Path $base 'safe'
    $script:writes=0;$script:failPackage='';$script:failBackup=$false;$script:onCheckpoint={};$script:user='S-1-5-21-test'
    function Assert-Administrator {}
    function Assert-OptimizationPlatform {}
    function New-TweakerRestorePoint {& $script:onCheckpoint}
    function Get-DebloatUser {$script:user}
    function Get-DebloatOneDrive {[pscustomobject]@{installed=$false;path=$null;hash=$null}}
    function Package([string]$Name,[string]$Version='1.0') {[pscustomobject]@{Name=$Name;PackageFullName=($Name+'_'+$Version);Version=$Version;Publisher='CN=Fixture';IsFramework=$false;IsResourcePackage=$false;NonRemovable=$false;IsDevelopmentMode=$false;SignatureKind='Store'}}
    $script:packages=@((Package 'Microsoft.BingWeather'),(Package 'Microsoft.BingNews'),(Package 'Microsoft.WindowsCamera'),(Package 'Microsoft.WindowsStore'))
    function Get-DebloatPackages {@($script:packages)}
    function Remove-DebloatPackage([string]$FullName) {
        $script:writes++
        if ($FullName -eq $script:failPackage) {throw 'simulated_removal_failure'}
        $script:packages=@($script:packages | Where-Object PackageFullName -CNE $FullName)
    }
    $script:register=${function:Register-TweakerBackup}
    function Register-TweakerBackup($State,[string]$Source) {if ($script:failBackup) {throw 'simulated_archive_failure'};& $script:register $State $Source}
    $script:run=@{Chat=[pscustomobject]@{exists=$true;kind='ExpandString';value='"%LOCALAPPDATA%\Chat\chat.exe" --startup'}}
    function Get-StartupNames {@($script:run.Keys)}
    function Get-StartupValue([string]$Name) {if ($script:run.ContainsKey($Name)) {$script:run[$Name]} else {[pscustomobject]@{exists=$false;kind=$null;value=$null}}}
    function Set-OptimizationRegistryValue($d,$v) {$script:writes++;if ($v.exists) {$script:run[$d.name]=$v} else {$script:run.Remove($d.name)}}
    try {
        $list=Invoke-TweakerDebloat debloat-list
        Assert ($list.apps.Count -eq 19 -and -not $list.dataBackup) 'Known inventory and no false data backup'
        Assert ('Microsoft.WindowsStore' -cnotin @($script:DebloatApps.package)) 'Store not allowlisted'
        Expect {Invoke-TweakerDebloat debloat-preview 'weather,weather'} 'invalid_debloat_selection'
        Expect {Invoke-TweakerDebloat debloat-preview 'windows-store'} 'invalid_debloat_selection'
        $script:packages[0].IsFramework=$true
        Expect {Invoke-TweakerDebloat debloat-preview weather} 'debloat_selection_unavailable'
        $script:packages[0].IsFramework=$false;$script:packages[0].SignatureKind='Developer'
        Expect {Invoke-TweakerDebloat debloat-preview weather} 'debloat_selection_unavailable'
        $script:packages[0].SignatureKind='Store'
        $p=Invoke-TweakerDebloat debloat-preview weather
        Expect {Invoke-TweakerDebloat debloat-remove weather $p.previewToken $false} 'explicit_debloat_confirmation_required'
        Expect {Invoke-TweakerPerformance apply debloat.recall.off} 'explicit_debloat_confirmation_required'
        $script:packages[0]=Package 'Microsoft.BingWeather' '2.0'
        Expect {Invoke-TweakerDebloat debloat-remove weather $p.previewToken $true} 'debloat_preview_changed'
        Assert ($script:writes -eq 0) 'Consent and changed preview prevent writes'
        $p=Invoke-TweakerDebloat debloat-preview weather
        $script:onCheckpoint={$script:packages[0]=Package 'Microsoft.BingWeather' '3.0'}
        Expect {Invoke-TweakerDebloat debloat-remove weather $p.previewToken $true} 'debloat_preview_changed'
        $script:onCheckpoint={};$p=Invoke-TweakerDebloat debloat-preview weather
        $script:failBackup=$true
        Expect {Invoke-TweakerDebloat debloat-remove weather $p.previewToken $true} 'simulated_archive_failure'
        Assert ($script:writes -eq 0) 'Archive failure precedes app removal'
        $script:failBackup=$false
        # Sorted camera, news, weather: stop at news failure, weather remains untouched.
        $p=Invoke-TweakerDebloat debloat-preview 'weather,news,camera'
        $script:failPackage='Microsoft.BingNews_1.0'
        $r=Invoke-TweakerDebloat debloat-remove 'weather,news,camera' $p.previewToken $true
        Assert (-not $r.ok -and $r.status -eq 'partial' -and $r.results.Count -eq 2 -and $script:writes -eq 2) 'Partial outcome stops later removals'
        Assert (@($script:packages | Where-Object Name -eq Microsoft.BingWeather).Count -eq 1) 'Remaining app retained'
        $backup=Invoke-TweakerBackup backup-preview -BackupId $r.backupId
        Assert (-not $backup.backup.canRestore -and $backup.backup.reason -eq 'app_reinstall_required') 'App evidence is not a data restore'
        $all=Invoke-TweakerBackup backup-restore-all
        Assert ($all.ok -and $all.results[0].status -eq 'skipped') 'Restore all skips reinstall-only evidence'
        $script:failPackage='';$p=Invoke-TweakerDebloat debloat-preview weather
        $r=Invoke-TweakerDebloat debloat-remove weather $p.previewToken $true
        Assert ($r.ok -and $r.recovery -eq 'reinstall_only' -and -not $r.dataBackup) 'Confirmed removal verified'
        $entry=(Invoke-TweakerStartup startup-list).entries[0]
        Assert (-not $entry.managed -and -not $entry.disabled) 'Live startup entry'
        Expect {Invoke-TweakerStartup startup-disable $entry.id ('b'*64)} 'debloat_preview_changed'
        $before=$script:run.Chat
        $script:failBackup=$true;$writes=$script:writes
        Expect {Invoke-TweakerStartup startup-disable $entry.id $entry.token} 'simulated_archive_failure'
        Assert ($script:writes -eq $writes) 'Startup backup precedes delete'
        $script:failBackup=$false
        $null=Invoke-TweakerStartup startup-disable $entry.id $entry.token
        $disabled=(Invoke-TweakerStartup startup-list).entries[0]
        Assert ($disabled.managed -and $disabled.disabled -and -not $script:run.ContainsKey('Chat')) 'Managed disabled entry visible'
        $records=(Invoke-TweakerBackup backup-list).backups
        $startup=@($records | Where-Object kind -eq startup)[0]
        Assert ($startup.canRestore) 'Common startup recovery ready'
        $script:run.Chat=[pscustomobject]@{exists=$true;kind='String';value='changed.exe'}
        Expect {Invoke-TweakerStartup startup-restore $entry.id} 'external_change_detected'
        $script:run.Remove('Chat')
        $restored=Invoke-TweakerBackup backup-restore -BackupId $startup.backupId
        Assert ($restored.ok -and (Test-OptimizationValueEqual $before $script:run.Chat)) 'Exact ExpandString round trip via common restore'
        $entry=(Invoke-TweakerStartup startup-list).entries[0]
        $null=Invoke-TweakerStartup startup-disable $entry.id $entry.token
        $script:user='S-1-5-21-other'
        Expect {Invoke-TweakerStartup startup-restore $entry.id} 'invalid_startup_backup'
        $script:user='S-1-5-21-test'
        $path=Join-Path $script:StartupDirectory ($entry.id+'.json')
        $s=Get-Content -LiteralPath $path -Raw | ConvertFrom-Json;$s.name='Other';Write-AtomicJson $s $path
        Expect {Invoke-TweakerStartup startup-restore $entry.id} 'invalid_startup_backup'
        'Debloat and startup tests passed (simulated OS adapters).'
    } finally {
        $resolved=[IO.Path]::GetFullPath($base)
        if (-not $resolved.StartsWith($parent+'\',[StringComparison]::OrdinalIgnoreCase)) {throw 'unsafe_fixture_path'}
        if (Test-Path -LiteralPath $resolved) {Remove-Item -LiteralPath $resolved -Recurse -Force}
    }
}
