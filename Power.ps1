# Extra > Energie: power plan, display-off and sleep timeouts (mains / battery) and battery state.
# Everything goes through the Windows power API (powrprof.dll), never through the localised powercfg text.
# Reversible: the first change of each value saves its original in %LOCALAPPDATA%\Tweaker\Power\original.json;
# power-reset writes all saved originals back and removes the file (also run when the license ends).
# Actions: power-get | power-plan -Id <guid> | power-timeout -Name monitor|sleep -Extra ac|dc -Seconds n | power-reset
$script:PowerDirectory = Join-Path $env:LOCALAPPDATA 'Tweaker\Power'
$script:PowerSubVideo = [guid]'7516b95f-f776-4464-8c53-06167f40cc99'
$script:PowerSubSleep = [guid]'238c9fa8-0aad-41ed-83f4-97be242c8f20'
$script:PowerSettings = @{
    monitor = @{ sub = $script:PowerSubVideo; setting = [guid]'3c0bc021-c8a8-4e07-a973-6b14cbcb2b7e' }
    sleep   = @{ sub = $script:PowerSubSleep; setting = [guid]'29f6c1db-86da-48c5-9fdb-f2b67b1f44da' }
}
# Offered choices in seconds; 0 = never. Values set elsewhere are shown as they are.
$script:PowerTimeoutChoices = @(0,60,120,180,300,600,900,1200,1800,2700,3600,7200,10800,18000)

function Initialize-PowerApi {
    if ('H1TPower.Native' -as [type]) { return }
    Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices; using System.Collections.Generic;
namespace H1TPower {
  public static class Native {
    [DllImport("powrprof.dll")] static extern uint PowerGetActiveScheme(IntPtr root, out IntPtr scheme);
    [DllImport("powrprof.dll")] static extern uint PowerSetActiveScheme(IntPtr root, ref Guid scheme);
    [DllImport("powrprof.dll")] static extern uint PowerEnumerate(IntPtr root, IntPtr scheme, IntPtr sub, uint flags, uint index, byte[] buffer, ref uint size);
    [DllImport("powrprof.dll")] static extern uint PowerReadFriendlyName(IntPtr root, ref Guid scheme, IntPtr sub, IntPtr setting, byte[] buffer, ref uint size);
    [DllImport("powrprof.dll")] static extern uint PowerReadACValueIndex(IntPtr root, ref Guid scheme, ref Guid sub, ref Guid setting, out uint value);
    [DllImport("powrprof.dll")] static extern uint PowerReadDCValueIndex(IntPtr root, ref Guid scheme, ref Guid sub, ref Guid setting, out uint value);
    [DllImport("powrprof.dll")] static extern uint PowerWriteACValueIndex(IntPtr root, ref Guid scheme, ref Guid sub, ref Guid setting, uint value);
    [DllImport("powrprof.dll")] static extern uint PowerWriteDCValueIndex(IntPtr root, ref Guid scheme, ref Guid sub, ref Guid setting, uint value);
    [DllImport("kernel32.dll")] static extern IntPtr LocalFree(IntPtr p);
    [StructLayout(LayoutKind.Sequential)] struct SystemPowerStatus { public byte ACLineStatus, BatteryFlag, BatteryLifePercent, SystemStatusFlag; public int BatteryLifeTime, BatteryFullLifeTime; }
    [DllImport("kernel32.dll")] static extern bool GetSystemPowerStatus(out SystemPowerStatus s);
    // The message stays a stable code for the UI; the Windows error number goes into Data["detail"] for support.
    static void Check(uint code, string what) { if (code != 0) { var e = new InvalidOperationException(what); e.Data["detail"] = "Windows error " + code; throw e; } }
    public static Guid Active() { IntPtr p; Check(PowerGetActiveScheme(IntPtr.Zero, out p), "power_state_unavailable");
      try { return (Guid)Marshal.PtrToStructure(p, typeof(Guid)); } finally { LocalFree(p); } }
    public static void SetActive(Guid g) { Check(PowerSetActiveScheme(IntPtr.Zero, ref g), "power_plan_failed"); }
    public static Guid[] Schemes() { var list = new List<Guid>(); for (uint i = 0; i < 64; i++) { var buf = new byte[16]; uint size = 16;
        if (PowerEnumerate(IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, 16, i, buf, ref size) != 0) break; list.Add(new Guid(buf)); } return list.ToArray(); }
    public static string Name(Guid g) { uint size = 0; PowerReadFriendlyName(IntPtr.Zero, ref g, IntPtr.Zero, IntPtr.Zero, null, ref size);
      if (size == 0 || size > 4096) return ""; var buf = new byte[size];
      if (PowerReadFriendlyName(IntPtr.Zero, ref g, IntPtr.Zero, IntPtr.Zero, buf, ref size) != 0) return "";
      return System.Text.Encoding.Unicode.GetString(buf, 0, (int)size).TrimEnd('\0'); }
    public static uint Read(Guid scheme, Guid sub, Guid setting, bool ac) { uint v;
      Check(ac ? PowerReadACValueIndex(IntPtr.Zero, ref scheme, ref sub, ref setting, out v) : PowerReadDCValueIndex(IntPtr.Zero, ref scheme, ref sub, ref setting, out v), "power_setting_unavailable"); return v; }
    public static void Write(Guid scheme, Guid sub, Guid setting, bool ac, uint v) {
      Check(ac ? PowerWriteACValueIndex(IntPtr.Zero, ref scheme, ref sub, ref setting, v) : PowerWriteDCValueIndex(IntPtr.Zero, ref scheme, ref sub, ref setting, v), "power_setting_failed"); }
    // [battery present, on mains, percent (255 = unknown)]
    public static int[] Battery() { SystemPowerStatus s; if (!GetSystemPowerStatus(out s)) return new int[] { 0, 1, 255 };
      bool present = (s.BatteryFlag & 128) == 0 && s.BatteryFlag != 255; return new int[] { present ? 1 : 0, s.ACLineStatus == 0 ? 0 : 1, s.BatteryLifePercent }; }
  }
}
'@ -ErrorAction Stop
}

function Get-PowerOriginalPath {
    $null = Assert-PowerPath
    Join-Path $script:PowerDirectory 'original.json'
}
function Assert-PowerPath {
    # Do not follow a junction into an elevated write.
    $current = [IO.Path]::GetFullPath($script:PowerDirectory)
    while ($current) {
        if ((Test-Path -LiteralPath $current) -and ((Get-Item -LiteralPath $current -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'power_link_not_allowed' }
        $parent = [IO.Path]::GetDirectoryName($current)
        if ($parent -eq $current) { break }
        $current = $parent
    }
}
function Read-PowerOriginal {
    $path = Get-PowerOriginalPath
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return [pscustomobject]@{version=1;plan=$null;values=@()} }
    $o = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    if ($o.version -ne 1) { throw 'invalid_power_backup' }
    if ($null -ne $o.plan -and [string]$o.plan -notmatch '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$') { throw 'invalid_power_backup' }
    $values = @(foreach ($v in @($o.values | Where-Object { $null -ne $_ })) {
        if ([string]$v.scheme -notmatch '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' -or $v.name -notin @('monitor','sleep') -or $v.mode -notin @('ac','dc') -or [long]$v.seconds -lt 0 -or [long]$v.seconds -gt 4294967295) { throw 'invalid_power_backup' }
        [pscustomobject]@{scheme=[string]$v.scheme;name=[string]$v.name;mode=[string]$v.mode;seconds=[long]$v.seconds}
    })
    [pscustomobject]@{version=1;plan=$(if ($o.plan) {[string]$o.plan} else {$null});values=$values}
}
function Save-PowerOriginal($Original) {
    $path = Get-PowerOriginalPath
    $null = New-Item -ItemType Directory -Path $script:PowerDirectory -Force
    if (-not $Original.plan -and @($Original.values).Count -eq 0) { if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force }; return }
    $temp = $path + '.tmp'
    [IO.File]::WriteAllText($temp, ($Original | ConvertTo-Json -Depth 5), [Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $temp -Destination $path -Force
}

# Values that an applied tweak changed belong to its backup; changing them here would make that tweak's restore fail.
$script:PowerOwners = @{ plan = @('windows.power.high'); sleepAc = @('windows.power.profile','windows.power.extras') }
function Get-PowerOwners {
    $dir = Join-Path $env:LOCALAPPDATA 'Tweaker\Performance'
    $out = [ordered]@{}
    foreach ($k in $script:PowerOwners.Keys) {
        $out[$k] = @(foreach ($id in $script:PowerOwners[$k]) {
            $path = Join-Path $dir ($id + '.json')
            try { if ((Test-Path -LiteralPath $path -PathType Leaf) -and (Get-Content -LiteralPath $path -Raw | ConvertFrom-Json).status -in @('applied','pending')) { $id } } catch { }
        })
    }
    [pscustomobject]$out
}

function Get-PowerSnapshot {
    Initialize-PowerApi
    $active = [H1TPower.Native]::Active()
    $plans = @(foreach ($g in [H1TPower.Native]::Schemes()) {
        $name = [H1TPower.Native]::Name($g)
        [pscustomobject]@{guid=$g.ToString();name=$(if ($name) {$name} else {$g.ToString()});active=($g -eq $active)}
    })
    $battery = [H1TPower.Native]::Battery()
    $timeouts = [ordered]@{}
    foreach ($name in @('monitor','sleep')) {
        $d = $script:PowerSettings[$name]
        $timeouts[$name] = [pscustomobject]@{
            ac = [long][H1TPower.Native]::Read($active, $d.sub, $d.setting, $true)
            dc = [long][H1TPower.Native]::Read($active, $d.sub, $d.setting, $false) }
    }
    $original = Read-PowerOriginal
    [pscustomobject]@{ok=$true;active=$active.ToString();plans=$plans;timeouts=[pscustomobject]$timeouts;choices=$script:PowerTimeoutChoices
        battery=[pscustomobject]@{present=($battery[0] -eq 1);onAc=($battery[1] -eq 1);percent=$(if ($battery[2] -le 100) {$battery[2]} else {$null})}
        hasBackup=($null -ne $original.plan -or @($original.values).Count -gt 0);owners=(Get-PowerOwners)}
}

function Invoke-Power {
    param([string]$Action,[string]$Id,[string]$Name,[string]$Mode,[long]$Seconds)
    Initialize-PowerApi
    if ($Action -eq 'power-get') { return Get-PowerSnapshot }
    $null = New-Item -ItemType Directory -Path $script:PowerDirectory -Force
    $lock = [IO.File]::Open((Join-Path $script:PowerDirectory 'operation.lock'),'OpenOrCreate','ReadWrite','None')
    try {
        $original = Read-PowerOriginal
        $active = [H1TPower.Native]::Active()
        $owners = Get-PowerOwners
        if ($Action -eq 'power-plan' -and @($owners.plan).Count) { throw 'power_owned_by_tweak' }
        if ($Action -eq 'power-timeout' -and $Name -eq 'sleep' -and $Mode -eq 'ac' -and @($owners.sleepAc).Count) { throw 'power_owned_by_tweak' }
        switch ($Action) {
            'power-plan' {
                if ($Id -notmatch '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$') { throw 'invalid_power_plan' }
                $target = [guid]$Id
                if (@([H1TPower.Native]::Schemes() | Where-Object { $_ -eq $target }).Count -ne 1) { throw 'invalid_power_plan' }
                if ($target -ne $active) {
                    if (-not $original.plan) { $original.plan = $active.ToString(); Save-PowerOriginal $original }
                    [H1TPower.Native]::SetActive($target)
                    if ([H1TPower.Native]::Active() -ne $target) { throw 'power_plan_failed' }
                }
            }
            'power-timeout' {
                if ($Name -notin @('monitor','sleep') -or $Mode -notin @('ac','dc') -or $Seconds -notin $script:PowerTimeoutChoices) { throw 'invalid_power_value' }
                $d = $script:PowerSettings[$Name]; $ac = $Mode -eq 'ac'
                $current = [long][H1TPower.Native]::Read($active, $d.sub, $d.setting, $ac)
                if ($current -ne $Seconds) {
                    $key = @($original.values | Where-Object { $_.scheme -eq $active.ToString() -and $_.name -eq $Name -and $_.mode -eq $Mode })
                    if ($key.Count -eq 0) { $original.values = @($original.values) + [pscustomobject]@{scheme=$active.ToString();name=$Name;mode=$Mode;seconds=$current}; Save-PowerOriginal $original }
                    [H1TPower.Native]::Write($active, $d.sub, $d.setting, $ac, [uint32]$Seconds)
                    [H1TPower.Native]::SetActive($active)
                    if ([long][H1TPower.Native]::Read($active, $d.sub, $d.setting, $ac) -ne $Seconds) { throw 'power_setting_failed' }
                }
            }
            'power-reset' {
                if (-not $original.plan -and @($original.values).Count -eq 0) { throw 'power_backup_not_found' }
                $schemes = @([H1TPower.Native]::Schemes() | ForEach-Object { $_.ToString() })
                $left = @(); $kept = @(); $failedAny = $false
                foreach ($v in @($original.values)) {
                    # A plan deleted in the meantime has nothing left to restore.
                    if ($v.scheme -notin $schemes) { continue }
                    # A value an active tweak owns stays saved: restoring it now would break that tweak's own backup.
                    if ($v.name -eq 'sleep' -and $v.mode -eq 'ac' -and @($owners.sleepAc).Count) { $kept += $v; continue }
                    try {
                        $d = $script:PowerSettings[$v.name]
                        [H1TPower.Native]::Write([guid]$v.scheme, $d.sub, $d.setting, ($v.mode -eq 'ac'), [uint32]$v.seconds)
                    } catch { $left += $v; $failedAny = $true }
                }
                $plan = $original.plan; $keepPlan = $null
                if ($plan -and @($owners.plan).Count) { $keepPlan = $plan; [H1TPower.Native]::SetActive([H1TPower.Native]::Active()) }
                elseif ($plan -and $plan -in $schemes) { [H1TPower.Native]::SetActive([guid]$plan) }
                else { [H1TPower.Native]::SetActive([H1TPower.Native]::Active()) }
                $original.values = @($left) + @($kept); $original.plan = $keepPlan
                Save-PowerOriginal $original
                if ($failedAny) { throw 'power_reset_incomplete' }
                if ($kept.Count -or $keepPlan) { throw 'power_owned_by_tweak' }
            }
            default { throw 'invalid_action' }
        }
    } finally { $lock.Dispose() }
    return Get-PowerSnapshot
}
