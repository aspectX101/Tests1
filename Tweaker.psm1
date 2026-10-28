#requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:HighPerformance = '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c'
. (Join-Path $PSScriptRoot 'Keyboard.ps1')
. (Join-Path $PSScriptRoot 'CacheCleaner.ps1')
. (Join-Path $PSScriptRoot 'SafeMode.ps1')
. (Join-Path $PSScriptRoot 'Backup.ps1')
. (Join-Path $PSScriptRoot 'Optimization.ps1')
. (Join-Path $PSScriptRoot 'ModManager.ps1')
. (Join-Path $PSScriptRoot 'Debloat.ps1')
. (Join-Path $PSScriptRoot 'SystemCheck.ps1')

function Get-TweakerCatalog {
    Get-OptimizationCatalog
    @(
        [pscustomobject]@{ id='windows.power.high'; scope='system'; category='performance'; risk='low'; bulkSafe=$true; requiresAdmin=$true; restart=$false
            name=@{de='Hohe Leistung';en='High performance';it='Prestazioni elevate'}
            description=@{de='Aktiviert den vorhandenen Windows-Energieplan Hohe Leistung. Kann Stromverbrauch, Temperatur und Luefterlautstaerke erhoehen. Kein garantierter FPS-Gewinn.';en='Activates the existing Windows High performance plan. May increase power use, heat and fan noise. No guaranteed FPS gain.';it='Attiva il piano Windows Prestazioni elevate esistente. Puo aumentare consumi, temperatura e rumore. Nessun aumento FPS garantito.'} }
        [pscustomobject]@{ id='fivem.priority.high'; scope='session'; category='gaming'; risk='medium'; bulkSafe=$false; requiresAdmin=$false; restart=$false
            name=@{de='FiveM-Prozessprioritaet';en='FiveM process priority';it='Priorita del processo FiveM'}
            description=@{de='Setzt laufende FiveM-Spielprozesse auf Hoch. Kann andere Anwendungen verlangsamen. Endet mit dem Spielprozess; kein garantierter FPS-Gewinn.';en='Sets running FiveM game processes to High. May slow other applications. Ends with the game process; no guaranteed FPS gain.';it='Imposta su Alta i processi di gioco FiveM attivi. Puo rallentare altre applicazioni. Termina con il processo; nessun aumento FPS garantito.'} }
        [pscustomobject]@{ id='keyboard.repeat.fast'; scope='user'; category='keyboard'; risk='low'; bulkSafe=$true; requiresAdmin=$true; restart=$false
            name=@{de='Tastenwiederholung: Verzögerung 0, Rate 31';en='Key repeat: delay 0, rate 31';it='Ripetizione tasti: ritardo 0, velocità 31'}
            description=@{de='Setzt die Windows-Wiederholverzögerung auf die kürzeste Stufe (ca. 250 ms) und die Wiederholrate auf die höchste Stufe (ca. 30/s). Betrifft gehaltene Tasten und auch Texteingaben, nicht die Latenz des ersten Tastendrucks. Kein garantierter Vorteil in Spielen.';en='Sets Windows repeat delay to the shortest level (about 250 ms) and repeat rate to the highest level (about 30/s). Affects held keys including text input, not first-press latency. No guaranteed game benefit.';it='Imposta il ritardo di ripetizione Windows al minimo (circa 250 ms) e la velocità al massimo (circa 30/s). Riguarda i tasti tenuti premuti, anche nel testo, non la latenza della prima pressione. Nessun vantaggio garantito nei giochi.'} }
        [pscustomobject]@{ id='keyboard.filterkeys.off'; scope='user'; category='keyboard'; risk='medium'; bulkSafe=$false; requiresAdmin=$true; restart=$false
            name=@{de='Filtertasten deaktivieren';en='Disable Filter Keys';it='Disattiva Filtro tasti'}
            description=@{de='Deaktiviert Filtertasten und die Aktivierung durch langes Halten der rechten Umschalttaste. Kann aktive Eingabefilter beseitigen. Verändert eine Bedienungshilfe für alle Anwendungen; nur deaktivieren, wenn sie nicht benötigt wird.';en='Disables Filter Keys and its right-Shift activation shortcut. Can remove active input filtering. Changes an accessibility feature for all applications; disable only if you do not need it.';it='Disattiva Filtro tasti e la scorciatoia con Maiusc destro tenuto premuto. Può eliminare filtri di input attivi. Modifica una funzione di accessibilità per tutte le app; disattivala solo se non serve.'} }
        [pscustomobject]@{ id='keyboard.stickykeys.off'; scope='user'; category='keyboard'; risk='medium'; bulkSafe=$false; requiresAdmin=$true; restart=$false
            name=@{de='Einrastfunktion deaktivieren';en='Disable Sticky Keys';it='Disattiva Tasti permanenti'}
            description=@{de='Deaktiviert die Einrastfunktion und die Aktivierung durch fünfmaliges Drücken der Umschalttaste. Verhindert versehentliches Einschalten beim Spielen. Verändert eine Bedienungshilfe für alle Anwendungen; senkt nicht die Hardware-Latenz.';en='Disables Sticky Keys and its five-Shift activation shortcut. Prevents accidental activation while gaming. Changes an accessibility feature for all applications; does not reduce hardware latency.';it='Disattiva Tasti permanenti e la scorciatoia con cinque pressioni di Maiusc. Evita attivazioni accidentali durante il gioco. Modifica una funzione di accessibilità per tutte le app; non riduce la latenza hardware.'} }
        [pscustomobject]@{ id='keyboard.togglekeys.off'; scope='user'; category='keyboard'; risk='medium'; bulkSafe=$false; requiresAdmin=$true; restart=$false
            name=@{de='Umschalttasten aus';en='Disable Toggle Keys';it='Disattiva Segnali acustici'}
            description=@{de='Schaltet die Umschalttasten-Töne für Feststell-, Num- und Rollen-Taste ab und entfernt die Aktivierung durch 5 Sekunden langes Halten von Num. Verhindert versehentliches Einschalten im Spiel. Ändert eine Bedienungshilfe für alle Programme.';en='Turns off the Toggle Keys sounds for Caps, Num and Scroll Lock and removes the shortcut of holding Num Lock for 5 seconds. Prevents accidental activation while gaming. Changes an accessibility feature for all applications.';it='Disattiva i segnali acustici per Bloc Maiusc, Bloc Num e Bloc Scorr e la scorciatoia tenendo premuto Bloc Num per 5 secondi. Evita attivazioni accidentali in gioco. Modifica una funzione di accessibilità per tutte le app.'} }
        [pscustomobject]@{ id='keyboard.mousekeys.off'; scope='user'; category='keyboard'; risk='medium'; bulkSafe=$false; requiresAdmin=$true; restart=$false
            name=@{de='Bedienungshilfen-Kürzel aus (Maustasten)';en='Disable accessibility shortcut (Mouse Keys)';it='Disattiva scorciatoia accessibilità (Tasti del mouse)'}
            description=@{de='Schaltet die Maustasten ab und entfernt das Kürzel Links-Alt + Links-Umschalt + Num, das sie mitten im Spiel einschalten kann. Andere Bedienungshilfen bleiben, wie sie sind. Ändert eine Bedienungshilfe für alle Programme.';en='Turns off Mouse Keys and removes the Left Alt + Left Shift + Num Lock shortcut that can switch them on mid-game. Other accessibility features stay as they are. Changes an accessibility feature for all applications.';it='Disattiva i Tasti del mouse e la scorciatoia Alt sinistro + Maiusc sinistro + Bloc Num che può attivarli durante il gioco. Le altre funzioni di accessibilità restano invariate. Modifica una funzione di accessibilità per tutte le app.'} }
        [pscustomobject]@{ id='keyboard.mouse.accel.off'; scope='user'; category='keyboard'; risk='low'; bulkSafe=$false; requiresAdmin=$true; restart=$false
            name=@{de='Mausbeschleunigung aus';en='Disable mouse acceleration';it='Disattiva accelerazione mouse'}
            description=@{de='Schaltet „Zeigerpräzision verbessern“ ab: Der Zeiger bewegt sich proportional zur Mausbewegung, unabhängig vom Tempo. Spiele mit Raw Input sind ohnehin nicht betroffen; wirkt auf Desktop, Menüs und Spiele ohne Raw Input. Sofort aktiv.';en='Turns off "Enhance pointer precision": the pointer moves in proportion to the mouse, regardless of speed. Games using raw input are not affected anyway; applies to the desktop, menus and games without raw input. Takes effect immediately.';it='Disattiva "Migliora precisione puntatore": il puntatore si muove in proporzione al mouse, indipendentemente dalla velocità. I giochi con raw input non ne sono influenzati; vale per desktop, menu e giochi senza raw input. Effetto immediato.'} }
        [pscustomobject]@{ id='keyboard.mouse.speed.native'; scope='user'; category='keyboard'; risk='low'; bulkSafe=$false; requiresAdmin=$true; restart=$false
            name=@{de='Maus 1:1 (Zeigergeschwindigkeit 6/11)';en='Mouse 1:1 (pointer speed 6/11)';it='Mouse 1:1 (velocità puntatore 6/11)'}
            description=@{de='Setzt die Windows-Zeigergeschwindigkeit auf die 6. von 11 Stufen. Nur dort wird jeder Mauszählschritt genau ein Pixel, ohne übersprungene oder doppelte Schritte. Die Empfindlichkeit regelst du dann über die DPI der Maus. Sofort aktiv.';en='Sets the Windows pointer speed to notch 6 of 11, the only setting where every mouse count is exactly one pixel, without skipped or doubled steps. Set sensitivity with your mouse DPI instead. Takes effect immediately.';it='Imposta la velocità del puntatore di Windows sul 6° livello di 11, l''unico in cui ogni conteggio del mouse corrisponde a un pixel senza passi saltati o doppi. Regola la sensibilità con i DPI del mouse. Effetto immediato.'} }
        [pscustomobject]@{ id='keyboard.mouse.doubleclick.fast'; scope='user'; category='mouse'; risk='low'; bulkSafe=$false; requiresAdmin=$true; restart=$false
            name=@{de='Schnellerer Doppelklick';en='Faster double-click';it='Doppio clic più rapido'}
            description=@{de='Verkürzt das Doppelklick-Fenster auf 300 ms (Windows-Standard 500 ms), damit Doppelklicks schneller erkannt werden. Ist es schon kürzer, bleibt es so. Sofort aktiv.';en='Shortens the double-click window to 300 ms (Windows default 500 ms) so double-clicks register quicker. If it is already shorter, it stays. Takes effect immediately.';it='Riduce la finestra del doppio clic a 300 ms (predefinito Windows 500 ms) per riconoscere prima i doppi clic. Se è già più breve, resta così. Effetto immediato.'} }
        [pscustomobject]@{ id='keyboard.mouse.wheel.fast'; scope='user'; category='mouse'; risk='low'; bulkSafe=$false; requiresAdmin=$true; restart=$false
            name=@{de='Schnelleres Mausrad';en='Faster mouse wheel';it='Rotellina più veloce'}
            description=@{de='Scrollt 5 statt 3 Zeilen pro Rasterstufe. Höhere eigene Werte und „eine Seite pro Rasterstufe“ bleiben unverändert. Sofort aktiv.';en='Scrolls 5 instead of 3 lines per notch. Higher custom values and "one page per notch" stay unchanged. Takes effect immediately.';it='Scorre 5 righe invece di 3 per scatto. Valori personalizzati più alti e "una pagina per scatto" restano invariati. Effetto immediato.'} }
        [pscustomobject]@{ id='keyboard.mouse.snap.off'; scope='user'; category='mouse'; risk='low'; bulkSafe=$false; requiresAdmin=$true; restart=$false
            name=@{de='Nicht zur Standard-Schaltfläche springen';en='Don''t snap to default button';it='Non saltare al pulsante predefinito'}
            description=@{de='Verhindert, dass der Zeiger in Dialogen automatisch auf OK oder Ja springt. Windows-Standard; der Schalter stellt es sicher. Sofort aktiv.';en='Stops the pointer jumping to OK / Yes in dialogs. This is the Windows default; the switch makes sure it stays that way. Takes effect immediately.';it='Impedisce al puntatore di saltare su OK / Sì nelle finestre di dialogo. È l''impostazione predefinita di Windows; l''interruttore la garantisce. Effetto immediato.'} }
        [pscustomobject]@{ id='keyboard.mouse.trails.off'; scope='user'; category='mouse'; risk='low'; bulkSafe=$false; requiresAdmin=$true; restart=$false
            name=@{de='Mausspur aus';en='Disable mouse trails';it='Disattiva scia del mouse'}
            description=@{de='Schaltet die Zeigerspur ab, die beim Bewegen Nachbilder zeichnet und den Zeiger träge wirken lässt. Sofort aktiv.';en='Turns off pointer trails that draw after-images and make the pointer feel laggy. Takes effect immediately.';it='Disattiva la scia del puntatore che disegna immagini residue e lo fa sembrare lento. Effetto immediato.'} }
        [pscustomobject]@{ id='keyboard.mouse.clicklock.off'; scope='user'; category='mouse'; risk='low'; bulkSafe=$false; requiresAdmin=$true; restart=$false
            name=@{de='ClickLock aus';en='Disable ClickLock';it='Disattiva ClickLock'}
            description=@{de='Schaltet ClickLock ab, damit langes Drücken die Maustaste nicht festhält (z. B. beim Spray im Spiel). Sofort aktiv.';en='Turns off ClickLock so a long press does not latch the mouse button down (for example while spraying in game). Takes effect immediately.';it='Disattiva ClickLock, così una pressione lunga non blocca il tasto del mouse (ad esempio durante lo spray in gioco). Effetto immediato.'} }
        [pscustomobject]@{ id='keyboard.mouse.vanish.off'; scope='user'; category='mouse'; risk='low'; bulkSafe=$false; requiresAdmin=$true; restart=$false
            name=@{de='Zeiger beim Tippen behalten';en='Keep pointer while typing';it='Mantieni il puntatore mentre scrivi'}
            description=@{de='Windows blendet den Mauszeiger beim Tippen nicht mehr aus, z. B. im Ingame-Chat oder in Menüs. Sofort aktiv.';en='Stops Windows hiding the cursor while you type, for example in in-game chat or menus. Takes effect immediately.';it='Windows non nasconde più il cursore mentre scrivi, ad esempio nella chat di gioco o nei menu. Effetto immediato.'} }
        [pscustomobject]@{ id='keyboard.mouse.buttons.normal'; scope='user'; category='mouse'; risk='medium'; bulkSafe=$false; requiresAdmin=$true; restart=$false
            name=@{de='Normale Maustasten';en='Normal mouse buttons';it='Tasti del mouse normali'}
            description=@{de='Linke Taste = Primärklick, rechte Taste = Kontextmenü. Hebt vertauschte Tasten für Linkshänder auf; ist sie nicht aktiv, ändert sich nichts. Sofort aktiv.';en='Left click is primary, right click opens the context menu. Undoes a left-handed button swap; if none is set, nothing changes. Takes effect immediately.';it='Clic sinistro primario, clic destro per il menu contestuale. Annulla lo scambio per mancini; se non è attivo, non cambia nulla. Effetto immediato.'} }
    )
}

# Stable error code for the UI plus technical detail for the support log (tweaker.ps1 reports both).
function New-TweakerError([string]$Code, [string]$Detail) {
    $e = [Exception]::new($Code)
    if ($Detail) { $e.Data['detail'] = $Detail }
    return $e
}

function Invoke-PowerCfg([string[]]$Arguments) {
    $result = & "$env:SystemRoot\System32\powercfg.exe" @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) { throw (New-TweakerError 'powercfg_failed' ("powercfg $($Arguments[0]) exit $LASTEXITCODE`: " + (($result | Out-String).Trim()))) }
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
    # Reuse only a verified, recent Tweaker checkpoint. Windows normally limits
    # checkpoint creation to one per day; never change its frequency registry key.
    $now = [DateTime]::UtcNow
    foreach ($point in @(Get-ComputerRestorePoint -ErrorAction Stop)) {
        if ($point.Description -notmatch '^Tweaker-[a-f0-9]{32}$') { continue }
        try {
            $created = if ($point.CreationTime -is [DateTime]) { $point.CreationTime.ToUniversalTime() }
                else { [Management.ManagementDateTimeConverter]::ToDateTime($point.CreationTime).ToUniversalTime() }
            if ($created -le $now -and ($now - $created).TotalHours -lt 24) { return }
        } catch { continue }
    }
    # Fail closed if neither a recent checkpoint nor a newly verified one exists.
    $description = 'Tweaker-' + [guid]::NewGuid().ToString('N')
    Checkpoint-Computer -Description $description -RestorePointType MODIFY_SETTINGS -WarningAction Stop -ErrorAction Stop
    if (-not (Get-ComputerRestorePoint | Where-Object { $_.Description -eq $description })) { throw 'restore_point_not_created' }
}

function Write-AtomicJson($State, [string]$Path) {
    $temporary = Join-Path ([IO.Path]::GetDirectoryName($Path)) ([guid]::NewGuid().ToString('N').Substring(0, 8) + '.tmp')
    $created = $false
    try {
        $stream = [IO.File]::Open($temporary, 'CreateNew', 'Write', 'None')
        $created = $true
        try {
            $bytes = [Text.UTF8Encoding]::new($false).GetBytes(($State | ConvertTo-Json -Depth 10))
            $stream.Write($bytes, 0, $bytes.Length)
            $stream.Flush($true)
        } finally { $stream.Dispose() }
        if (Test-Path -LiteralPath $Path) { [IO.File]::Replace($temporary, $Path, ($Path + '.previous')) }
        else { [IO.File]::Move($temporary, $Path) }
    } finally { if ($created -and (Test-Path -LiteralPath $temporary)) { Remove-Item -LiteralPath $temporary } }
}

function Save-Journal($State, [string]$Path) {
    Register-TweakerBackup $State $Path
    Write-AtomicJson $State $Path
}

function Get-TweakerStatus {
    [pscustomobject]@{ powerScheme=(Get-PowerState); fiveMProcesses=@(Get-FiveMProcesses) }
}

function Invoke-TweakerPerformance {
    [CmdletBinding(SupportsShouldProcess=$true, ConfirmImpact='Medium')]
    param(
        [Parameter(Mandatory)][ValidateSet('apply','restore')][string]$Action,
        [Parameter(Mandatory)][string]$Id,
        [string]$StateDirectory = $script:PerformanceStateDirectory,
        [string]$ExpectedRecoveryId,
        [switch]$ConfirmDataLoss
    )
    if ($Action -eq 'apply' -and $Id -eq 'debloat.recall.off' -and -not $ConfirmDataLoss) {throw 'explicit_debloat_confirmation_required'}
    if ($Id -notin @((Get-TweakerCatalog).id)) { throw 'invalid_tweak_id' }
    if (-not $PSCmdlet.ShouldProcess($Id, $Action)) { return }
    if ($Id -in @((Get-OptimizationCatalog).id)) { return Invoke-TweakerOptimization $Action $Id $StateDirectory $ExpectedRecoveryId }
    if ($Id.StartsWith('keyboard.')) { return Invoke-TweakerKeyboard $Action $Id $StateDirectory $ExpectedRecoveryId }
    # Separate journal per Windows user; UI must elevate as the same user.
    $null = New-Item -ItemType Directory -Path $StateDirectory -Force
    $path = Join-Path $StateDirectory ($Id + '.json')
    # Cross-process exclusive lock also covers crash recovery and restore.
    $lock = [IO.File]::Open((Join-Path $StateDirectory 'operation.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    try {
        $state = if (Test-Path -LiteralPath $path) { Get-Content -LiteralPath $path -Raw | ConvertFrom-Json } else { $null }
        if ($ExpectedRecoveryId) { Assert-ExpectedRecovery $state $path $ExpectedRecoveryId }
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
            # High performance was already active without a backup: switch off to the Windows default plan (Balanced).
            if ($null -eq $state -and $Id -eq 'windows.power.high' -and -not $ExpectedRecoveryId) {
                Assert-Administrator
                $balanced = '381b4222-f694-41f0-9685-ff5bb260df2e'
                if ((Get-PowerState) -ne $script:HighPerformance) { return [pscustomobject]@{id=$Id;status='restored'} }
                New-TweakerRestorePoint
                $null = Invoke-PowerCfg @('/setactive', $balanced)
                if ((Get-PowerState) -ne $balanced) { throw 'restore_verification_failed' }
                return [pscustomobject]@{id=$Id;status='restored'}
            }
            if ($null -eq $state) { throw 'backup_not_found' }
            if ($state.version -ne 1 -or $state.id -ne $Id) { throw 'invalid_backup' }
            if ($state.status -eq 'restored') { return [pscustomobject]@{id=$Id;status='restored'} }
            Register-TweakerBackup $state $path
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

Export-ModuleMember -Function Get-TweakerCatalog,Get-TweakerStatus,Get-TweakerSystemInfo,Get-TweakerSystemCheck,Invoke-TweakerPerformance,Test-TweakerKeyboardApplied,Test-TweakerOptimizationApplied,Get-OptimizationCatalog,Invoke-TweakerCache,Invoke-TweakerSafeMode,Invoke-TweakerBackup,Invoke-TweakerMods,Invoke-TweakerDebloat,Invoke-TweakerStartup

