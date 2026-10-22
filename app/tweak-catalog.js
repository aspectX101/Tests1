/* Generated from Get-TweakerCatalog; shared by browser and Electron mock. */
(function(root) {
  const catalog = [
  {
    "description": {
      "en": "Our alternative to Elux: sets minimum CPU performance to 100% and sleep to Never in the current plan, on AC power only. More heat, power and fan noise; no FPS promise.",
      "de": "Eigenes Profil statt Elux: setzt im aktiven Energieplan die minimale CPU-Leistung auf 100% und Standby auf Nie, nur am Netzteil. Mehr Verbrauch, Hitze und Luefter; kein FPS-Versprechen.",
      "it": "Alternativa a Elux: CPU minima al 100% e sospensione Mai nel piano attivo, solo con alimentazione di rete. Piu consumi, calore e rumore; nessuna promessa FPS."
    },
    "bulkSafe": false,
    "id": "windows.power.profile",
    "risk": "medium",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "UND.CC performance preset",
      "de": "UND.CC Leistungsprofil",
      "it": "Profilo prestazioni UND.CC"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Sets minimum unparked cores to 100% in the current AC power plan. Can increase heat and power use and hurt hybrid/X3D scheduling.",
      "de": "Setzt den Mindestanteil aktiver Kerne im aktuellen Plan am Netzteil auf 100%. Kann Verbrauch und Temperaturen erhoehen und bei Hybrid-/X3D-CPUs nachteilig sein.",
      "it": "Imposta al 100% i core non parcheggiati nel piano attivo con alimentazione di rete. Puo aumentare calore e consumi e peggiorare la gestione di CPU ibride/X3D."
    },
    "bulkSafe": false,
    "id": "windows.cpu.unpark",
    "risk": "high",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Unpark CPU cores",
      "de": "CPU-Core-Parking deaktivieren",
      "it": "Disattiva parcheggio core CPU"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Disables Windows settings synchronization by policy. Does not modify cloud files. Privacy option, not an FPS tweak.",
      "de": "Sperrt die Windows-Einstellungssynchronisierung per Richtlinie. Aendert keine Cloud-Dateien. Datenschutzoption, kein FPS-Tweak.",
      "it": "Disattiva la sincronizzazione delle impostazioni tramite criterio. Non modifica file cloud. Opzione privacy, non aumenta gli FPS."
    },
    "bulkSafe": false,
    "id": "windows.sync.off",
    "risk": "medium",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Disable settings sync groups",
      "de": "Einstellungssynchronisierung aus",
      "it": "Disattiva sincronizzazione impostazioni"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Sets the classic Explorer startup delay to 0 ms. More simultaneous load at sign-in; behavior depends on Windows version and startup application.",
      "de": "Setzt die klassische Explorer-Autostartverzoegerung auf 0 ms. Mehr gleichzeitige Last bei der Anmeldung; abhaengig von Windows-Version und Autostart-App.",
      "it": "Imposta a 0 ms il ritardo classico di avvio Explorer. Maggiore carico simultaneo all accesso; dipende da Windows e dalle app."
    },
    "bulkSafe": false,
    "id": "windows.explorer.startup",
    "risk": "medium",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Remove Explorer startup delay",
      "de": "Explorer-Startverzoegerung aus",
      "it": "Rimuovi ritardo avvio Explorer"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Classic submenus open without a delay. Convenience only, no game speed gain. Sign out and back in.",
      "de": "Klassische Untermenues oeffnen ohne Wartezeit. Komfortoption; keine schnelleren Spiele. Ab-/Anmeldung erforderlich.",
      "it": "I sottomenu classici si aprono senza attesa. Solo comodita, nessun vantaggio nei giochi. Disconnettersi e riconnettersi."
    },
    "bulkSafe": false,
    "id": "windows.menu.instant",
    "risk": "low",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Zero menu show delay",
      "de": "Menues ohne Wartezeit",
      "it": "Menu senza attesa"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Disables hibernation through powercfg and Fast Startup. Windows removes the hiberfile; boot may take longer. No FPS gain.",
      "de": "Deaktiviert den Ruhezustand mit powercfg und den Schnellstart. Hiberfil wird von Windows entfernt; Hochfahren kann laenger dauern. Kein FPS-Gewinn.",
      "it": "Disattiva ibernazione con powercfg e avvio rapido. Windows rimuove il file di ibernazione; avvio potenzialmente piu lento. Nessun aumento FPS."
    },
    "bulkSafe": false,
    "id": "windows.hibernate.off",
    "risk": "medium",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Disable hibernate / fast startup",
      "de": "Ruhezustand und Schnellstart aus",
      "it": "Disattiva ibernazione e avvio rapido"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Nur Treiberdiagnose: wartet 8 statt standardm\u00e4\u00dfig 2 Sekunden vor GPU-Timeout. Kann H\u00e4nger verl\u00e4ngern und Fehler verdecken. Microsoft r\u00e4t Endnutzern von TDR-\u00c4nderungen ab; kein Leistungsgewinn.",
      "en": "Driver diagnostics only: waits 8 instead of the default 2 seconds before a GPU timeout. Can prolong freezes and mask faults. Microsoft advises end users against TDR changes; no performance gain.",
      "it": "Solo diagnostica driver: attende 8 secondi invece di 2 prima del timeout GPU. Puo prolungare blocchi e nascondere guasti. Microsoft sconsiglia queste modifiche agli utenti; nessun aumento prestazioni."
    },
    "bulkSafe": false,
    "id": "windows.gpu.tdr",
    "risk": "high",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "de": "GPU-TDR-Wartezeit: 8 Sekunden",
      "en": "GPU TDR delay: 8 seconds",
      "it": "Attesa TDR GPU: 8 secondi"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Setzt das vorhandene MMCSS-Profil Games auf High / Priorit\u00e4t 2. Wirkt nur auf Threads, die dieses Profil verwenden. Kann andere Multimedia-Aufgaben beeintr\u00e4chtigen.",
      "en": "Sets the existing MMCSS Games profile to High / priority 2. Only affects threads registered with this profile. May affect other multimedia work.",
      "it": "Imposta il profilo MMCSS Games esistente su High / priorita 2. Agisce solo sui thread registrati con questo profilo. Puo penalizzare altre attivita multimediali."
    },
    "bulkSafe": false,
    "id": "windows.mmcss.games",
    "risk": "high",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "de": "Multimedia-Priorit\u00e4t f\u00fcr Spiele",
      "en": "Games multimedia priority",
      "it": "Priorita multimedia giochi"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Eigene Low-latency-Variante: SystemResponsiveness 10 statt 20. Nur f\u00fcr MMCSS-Anwendungen; kann Hintergrundarbeit verlangsamen. Kein erfundenes Profil, das Spiele nicht verwenden.",
      "en": "Our low-latency variant: SystemResponsiveness 10 instead of 20. Only affects MMCSS applications and can slow background work. Does not create an unused custom game profile.",
      "it": "Variante a bassa latenza: SystemResponsiveness 10 invece di 20. Solo per app MMCSS; puo rallentare attivita in background. Non crea un profilo inutilizzato dai giochi."
    },
    "bulkSafe": false,
    "id": "windows.mmcss.latency",
    "risk": "high",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "de": "MMCSS: Hintergrundreserve 10%",
      "en": "MMCSS: 10% background reserve",
      "it": "MMCSS: riserva background 10%"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Uses Win32PrioritySeparation 38 (0x26): short variable quanta with foreground boost. Often already the default; background services may slow down.",
      "de": "Verwendet Win32PrioritySeparation 38 (0x26): kurze variable Zeitscheiben mit Vordergrundbonus. Oft bereits Standard; Hintergrunddienste koennen langsamer werden.",
      "it": "Usa Win32PrioritySeparation 38 (0x26): intervalli brevi variabili con priorita al primo piano. Spesso gia predefinito; servizi in background potenzialmente piu lenti."
    },
    "bulkSafe": false,
    "id": "windows.foreground",
    "risk": "medium",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Foreground scheduling",
      "de": "Vordergrundplanung fuer Programme",
      "it": "Pianificazione in primo piano"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Sets EnablePrefetcher to 0. Can slow application launches; no established gaming benefit on modern Windows. SysMain is a separate switch.",
      "de": "Setzt EnablePrefetcher auf 0. Kann Programmstarts verlangsamen; auf modernen Windows-Versionen kein belegter Gaming-Vorteil. SysMain ist ein separater Schalter.",
      "it": "Imposta EnablePrefetcher a 0. Puo rallentare avvio app; nessun beneficio gaming dimostrato su Windows moderno. SysMain ha un comando separato."
    },
    "bulkSafe": false,
    "id": "windows.prefetch.off",
    "risk": "high",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Disable Prefetch (legacy)",
      "de": "Prefetch deaktivieren (Legacy)",
      "it": "Disattiva Prefetch (legacy)"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Stops and disables SysMain. For diagnosing high disk activity; app launches may slow down. SafeMode blocks service shutdowns.",
      "de": "Stoppt und deaktiviert SysMain. Nur zur Diagnose hoher Datentraegerlast; Programmstarts koennen langsamer werden. SafeMode blockiert Dienstabschaltungen.",
      "it": "Arresta e disabilita SysMain. Per diagnosticare attivita disco elevata; avvio app potenzialmente piu lento. SafeMode impedisce arresti dei servizi."
    },
    "bulkSafe": false,
    "id": "windows.service.sysmain.off",
    "risk": "high",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Disable SysMain service",
      "de": "SysMain deaktivieren",
      "it": "Disattiva servizio SysMain"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Stops the Connected User Experiences and Telemetry service. Does not disable all telemetry or promise more FPS. Blocked by SafeMode.",
      "de": "Stoppt den Dienst fuer verbundene Benutzererfahrungen und Diagnosedaten. Kein vollstaendiger Telemetrie-Stopp und kein FPS-Versprechen. SafeMode blockiert dies.",
      "it": "Arresta il servizio esperienze utente connesse e telemetria. Non disattiva tutta la telemetria e non promette FPS. Bloccato da SafeMode."
    },
    "bulkSafe": false,
    "id": "windows.service.diagtrack.off",
    "risk": "high",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Disable Connected User Experiences (DiagTrack)",
      "de": "DiagTrack deaktivieren",
      "it": "Disattiva DiagTrack"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Stops WAP Push routing when installed. Can affect device management; unsuitable for managed business PCs. Blocked by SafeMode.",
      "de": "Stoppt WAP-Push-Routing, falls vorhanden. Kann Geraeteverwaltung beeintraechtigen; keine geschaeftlich verwalteten PCs. SafeMode blockiert dies.",
      "it": "Arresta WAP Push se presente. Puo compromettere gestione dispositivi; non adatto a PC aziendali gestiti. Bloccato da SafeMode."
    },
    "bulkSafe": false,
    "id": "windows.service.wappush.off",
    "risk": "high",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Disable WAP Push service",
      "de": "WAP-Push-Dienst deaktivieren",
      "it": "Disattiva servizio WAP Push"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Stops Windows Error Reporting. Reduces crash diagnostics; does not prevent crashes. Blocked by SafeMode.",
      "de": "Stoppt den Fehlerberichtsdienst. Weniger Absturzdiagnose; verhindert keine Abstuerze. SafeMode blockiert dies.",
      "it": "Arresta segnalazione errori Windows. Riduce la diagnostica; non evita arresti anomali. Bloccato da SafeMode."
    },
    "bulkSafe": false,
    "id": "windows.service.wer.off",
    "risk": "high",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Disable Windows Error Reporting service",
      "de": "Windows-Fehlerberichte deaktivieren",
      "it": "Disattiva segnalazione errori Windows"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Stops the Standard Collector when installed. Diagnostic and developer tools may lose functionality. Blocked by SafeMode.",
      "de": "Stoppt den Standard Collector, falls installiert. Diagnose- und Entwicklerwerkzeuge koennen Funktionen verlieren. SafeMode blockiert dies.",
      "it": "Arresta Standard Collector se installato. Strumenti diagnostici e di sviluppo possono perdere funzioni. Bloccato da SafeMode."
    },
    "bulkSafe": false,
    "id": "windows.service.diagnosticshub.off",
    "risk": "high",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Disable Diagnostics Hub collector",
      "de": "Diagnostics-Hub-Sammlung deaktivieren",
      "it": "Disattiva raccolta Diagnostics Hub"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Stops the legacy xbgm service when present. May affect Xbox functionality; absent on many PCs. Blocked by SafeMode.",
      "de": "Stoppt den alten xbgm-Dienst, falls vorhanden. Kann Xbox-Funktionen beeintraechtigen; fehlt auf vielen PCs. SafeMode blockiert dies.",
      "it": "Arresta il servizio legacy xbgm se presente. Puo influire sulle funzioni Xbox; assente su molti PC. Bloccato da SafeMode."
    },
    "bulkSafe": false,
    "id": "windows.service.xbgm.off",
    "risk": "high",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Disable Xbox Game Monitoring",
      "de": "Xbox Game Monitoring deaktivieren",
      "it": "Disattiva Xbox Game Monitoring"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Raises the split threshold to 4,194,303 MB. Fewer isolated processes but worse fault isolation. No general performance gain; restart required.",
      "de": "Setzt die Trennschwelle auf 4.194.303 MB. Weniger getrennte Prozesse, aber schlechtere Fehlerisolation. Kein allgemeiner Leistungsgewinn; Neustart erforderlich.",
      "it": "Alza la soglia di separazione a 4.194.303 MB. Meno processi isolati, ma minore isolamento guasti. Nessun vantaggio generale; riavvio necessario."
    },
    "bulkSafe": false,
    "id": "windows.svchost.group",
    "risk": "high",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Group svchost processes",
      "de": "Svchost-Prozesse gruppieren",
      "it": "Raggruppa processi svchost"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Disables installed Consolidator, KernelCeipTask and UsbCeip tasks without deleting them. Privacy option, no guaranteed performance gain.",
      "de": "Deaktiviert vorhandene Consolidator-, KernelCeipTask- und UsbCeip-Aufgaben. Keine Aufgaben werden geloescht. Datenschutz, kein garantierter Leistungsgewinn.",
      "it": "Disattiva le attivita Consolidator, KernelCeipTask e UsbCeip presenti senza eliminarle. Opzione privacy, nessun aumento prestazioni garantito."
    },
    "bulkSafe": false,
    "id": "windows.ceip.off",
    "risk": "medium",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Disable CEIP scheduled tasks",
      "de": "CEIP-Aufgaben deaktivieren",
      "it": "Disattiva attivita CEIP"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Disables AC sleep and Windows Power Throttling. Higher power use; the global throttling option may reduce battery life.",
      "de": "Deaktiviert Standby am Netzteil und Windows Power Throttling. Hoeherer Verbrauch; Akkulaufzeit kann durch die globale Drosselungsoption sinken.",
      "it": "Disattiva sospensione con alimentazione di rete e Windows Power Throttling. Maggiori consumi; la modifica globale puo ridurre autonomia."
    },
    "bulkSafe": false,
    "id": "windows.power.extras",
    "risk": "high",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Power plan extras: sleep / throttle",
      "de": "Energieplan: Standby und Drosselung aus",
      "it": "Piano energia: sospensione / limitazione"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Disables logging and upload for the classic Office 16 Telemetry Agent. Does not disable all Microsoft 365 diagnostics; requires Office 16 family.",
      "de": "Deaktiviert Logging und Upload des klassischen Office-16-Telemetrie-Agenten. Betrifft nicht alle Microsoft-365-Diagnosedaten; nur bei installierter Office-16-Familie.",
      "it": "Disattiva log e invio per agente telemetria classico Office 16. Non disattiva tutta la diagnostica Microsoft 365; richiede Office 16."
    },
    "bulkSafe": false,
    "id": "windows.office.telemetry.off",
    "risk": "medium",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Disable Office Telemetry Agent",
      "de": "Office-Telemetrie-Agent deaktivieren",
      "it": "Disattiva agente telemetria Office"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Disables suggested apps for this user. Keeps WUDF driver diagnostic logs: disabling those has no established benefit.",
      "de": "Deaktiviert vorgeschlagene Apps fuer diesen Benutzer. Treiberdiagnose/WUDF-Logs bleiben erhalten: kein belegter Vorteil durch deren Abschaltung.",
      "it": "Disattiva suggerimenti app per questo utente. Mantiene log diagnostici WUDF: disattivarli non offre benefici dimostrati."
    },
    "bulkSafe": false,
    "id": "windows.suggestions.off",
    "risk": "low",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Disable consumer app suggestions",
      "de": "App-Vorschlaege deaktivieren",
      "it": "Disattiva suggerimenti app"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Schaltet die Windows-Vollbildoptimierungen f\u00fcr alle Spiele ab. Exklusiver Vollbildmodus l\u00e4uft dann wieder direkt ohne Desktop-Komposition \u2013 bei manchen DirectX-Spielen sp\u00fcrbar weniger Eingabeverz\u00f6gerung. Randlose Fenster sind nicht betroffen. Neustart erforderlich.",
      "en": "Turns off Windows fullscreen optimizations for all games. Exclusive fullscreen runs directly again without desktop composition \u2013 noticeably lower input latency in some DirectX games. Borderless windows are not affected. Restart required.",
      "it": "Disattiva le ottimizzazioni a schermo intero di Windows per tutti i giochi. Lo schermo intero esclusivo torna diretto senza composizione del desktop: in alcuni giochi DirectX meno latenza di input. Le finestre senza bordi non cambiano. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "windows.legacy.fps",
    "risk": "medium",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "de": "Vollbildoptimierungen global aus",
      "en": "Disable fullscreen optimizations globally",
      "it": "Disattiva ottimizzazioni schermo intero"
    },
    "unavailable": "unsupported_optimization_recipe",
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Windows schreibt nicht mehr bei jedem Lesen einer Datei den Zeitpunkt des letzten Zugriffs. Weniger Schreibzugriffe auf SSD/HDD, besonders beim Laden vieler kleiner Spieldateien. Backup-Programme, die darauf angewiesen sind, sind selten. Neustart erforderlich.",
      "en": "Windows no longer writes the last-access time every time a file is read. Fewer writes to SSD/HDD, especially when loading many small game files. Backup tools relying on it are rare. Restart required.",
      "it": "Windows non scrive pi\u00f9 l\u2019ora dell\u2019ultimo accesso a ogni lettura di file. Meno scritture su SSD/HDD, soprattutto caricando molti piccoli file di gioco. Raramente serve ai programmi di backup. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "windows.io.realtime",
    "risk": "low",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "de": "NTFS: Zugriffszeitstempel aus",
      "en": "NTFS: disable last-access timestamps",
      "it": "NTFS: disattiva timestamp ultimo accesso"
    },
    "unavailable": "unsupported_optimization_recipe",
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Sets HungAppTimeout to 3000 ms and WaitToKillAppTimeout to 5000 ms. May interrupt saving at sign-out. Does not force automatic termination; menu delay is separate.",
      "de": "Setzt HungAppTimeout auf 3000 ms und WaitToKillAppTimeout auf 5000 ms. Kann Speichern beim Abmelden unterbrechen. Erzwingt kein automatisches Beenden; Menue-Wartezeit bleibt separat.",
      "it": "Imposta HungAppTimeout a 3000 ms e WaitToKillAppTimeout a 5000 ms. Puo interrompere salvataggi alla disconnessione. Non forza chiusura automatica; menu separati."
    },
    "bulkSafe": false,
    "id": "windows.close.faster",
    "risk": "high",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Shorter hung-app response timeout",
      "de": "Kuerzere Wartezeit bei haengenden Apps",
      "it": "Attesa ridotta per app bloccate"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Our alternative to no-lazy-mode: sets MMCSS to Automatic and starts it. Does not alter undocumented scheduler keys. Usually already active.",
      "de": "Eigene Alternative zu No-lazy-mode: stellt MMCSS auf Automatisch und startet ihn. Veraendert keine undokumentierten Scheduler-Schluessel. Meist bereits aktiv.",
      "it": "Alternativa a no-lazy-mode: imposta MMCSS su Automatico e lo avvia. Non modifica chiavi scheduler non documentate. Di solito gia attivo."
    },
    "bulkSafe": false,
    "id": "windows.mmcss.on",
    "risk": "medium",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Enable MMCSS service",
      "de": "MMCSS-Dienst aktivieren",
      "it": "Attiva servizio MMCSS"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Disables solicited Windows Remote Assistance. Remote Desktop and third-party remote tools are separate. Not an FPS tweak.",
      "de": "Deaktiviert angeforderte Windows-Remoteunterstuetzung. Remote Desktop und Drittanbieter-Fernwartung bleiben separat. Kein FPS-Tweak.",
      "it": "Disattiva Assistenza remota Windows richiesta. Desktop remoto e strumenti esterni sono separati. Non aumenta gli FPS."
    },
    "bulkSafe": false,
    "id": "windows.assistance.off",
    "risk": "medium",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Disable Remote Assistance",
      "de": "Remoteunterstuetzung deaktivieren",
      "it": "Disattiva Assistenza remota"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Disables AutoPlay for all drive types for this user. Drives remain accessible.",
      "de": "Deaktiviert die automatische Wiedergabe fuer alle Laufwerkstypen dieses Benutzers. Laufwerke bleiben normal erreichbar.",
      "it": "Disattiva AutoPlay per tutti i tipi di unita di questo utente. Le unita restano accessibili."
    },
    "bulkSafe": false,
    "id": "windows.autoplay.off",
    "risk": "low",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Disable AutoPlay",
      "de": "Automatische Wiedergabe deaktivieren",
      "it": "Disattiva AutoPlay"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Sets MouseHoverTime to 100 ms for classic hover events. Apps with custom tooltips may ignore it. Does not reduce keyboard input latency.",
      "de": "Setzt MouseHoverTime auf 100 ms. Wirkt auf klassische Hover-Ereignisse; Apps mit eigenen Tooltips koennen dies ignorieren. Keine Eingabelatenz-Optimierung.",
      "it": "Imposta MouseHoverTime a 100 ms per eventi hover classici. App con tooltip propri possono ignorarlo. Non riduce latenza tastiera."
    },
    "bulkSafe": false,
    "id": "windows.tooltip.fast",
    "risk": "low",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Faster hover / tooltip delay",
      "de": "Schnellere Hover-Reaktion",
      "it": "Reazione hover piu rapida"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Disables activity feed, collection and upload by policy. Does not delete existing history. Legacy Timeline features depend on Windows version.",
      "de": "Deaktiviert Aktivitaetsfeed, Sammlung und Upload per Richtlinie. Loescht keine bestehende Historie. Veraltete Timeline-Funktionen sind versionsabhaengig.",
      "it": "Disattiva feed, raccolta e invio attivita tramite criterio. Non elimina la cronologia esistente. Le funzioni Timeline dipendono da Windows."
    },
    "bulkSafe": false,
    "id": "windows.activity.off",
    "risk": "medium",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Disable activity history",
      "de": "Aktivitaetsverlauf deaktivieren",
      "it": "Disattiva cronologia attivita"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Disables automatic storage cleanup. Deletes no files; disk usage may grow.",
      "de": "Deaktiviert automatische Speicherbereinigung. Keine Dateien werden geloescht; belegter Speicher kann wachsen.",
      "it": "Disattiva pulizia automatica spazio. Non elimina file; lo spazio occupato puo aumentare."
    },
    "bulkSafe": false,
    "id": "windows.storage.off",
    "risk": "medium",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Disable Storage Sense",
      "de": "Speicheroptimierung deaktivieren",
      "it": "Disattiva Sensore memoria"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Opens Explorer at This PC and hides recent files/folders. Convenience only; no FPS gain or file deletion.",
      "de": "Oeffnet Explorer bei Dieser PC und blendet zuletzt genutzte Dateien/Ordner aus. Komfortoption; kein FPS-Vorteil und keine Dateiloeschung.",
      "it": "Apre Explorer su Questo PC e nasconde file/cartelle recenti. Solo comodita; nessun aumento FPS o eliminazione file."
    },
    "bulkSafe": false,
    "id": "windows.explorer.defaults",
    "risk": "low",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Explorer: This PC without recent history",
      "de": "Explorer: Dieser PC ohne Verlauf",
      "it": "Explorer: Questo PC senza cronologia"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Disables rotating lock-screen Spotlight content and tips for this user. No performance guarantee.",
      "de": "Deaktiviert rotierende Spotlight-Inhalte und Tipps am Sperrbildschirm fuer diesen Benutzer. Keine Leistungsgarantie.",
      "it": "Disattiva contenuti Spotlight e suggerimenti sulla schermata di blocco per questo utente. Nessuna garanzia prestazioni."
    },
    "bulkSafe": false,
    "id": "windows.spotlight.off",
    "risk": "low",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Disable lock-screen Spotlight and tips",
      "de": "Sperrbildschirm-Spotlight und Tipps aus",
      "it": "Disattiva Spotlight e suggerimenti blocco"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Deaktiviert Starttipps der klassischen Game Bar. Versionsabh\u00e4ngige Komfortoption; Aufzeichnung bleibt separat.",
      "en": "Disables classic Game Bar startup tips. Version-dependent convenience setting; recording is separate.",
      "it": "Disattiva suggerimenti iniziali della Game Bar classica. Opzione comodita dipendente dalla versione; registrazione separata."
    },
    "bulkSafe": false,
    "id": "windows.gamebar.quiet",
    "risk": "low",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "de": "Game-Bar-Starttipps aus",
      "en": "Quiet Game Bar startup",
      "it": "Disattiva suggerimenti iniziali Game Bar"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Disables clipboard history. Normal copy/paste remains available. Does not actively delete saved entries.",
      "de": "Sperrt den Zwischenablageverlauf. Normales Kopieren/Einfuegen bleibt moeglich. Gespeicherte Eintraege werden nicht aktiv geloescht.",
      "it": "Disattiva cronologia Appunti. Copia/incolla normale resta disponibile. Non elimina attivamente le voci salvate."
    },
    "bulkSafe": false,
    "id": "windows.clipboard.off",
    "risk": "medium",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Disable clipboard history",
      "de": "Zwischenablageverlauf deaktivieren",
      "it": "Disattiva cronologia Appunti"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Schaltet Copilot per Richtlinie ab und blendet den Copilot-Knopf in der Taskleiste aus. Auf neueren Windows-Versionen bleibt die Copilot-App installiert, wird aber nicht mehr angeboten. Neustart erforderlich.",
      "en": "Turns Copilot off by policy and hides the Copilot taskbar button. On newer Windows versions the Copilot app stays installed but is no longer offered. Restart required.",
      "it": "Disattiva Copilot tramite criterio e nasconde il pulsante Copilot nella barra delle applicazioni. Sulle versioni pi\u00f9 recenti l\u2019app resta installata ma non viene pi\u00f9 proposta. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "windows.copilot.off",
    "risk": "medium",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "de": "Klassischen Windows-Copilot deaktivieren",
      "en": "Disable legacy Windows Copilot policy",
      "it": "Disattiva Copilot Windows classico"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Disables classic Ink Workspace by policy. Can affect pen workflows; no FPS gain.",
      "de": "Deaktiviert den klassischen Ink Workspace per Richtlinie. Kann Stift-Workflows beeintraechtigen; kein FPS-Gewinn.",
      "it": "Disattiva Ink Workspace classico tramite criterio. Puo influire sui flussi con penna; nessun aumento FPS."
    },
    "bulkSafe": false,
    "id": "windows.ink.off",
    "risk": "medium",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Disable Windows Ink Workspace",
      "de": "Windows Ink Workspace deaktivieren",
      "it": "Disattiva Windows Ink Workspace"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "id": "windows.capture.off",
    "category": "performance",
    "risk": "medium",
    "bulkSafe": false,
    "requiresAdmin": true,
    "name": {
      "en": "Disable Game DVR recording",
      "de": "Game-DVR-Aufzeichnung deaktivieren",
      "it": "Disattiva registrazione Game DVR"
    },
    "description": {
      "en": "Disables Windows game capture including background clips. Can avoid recording overhead when capture was active. Manual Game Bar recording is also disabled. Existing videos are preserved. Restart required; no guaranteed FPS gain.",
      "de": "Deaktiviert Windows-Spielaufnahmen einschlie\u00dflich Hintergrundclips. Kann Aufnahme-Last vermeiden, wenn diese vorher aktiv war. Manuelle Game-Bar-Aufnahmen sind ebenfalls aus. Bestehende Videos bleiben erhalten. Neustart erforderlich; kein garantierter FPS-Gewinn.",
      "it": "Disattiva le acquisizioni Windows, incluse le clip in background e le registrazioni manuali di Game Bar. Puo eliminare il carico delle registrazioni prima attive. Conserva i video esistenti. Riavvio necessario; nessun aumento FPS garantito."
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "id": "windows.gamemode.on",
    "category": "performance",
    "risk": "low",
    "bulkSafe": false,
    "requiresAdmin": true,
    "name": {
      "en": "Enable Windows Game Mode",
      "de": "Windows-Spielmodus aktivieren",
      "it": "Attiva Modalita gioco Windows"
    },
    "description": {
      "en": "Enables Windows Game Mode for recognized games. May help under background load; already enabled on many PCs. Restart required. No guaranteed FPS gain.",
      "de": "Aktiviert den Windows-Spielmodus f\u00fcr erkannte Spiele. Kann unter Hintergrundlast helfen; ist auf vielen PCs bereits aktiv. Neustart erforderlich. Kein garantierter FPS-Gewinn.",
      "it": "Attiva Modalita gioco per i giochi riconosciuti. Puo aiutare con carichi in background; spesso e gia attiva. Riavvio necessario. Nessun aumento FPS garantito."
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "id": "windows.audio.ducking.off",
    "category": "performance",
    "risk": "low",
    "bulkSafe": false,
    "requiresAdmin": true,
    "name": {
      "en": "Disable communications audio ducking",
      "de": "Lautstaerkeabsenkung bei Sprachchats aus",
      "it": "Disattiva attenuazione audio nelle chiamate"
    },
    "description": {
      "en": "Stops Windows automatically lowering other audio during detected calls. Audio convenience, not an FPS or latency tweak. Discord attenuation settings are separate. Restart required.",
      "de": "Verhindert, dass Windows andere Audioquellen bei erkannten Anrufen automatisch leiser stellt. Audio-Komfort, kein FPS- oder Latenz-Tweak. Eigene Lautstaerkeregeln von Discord bleiben separat. Neustart erforderlich.",
      "it": "Impedisce a Windows di abbassare altri suoni durante le chiamate rilevate. Comodita audio, senza benefici FPS o latenza. Le impostazioni Discord sono separate. Riavvio necessario."
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "id": "windows.power.high",
    "category": "performance",
    "risk": "low",
    "bulkSafe": true,
    "requiresAdmin": true,
    "name": {
      "en": "High performance",
      "de": "Hohe Leistung",
      "it": "Prestazioni elevate"
    },
    "description": {
      "en": "Activates the existing Windows High performance plan. May increase power use, heat and fan noise. No guaranteed FPS gain.",
      "de": "Aktiviert den vorhandenen Windows-Energieplan Hohe Leistung. Kann Stromverbrauch, Temperatur und Luefterlautstaerke erhoehen. Kein garantierter FPS-Gewinn.",
      "it": "Attiva il piano Windows Prestazioni elevate esistente. Puo aumentare consumi, temperatura e rumore. Nessun aumento FPS garantito."
    },
    "requiresRestart": false,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "id": "fivem.priority.high",
    "category": "gaming",
    "risk": "medium",
    "bulkSafe": false,
    "requiresAdmin": false,
    "name": {
      "en": "FiveM process priority",
      "de": "FiveM-Prozessprioritaet",
      "it": "Priorita del processo FiveM"
    },
    "description": {
      "en": "Sets running FiveM game processes to High. May slow other applications. Ends with the game process; no guaranteed FPS gain.",
      "de": "Setzt laufende FiveM-Spielprozesse auf Hoch. Kann andere Anwendungen verlangsamen. Endet mit dem Spielprozess; kein garantierter FPS-Gewinn.",
      "it": "Imposta su Alta i processi di gioco FiveM attivi. Puo rallentare altre applicazioni. Termina con il processo; nessun aumento FPS garantito."
    },
    "requiresRestart": false,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "id": "keyboard.repeat.fast",
    "category": "keyboard",
    "risk": "low",
    "bulkSafe": true,
    "requiresAdmin": true,
    "name": {
      "de": "Tastenwiederholung: Verz\u00f6gerung 0, Rate 31",
      "en": "Key repeat: delay 0, rate 31",
      "it": "Ripetizione tasti: ritardo 0, velocit\u00e0 31"
    },
    "description": {
      "de": "Setzt die Windows-Wiederholverz\u00f6gerung auf die k\u00fcrzeste Stufe (ca. 250 ms) und die Wiederholrate auf die h\u00f6chste Stufe (ca. 30/s). Betrifft gehaltene Tasten und auch Texteingaben, nicht die Latenz des ersten Tastendrucks. Kein garantierter Vorteil in Spielen.",
      "en": "Sets Windows repeat delay to the shortest level (about 250 ms) and repeat rate to the highest level (about 30/s). Affects held keys including text input, not first-press latency. No guaranteed game benefit.",
      "it": "Imposta il ritardo di ripetizione Windows al minimo (circa 250 ms) e la velocit\u00e0 al massimo (circa 30/s). Riguarda i tasti tenuti premuti, anche nel testo, non la latenza della prima pressione. Nessun vantaggio garantito nei giochi."
    },
    "requiresRestart": false,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "id": "keyboard.filterkeys.off",
    "category": "keyboard",
    "risk": "medium",
    "bulkSafe": false,
    "requiresAdmin": true,
    "name": {
      "de": "Filtertasten deaktivieren",
      "en": "Disable Filter Keys",
      "it": "Disattiva Filtro tasti"
    },
    "description": {
      "de": "Deaktiviert Filtertasten und die Aktivierung durch langes Halten der rechten Umschalttaste. Kann aktive Eingabefilter beseitigen. Ver\u00e4ndert eine Bedienungshilfe f\u00fcr alle Anwendungen; nur deaktivieren, wenn sie nicht ben\u00f6tigt wird.",
      "en": "Disables Filter Keys and its right-Shift activation shortcut. Can remove active input filtering. Changes an accessibility feature for all applications; disable only if you do not need it.",
      "it": "Disattiva Filtro tasti e la scorciatoia con Maiusc destro tenuto premuto. Pu\u00f2 eliminare filtri di input attivi. Modifica una funzione di accessibilit\u00e0 per tutte le app; disattivala solo se non serve."
    },
    "requiresRestart": false,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "id": "keyboard.stickykeys.off",
    "category": "keyboard",
    "risk": "medium",
    "bulkSafe": false,
    "requiresAdmin": true,
    "name": {
      "de": "Einrastfunktion deaktivieren",
      "en": "Disable Sticky Keys",
      "it": "Disattiva Tasti permanenti"
    },
    "description": {
      "de": "Deaktiviert die Einrastfunktion und die Aktivierung durch f\u00fcnfmaliges Dr\u00fccken der Umschalttaste. Verhindert versehentliches Einschalten beim Spielen. Ver\u00e4ndert eine Bedienungshilfe f\u00fcr alle Anwendungen; senkt nicht die Hardware-Latenz.",
      "en": "Disables Sticky Keys and its five-Shift activation shortcut. Prevents accidental activation while gaming. Changes an accessibility feature for all applications; does not reduce hardware latency.",
      "it": "Disattiva Tasti permanenti e la scorciatoia con cinque pressioni di Maiusc. Evita attivazioni accidentali durante il gioco. Modifica una funzione di accessibilit\u00e0 per tutte le app; non riduce la latenza hardware."
    },
    "requiresRestart": false,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "id": "debloat.widgets.hide",
    "category": "debloat",
    "risk": "medium",
    "bulkSafe": false,
    "requiresAdmin": true,
    "name": {
      "de": "Widgets und Nachrichten ausblenden",
      "en": "Hide widgets and news",
      "it": "Nascondi widget e notizie"
    },
    "description": {
      "de": "Blendet Widgets und Nachrichten in der Taskleiste aus. Aendert keine Store- oder Sicherheitsdienste. Die Wirkung der Widgets-Richtlinie ist editionsabhaengig.",
      "en": "Hides taskbar widgets and news. Does not change Store or security services. Widget policy enforcement depends on Windows edition.",
      "it": "Nasconde widget e notizie nella barra delle applicazioni. Non modifica servizi Store o sicurezza. Il criterio widget dipende dall edizione Windows."
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "id": "debloat.onedrive.block",
    "category": "debloat",
    "risk": "high",
    "bulkSafe": false,
    "requiresAdmin": true,
    "name": {
      "de": "OneDrive-Synchronisierung sperren",
      "en": "Block OneDrive synchronization",
      "it": "Blocca sincronizzazione OneDrive"
    },
    "description": {
      "de": "Sperrt OneDrive-Synchronisierung per Richtlinie, ohne Cloud-Dateien oder lokale Ordner zu loeschen. Verhindert nicht garantiert jede Neuinstallation. Vor erneuter Nutzung die Richtlinie rueckgaengig machen.",
      "en": "Blocks OneDrive synchronization by policy without deleting cloud files or local folders. Does not guarantee prevention of reinstallations. Undo this policy before using OneDrive again.",
      "it": "Blocca sincronizzazione OneDrive tramite criterio senza eliminare file cloud o cartelle locali. Non garantisce il blocco delle reinstallazioni. Annullare il criterio prima di riutilizzare OneDrive."
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "id": "debloat.recall.off",
    "category": "debloat",
    "risk": "high",
    "bulkSafe": false,
    "requiresAdmin": true,
    "name": {
      "de": "Recall-Momentaufnahmen deaktivieren",
      "en": "Disable Recall snapshots",
      "it": "Disattiva istantanee Recall"
    },
    "description": {
      "de": "Verhindert, dass Windows Recall Momentaufnahmen speichert (Richtlinie). Wirkt auf Copilot+-PCs; auf anderen PCs vorbeugend f\u00fcr sp\u00e4tere Windows-Updates. Vorhandene Momentaufnahmen k\u00f6nnen gel\u00f6scht werden. Neustart erforderlich.",
      "en": "Stops Windows Recall from saving snapshots (policy). Effective on Copilot+ PCs; on other PCs it takes effect preventively for later Windows updates. Existing snapshots may be deleted. Restart required.",
      "it": "Impedisce a Windows Recall di salvare istantanee (criterio). Vale sui PC Copilot+; sugli altri PC in via preventiva per futuri aggiornamenti. Le istantanee esistenti possono essere eliminate. Riavvio necessario."
    },
    "dataLoss": true,
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "id": "debloat.suggestions.off",
    "category": "debloat",
    "risk": "medium",
    "bulkSafe": false,
    "requiresAdmin": true,
    "name": {
      "de": "Automatische App-Vorschlaege reduzieren",
      "en": "Reduce automatic app suggestions",
      "it": "Riduci suggerimenti automatici app"
    },
    "description": {
      "de": "Deaktiviert vorgeschlagene und automatisch beworbene Apps fuer diesen Benutzer. Kein garantierter Schutz vor Wiederinstallation durch Updates, OEMs oder eigene Store-Installationen. Store und App-Updates bleiben aktiv.",
      "en": "Disables suggested and promoted app installations for this user. Does not guarantee prevention of reinstalls by updates, OEMs or user Store installs. Store and app updates remain enabled.",
      "it": "Disattiva app suggerite e promosse per questo utente. Non garantisce il blocco di reinstallazioni da aggiornamenti, OEM o Store. Store e aggiornamenti app restano attivi."
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Hebt die Fast-Send-Grenze des Windows-Socket-Treibers (AFD) auf 1500 Byte. Typische Spielpakete bis zur Ethernet-Paketgr\u00f6\u00dfe gehen dann \u00fcber den schnellen Kopierpfad. Kleiner Effekt, kein garantierter Ping-Gewinn. Neustart erforderlich.",
      "en": "Raises the Windows socket driver (AFD) fast-send threshold to 1500 bytes, so typical game packets up to Ethernet packet size use the fast copy path. Small effect, no guaranteed ping gain. Restart required.",
      "it": "Alza a 1500 byte la soglia fast-send del driver socket di Windows (AFD): i pacchetti di gioco tipici fino alla dimensione Ethernet usano il percorso di copia rapido. Effetto ridotto, nessun miglioramento del ping garantito. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "network.winsock.udp",
    "risk": "medium",
    "category": "network",
    "requiresAdmin": true,
    "name": {
      "de": "Winsock: schneller UDP-Versand",
      "en": "Winsock: fast UDP sends",
      "it": "Winsock: invio UDP rapido"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Setzt NetworkThrottlingIndex auf aus. Windows begrenzt dann den Netzwerkdurchsatz nicht mehr, w\u00e4hrend Audio oder Video \u00fcber MMCSS l\u00e4uft. Hilft vor allem bei Musik im Hintergrund; etwas mehr CPU-Last f\u00fcr Netzwerkpakete m\u00f6glich. Neustart erforderlich.",
      "en": "Sets NetworkThrottlingIndex to off, so Windows no longer limits network throughput while audio or video runs through MMCSS. Mainly helps with music in the background; slightly more CPU work for network packets is possible. Restart required.",
      "it": "Imposta NetworkThrottlingIndex su disattivato: Windows non limita pi\u00f9 la rete mentre audio o video usano MMCSS. Utile soprattutto con musica in sottofondo; possibile un leggero aumento del carico CPU. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "network.throttle.off",
    "risk": "medium",
    "category": "network",
    "requiresAdmin": true,
    "name": {
      "de": "Multimedia-Netzwerkdrossel aus",
      "en": "Disable multimedia network throttling",
      "it": "Disattiva limitazione rete multimediale"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Misst beim Anwenden Cloudflare (1.1.1.1) und Google (8.8.8.8) und tr\u00e4gt den schnelleren als IPv4-DNS f\u00fcr alle Ethernet- und WLAN-Karten ein. Beschleunigt Namensaufl\u00f6sung, nicht den Ping im Spiel. Ersetzt eigene DNS-Server (z. B. Pi-hole, Firmen-DNS); Revert stellt sie exakt wieder her.",
      "en": "Measures Cloudflare (1.1.1.1) and Google (8.8.8.8) when applied and sets the faster one as IPv4 DNS for all Ethernet and Wi-Fi cards. Speeds up name lookups, not in-game ping. Replaces custom DNS servers (e.g. Pi-hole, company DNS); Revert restores them exactly.",
      "it": "Misura Cloudflare (1.1.1.1) e Google (8.8.8.8) e imposta il pi\u00f9 veloce come DNS IPv4 per tutte le schede Ethernet e Wi-Fi. Velocizza la risoluzione dei nomi, non il ping in gioco. Sostituisce DNS personalizzati (es. Pi-hole, DNS aziendale); Revert li ripristina esattamente."
    },
    "bulkSafe": false,
    "id": "network.dns.fast",
    "risk": "medium",
    "category": "network",
    "requiresAdmin": true,
    "name": {
      "de": "Schnellster \u00f6ffentlicher DNS (1.1.1.1 oder 8.8.8.8)",
      "en": "Fastest public DNS (1.1.1.1 or 8.8.8.8)",
      "it": "DNS pubblico pi\u00f9 veloce (1.1.1.1 o 8.8.8.8)"
    },
    "requiresRestart": false,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Setzt TCPNoDelay und TcpAckFrequency=1 f\u00fcr alle Ethernet- und WLAN-Karten: kleine TCP-Pakete werden ohne Sammelverz\u00f6gerung gesendet und sofort best\u00e4tigt. Wirkt nur auf TCP (z. B. Server-Downloads, Chats); FiveM-Spielverkehr l\u00e4uft \u00fcberwiegend \u00fcber UDP. Etwas mehr Pakete im Netz. Neustart erforderlich.",
      "en": "Sets TCPNoDelay and TcpAckFrequency=1 on all Ethernet and Wi-Fi cards: small TCP packets are sent without batching delay and acknowledged immediately. Only affects TCP (e.g. server downloads, chats); FiveM gameplay traffic is mostly UDP. Slightly more packets on the network. Restart required.",
      "it": "Imposta TCPNoDelay e TcpAckFrequency=1 su tutte le schede Ethernet e Wi-Fi: i piccoli pacchetti TCP partono senza attesa e vengono confermati subito. Vale solo per TCP (es. download dal server, chat); il traffico di gioco FiveM \u00e8 quasi tutto UDP. Leggermente pi\u00f9 pacchetti in rete. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "network.nagle.off",
    "risk": "medium",
    "category": "network",
    "requiresAdmin": true,
    "name": {
      "de": "Nagle aus (TCPNoDelay + sofortige ACKs)",
      "en": "Disable Nagle (TCPNoDelay + immediate ACKs)",
      "it": "Disattiva Nagle (TCPNoDelay + ACK immediati)"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Verhindert, dass Windows sich automatisch mit offenen oder vorgeschlagenen Hotspots verbindet. Gespeicherte eigene WLANs verbinden weiter automatisch. Auf PCs ohne WLAN ohne Wirkung. Neustart erforderlich.",
      "en": "Stops Windows connecting automatically to open or suggested hotspots. Your own saved Wi-Fi networks still connect automatically. No effect on PCs without Wi-Fi. Restart required.",
      "it": "Impedisce a Windows di connettersi automaticamente a hotspot aperti o suggeriti. Le reti Wi-Fi salvate continuano a connettersi da sole. Nessun effetto senza Wi-Fi. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "network.wifisense.off",
    "risk": "low",
    "category": "network",
    "requiresAdmin": true,
    "name": {
      "de": "WLAN-Optimierung / Hotspot-Autoverbindung aus",
      "en": "Disable Wi-Fi Sense / hotspot auto-connect",
      "it": "Disattiva Wi-Fi Sense / connessione automatica hotspot"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Entfernt f\u00fcr alle Ethernet- und WLAN-Karten die Option, dass Windows die Karte zum Energiesparen abschaltet. Verhindert Verbindungsabbr\u00fcche nach Leerlauf. Wake-on-LAN kann danach nicht mehr funktionieren; Laptop-Akku h\u00e4lt etwas k\u00fcrzer. Neustart erforderlich.",
      "en": "Removes the option for Windows to turn off Ethernet and Wi-Fi cards to save power. Prevents dropouts after idle periods. Wake-on-LAN may stop working; laptop battery life is slightly shorter. Restart required.",
      "it": "Rimuove per tutte le schede Ethernet e Wi-Fi la possibilita che Windows le spenga per risparmiare energia. Evita disconnessioni dopo inattivita. Wake-on-LAN potrebbe non funzionare piu; batteria del portatile leggermente pi\u00f9 corta. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "network.nic.powersave.off",
    "risk": "medium",
    "category": "network",
    "requiresAdmin": true,
    "name": {
      "de": "Energiesparen der Netzwerkkarte aus",
      "en": "Disable network card power saving",
      "it": "Disattiva risparmio energetico scheda di rete"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Gibt geschlossene Verbindungen nach 30 statt 120 Sekunden frei und nutzt TCP-Fensterskalierung ohne Zeitstempel (12 Byte weniger pro Paket). L\u00e4sst die automatische Empfangsfenster-Abstimmung von Windows unver\u00e4ndert. Kein garantierter Ping-Gewinn. Neustart erforderlich.",
      "en": "Releases closed connections after 30 instead of 120 seconds and uses TCP window scaling without timestamps (12 bytes less per packet). Leaves Windows receive-window auto-tuning unchanged. No guaranteed ping gain. Restart required.",
      "it": "Libera le connessioni chiuse dopo 30 invece di 120 secondi e usa il ridimensionamento della finestra TCP senza timestamp (12 byte in meno per pacchetto). Non modifica l'autotuning di Windows. Nessun miglioramento del ping garantito. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "network.tcp.gaming",
    "risk": "medium",
    "category": "network",
    "requiresAdmin": true,
    "name": {
      "de": "TCP-Stack f\u00fcr Spiele",
      "en": "TCP stack for gaming",
      "it": "Stack TCP per il gioco"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Schaltet die IPv6-Tunnel Teredo, 6to4 und ISATAP per Richtlinie ab. Echtes IPv6 deines Anschlusses bleibt aktiv. Xbox-App-Partychat und manche Xbox-Mehrspielerfunktionen brauchen Teredo und k\u00f6nnen danach ausfallen. Neustart erforderlich.",
      "en": "Turns off the Teredo, 6to4 and ISATAP IPv6 tunnels by policy. Your connection's native IPv6 stays active. Xbox app party chat and some Xbox multiplayer features need Teredo and may stop working. Restart required.",
      "it": "Disattiva via criterio i tunnel IPv6 Teredo, 6to4 e ISATAP. L IPv6 nativo della connessione resta attivo. La chat di gruppo dell app Xbox e alcune funzioni multigiocatore Xbox richiedono Teredo e potrebbero non funzionare. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "network.teredo.off",
    "risk": "medium",
    "category": "network",
    "requiresAdmin": true,
    "name": {
      "de": "Teredo / 6to4 / ISATAP aus",
      "en": "Disable Teredo / 6to4 / ISATAP",
      "it": "Disattiva Teredo / 6to4 / ISATAP"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Windows-Updates und Store-Apps werden nur noch direkt von Microsoft geladen, nicht mehr mit anderen PCs im Netz oder Internet geteilt. Spart Upload im Hintergrund. Updates selbst bleiben aktiv. Neustart erforderlich.",
      "en": "Windows updates and Store apps are downloaded directly from Microsoft only and no longer shared with other PCs on your network or the internet. Saves background upload. Updates stay enabled. Restart required.",
      "it": "Aggiornamenti Windows e app dello Store vengono scaricati solo da Microsoft e non pi\u00f9 condivisi con altri PC in rete o su internet. Risparmia upload in background. Gli aggiornamenti restano attivi. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "network.delivery.off",
    "risk": "low",
    "category": "network",
    "requiresAdmin": true,
    "name": {
      "de": "\u00dcbermittlungsoptimierung aus",
      "en": "Disable Delivery Optimization",
      "it": "Disattiva Ottimizzazione recapito"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Setzt die Bandbreite, die Windows f\u00fcr priorisierte QoS-Anwendungen zur\u00fccklegen darf, auf 0%. Ehrlich: normale Programme und Spiele werden davon praktisch nie gebremst; der Effekt ist meist nicht messbar. Neustart erforderlich.",
      "en": "Sets the bandwidth Windows may reserve for prioritised QoS applications to 0%. Honestly: normal programs and games are practically never slowed by it; the effect is usually not measurable. Restart required.",
      "it": "Imposta allo 0% la banda che Windows pu\u00f2 riservare alle applicazioni QoS prioritarie. Onestamente: programmi e giochi normali non ne sono quasi mai rallentati; l'effetto di solito non \u00e8 misurabile. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "network.qos.reserve.off",
    "risk": "low",
    "category": "network",
    "requiresAdmin": true,
    "name": {
      "de": "QoS-Bandbreitenreserve auf 0%",
      "en": "QoS bandwidth reserve to 0%",
      "it": "Riserva di banda QoS allo 0%"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Schaltet LLMNR-Multicast ab und stellt NetBIOS auf Punkt-zu-Punkt (keine Broadcasts). Weniger Namensrundrufe im Netz und mehr Sicherheit in fremden WLANs. Alte Ger\u00e4te, die nur per NetBIOS-Name erreichbar sind, findest du danach nur noch per IP oder DNS. Neustart erforderlich.",
      "en": "Turns off LLMNR multicast and sets NetBIOS to point-to-point (no broadcasts). Fewer name broadcasts on your network and better security on public Wi-Fi. Old devices reachable only by NetBIOS name must then be reached by IP or DNS. Restart required.",
      "it": "Disattiva il multicast LLMNR e imposta NetBIOS su punto-punto (nessun broadcast). Meno broadcast di nomi in rete e pi\u00f9 sicurezza nelle reti Wi-Fi pubbliche. I vecchi dispositivi raggiungibili solo per nome NetBIOS andranno raggiunti per IP o DNS. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "network.llmnr.off",
    "risk": "medium",
    "category": "network",
    "requiresAdmin": true,
    "name": {
      "de": "LLMNR / NetBIOS-Rundrufe aus",
      "en": "Disable LLMNR / NetBIOS broadcasts",
      "it": "Disattiva broadcast LLMNR / NetBIOS"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Stellt den Windows-Dateifreigabedienst auf maximalen Durchsatz und schaltet die SMB-Bandbreitendrosselung beim Kopieren aus dem Netzwerk ab. Hilft nur bei Datei\u00fcbertragungen im Heimnetz, nicht in Spielen. Neustart erforderlich.",
      "en": "Sets the Windows file sharing service to maximum throughput and turns off SMB bandwidth throttling when copying from the network. Only helps file transfers on your home network, not games. Restart required.",
      "it": "Imposta il servizio di condivisione file di Windows sulla massima velocita e disattiva la limitazione di banda SMB durante le copie in rete. Aiuta solo i trasferimenti di file nella rete domestica, non i giochi. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "network.lanman.lan",
    "risk": "low",
    "category": "network",
    "requiresAdmin": true,
    "name": {
      "de": "Dateifreigabe f\u00fcr LAN optimieren",
      "en": "Optimise file sharing for LAN",
      "it": "Ottimizza condivisione file in LAN"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Vergr\u00f6\u00dfert den Eingabepuffer des Windows-Tastaturtreibers von 100 auf 400 Ereignisse. Verhindert verlorene Tastendr\u00fccke, wenn das System kurz ausgelastet ist. Ehrlich: senkt die Eingabeverz\u00f6gerung nicht. Neustart erforderlich.",
      "en": "Enlarges the Windows keyboard driver input buffer from 100 to 400 events. Prevents lost key presses when the system is briefly overloaded. Honestly: it does not reduce input lag. Restart required.",
      "it": "Aumenta il buffer del driver tastiera di Windows da 100 a 400 eventi. Evita la perdita di tasti premuti quando il sistema \u00e8 momentaneamente sovraccarico. Onestamente: non riduce l'input lag. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "keyboard.buffer.large",
    "risk": "low",
    "category": "keyboard",
    "requiresAdmin": true,
    "name": {
      "de": "Tastaturpuffer \u00d74",
      "en": "Keyboard buffer \u00d74",
      "it": "Buffer tastiera \u00d74"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Schaltet die Umschalttasten-T\u00f6ne f\u00fcr Feststell-, Num- und Rollen-Taste ab und entfernt die Aktivierung durch 5 Sekunden langes Halten von Num. Verhindert versehentliches Einschalten im Spiel. \u00c4ndert eine Bedienungshilfe f\u00fcr alle Programme.",
      "en": "Turns off the Toggle Keys sounds for Caps, Num and Scroll Lock and removes the shortcut of holding Num Lock for 5 seconds. Prevents accidental activation while gaming. Changes an accessibility feature for all applications.",
      "it": "Disattiva i segnali acustici per Bloc Maiusc, Bloc Num e Bloc Scorr e la scorciatoia tenendo premuto Bloc Num per 5 secondi. Evita attivazioni accidentali in gioco. Modifica una funzione di accessibilit\u00e0 per tutte le app."
    },
    "bulkSafe": false,
    "id": "keyboard.togglekeys.off",
    "risk": "medium",
    "category": "keyboard",
    "requiresAdmin": true,
    "name": {
      "de": "Umschalttasten aus",
      "en": "Disable Toggle Keys",
      "it": "Disattiva Segnali acustici"
    },
    "requiresRestart": false,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Schaltet die Maustasten ab und entfernt das K\u00fcrzel Links-Alt + Links-Umschalt + Num, das sie mitten im Spiel einschalten kann. Andere Bedienungshilfen bleiben, wie sie sind. \u00c4ndert eine Bedienungshilfe f\u00fcr alle Programme.",
      "en": "Turns off Mouse Keys and removes the Left Alt + Left Shift + Num Lock shortcut that can switch them on mid-game. Other accessibility features stay as they are. Changes an accessibility feature for all applications.",
      "it": "Disattiva i Tasti del mouse e la scorciatoia Alt sinistro + Maiusc sinistro + Bloc Num che pu\u00f2 attivarli durante il gioco. Le altre funzioni di accessibilit\u00e0 restano invariate. Modifica una funzione di accessibilit\u00e0 per tutte le app."
    },
    "bulkSafe": false,
    "id": "keyboard.mousekeys.off",
    "risk": "medium",
    "category": "keyboard",
    "requiresAdmin": true,
    "name": {
      "de": "Bedienungshilfen-K\u00fcrzel aus (Maustasten)",
      "en": "Disable accessibility shortcut (Mouse Keys)",
      "it": "Disattiva scorciatoia accessibilit\u00e0 (Tasti del mouse)"
    },
    "requiresRestart": false,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Schaltet \u201eZeigerpr\u00e4zision verbessern\u201c ab: Der Zeiger bewegt sich proportional zur Mausbewegung, unabh\u00e4ngig vom Tempo. Spiele mit Raw Input sind ohnehin nicht betroffen; wirkt auf Desktop, Men\u00fcs und Spiele ohne Raw Input. Sofort aktiv.",
      "en": "Turns off \"Enhance pointer precision\": the pointer moves in proportion to the mouse, regardless of speed. Games using raw input are not affected anyway; applies to the desktop, menus and games without raw input. Takes effect immediately.",
      "it": "Disattiva \"Migliora precisione puntatore\": il puntatore si muove in proporzione al mouse, indipendentemente dalla velocit\u00e0. I giochi con raw input non ne sono influenzati; vale per desktop, menu e giochi senza raw input. Effetto immediato."
    },
    "bulkSafe": false,
    "id": "keyboard.mouse.accel.off",
    "risk": "low",
    "category": "keyboard",
    "requiresAdmin": true,
    "name": {
      "de": "Mausbeschleunigung aus",
      "en": "Disable mouse acceleration",
      "it": "Disattiva accelerazione mouse"
    },
    "requiresRestart": false,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Setzt die Windows-Zeigergeschwindigkeit auf die 6. von 11 Stufen. Nur dort wird jeder Mausz\u00e4hlschritt genau ein Pixel, ohne \u00fcbersprungene oder doppelte Schritte. Die Empfindlichkeit regelst du dann \u00fcber die DPI der Maus. Sofort aktiv.",
      "en": "Sets the Windows pointer speed to notch 6 of 11, the only setting where every mouse count is exactly one pixel, without skipped or doubled steps. Set sensitivity with your mouse DPI instead. Takes effect immediately.",
      "it": "Imposta la velocit\u00e0 del puntatore di Windows sul 6\u00b0 livello di 11, l'unico in cui ogni conteggio del mouse corrisponde a un pixel senza passi saltati o doppi. Regola la sensibilit\u00e0 con i DPI del mouse. Effetto immediato."
    },
    "bulkSafe": false,
    "id": "keyboard.mouse.speed.native",
    "risk": "low",
    "category": "keyboard",
    "requiresAdmin": true,
    "name": {
      "de": "Maus 1:1 (Zeigergeschwindigkeit 6/11)",
      "en": "Mouse 1:1 (pointer speed 6/11)",
      "it": "Mouse 1:1 (velocit\u00e0 puntatore 6/11)"
    },
    "requiresRestart": false,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Schaltet bei Ethernet- und WLAN-Karten Interrupt-Moderation, Flusskontrolle, Energy Efficient Ethernet und Large Send Offload ab und Receive Side Scaling an \u2013 sofern der Treiber diese Optionen anbietet. Pakete werden sofort statt gesammelt verarbeitet und auf mehrere Kerne verteilt: gleichm\u00e4\u00dfigere Treffer-R\u00fcckmeldung, etwas mehr CPU-Last. Neustart erforderlich.",
      "en": "Turns off interrupt moderation, flow control, Energy Efficient Ethernet and Large Send Offload and turns on Receive Side Scaling on Ethernet and Wi-Fi cards \u2013 where the driver offers them. Packets are handled immediately instead of batched and spread across cores: steadier hit feedback, slightly more CPU load. Restart required.",
      "it": "Disattiva moderazione degli interrupt, controllo di flusso, Energy Efficient Ethernet e Large Send Offload e attiva Receive Side Scaling sulle schede Ethernet e Wi-Fi, se il driver li offre. I pacchetti vengono gestiti subito e distribuiti sui core: riscontro dei colpi pi\u00f9 costante, un po\u2019 pi\u00f9 di carico CPU. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "hitreg.nic.latency",
    "risk": "medium",
    "category": "hitreg",
    "requiresAdmin": true,
    "name": {
      "de": "Netzwerkkarte: Latenz-Modus",
      "en": "Network card: latency mode",
      "it": "Scheda di rete: modalit\u00e0 latenza"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Windows 11 wendet die feine Timer-Aufl\u00f6sung, die FiveM anfordert, wieder systemweit an. Gleichm\u00e4\u00dfigere Frame-Zeiten und Netzwerk-Ticks, weniger Ruckler beim Zielen. Etwas h\u00f6herer Stromverbrauch. Neustart erforderlich.",
      "en": "Windows 11 applies the fine timer resolution FiveM requests system-wide again. More even frame times and network ticks, fewer stutters while aiming. Slightly higher power use. Restart required.",
      "it": "Windows 11 applica di nuovo a tutto il sistema la risoluzione del timer richiesta da FiveM. Tempi di frame e tick di rete pi\u00f9 regolari, meno scatti mirando. Consumo leggermente maggiore. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "hitreg.timer.global",
    "risk": "low",
    "category": "hitreg",
    "requiresAdmin": true,
    "name": {
      "de": "Pr\u00e4zise Timer-Aufl\u00f6sung (global)",
      "en": "Precise timer resolution (global)",
      "it": "Risoluzione timer precisa (globale)"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Markiert den Netzwerkverkehr der FiveM-Spielprozesse als Echtzeit-Verkehr (DSCP 46). \u00dcber WLAN (WMM) und auf Routern mit QoS werden Spielpakete vor Downloads und Streams durchgelassen \u2013 weniger Verz\u00f6gerung, wenn nebenbei etwas l\u00e4dt. Neustart erforderlich.",
      "en": "Marks the network traffic of the FiveM game processes as real-time traffic (DSCP 46). Over Wi-Fi (WMM) and on routers with QoS, game packets go ahead of downloads and streams \u2013 less delay when something else is loading. Restart required.",
      "it": "Contrassegna il traffico dei processi di gioco FiveM come traffico in tempo reale (DSCP 46). Su Wi-Fi (WMM) e router con QoS i pacchetti di gioco passano prima di download e streaming: meno ritardo quando altro sta scaricando. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "hitreg.qos.fivem",
    "risk": "low",
    "category": "hitreg",
    "requiresAdmin": true,
    "name": {
      "de": "FiveM-Pakete priorisieren (QoS)",
      "en": "Prioritise FiveM packets (QoS)",
      "it": "Priorit\u00e0 ai pacchetti FiveM (QoS)"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Maus, Tastatur, Grafik- und Netzwerkkarte werden im aktiven Energieplan (am Netzteil) nie in Stromsparzust\u00e4nde versetzt. Kein kurzes \u201eAufwachen\u201c beim ersten Klick oder Paket \u2013 direktere Eingaben. Etwas h\u00f6herer Stromverbrauch.",
      "en": "Mouse, keyboard, graphics and network card are never put into power-saving states in the active power plan (on AC power). No short wake-up on the first click or packet \u2013 more direct input. Slightly higher power use.",
      "it": "Mouse, tastiera, scheda grafica e di rete non entrano mai in risparmio energetico nel piano attivo (con alimentazione di rete). Nessun breve risveglio al primo clic o pacchetto: input pi\u00f9 diretto. Consumo leggermente maggiore."
    },
    "bulkSafe": false,
    "id": "hitreg.input.power",
    "risk": "low",
    "category": "hitreg",
    "requiresAdmin": true,
    "name": {
      "de": "Eingabe-Latenz: USB- und PCIe-Energiesparen aus",
      "en": "Input latency: USB and PCIe power saving off",
      "it": "Latenza input: risparmio USB e PCIe disattivato"
    },
    "requiresRestart": false,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Windows startet jeden FiveM-Spielprozess (alle Spiel-Builds) automatisch mit hoher CPU-Priorit\u00e4t. Spiel-Logik und Netzwerk-Verarbeitung werden vor Hintergrundprogrammen bedient \u2013 weniger Aussetzer bei Schusswechseln. Wirkt ab dem n\u00e4chsten FiveM-Start.",
      "en": "Windows starts every FiveM game process (all game builds) at high CPU priority automatically. Game logic and network handling are served before background programs \u2013 fewer hiccups in gunfights. Takes effect from the next FiveM start.",
      "it": "Windows avvia ogni processo di gioco FiveM (tutte le build) con priorit\u00e0 CPU alta. Logica di gioco e rete vengono servite prima dei programmi in background: meno intoppi negli scontri. Effetto dal prossimo avvio di FiveM."
    },
    "bulkSafe": false,
    "id": "hitreg.fivem.priority",
    "risk": "medium",
    "category": "hitreg",
    "requiresAdmin": true,
    "name": {
      "de": "FiveM immer mit hoher CPU-Priorit\u00e4t",
      "en": "FiveM always at high CPU priority",
      "it": "FiveM sempre con priorit\u00e0 CPU alta"
    },
    "requiresRestart": false,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Die Grafikkarte plant ihre Arbeit selbst statt \u00fcber die CPU. Kann Eingabeverz\u00f6gerung und CPU-Last senken, besonders bei hoher GPU-Auslastung. Braucht eine aktuelle GPU und einen passenden Treiber (NVIDIA ab GTX 10, AMD ab RX 5000). Neustart erforderlich.",
      "en": "The graphics card schedules its own work instead of the CPU. Can lower input latency and CPU load, especially at high GPU usage. Needs a recent GPU and driver (NVIDIA GTX 10+, AMD RX 5000+). Restart required.",
      "it": "La scheda grafica pianifica da sola il proprio lavoro invece della CPU. Pu\u00f2 ridurre latenza di input e carico CPU, soprattutto con GPU molto usata. Richiede GPU e driver recenti (NVIDIA GTX 10+, AMD RX 5000+). Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "gaming.gpu.hags",
    "risk": "medium",
    "category": "gaming",
    "requiresAdmin": true,
    "name": {
      "de": "Hardware-GPU-Scheduling",
      "en": "Hardware GPU scheduling",
      "it": "Pianificazione GPU hardware"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Setzt die Windows-Latenztoleranz f\u00fcr Energiesparzust\u00e4nde auf das Minimum. Ger\u00e4te und GPU wechseln schneller aus Stromsparzust\u00e4nden zur\u00fcck. Wirkung h\u00e4ngt stark von Hardware und Treiber ab, oft kaum messbar; etwas mehr Stromverbrauch. Neustart erforderlich.",
      "en": "Sets the Windows latency tolerance for power-saving states to the minimum, so devices and GPU leave power-saving states faster. The effect depends heavily on hardware and driver, often barely measurable; slightly more power use. Restart required.",
      "it": "Imposta al minimo la tolleranza di latenza di Windows per gli stati di risparmio energetico: dispositivi e GPU ne escono pi\u00f9 in fretta. L\u2019effetto dipende molto da hardware e driver, spesso poco misurabile; consumo leggermente maggiore. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "gaming.gpu.latency",
    "risk": "medium",
    "category": "gaming",
    "requiresAdmin": true,
    "name": {
      "de": "GPU- / Energie-Latenzschl\u00fcssel",
      "en": "GPU / power latency keys",
      "it": "Chiavi latenza GPU / energia"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "L\u00e4sst den Grafiktreiber GPU-Speicher in zusammenh\u00e4ngenden Bl\u00f6cken \u00fcber die IOMMU abbilden. Kleine Optimierung der Speicherzuordnung, wirkt nur auf Systemen mit aktiver IOMMU; bei Grafikproblemen wieder ausschalten. Neustart erforderlich.",
      "en": "Lets the graphics driver map GPU memory in contiguous blocks through the IOMMU. A small memory-mapping optimization that only affects systems with an active IOMMU; switch off again if graphics problems appear. Restart required.",
      "it": "Consente al driver grafico di mappare la memoria GPU in blocchi contigui tramite IOMMU. Piccola ottimizzazione che agisce solo con IOMMU attiva; disattivala in caso di problemi grafici. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "gaming.gpu.iommu",
    "risk": "medium",
    "category": "gaming",
    "requiresAdmin": true,
    "name": {
      "de": "GPU-Speicherzuordnung zusammenh\u00e4ngend (DpiMapIommuContiguous)",
      "en": "Contiguous GPU memory mapping (DpiMapIommuContiguous)",
      "it": "Mappatura memoria GPU contigua (DpiMapIommuContiguous)"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Verkleinert den Eingabepuffer des Windows-Maustreibers von 100 auf 50 Ereignisse. Beliebter Gaming-Tweak; die messbare Wirkung ist gering, bei sehr hohen Abfrageraten (4000\u20138000 Hz) besser ausgeschaltet lassen. Neustart erforderlich.",
      "en": "Shrinks the Windows mouse driver input queue from 100 to 50 events. A popular gaming tweak; the measurable effect is small, and with very high polling rates (4000\u20138000 Hz) it is better left off. Restart required.",
      "it": "Riduce la coda di input del driver mouse di Windows da 100 a 50 eventi. Tweak da gioco popolare; l\u2019effetto misurabile \u00e8 piccolo, con polling molto alti (4000\u20138000 Hz) meglio lasciarlo disattivato. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "gaming.mouse.queue",
    "risk": "low",
    "category": "gaming",
    "requiresAdmin": true,
    "name": {
      "de": "Maus-Datenpuffer kompakt",
      "en": "Compact mouse data queue",
      "it": "Coda dati mouse compatta"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Schaltet Multiplane Overlay im Desktop-Fenstermanager ab. Behebt auf manchen GPUs Flackern, Ruckler und schwarze Bildschirme in randlosen Fenstern \u2013 eine von NVIDIA dokumentierte Abhilfe. Neustart erforderlich.",
      "en": "Turns off multiplane overlay in the Desktop Window Manager. Fixes flicker, stutter and black screens in borderless windows on some GPUs \u2013 a workaround documented by NVIDIA. Restart required.",
      "it": "Disattiva il multiplane overlay nel Desktop Window Manager. Risolve su alcune GPU sfarfallii, scatti e schermi neri in finestre senza bordi: soluzione documentata da NVIDIA. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "gaming.mpo.off",
    "risk": "low",
    "category": "gaming",
    "requiresAdmin": true,
    "name": {
      "de": "Multiplane Overlay (MPO) aus",
      "en": "Disable multiplane overlay (MPO)",
      "it": "Disattiva multiplane overlay (MPO)"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Schaltet die Speicherintegrit\u00e4t der Kernisolierung ab. Microsoft nennt bis zu 5\u201310 % mehr FPS in manchen Spielen. Senkt den Schutz vor Schadsoftware im Windows-Kern deutlich; manche Anti-Cheats setzen sie voraus. Bei UEFI-Sperre wirkungslos. Neustart erforderlich.",
      "en": "Turns off core isolation memory integrity. Microsoft cites up to 5\u201310% more FPS in some games. Clearly lowers protection against malware in the Windows kernel; some anti-cheats require it. Has no effect if locked in UEFI. Restart required.",
      "it": "Disattiva l\u2019integrit\u00e0 della memoria dell\u2019isolamento core. Microsoft indica fino al 5\u201310% di FPS in pi\u00f9 in alcuni giochi. Riduce nettamente la protezione dal malware nel kernel; alcuni anti-cheat la richiedono. Senza effetto se bloccata in UEFI. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "gaming.hvci.off",
    "risk": "high",
    "category": "gaming",
    "requiresAdmin": true,
    "name": {
      "de": "Speicherintegrit\u00e4t aus (VBS / Kernisolierung)",
      "en": "Disable memory integrity (VBS / core isolation)",
      "it": "Disattiva integrit\u00e0 della memoria (VBS / isolamento core)"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "de": "Schaltet Xbox Game Bar und Spielaufnahme per Richtlinie ab: Win+G und der Controller-Knopf \u00f6ffnen kein Overlay mehr \u00fcber Spielen. Neustart erforderlich.",
      "en": "Turns off Xbox Game Bar and game recording by policy: Win+G and the controller button no longer open an overlay over games. Restart required.",
      "it": "Disattiva Xbox Game Bar e la registrazione tramite criterio: Win+G e il pulsante del controller non aprono pi\u00f9 l\u2019overlay sopra i giochi. Riavvio necessario."
    },
    "bulkSafe": false,
    "id": "gaming.gamebar.off",
    "risk": "low",
    "category": "gaming",
    "requiresAdmin": true,
    "name": {
      "de": "Game-Bar-Overlay aus",
      "en": "Disable Game Bar overlay",
      "it": "Disattiva overlay Game Bar"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  }
];
  if (typeof module !== "undefined" && module.exports) module.exports = catalog;
  else root.TweakerCatalog = catalog;
})(this);
