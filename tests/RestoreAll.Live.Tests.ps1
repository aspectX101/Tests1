# Windows only (CI runner or a test PC as administrator): the real round trip a customer does.
# 1. record the current value of every setting the tweaks touch
# 2. apply every tweak for real (registry, power plan, scheduled tasks, services, keyboard/mouse, hibernate, QoS ...)
# 3. "Restore all" from Sicherungen
# 4. every single value must be exactly what it was before, and nothing may be left to restore
# Left out only: network card driver values and DNS (would cut the runner's own connection) and Debloat (removes apps).
# Backups go to a temporary folder. Windows Server has no System Restore: only the restore point and the client
# edition check are skipped, everything else is the real code path.
$ErrorActionPreference='Stop'
$temp=Join-Path ([IO.Path]::GetTempPath()) ('h1t-restore-' + [guid]::NewGuid().ToString('N').Substring(0,8))
$null=New-Item -ItemType Directory -Path $temp -Force
$env:LOCALAPPDATA=$temp
Import-Module (Join-Path $PSScriptRoot '../Tweaker.psm1') -Force
try {
& (Get-Module Tweaker) {
    param($temp)
    function Assert($c,[string]$m) {if (-not $c) {throw $m}}
    function Assert-OptimizationPlatform {}
    function New-TweakerRestorePoint {}
    $script:SafeModeDirectory=Join-Path $temp 'SafeMode'
    $skipAdapters=@('ifreg','dns')
    $optIds=@((Get-OptimizationCatalog).id)
    $ids=@(Get-TweakerCatalog | Where-Object { $_.category -ne 'debloat' -and -not $_.id.StartsWith('debloat.') } | ForEach-Object { $_.id } | Where-Object {
        $id=$_
        if ($id -notin $optIds) { return $true }
        @(Get-OptimizationFields $id | Where-Object { (Get-OptimizationDefinition $_).adapter -in $skipAdapters }).Count -eq 0
    })
    # 1. what the PC looks like before the tweaker
    function Read-State([string]$id) {
        if ($id -in $optIds) { return @(Get-OptimizationFields $id | ForEach-Object { [pscustomobject]@{field=$_;value=(Get-OptimizationValue $_)} }) }
        if ($id.StartsWith('keyboard.')) { return @(Get-KeyboardFields $id | ForEach-Object { [pscustomobject]@{field=$_;value=(Get-KeyboardValue $_)} }) }
        if ($id -eq 'windows.power.high') { return @([pscustomobject]@{field='scheme';value=(Get-PowerState)}) }
        return @()
    }
    function Same($a,$b) {
        if ($null -eq $a -or $null -eq $b) { return ($null -eq $a) -and ($null -eq $b) }
        if ($a -is [ValueType] -or $a -is [string] -or $b -is [ValueType] -or $b -is [string]) { return "$a" -eq "$b" }
        return (ConvertTo-Json $a -Compress -Depth 4) -eq (ConvertTo-Json $b -Compress -Depth 4)
    }
    $before=@{}
    foreach ($id in $ids) { try { $before[$id]=Read-State $id } catch { $before[$id]=$null } }
    # 2. apply everything
    $applied=@(); $notAvailable=@()
    $sw=[Diagnostics.Stopwatch]::StartNew()
    foreach ($id in $ids) {
        if ($null -eq $before[$id]) { $notAvailable+=$id; continue }
        try {
            $r=Invoke-TweakerPerformance -Action apply -Id $id -Confirm:$false
            if ($r.status -eq 'applied') { $applied+=$id }
        } catch { $notAvailable+=('{0} ({1})' -f $id,$_.Exception.Message) }
    }
    Write-Host ('INFO applied {0} tweaks in {1:n1} s; not applicable on this machine: {2}' -f $applied.Count,$sw.Elapsed.TotalSeconds,($notAvailable -join ', '))
    Assert ($applied.Count -ge 30) ('too few tweaks applied for a meaningful test: ' + $applied.Count)
    $list=Invoke-TweakerBackup backup-list
    $ready=@($list.backups | Where-Object canRestore).Count
    Assert ($ready -ge $applied.Count) ('every applied tweak has a restorable backup: ' + $ready + ' of ' + $applied.Count)
    # 3. Restore all
    $sw.Restart()
    $all=Invoke-TweakerBackup backup-restore-all -Confirm:$false
    $seconds=$sw.Elapsed.TotalSeconds
    $failed=@($all.results | Where-Object { $_.status -ne 'restored' -and $_.reason -notin @('already_restored','backup_superseded','service_evidence_only') })
    Write-Host ('INFO restore all: {0} restored in {1:n1} s, ok={2}' -f @($all.results | Where-Object status -eq 'restored').Count,$seconds,$all.ok)
    foreach ($f in $failed) { Write-Host ('FAIL restore {0}: {1} {2}' -f $f.backupId,$f.status,$f.reason) }
    # 4. every value back to exactly what it was
    $wrong=@()
    foreach ($id in $applied) {
        try {
            $now=@(Read-State $id)
            foreach ($b in @($before[$id])) {
                $n=@($now | Where-Object { $_.field -eq $b.field })
                $nv=if ($n.Count) { $n[0].value } else { $null }
                if (-not (Same $b.value $nv)) { $wrong+=('{0}/{1}: before {2} now {3}' -f $id,$b.field,(ConvertTo-Json $b.value -Compress -Depth 4),(ConvertTo-Json $nv -Compress -Depth 4)) }
            }
        } catch { $wrong+=('{0}: compare failed: {1} (line {2})' -f $id,$_.Exception.Message,$_.InvocationInfo.ScriptLineNumber) }
    }
    foreach ($w in $wrong) { Write-Host ('FAIL value ' + $w) }
    Assert ($failed.Count -eq 0 -and $all.ok) ('restore all reported problems: ' + $failed.Count)
    Assert ($wrong.Count -eq 0) ('values not back to the original: ' + $wrong.Count)
    $left=@((Invoke-TweakerBackup backup-list).backups | Where-Object canRestore)
    Assert ($left.Count -eq 0) ('backups still restorable after restore all: ' + $left.Count)
    $again=Invoke-TweakerBackup backup-restore-all -Confirm:$false
    Assert ($again.ok) 'a second restore all is a clean no-op'
    Write-Host ('PASS restore all: {0} tweaks applied and every value restored exactly ({1:n1} s)' -f $applied.Count,$seconds)
} $temp
} catch { Write-Host ('FAIL error: {0} (line {1})' -f $_.Exception.Message,$_.InvocationInfo.ScriptLineNumber); throw
} finally {
    if ($temp.StartsWith([IO.Path]::GetTempPath()) -and (Test-Path -LiteralPath $temp)) { Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue }
}
