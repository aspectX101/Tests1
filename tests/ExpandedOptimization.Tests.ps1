# Full catalog transactions against simulated OS values; never changes real Windows settings.
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot '../Tweaker.psm1') -Force
& (Get-Module Tweaker) {
    function Assert($c,[string]$m) {if (-not $c) {throw $m}}
    function Expect([scriptblock]$f,[string]$code) {
        $actual=$null; try {$null=&$f} catch {$actual=$_.Exception.Message}
        Assert ($actual -eq $code) "Expected $code, got $actual"
    }
    $parent=[IO.Path]::GetFullPath((Join-Path (Get-Location) 'work'))
    $base=Join-Path $parent ('expanded-'+[guid]::NewGuid().ToString('N'))
    $script:PerformanceStateDirectory=Join-Path $base 'state'
    $script:BackupDirectory=Join-Path $base 'backups'
    $script:SafeModeDirectory=Join-Path $base 'safe'
    $script:values=@{};$script:writes=0;$script:safe=$false;$script:failOnce='';$script:failAlways=''
    function Assert-Administrator {}
    function Assert-OptimizationPlatform {}
    function Assert-OptimizationAvailable([string]$Id) {
        if ($Id -in @('windows.legacy.fps','windows.io.realtime')) {throw 'unsupported_optimization_recipe'}
    }
    function Initialize-SafeModeStorage {$null=New-Item -ItemType Directory -Path $script:SafeModeDirectory -Force}
    function Read-SafeModeState {[pscustomobject]@{enabled=$script:safe}}
    function New-TweakerRestorePoint {}
    $script:dnsMeasured=0
    function Update-NetworkDnsChoice {$script:dnsMeasured++}
    $script:failPartialNet=''
    function Get-OptimizationValue([string]$Field) {return $script:values[$Field]}
    function Set-OptimizationValue([string]$Field,$Value) {
        Assert-OptimizationValue $Field $Value
        $script:writes++
        if ($script:failPartialNet -eq $Field) {
            # First network card already written, second one fails.
            $script:failPartialNet=''
            $parts=$Value.value.Split('|')
            $script:values[$Field]=[pscustomobject]@{exists=$true;kind=$Value.kind;value=($parts[0]+'|'+$script:values[$Field].value.Split('|')[1])}
            throw 'simulated_partial_network_failure'
        }
        if ($script:failAlways -eq $Field) {throw 'simulated_failure'}
        if ($script:failOnce -eq $Field) {
            $script:failOnce=''
            $script:values[$Field]=[pscustomobject]@{exists=$true;kind='Hibernate';value='0|0|2|0'}
            throw 'simulated_partial_native_failure'
        }
        $script:values[$Field]=$Value
    }
    function Seed([string]$Field) {
        $d=Get-OptimizationDefinition $Field
        switch ($d.adapter) {
            'registry' {[pscustomobject]@{exists=$false;kind=$null;value=$null}}
            'service' {
                $value=if ($d.part -eq 'start') {'3|1'} elseif ($d.service -eq 'MMCSS') {0} else {1}
                [pscustomobject]@{exists=$true;kind=$d.kind;value=$value}
            }
            'task' {[pscustomobject]@{exists=$true;kind='DWord';value=1}}
            'power' {[pscustomobject]@{exists=$true;kind='Power';value='381b4222-f694-41f0-9685-ff5bb260df2e|50'}}
            'hibernate' {[pscustomobject]@{exists=$true;kind='Hibernate';value='1|1|2|40'}}
            'ifreg' {[pscustomobject]@{exists=$true;kind='Interfaces';value='{11111111-2222-3333-4444-555555555555}=x|{AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE}=0'}}
            'dns' {[pscustomobject]@{exists=$true;kind='Dns';value='{11111111-2222-3333-4444-555555555555}=|{AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE}=192.168.1.2'}}
        }
    }
    try {
        $catalog=@(Get-TweakerCatalog)
        Assert ($catalog.Count -eq 66) '66 catalog entries'
        Assert (@($catalog | Where-Object category -eq performance).Count -eq 41) '40 screenshot entries plus existing plan'
        Assert (@($catalog | Where-Object category -eq network).Count -eq 12) '12 network entries'
        Assert (@($catalog | Where-Object category -eq keyboard).Count -eq 8) '8 keyboard entries'
        Assert (@($catalog.id | Select-Object -Unique).Count -eq 66) 'Unique IDs'
        foreach ($item in Get-OptimizationCatalog) {
            foreach ($language in @('de','en','it')) {Assert ($item.name[$language] -and $item.description[$language]) 'All translations required'}
            Assert (-not $item.bulkSafe) 'Extended settings require individual choice'
            if ($item.id -in @('windows.legacy.fps','windows.io.realtime')) {
                $writes=$script:writes
                Expect {Invoke-TweakerPerformance apply $item.id} 'unsupported_optimization_recipe'
                Assert ($writes -eq $script:writes) 'Unavailable cards cannot mutate'
                continue
            }
            $fields=@(Get-OptimizationFields $item.id)
            Assert ($fields.Count -gt 0) 'Implemented cards have concrete fields'
            foreach ($field in $fields) {$script:values[$field]=Seed $field}
            $before=@{};foreach ($field in $fields) {$before[$field]=$script:values[$field]}
            if ($item.id -eq 'windows.ceip.off') {$script:values.ceipKernelCeipTask=[pscustomobject]@{exists=$false;kind=$null;value=$null};$before.ceipKernelCeipTask=$script:values.ceipKernelCeipTask}
            $null=Invoke-TweakerPerformance apply $item.id -ConfirmDataLoss
            Assert (Test-TweakerOptimizationApplied $item.id) ('Live target '+$item.id)
            $backup=@((Invoke-TweakerBackup backup-list).backups | Where-Object { $_.tweakId -eq $item.id -and $_.status -eq 'applied' })
            Assert ($backup.Count -eq 1 -and $backup[0].canRestore) ('Shared backup '+$item.id)
            $result=Invoke-TweakerBackup backup-restore -BackupId $backup[0].backupId
            Assert $result.ok ('Shared restore '+$item.id)
            foreach ($field in $fields) {Assert (Test-OptimizationValueEqual $before[$field] $script:values[$field]) ('Exact original '+$field)}
        }
        Assert ($script:dnsMeasured -eq 1) 'DNS speed measured once when applying the DNS tweak'
        # Partial write across network cards is recognised and rolled back exactly.
        foreach ($field in @('nagleAck','nagleNoDelay')) {$script:values[$field]=Seed $field}
        $script:failPartialNet='nagleNoDelay'
        Expect {Invoke-TweakerPerformance apply network.nagle.off} 'simulated_partial_network_failure'
        Assert ($script:values.nagleAck.value -eq (Seed nagleAck).value -and $script:values.nagleNoDelay.value -eq (Seed nagleNoDelay).value) 'Partial network write rolled back'
        Assert ((Get-Content (Join-Path $script:PerformanceStateDirectory 'network.nagle.off.json') -Raw | ConvertFrom-Json).status -eq 'restored') 'Network rollback recorded'
        foreach ($bad in @(
            @{f='nagleAck';v=[pscustomobject]@{exists=$true;kind='Interfaces';value='{11111111-2222-3333-4444-555555555555}=1;reg add'}},
            @{f='dnsServers';v=[pscustomobject]@{exists=$true;kind='Dns';value='{11111111-2222-3333-4444-555555555555}=1.1.1.1 & calc'}}
        )) {Expect {Assert-OptimizationValue $bad.f $bad.v} 'unsupported_optimization_value'}
        $script:safe=$true;$writes=$script:writes
        foreach ($id in @('windows.service.sysmain.off','windows.service.diagtrack.off','windows.service.wer.off','windows.service.wappush.off','windows.service.diagnosticshub.off','windows.service.xbgm.off')) {
            Expect {Invoke-TweakerPerformance apply $id} 'safemode_protects_service'
        }
        Assert ($writes -eq $script:writes) 'SafeMode blocked before any writes'
        $script:safe=$false
        $script:values.hibernate=Seed hibernate;$script:values.fastStartup=Seed fastStartup;$script:failOnce='hibernate'
        Expect {Invoke-TweakerPerformance apply windows.hibernate.off} 'simulated_partial_native_failure'
        Assert ($script:values.hibernate.value -eq '1|1|2|40') 'Observed partial native state was rolled back'
        $path=Join-Path $script:PerformanceStateDirectory 'windows.hibernate.off.json'
        Assert ((Get-Content $path -Raw | ConvertFrom-Json).status -eq 'restored') 'Successful automatic rollback recorded'
        $script:values.gamesCategory=Seed gamesCategory;$script:values.gamesPriority=Seed gamesPriority
        $script:failAlways='gamesPriority'
        Expect {Invoke-TweakerPerformance apply windows.mmcss.games} 'simulated_failure'
        Assert (-not $script:values.gamesCategory.exists) 'Earlier field automatically rolled back'
        $script:failAlways=''
        $script:values.cpuMinimum=Seed cpuMinimum;$script:values.sleepTimeout=Seed sleepTimeout
        $null=Invoke-TweakerPerformance apply windows.power.profile
        $script:values.cpuMinimum=[pscustomobject]@{exists=$true;kind='Power';value='8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c|100'}
        $writes=$script:writes
        Expect {Invoke-TweakerPerformance restore windows.power.profile} 'external_change_detected'
        Assert ($writes -eq $script:writes) 'Changed power plan blocks restore before writes'
        foreach ($bad in @(
            @{f='menu';v=[pscustomobject]@{exists=$true;kind='String';value="x`ncommand"}},
            @{f='cpuMinimum';v=[pscustomobject]@{exists=$true;kind='Power';value='arbitrary|100'}},
            @{f='sysmain_start';v=[pscustomobject]@{exists=$true;kind='ServiceStart';value='0|1'}},
            @{f='hibernate';v=[pscustomobject]@{exists=$true;kind='Hibernate';value='1|1|2|999'}}
        )) {Expect {Assert-OptimizationValue $bad.f $bad.v} 'unsupported_optimization_value'}
        Write-Output 'PASS: expanded catalog, exact shared recovery, partial-write rollback, SafeMode, plan conflicts, validation'
    } finally {
        $resolved=[IO.Path]::GetFullPath($base)
        if ($resolved.StartsWith($parent+'\',[StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolved)) {Remove-Item -LiteralPath $resolved -Recurse -Force}
    }
}
