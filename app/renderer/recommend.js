'use strict';
/* Profile "Recommended": a read-only system check (backend action system-check) plus fixed, explainable rules
   that pick the tweaks that fit this PC. Local only: no data leaves the computer.
   The rules are a pure function (recommendTweaks) so they can be tested without a UI. */
(function (root) {
  const known = (v) => v === true || v === false;
  // [tweak id, (facts) => ['pick' | 'skip', reason]] in display order. Unknown facts never lead to a pick.
  // Hardware-dependent picks only happen when the fact is known; unknown facts never lead to such a pick.
  const desk = (f, why) => (f.laptop === false ? ['pick', why] : ['skip', f.laptop ? 'laptop_battery' : 'unknown_chassis']);
  const notLaptop = (f, why) => (f.laptop === true ? ['skip', 'laptop_battery'] : ['pick', why]);
  const gpus = (f) => (Array.isArray(f.gpu) ? f.gpu : f.gpu ? [f.gpu] : []).map(String);
  // NVIDIA GTX 10/16 and RTX, AMD RX 5000 and newer, Intel Arc: hardware GPU scheduling is supported.
  const MODERN_GPU = /RTX|GTX 1[06]\d0|Radeon RX [5-9]\d{3}|\bRX [5-9]\d{3}|Arc\b/i;
  const hags = (f) => (gpus(f).some((g) => MODERN_GPU.test(g)) ? ['pick', 'hags_gpu'] : ['skip', gpus(f).length ? 'hags_old_gpu' : 'unknown_gpu']);
  const RULES = [
    // Windows
    ['windows.gamemode.on', () => ['pick', 'baseline']],
    ['windows.power.high', (f) => desk(f, 'desktop_power')],
    ['windows.hibernate.off', (f) => (f.laptop === false && f.systemDisk === 'SSD' ? ['pick', 'desktop_hibernate'] : ['skip', f.laptop ? 'laptop_battery' : 'unknown_chassis'])],
    ['windows.gamebar.quiet', () => ['pick', 'baseline_quiet']],
    ['windows.suggestions.off', () => ['pick', 'background_ads']],
    ['windows.spotlight.off', () => ['pick', 'background_ads']],
    ['windows.copilot.off', () => ['pick', 'background_assistant']],
    ['windows.ceip.off', () => ['pick', 'telemetry']],
    ['windows.office.telemetry.off', () => ['pick', 'telemetry']],
    ['windows.assistance.off', () => ['pick', 'remote_safety']],
    ['windows.autoplay.off', () => ['pick', 'autoplay_safety']],
    ['windows.menu.instant', () => ['pick', 'snappy_ui']],
    ['windows.tooltip.fast', () => ['pick', 'snappy_ui']],
    ['windows.explorer.startup', () => ['pick', 'faster_login']],
    ['windows.io.realtime', () => ['pick', 'fewer_writes']],
    ['windows.foreground', () => ['pick', 'foreground_games']],
    ['windows.mmcss.on', () => ['pick', 'mmcss_on']],
    ['windows.legacy.fps', () => ['pick', 'exclusive_fullscreen']],
    ['windows.ink.off', (f) => desk(f, 'desktop_no_pen')],
    // Network
    ['network.throttle.off', () => ['pick', 'network_gaming']],
    ['network.winsock.udp', () => ['pick', 'udp_game']],
    ['network.delivery.off', () => ['pick', 'background_upload']],
    ['network.tcp.gaming', () => ['pick', 'tcp_tidy']],
    ['network.llmnr.off', () => ['pick', 'llmnr_safety']],
    ['network.nic.powersave.off', (f) => desk(f, 'desktop_nic')],
    ['network.wifisense.off', (f) => (f.wifi === true ? ['pick', 'wifi_present'] : ['skip', f.wifi === false ? 'no_wifi' : 'unknown_network'])],
    ['network.teredo.off', (f) => (f.xboxApp === false ? ['pick', 'no_xbox_app'] : ['skip', f.xboxApp ? 'xbox_app_needs_teredo' : 'unknown_xbox'])],
    ['network.dns.fast', (f) => (f.customDns === false ? ['pick', 'dhcp_dns'] : ['skip', f.customDns ? 'custom_dns' : 'unknown_dns'])],
    // Hit registration
    ['hitreg.qos.fivem', () => ['pick', 'fivem_qos']],
    ['hitreg.timer.global', (f) => notLaptop(f, 'smooth_frametimes')],
    ['hitreg.nic.latency', (f) => desk(f, 'nic_latency')],
    ['hitreg.input.power', (f) => desk(f, 'input_wake')],
    // Gaming
    ['gaming.mpo.off', () => ['pick', 'mpo_fix']],
    ['gaming.gpu.hags', hags],
    // Mouse and keyboard
    ['keyboard.mouse.accel.off', () => ['pick', 'mouse_precision']],
    ['keyboard.mouse.snap.off', () => ['pick', 'mouse_defaults']],
    ['keyboard.mouse.trails.off', () => ['pick', 'mouse_defaults']],
    ['keyboard.mouse.clicklock.off', () => ['pick', 'mouse_defaults']],
    ['keyboard.mouse.vanish.off', () => ['pick', 'mouse_defaults']],
    ['keyboard.buffer.large', () => ['pick', 'no_lost_keys']],
    // Deliberately not recommended, with the reason shown to the user.
    ['windows.prefetch.off', (f) => ['skip', f.systemDisk === 'HDD' ? 'hdd_keeps_prefetch' : 'no_gain_ssd']],
    ['windows.service.sysmain.off', (f) => ['skip', f.systemDisk === 'HDD' ? 'hdd_keeps_prefetch' : 'no_gain_ssd']],
    ['windows.cpu.unpark', (f) => ['skip', /X3D/i.test(f.cpu?.name || '') ? 'x3d_cpu' : f.laptop ? 'laptop_battery' : 'scheduler_risk']],
    ['windows.power.profile', (f) => ['skip', f.laptop ? 'laptop_battery' : 'power_plan_enough']],
    ['windows.power.extras', (f) => ['skip', f.laptop ? 'laptop_battery' : 'keeps_sleep']],
    ['windows.mmcss.games', () => ['skip', 'scheduler_high']],
    ['windows.mmcss.latency', () => ['skip', 'scheduler_high']],
    ['windows.svchost.group', () => ['skip', 'no_gain_isolation']],
    ['windows.close.faster', () => ['skip', 'unsaved_work']],
    ['windows.storage.off', () => ['skip', 'keeps_cleanup']],
    ['windows.capture.off', () => ['skip', 'records_clips']],
    ['gaming.gamebar.off', () => ['skip', 'records_clips']],
    ['hitreg.fivem.priority', () => ['skip', 'priority_starves']],
    ['fivem.priority.high', () => ['skip', 'priority_starves']],
    ['gaming.mouse.queue', () => ['skip', 'polling_unknown']],
    ['gaming.gpu.latency', () => ['skip', 'not_measurable']],
    ['gaming.gpu.iommu', () => ['skip', 'not_measurable']],
    ['network.nagle.off', () => ['skip', 'udp_game_nagle']],
    ['network.qos.reserve.off', () => ['skip', 'not_measurable']],
    ['network.lanman.lan', () => ['skip', 'not_gaming']],
    ['windows.gpu.tdr', () => ['skip', 'debug_only']],
    ['keyboard.mouse.speed.native', () => ['skip', 'personal_preference']],
    ['keyboard.mouse.buttons.normal', () => ['skip', 'left_handed']],
    ['keyboard.mouse.doubleclick.fast', () => ['skip', 'your_choice']],
    ['keyboard.mouse.wheel.fast', () => ['skip', 'your_choice']],
    ['keyboard.repeat.fast', () => ['skip', 'your_choice']],
    ['windows.clipboard.off', () => ['skip', 'your_choice']],
    ['windows.sync.off', () => ['skip', 'your_choice']],
    ['windows.explorer.defaults', () => ['skip', 'your_choice']],
  ];
  function recommendTweaks(facts, tweaks) {
    const f = facts || {};
    const byId = new Map((tweaks || []).map((tw) => [tw.id, tw]));
    const picks = [], skips = [];
    for (const [id, rule] of RULES) {
      const tw = byId.get(id);
      if (!tw) continue;
      const [kind, reason] = rule(f);
      if (kind === 'pick' && tw.available !== false) picks.push({ id, reason, tweak: tw });
      else skips.push({ id, reason: kind === 'pick' ? 'unavailable' : reason, tweak: tw });
    }
    return { picks, skips };
  }

  const TEXT = {
    de: { name: 'Recommended', desc: 'Prüft deinen PC und empfiehlt nur die Tweaks, die zu ihm passen. Läuft komplett lokal, es werden keine Daten gesendet.',
      badge: 'Für deinen PC', check: 'System prüfen', recheck: 'Neu prüfen', checking: 'System wird geprüft …', failed: 'Systemprüfung fehlgeschlagen.',
      first: 'Starte die Systemprüfung, um deine Empfehlung zu sehen.', why: 'Warum diese Auswahl?', skipped: 'Bewusst nicht empfohlen',
      laptop: 'Laptop', desktop: 'Desktop', unknown: 'unbekannt', wifi: 'WLAN', lan: 'LAN', xbox: 'Xbox-App', customDns: 'eigener DNS', ram: (g) => `${Math.round(g)} GB RAM`,
      reasons: {
        baseline: 'Sinnvolle Grundeinstellung für jeden Spiele-PC.', baseline_quiet: 'Weniger Game-Bar-Hinweise während des Spielens.', background_ads: 'Keine App-Vorschläge und Werbe-Installationen im Hintergrund.',
        desktop_power: 'Desktop am Netzteil: volle Leistung ohne Akku-Nachteil.', desktop_nic: 'Desktop: Netzwerkkarte soll nie zum Stromsparen abschalten.', desktop_hibernate: 'Desktop mit SSD: Ruhezustand wird nicht gebraucht, spart Speicherplatz.',
        network_gaming: 'Keine Netzwerkdrossel, wenn Musik im Hintergrund läuft.', udp_game: 'FiveM nutzt UDP: Pakete gehen über den schnellen Pfad.', background_upload: 'Kein Teilen von Updates mit fremden PCs im Hintergrund.',
        wifi_present: 'WLAN-Karte gefunden: keine automatischen Hotspot-Verbindungen.', no_xbox_app: 'Keine Xbox-App installiert: IPv6-Tunnel werden nicht gebraucht.', dhcp_dns: 'Kein eigener DNS eingerichtet: schnellster öffentlicher DNS bringt schnellere Namensauflösung.',
        mouse_precision: 'Gleichmäßige Mausbewegung in Menüs und Spielen ohne Raw Input.',
        laptop_battery: 'Laptop: würde Akkulaufzeit und Temperatur verschlechtern.', unknown_chassis: 'Laptop/Desktop nicht erkennbar – sicherheitshalber ausgelassen.',
        no_wifi: 'Keine WLAN-Karte vorhanden.', unknown_network: 'Netzwerkkarten nicht lesbar – ausgelassen.', xbox_app_needs_teredo: 'Xbox-App installiert: Partychat braucht Teredo.', unknown_xbox: 'Xbox-App nicht prüfbar – ausgelassen.',
        custom_dns: 'Eigener DNS (z. B. Pi-hole) eingerichtet – bleibt unangetastet.', unknown_dns: 'DNS-Einstellung nicht lesbar – ausgelassen.',
        hdd_keeps_prefetch: 'Windows liegt auf einer HDD: Prefetch/SysMain beschleunigen dort Programmstarts.', no_gain_ssd: 'Auf SSDs kein belegter Spielvorteil.',
        x3d_cpu: 'X3D-Prozessor: Kerne-Entparken kann die Cache-Zuordnung verschlechtern.', scheduler_risk: 'Hohes Risiko, kein belegter Vorteil auf modernen CPUs.',
        udp_game_nagle: 'FiveM-Spielverkehr ist UDP – Nagle betrifft nur TCP.', not_measurable: 'Effekt in der Praxis nicht messbar.', debug_only: 'Treiber-Diagnose, keine Leistungsoptimierung.',
        personal_preference: 'Ändert dein Mausgefühl – lieber selbst entscheiden.', unavailable: 'Auf diesem PC nicht verfügbar.' } },
    en: { name: 'Recommended', desc: 'Checks your PC and recommends only the tweaks that fit it. Runs entirely locally; no data is sent.',
      badge: 'For your PC', check: 'Check system', recheck: 'Check again', checking: 'Checking your system …', failed: 'System check failed.',
      first: 'Run the system check to see your recommendation.', why: 'Why this selection?', skipped: 'Deliberately not recommended',
      laptop: 'Laptop', desktop: 'Desktop', unknown: 'unknown', wifi: 'Wi-Fi', lan: 'LAN', xbox: 'Xbox app', customDns: 'custom DNS', ram: (g) => `${Math.round(g)} GB RAM`,
      reasons: {
        baseline: 'Sensible baseline for every gaming PC.', baseline_quiet: 'Fewer Game Bar tips while you play.', background_ads: 'No app suggestions or promoted installs in the background.',
        desktop_power: 'Desktop on mains power: full performance without a battery penalty.', desktop_nic: 'Desktop: the network card should never sleep to save power.', desktop_hibernate: 'Desktop with SSD: hibernation is not needed and frees disk space.',
        network_gaming: 'No network throttling while music plays in the background.', udp_game: 'FiveM uses UDP: packets take the fast path.', background_upload: 'No sharing of updates with other PCs in the background.',
        wifi_present: 'Wi-Fi card found: no automatic hotspot connections.', no_xbox_app: 'No Xbox app installed: IPv6 tunnels are not needed.', dhcp_dns: 'No custom DNS set up: the fastest public DNS speeds up lookups.',
        mouse_precision: 'Consistent mouse movement in menus and games without raw input.',
        laptop_battery: 'Laptop: would cost battery life and raise temperatures.', unknown_chassis: 'Laptop/desktop not detectable – left out to be safe.',
        no_wifi: 'No Wi-Fi card present.', unknown_network: 'Network cards not readable – left out.', xbox_app_needs_teredo: 'Xbox app installed: party chat needs Teredo.', unknown_xbox: 'Xbox app not checkable – left out.',
        custom_dns: 'Custom DNS (e.g. Pi-hole) set up – left untouched.', unknown_dns: 'DNS setting not readable – left out.',
        hdd_keeps_prefetch: 'Windows is on an HDD: Prefetch/SysMain speed up program starts there.', no_gain_ssd: 'No proven gaming benefit on SSDs.',
        x3d_cpu: 'X3D processor: unparking cores can hurt cache scheduling.', scheduler_risk: 'High risk, no proven benefit on modern CPUs.',
        udp_game_nagle: 'FiveM gameplay traffic is UDP – Nagle only affects TCP.', not_measurable: 'Effect not measurable in practice.', debug_only: 'Driver diagnostics, not a performance tweak.',
        personal_preference: 'Changes how your mouse feels – your call.', unavailable: 'Not available on this PC.' } },
    it: { name: 'Recommended', desc: 'Controlla il tuo PC e consiglia solo le modifiche adatte. Funziona solo in locale; nessun dato viene inviato.',
      badge: 'Per il tuo PC', check: 'Controlla sistema', recheck: 'Controlla di nuovo', checking: 'Controllo del sistema …', failed: 'Controllo del sistema non riuscito.',
      first: 'Avvia il controllo per vedere il tuo consiglio.', why: 'Perché questa scelta?', skipped: 'Non consigliati di proposito',
      laptop: 'Portatile', desktop: 'Desktop', unknown: 'sconosciuto', wifi: 'Wi-Fi', lan: 'LAN', xbox: 'App Xbox', customDns: 'DNS personalizzato', ram: (g) => `${Math.round(g)} GB RAM`,
      reasons: {
        baseline: 'Impostazione di base utile per ogni PC da gioco.', baseline_quiet: 'Meno suggerimenti della Game Bar mentre giochi.', background_ads: 'Nessun suggerimento di app o installazione promossa in background.',
        desktop_power: 'Desktop alimentato da rete: piene prestazioni senza svantaggi per la batteria.', desktop_nic: 'Desktop: la scheda di rete non deve mai spegnersi per risparmio.', desktop_hibernate: 'Desktop con SSD: l’ibernazione non serve e libera spazio.',
        network_gaming: 'Nessuna limitazione di rete con musica in sottofondo.', udp_game: 'FiveM usa UDP: i pacchetti prendono il percorso rapido.', background_upload: 'Nessuna condivisione di aggiornamenti con altri PC in background.',
        wifi_present: 'Scheda Wi-Fi trovata: nessuna connessione automatica agli hotspot.', no_xbox_app: 'App Xbox non installata: i tunnel IPv6 non servono.', dhcp_dns: 'Nessun DNS personalizzato: il DNS pubblico più veloce accelera la risoluzione.',
        mouse_precision: 'Movimento del mouse uniforme in menu e giochi senza raw input.',
        laptop_battery: 'Portatile: peggiorerebbe autonomia e temperature.', unknown_chassis: 'Portatile/desktop non rilevabile – escluso per sicurezza.',
        no_wifi: 'Nessuna scheda Wi-Fi presente.', unknown_network: 'Schede di rete non leggibili – escluso.', xbox_app_needs_teredo: 'App Xbox installata: la chat di gruppo richiede Teredo.', unknown_xbox: 'App Xbox non verificabile – escluso.',
        custom_dns: 'DNS personalizzato (es. Pi-hole) – lasciato invariato.', unknown_dns: 'Impostazione DNS non leggibile – escluso.',
        hdd_keeps_prefetch: 'Windows è su un HDD: Prefetch/SysMain velocizzano l’avvio dei programmi.', no_gain_ssd: 'Nessun vantaggio dimostrato sugli SSD.',
        x3d_cpu: 'CPU X3D: sbloccare i core può peggiorare l’uso della cache.', scheduler_risk: 'Rischio alto, nessun vantaggio dimostrato sulle CPU moderne.',
        udp_game_nagle: 'Il traffico di gioco FiveM è UDP – Nagle riguarda solo TCP.', not_measurable: 'Effetto non misurabile in pratica.', debug_only: 'Diagnostica del driver, non un’ottimizzazione.',
        personal_preference: 'Cambia la sensazione del mouse – decidi tu.', unavailable: 'Non disponibile su questo PC.' } },
  };

  // Reasons of the extended selection (1.0.34), merged into TEXT.
  const MORE = {
    de: {
      background_assistant: 'Copilot blendet sich nicht ein und läuft nicht im Hintergrund mit.', telemetry: 'Weniger Diagnose-Aufgaben und Uploads im Hintergrund.',
      remote_safety: 'Niemand kann über die Windows-Remoteunterstützung Hilfe-Sitzungen anfragen; andere Fernwartung bleibt nutzbar.',
      autoplay_safety: 'USB-Sticks und Laufwerke starten nichts mehr automatisch – sicherer.', snappy_ui: 'Menüs und Hinweise reagieren sofort – Komfort ohne Nachteil.',
      faster_login: 'Autostart-Programme starten ohne künstliche Wartezeit nach der Anmeldung.', fewer_writes: 'Weniger Schreibzugriffe beim Laden vieler kleiner Spieldateien.',
      foreground_games: 'Das aktive Spiel bekommt bei der CPU-Zeit Vorrang vor Hintergrundprogrammen.', mmcss_on: 'Stellt sicher, dass der Windows-Dienst für Audio- und Spiel-Prioritäten läuft.',
      exclusive_fullscreen: 'Exklusiver Vollbildmodus läuft wieder direkt – weniger Eingabeverzögerung in DirectX-Spielen.', desktop_no_pen: 'Desktop ohne Stift: der Ink-Arbeitsbereich wird nicht gebraucht.',
      tcp_tidy: 'Schlankere TCP-Pakete und schneller freigegebene Verbindungen für Downloads und Serverlisten.', llmnr_safety: 'Weniger Rundrufe im Netz und mehr Sicherheit in fremden WLANs.',
      fivem_qos: 'FiveM-Pakete gehen vor Downloads und Streams durch.', smooth_frametimes: 'Gleichmäßigere Frame-Zeiten und Netzwerk-Ticks in FiveM.',
      nic_latency: 'Desktop: Netzwerkpakete werden sofort verarbeitet statt gesammelt.', input_wake: 'Desktop: Maus, Tastatur und Netzwerkkarte schlafen nie ein – direktere Eingaben.',
      mpo_fix: 'Verhindert auf vielen Grafikkarten Flackern und Ruckler in randlosen Fenstern.', hags_gpu: 'Aktuelle Grafikkarte erkannt: sie plant ihre Arbeit selbst, weniger CPU-Last.',
      mouse_defaults: 'Stellt normales Mausverhalten sicher: kein Springen, keine Spur, kein Festhalten, Zeiger bleibt sichtbar.', no_lost_keys: 'Keine verlorenen Tastendrücke, wenn das System kurz ausgelastet ist.',
      hags_old_gpu: 'Keine Grafikkarte gefunden, die Hardware-GPU-Scheduling sicher unterstützt.', unknown_gpu: 'Grafikkarte nicht erkennbar – ausgelassen.',
      power_plan_enough: 'Höchstleistung ist schon gewählt; dauerhaft 100 % CPU bringt nur mehr Hitze.', keeps_sleep: 'Würde den Standby deines PCs abschalten – lieber selbst entscheiden.',
      scheduler_high: 'Greift tief in die Windows-Planung ein – nur gezielt als einzelner Tweak.', no_gain_isolation: 'Kein Leistungsgewinn, aber schlechtere Fehlerisolation der Windows-Dienste.',
      unsaved_work: 'Kann beim Abmelden ungespeicherte Arbeit abbrechen.', keeps_cleanup: 'Die Speicheroptimierung räumt Papierkorb und Temp-Dateien selbst auf; abschalten bringt nichts.',
      records_clips: 'Schaltet Aufnahmen und Clips ab – nur sinnvoll, wenn du sie nicht nutzt.', priority_starves: 'Hohe Priorität kann Discord und Audio ausbremsen – nur gezielt als einzelner Tweak.',
      polling_unknown: 'Bei Mäusen mit 4000–8000 Hz besser aus; die Abfragerate ist nicht prüfbar.', not_gaming: 'Hilft nur beim Kopieren im Heimnetz, nicht in Spielen.',
      left_handed: 'Vertauschte Maustasten sind meist gewollt (Linkshänder).', your_choice: 'Komfort-Einstellung ohne Spielvorteil – lieber selbst entscheiden.',
    },
    en: {
      background_assistant: 'Copilot does not pop up or run along in the background.', telemetry: 'Fewer diagnostic tasks and uploads in the background.',
      remote_safety: 'Nobody can request help sessions through Windows Remote Assistance; other remote tools keep working.',
      autoplay_safety: 'USB sticks and drives no longer start anything automatically – safer.', snappy_ui: 'Menus and hover tips react instantly – comfort without a downside.',
      faster_login: 'Startup programs start without an artificial delay after sign-in.', fewer_writes: 'Fewer disk writes when loading many small game files.',
      foreground_games: 'The active game gets CPU time ahead of background programs.', mmcss_on: 'Makes sure the Windows service for audio and game priorities is running.',
      exclusive_fullscreen: 'Exclusive fullscreen runs directly again – less input delay in DirectX games.', desktop_no_pen: 'Desktop without a pen: the Ink workspace is not needed.',
      tcp_tidy: 'Leaner TCP packets and faster released connections for downloads and server lists.', llmnr_safety: 'Fewer broadcasts on the network and more safety on public Wi-Fi.',
      fivem_qos: 'FiveM packets go ahead of downloads and streams.', smooth_frametimes: 'Smoother frame times and network ticks in FiveM.',
      nic_latency: 'Desktop: network packets are processed immediately instead of batched.', input_wake: 'Desktop: mouse, keyboard and network card never fall asleep – more direct input.',
      mpo_fix: 'Prevents flicker and stutter in borderless windows on many graphics cards.', hags_gpu: 'Current graphics card found: it schedules its own work, less CPU load.',
      mouse_defaults: 'Makes sure the mouse behaves normally: no snapping, no trails, no click lock, pointer stays visible.', no_lost_keys: 'No lost key presses when the system is briefly busy.',
      hags_old_gpu: 'No graphics card found that safely supports hardware GPU scheduling.', unknown_gpu: 'Graphics card not detectable – left out.',
      power_plan_enough: 'High performance is already selected; a constant 100% CPU only adds heat.', keeps_sleep: 'Would turn off sleep on your PC – your call.',
      scheduler_high: 'Reaches deep into Windows scheduling – only as a deliberate single tweak.', no_gain_isolation: 'No performance gain, but worse fault isolation of Windows services.',
      unsaved_work: 'Can cut off unsaved work when signing out.', keeps_cleanup: 'Storage Sense cleans the recycle bin and temp files by itself; turning it off gains nothing.',
      records_clips: 'Turns off recordings and clips – only useful if you do not use them.', priority_starves: 'High priority can slow down Discord and audio – only as a deliberate single tweak.',
      polling_unknown: 'Better left off for 4000–8000 Hz mice; the polling rate cannot be checked.', not_gaming: 'Only helps when copying on the home network, not in games.',
      left_handed: 'Swapped mouse buttons are usually intended (left-handed).', your_choice: 'Comfort setting without a gaming benefit – your call.',
    },
    it: {
      background_assistant: 'Copilot non compare e non resta attivo in background.', telemetry: 'Meno attività di diagnostica e caricamenti in background.',
      remote_safety: 'Nessuno può richiedere sessioni tramite Assistenza remota di Windows; gli altri strumenti remoti restano utilizzabili.',
      autoplay_safety: 'Chiavette USB e unità non avviano più nulla in automatico – più sicuro.', snappy_ui: 'Menu e suggerimenti reagiscono subito – comodità senza svantaggi.',
      faster_login: 'I programmi in avvio automatico partono senza attesa artificiale dopo l’accesso.', fewer_writes: 'Meno scritture su disco quando si caricano molti piccoli file di gioco.',
      foreground_games: 'Il gioco attivo ha la precedenza sul tempo CPU rispetto ai programmi in background.', mmcss_on: 'Garantisce che il servizio di Windows per le priorità audio e di gioco sia attivo.',
      exclusive_fullscreen: 'Lo schermo intero esclusivo torna diretto – meno ritardo di input nei giochi DirectX.', desktop_no_pen: 'Desktop senza penna: l’area di lavoro Ink non serve.',
      tcp_tidy: 'Pacchetti TCP più snelli e connessioni liberate prima per download ed elenchi server.', llmnr_safety: 'Meno broadcast in rete e più sicurezza sulle reti Wi-Fi pubbliche.',
      fivem_qos: 'I pacchetti FiveM passano prima di download e streaming.', smooth_frametimes: 'Tempi dei frame e tick di rete più regolari in FiveM.',
      nic_latency: 'Desktop: i pacchetti di rete vengono elaborati subito invece che raggruppati.', input_wake: 'Desktop: mouse, tastiera e scheda di rete non vanno mai in sospensione – input più diretto.',
      mpo_fix: 'Evita sfarfallii e scatti nelle finestre senza bordi su molte schede grafiche.', hags_gpu: 'Scheda grafica recente trovata: pianifica da sola il proprio lavoro, meno carico sulla CPU.',
      mouse_defaults: 'Garantisce un comportamento normale del mouse: nessuno scatto, nessuna scia, nessun blocco del clic, puntatore sempre visibile.', no_lost_keys: 'Nessun tasto perso quando il sistema è brevemente sotto carico.',
      hags_old_gpu: 'Nessuna scheda grafica che supporti in modo sicuro la pianificazione GPU hardware.', unknown_gpu: 'Scheda grafica non rilevabile – esclusa.',
      power_plan_enough: 'Prestazioni elevate è già selezionato; CPU sempre al 100% aggiunge solo calore.', keeps_sleep: 'Disattiverebbe la sospensione del PC – decidi tu.',
      scheduler_high: 'Interviene a fondo nella pianificazione di Windows – solo come singolo tweak mirato.', no_gain_isolation: 'Nessun guadagno di prestazioni, ma peggiore isolamento degli errori dei servizi.',
      unsaved_work: 'Può interrompere lavori non salvati alla disconnessione.', keeps_cleanup: 'Sensore memoria pulisce da solo cestino e file temporanei; disattivarlo non porta vantaggi.',
      records_clips: 'Disattiva registrazioni e clip – utile solo se non li usi.', priority_starves: 'La priorità alta può rallentare Discord e l’audio – solo come singolo tweak mirato.',
      polling_unknown: 'Meglio lasciarlo disattivato con mouse a 4000–8000 Hz; la frequenza di polling non è verificabile.', not_gaming: 'Aiuta solo nelle copie in rete domestica, non nei giochi.',
      left_handed: 'I tasti del mouse invertiti di solito sono voluti (mancini).', your_choice: 'Impostazione di comodità senza vantaggi nel gioco – decidi tu.',
    },
  };
  for (const lang of Object.keys(MORE)) Object.assign(TEXT[lang].reasons, MORE[lang]);

  // ---------- UI (Profile page) ----------
  const rec = { facts: null, busy: false, error: null };
  const tx = () => TEXT[(typeof state !== 'undefined' && state.lang) || 'de'] || TEXT.en;
  const result = () => recommendTweaks(rec.facts, typeof state !== 'undefined' ? state.tweaks : []);
  // Tweaks the "Recommended" profile applies: picks not active yet and not deselected.
  // Picks the config guard leaves out for this PC (driver resets, power-offs, laptop, ...).
  const guardOut = () => (rec.facts && root.ConfigGuard ? root.ConfigGuard.guard(rec.facts, result().picks.map((p) => p.tweak)).skipped : []);
  const guardedOut = () => guardOut();
  const candidates = () => {
    if (!rec.facts) return [];
    const out = new Set(guardOut().map((s) => s.tweak.id));
    return result().picks.map((p) => p.tweak).filter((tw) => !out.has(tw.id));
  };
  async function check() {
    if (rec.busy) return;
    rec.busy = true; rec.error = null; render();
    try { const r = await call('system-check'); if (r?.ok) rec.facts = r.facts || {}; else rec.error = r?.error || 'failed'; }
    catch (e) { rec.error = e.message; }
    finally { rec.busy = false; if (state.route.page === 'profiles') render(); }
  }
  function summary(f) {
    const w = tx(), chip = (s) => `<span class="rec-fact">${esc(s)}</span>`;
    const gpu = Array.isArray(f.gpu) ? f.gpu.join(', ') : f.gpu;
    return [
      chip(f.laptop === true ? w.laptop : f.laptop === false ? w.desktop : `${w.desktop}/${w.laptop}: ${w.unknown}`),
      f.cpu?.name ? chip(f.cpu.name) : '', gpu ? chip(gpu) : '', typeof f.ramGB === 'number' ? chip(w.ram(f.ramGB)) : '',
      f.systemDisk ? chip(f.systemDisk) : '', f.ethernetUp ? chip(w.lan) : '', f.wifi ? chip(w.wifi) : '',
      f.xboxApp ? chip(w.xbox) : '', f.customDns ? chip(w.customDns) : '',
    ].join('');
  }
  // Same structure and classes as the other profile cards; tier-go/pchip clicks are handled by app.js.
  // Featured card above the three configs: system and reasons on the left, the sorted selection on the right.
  function card() {
    const w = tx(), run = state.profileRun, mine = run?.tier === 'recommended';
    const checkBtn = `<button class="pill dark rec-check" id="rec-check" ${rec.busy || run ? 'disabled' : ''}>${esc(rec.busy ? w.checking : rec.facts ? w.recheck : w.check)}</button>`;
    const info = (extra) => `<div class="cfg-feat-info"><div class="tier-badge">${esc(w.badge)}</div><h2>${esc(w.name)}</h2><p>${esc(w.desc)}</p>${extra}</div>`;
    if (!rec.facts) {
      return `<section class="card cfg-featured">${info(`<div class="cfg-feat-actions">${checkBtn}</div>`)}
        <div class="cfg-feat-picks cfg-feat-empty"><p class="muted">${esc(rec.error ? `${w.failed} ${errorText(rec.error)}` : rec.busy ? w.checking : w.first)}</p></div></section>`;
    }
    const all = result(), out = guardOut(), outIds = new Set(out.map((s) => s.tweak.id));
    const picks = all.picks.filter((p) => !outIds.has(p.id));
    const lang = (typeof state !== 'undefined' && state.lang) || 'de';
    const skips = [...all.skips, ...out.map((s) => ({ id: s.tweak.id, tweak: s.tweak, text: s.reasons.map((r) => root.ConfigGuard.reasonText(lang, r)).join(' ') }))];
    const todo = picks.filter((p) => !p.tweak.applied && !state.profileOff.has(p.id));
    const done = picks.filter((p) => p.tweak.applied).length;
    const reasonOf = new Map(picks.map((p) => [p.id, w.reasons[p.reason] || '']));
    const line = (x) => `<li><b>${esc(x.tweak.name)}</b> – ${esc(x.text || w.reasons[x.reason] || x.reason)}</li>`;
    return `<section class="card cfg-featured${mine ? ' running' : ''}">
      ${info(`<div class="rec-facts">${summary(rec.facts)}</div>
        ${skips.length ? `<details class="rec-why"><summary>${esc(w.skipped)} (${skips.length})</summary><ul class="rec-skips">${skips.map(line).join('')}</ul></details>` : ''}
        <div class="cfg-feat-actions">${checkBtn}</div>`)}
      <div class="cfg-feat-picks">
        <div class="tier-count"><b data-count="${todo.length}">${todo.length}</b><span>${t().tierTodo(done, picks.length)}</span></div>
        ${cfgList(picks.map((p) => p.tweak), run, (tw) => reasonOf.get(tw.id))}
        ${mine ? `<div class="tier-progress"><div class="cat-meter"><i data-pct="${Math.round((run.i / run.n) * 100)}"></i></div><span>${esc(t().tierRunning(run.i, run.n, run.current || ''))}</span></div>` : ''}
        <button class="pill light big tier-go" data-tier="recommended" ${run || !todo.length ? 'disabled' : ''}>${icon('bolt')}<span>${t().tierGo(todo.length)}</span></button>
      </div>
    </section>`;
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => { if (e.target.closest('#rec-check')) check(); });
    // Profile name for the shared confirm dialog and result toast.
    for (const lang of ['de', 'en', 'it']) {
      const tiers = root.I18N?.[lang]?.tiers;
      if (tiers) tiers.recommended = [TEXT[lang].name, TEXT[lang].desc];
    }
  }
  const api = { recommendTweaks, RULES, TEXT, card, candidates, guardedOut, check, state: rec };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Recommend = api;
})(this);
