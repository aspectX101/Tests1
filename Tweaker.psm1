#requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:HighPerformance = '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c'
. (Join-Path $PSScriptRoot 'Keyboard.ps1')

function Get-TweakerCatalog {
    @(
        [pscustomobject]@{ id='windows.power.high'; scope='system'; requiresAdmin=$true; restart=$false
            name=@{de='Hohe Leistung';en='High performance';it='Prestazioni elevate'}
            description=@{de='Aktiviert den vorhandenen Windows-Energieplan Hohe Leistung. Kann Stromverbrauch, Temperatur und Luefterlautstaerke erhoehen. Kein garantierter FPS-Gewinn.';en='Activates the existing Windows High performance plan. May increase power use, heat and fan noise. No guaranteed FPS gain.';it='Attiva il piano Windows Prestazioni elevate esistente. Puo aumentare consumi, temperatura e rumore. Nessun aumento FPS garantito.'} }
        [pscustomobject]@{ id='fivem.priority.high'; scope='session'; requiresAdmin=$false; restart=$false
            name=@{de='FiveM-Prozessprioritaet';en='FiveM process priority';it='Priorita del processo FiveM'}
            description=@{de='Setzt laufende FiveM-Spielprozesse auf Hoch. Kann andere Anwendungen verlangsamen. Endet mit dem Spielprozess; kein garantierter FPS-Gewinn.';en='Sets running FiveM game processes to High. May slow other applications. Ends with the game process; no guaranteed FPS gain.';it='Imposta su Alta i processi di gioco FiveM attivi. Puo rallentare altre applicazioni. Termina con il processo; nessun aumento FPS garantito.'} }
        [pscustomobject]@{ id='keyboard.repeat.fast'; scope='user'; requiresAdmin=$true; restart=$false
            name=@{de='WASD: schnelle Tastenwiederholung';en='WASD: fast key repeat';it='WASD: ripetizione rapida dei tasti'}
            description=@{de='Setzt die Windows-Wiederholverzoegerung auf die kuerzeste Stufe (ca. 250 ms) und die Wiederholrate auf die hoechste Stufe (ca. 30/s). Betrifft gehaltene Tasten und auch Texteingaben, nicht die Latenz des ersten Tastendrucks. Kein garantierter Vorteil in Spielen.';en='Sets Windows repeat delay to the shortest level (about 250 ms) and repeat rate to the highest level (about 30/s). Affects held keys including text input, not first-press latency. No guaranteed game benefit.';it='Imposta il ritardo di ripetizione Windows al minimo (circa 250 ms) e la velocita al massimo (circa 30/s). Riguarda i tasti tenuti premuti, anche nel testo, non la latenza della prima pressione. Nessun vantaggio garantito nei giochi.'} }
        [pscustomobject]@{ id='keyboard.filterkeys.off'; scope='user'; requiresAdmin=$true; restart=$false
            name=@{de='Filtertasten deaktivieren';en='Disable Filter Keys';it='Disattiva Filtro tasti'}
            description=@{de='Deaktiviert Filtertasten und die Aktivierung durch langes Halten der rechten Umschalttaste. Kann aktive Eingabefilter beseitigen. Veraendert eine Bedienungshilfe fuer alle Anwendungen; nur deaktivieren, wenn sie nicht benoetigt wird.';en='Disables Filter Keys and its right-Shift activation shortcut. Can remove active input filtering. Changes an accessibility feature for all applications; disable only if you do not need it.';it='Disattiva Filtro tasti e la scorciatoia con Maiusc destro tenuto premuto. Puo eliminare filtri di input attivi. Modifica una funzione di accessibilita per tutte le app; disattivala solo se non serve.'} }
        [pscustomobject]@{ id='keyboard.stickykeys.off'; scope='user'; requiresAdmin=$true; restart=$false
            name=@{de='Einrastfunktion deaktivieren';en='Disable Sticky Keys';it='Disattiva Tasti permanenti'}
            description=@{de='Deaktiviert die Einrastfunktion und die Aktivierung durch fuenfmaliges Druecken der Umschalttaste. Verhindert versehentliches Einschalten beim Spielen. Veraendert eine Bedienungshilfe fuer alle Anwendungen; senkt nicht die Hardware-Latenz.';en='Disables Sticky Keys and its five-Shift activation shortcut. Prevents accidental activation while gaming. Changes an accessibility feature for all applications; does not reduce hardware latency.';it='Disattiva Tasti permanenti e la scorciatoia con cinque pressioni di Maiusc. Evita attivazioni accidentali durante il gioco. Modifica una funzione di accessibilita per tutte le app; non riduce la latenza hardware.'} }
    )
}

function Invoke-PowerCfg([string[]]$Arguments) {
    $result = & "$env:SystemRoot\System32\powercfg.exe" @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'powercfg_failed' }
    return ($result -join "`n")
}

function Get-PowerState {
    $text = Invoke-PowerCfg @('/getactivescheme')
    if ($text -notmatch '[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}') { throw 'power_state_unavailable' }
    return $Matches[0].ToLowerInvariant()
}

function Get-FiveMProcesses {
    # Match the game subprocess only, never the launcher, browser, or anti-cheat.
    @(Get-Process | Where-Object { $_.ProcessName -match '^FiveM(?:_b[0-9]+)?_GTAProcess$' } | ForEach-Object {
        [pscustomobject]@{ pid=$_.Id; started=$_.StartTime.ToUniversalTime().Ticks.ToString(); priority=$_.PriorityClass.ToString() }
    })
}

function Set-FiveMPriority($Entry, [string]$Priority) {
    $process = Get-Process -Id $Entry.pid -ErrorAction SilentlyContinue
    if ($null -eq $process) { return $false }
    try {
        if ($process.ProcessName -notmatch '^FiveM(?:_b[0-9]+)?_GTAProcess$' -or
            $process.StartTime.ToUniversalTime().Ticks.ToString() -ne $Entry.started) { return $false }
        $process.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::$Priority
        $process.Refresh()
        if ($process.PriorityClass.ToString() -ne $Priority) { throw 'priority_verification_failed' }
        return $true
    } finally { $process.Dispose() }
}

function Assert-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    try {
        if (-not ([Security.Principal.WindowsPrincipal]::new($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'admin_required' }
    } finally { $identity.Dispose() }
}

function New-TweakerRestorePoint {
    # Fail closed. Do not bypass Windows restore-point frequency limits.
    $description = 'Tweaker-' + [guid]::NewGuid().ToString('N')
    Checkpoint-Computer -Description $description -RestorePointType MODIFY_SETTINGS -WarningAction Stop -ErrorAction Stop
    if (-not (Get-ComputerRestorePoint | Where-Object { $_.Description -eq $description })) { throw 'restore_point_not_created' }
}

function Save-Journal($State, [string]$Path) {
    $temporary = $Path + '.' + [guid]::NewGuid().ToString('N') + '.tmp'
    try {
        [IO.File]::WriteAllText($temporary, ($State | ConvertTo-Json -Depth 10), [Text.UTF8Encoding]::new($false))
        if (Test-Path -LiteralPath $Path) { [IO.File]::Replace($temporary, $Path, ($Path + '.previous')) }
        else { [IO.File]::Move($temporary, $Path) }
    } finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary } }
}

function Get-TweakerStatus {
    [pscustomobject]@{ powerScheme=(Get-PowerState); fiveMProcesses=@(Get-FiveMProcesses) }
}

function Invoke-TweakerPerformance {
    [CmdletBinding(SupportsShouldProcess=$true, ConfirmImpact='Medium')]
    param(
        [Parameter(Mandatory)][ValidateSet('apply','restore')][string]$Action,
        [Parameter(Mandatory)][ValidateSet('windows.power.high','fivem.priority.high','keyboard.repeat.fast','keyboard.filterkeys.off','keyboard.stickykeys.off')][string]$Id,
        [string]$StateDirectory = (Join-Path $env:LOCALAPPDATA 'Tweaker\Performance')
    )
    if (-not $PSCmdlet.ShouldProcess($Id, $Action)) { return }
    if ($Id.StartsWith('keyboard.')) { return Invoke-TweakerKeyboard $Action $Id $StateDirectory }
    # Separate journal per Windows user; UI must elevate as the same user.
    $null = New-Item -ItemType Directory -Path $StateDirectory -Force
    $path = Join-Path $StateDirectory ($Id + '.json')
    # Cross-process exclusive lock also covers crash recovery and restore.
    $lock = [IO.File]::Open((Join-Path $StateDirectory 'operation.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    try {
        $state = if (Test-Path -LiteralPath $path) { Get-Content -LiteralPath $path -Raw | ConvertFrom-Json } else { $null }
        if ($Action -eq 'apply') {
            if ($null -ne $state -and $state.status -ne 'restored') { throw 'existing_backup_restore_first' }
            if ($Id -eq 'windows.power.high') {
                Assert-Administrator
                $before = Get-PowerState
                if ($before -eq $script:HighPerformance) { return [pscustomobject]@{id=$Id;status='unchanged'} }
                $available = Invoke-PowerCfg @('/list')
                if ($available -notmatch $script:HighPerformance) { throw 'power_plan_unavailable' }
                New-TweakerRestorePoint
            } else {
                $before = @(Get-FiveMProcesses | Where-Object { $_.priority -in @('Normal','AboveNormal','BelowNormal','Idle') })
                if ($before.Count -eq 0) { return [pscustomobject]@{id=$Id;status='no_change';messageKey='no_eligible_fivem_process'} }
            }
            $state = [pscustomobject]@{version=1;id=$Id;status='pending';createdUtc=[DateTime]::UtcNow.ToString('o');before=$before}
            # Persist original values before the first mutation; pending is recoverable.
            Save-Journal $state $path
            if ($Id -eq 'windows.power.high') {
                $null = Invoke-PowerCfg @('/setactive', $script:HighPerformance)
                if ((Get-PowerState) -ne $script:HighPerformance) { throw 'power_verification_failed' }
            } else {
                foreach ($entry in $state.before) {
                    if (-not (Set-FiveMPriority $entry 'High')) { throw 'process_exited_restore_backup' }
                }
            }
            $state.status = 'applied'
        } else {
            if ($null -eq $state) { throw 'backup_not_found' }
            if ($state.version -ne 1 -or $state.id -ne $Id) { throw 'invalid_backup' }
            if ($state.status -eq 'restored') { return [pscustomobject]@{id=$Id;status='restored'} }
            if ($Id -eq 'windows.power.high') {
                Assert-Administrator
                $current = Get-PowerState
                if ($current -ne $state.before) {
                    if ($current -ne $script:HighPerformance) { throw 'external_change_detected' }
                    $original = ([guid]$state.before).ToString()
                    $null = Invoke-PowerCfg @('/setactive', $original)
                    if ((Get-PowerState) -ne $original) { throw 'restore_verification_failed' }
                }
            } else {
                $running = @(Get-FiveMProcesses)
                foreach ($entry in $state.before) {
                    $match = @($running | Where-Object { $_.pid -eq $entry.pid -and $_.started -eq $entry.started })
                    if ($match.Count -eq 0) { continue }
                    if ($match[0].priority -eq $entry.priority) { continue }
                    if ($match[0].priority -ne 'High') { throw 'external_change_detected' }
                    if ($entry.priority -notin @('Normal','AboveNormal','BelowNormal','Idle')) { throw 'invalid_backup' }
                    $null = Set-FiveMPriority $entry $entry.priority
                }
            }
            $state.status = 'restored'
        }
        Save-Journal $state $path
        [pscustomobject]@{id=$Id;status=$state.status}
    } finally { $lock.Dispose() }
}

function Get-TweakerSystemInfo {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    try { $admin = ([Security.Principal.WindowsPrincipal]::new($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator) }
    finally { $identity.Dispose() }
    $os = Get-CimInstance Win32_OperatingSystem
    $cpu = @(Get-CimInstance Win32_Processor | ForEach-Object { $_.Name }) -join ', '
    $gpu = @(Get-CimInstance Win32_VideoController | ForEach-Object { $_.Name }) -join ', '
    $memory = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory
    [pscustomobject]@{ok=$true;os=$os.Caption;cpu=$cpu;gpu=$gpu;ramGB=[math]::Round($memory / 1GB, 1);isAdmin=$admin}
}

Export-ModuleMember -Function Get-TweakerCatalog,Get-TweakerStatus,Get-TweakerSystemInfo,Invoke-TweakerPerformance,Test-TweakerKeyboardApplied
