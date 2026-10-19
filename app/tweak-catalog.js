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
      "en": "Driver diagnostics only: waits 8 instead of the default 2 seconds before a GPU timeout. Can prolong freezes and mask faults. Microsoft advises end users against TDR changes; no performance gain.",
      "de": "Nur Treiberdiagnose: wartet 8 statt standardmaessig 2 Sekunden vor GPU-Timeout. Kann Haenger verlaengern und Fehler verdecken. Microsoft raet Endnutzern von TDR-Aenderungen ab; kein Leistungsgewinn.",
      "it": "Solo diagnostica driver: attende 8 secondi invece di 2 prima del timeout GPU. Puo prolungare blocchi e nascondere guasti. Microsoft sconsiglia queste modifiche agli utenti; nessun aumento prestazioni."
    },
    "bulkSafe": false,
    "id": "windows.gpu.tdr",
    "risk": "high",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "GPU TDR delay: 8 seconds",
      "de": "GPU-TDR-Wartezeit: 8 Sekunden",
      "it": "Attesa TDR GPU: 8 secondi"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Sets the existing MMCSS Games profile to High / priority 2. Only affects threads registered with this profile. May affect other multimedia work.",
      "de": "Setzt das vorhandene MMCSS-Profil Games auf High / Prioritaet 2. Wirkt nur auf Threads, die dieses Profil verwenden. Kann andere Multimedia-Aufgaben beeintraechtigen.",
      "it": "Imposta il profilo MMCSS Games esistente su High / priorita 2. Agisce solo sui thread registrati con questo profilo. Puo penalizzare altre attivita multimediali."
    },
    "bulkSafe": false,
    "id": "windows.mmcss.games",
    "risk": "high",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Games multimedia priority",
      "de": "Multimedia-Prioritaet fuer Spiele",
      "it": "Priorita multimedia giochi"
    },
    "requiresRestart": true,
    "reversible": true,
    "available": true,
    "stateError": null
  },
  {
    "description": {
      "en": "Our low-latency variant: SystemResponsiveness 10 instead of 20. Only affects MMCSS applications and can slow background work. Does not create an unused custom game profile.",
      "de": "Eigene Low-latency-Variante: SystemResponsiveness 10 statt 20. Nur fuer MMCSS-Anwendungen; kann Hintergrundarbeit verlangsamen. Kein erfundenes Profil, das Spiele nicht verwenden.",
      "it": "Variante a bassa latenza: SystemResponsiveness 10 invece di 20. Solo per app MMCSS; puo rallentare attivita in background. Non crea un profilo inutilizzato dai giochi."
    },
    "bulkSafe": false,
    "id": "windows.mmcss.latency",
    "risk": "high",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "MMCSS: 10% background reserve",
      "de": "MMCSS: Hintergrundreserve 10%",
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
      "en": "No universal Windows feature has this name. No ineffective FPS keys are created. Specific games need individual compatibility settings.",
      "de": "Keine universelle Windows-Funktion unter diesem Namen. Es werden keine wirkungslosen FPS-Schluessel angelegt. Fuer konkrete Spiele sind individuelle Kompatibilitaetseinstellungen erforderlich.",
      "it": "Non esiste una funzione Windows universale con questo nome. Non vengono create chiavi FPS inefficaci. Servono impostazioni specifiche per ogni gioco."
    },
    "bulkSafe": false,
    "id": "windows.legacy.fps",
    "risk": "high",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Legacy Games FPS keys",
      "de": "Legacy-Games-FPS-Schluessel",
      "it": "Chiavi FPS giochi legacy"
    },
    "unavailable": "unsupported_optimization_recipe",
    "requiresRestart": false,
    "reversible": false,
    "available": false,
    "stateError": "unsupported_optimization_recipe"
  },
  {
    "description": {
      "en": "No supported global Windows switch. Real-time priority can starve system work; this card therefore changes no settings.",
      "de": "Kein unterstuetzter globaler Windows-Schalter. Echtzeit-Prioritaet kann Systemaufgaben verdraengen; diese Karte veraendert deshalb keine Systemwerte.",
      "it": "Nessun comando Windows globale supportato. La priorita tempo reale puo bloccare attivita di sistema; questa scheda non modifica impostazioni."
    },
    "bulkSafe": false,
    "id": "windows.io.realtime",
    "risk": "high",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "IO realtime worker priority",
      "de": "IO-Realtime-Worker-Prioritaet",
      "it": "Priorita worker IO realtime"
    },
    "unavailable": "unsupported_optimization_recipe",
    "requiresRestart": false,
    "reversible": false,
    "available": false,
    "stateError": "unsupported_optimization_recipe"
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
      "en": "Disables classic Game Bar startup tips. Version-dependent convenience setting; recording is separate.",
      "de": "Deaktiviert Starttipps der klassischen Game Bar. Versionsabhaengige Komfortoption; Aufzeichnung bleibt separat.",
      "it": "Disattiva suggerimenti iniziali della Game Bar classica. Opzione comodita dipendente dalla versione; registrazione separata."
    },
    "bulkSafe": false,
    "id": "windows.gamebar.quiet",
    "risk": "low",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Quiet Game Bar startup",
      "de": "Game-Bar-Starttipps aus",
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
      "en": "Only for the old integrated Copilot sidebar. Does not uninstall or block the newer standalone Copilot app; unavailable on newer Windows builds.",
      "de": "Nur fuer die alte integrierte Copilot-Seitenleiste. Deinstalliert und blockiert nicht die neue eigenstaendige Copilot-App; auf neueren Windows-Versionen nicht verfuegbar.",
      "it": "Solo per la vecchia barra Copilot integrata. Non disinstalla ne blocca la nuova app Copilot autonoma; non disponibile su build Windows recenti."
    },
    "bulkSafe": false,
    "id": "windows.copilot.off",
    "risk": "medium",
    "category": "performance",
    "requiresAdmin": true,
    "name": {
      "en": "Disable legacy Windows Copilot policy",
      "de": "Klassischen Windows-Copilot deaktivieren",
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
      "de": "Deaktiviert Windows-Spielaufnahmen einschliesslich Hintergrundclips. Kann Aufnahme-Last vermeiden, wenn diese vorher aktiv war. Manuelle Game-Bar-Aufnahmen sind ebenfalls aus. Bestehende Videos bleiben erhalten. Neustart erforderlich; kein garantierter FPS-Gewinn.",
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
      "de": "Aktiviert den Windows-Spielmodus fuer erkannte Spiele. Kann unter Hintergrundlast helfen; ist auf vielen PCs bereits aktiv. Neustart erforderlich. Kein garantierter FPS-Gewinn.",
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
      "en": "WASD: fast key repeat",
      "de": "WASD: schnelle Tastenwiederholung",
      "it": "WASD: ripetizione rapida dei tasti"
    },
    "description": {
      "en": "Sets Windows repeat delay to the shortest level (about 250 ms) and repeat rate to the highest level (about 30/s). Affects held keys including text input, not first-press latency. No guaranteed game benefit.",
      "de": "Setzt die Windows-Wiederholverzoegerung auf die kuerzeste Stufe (ca. 250 ms) und die Wiederholrate auf die hoechste Stufe (ca. 30/s). Betrifft gehaltene Tasten und auch Texteingaben, nicht die Latenz des ersten Tastendrucks. Kein garantierter Vorteil in Spielen.",
      "it": "Imposta il ritardo di ripetizione Windows al minimo (circa 250 ms) e la velocita al massimo (circa 30/s). Riguarda i tasti tenuti premuti, anche nel testo, non la latenza della prima pressione. Nessun vantaggio garantito nei giochi."
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
      "en": "Disable Filter Keys",
      "de": "Filtertasten deaktivieren",
      "it": "Disattiva Filtro tasti"
    },
    "description": {
      "en": "Disables Filter Keys and its right-Shift activation shortcut. Can remove active input filtering. Changes an accessibility feature for all applications; disable only if you do not need it.",
      "de": "Deaktiviert Filtertasten und die Aktivierung durch langes Halten der rechten Umschalttaste. Kann aktive Eingabefilter beseitigen. Veraendert eine Bedienungshilfe fuer alle Anwendungen; nur deaktivieren, wenn sie nicht benoetigt wird.",
      "it": "Disattiva Filtro tasti e la scorciatoia con Maiusc destro tenuto premuto. Puo eliminare filtri di input attivi. Modifica una funzione di accessibilita per tutte le app; disattivala solo se non serve."
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
      "en": "Disable Sticky Keys",
      "de": "Einrastfunktion deaktivieren",
      "it": "Disattiva Tasti permanenti"
    },
    "description": {
      "en": "Disables Sticky Keys and its five-Shift activation shortcut. Prevents accidental activation while gaming. Changes an accessibility feature for all applications; does not reduce hardware latency.",
      "de": "Deaktiviert die Einrastfunktion und die Aktivierung durch fuenfmaliges Druecken der Umschalttaste. Verhindert versehentliches Einschalten beim Spielen. Veraendert eine Bedienungshilfe fuer alle Anwendungen; senkt nicht die Hardware-Latenz.",
      "it": "Disattiva Tasti permanenti e la scorciatoia con cinque pressioni di Maiusc. Evita attivazioni accidentali durante il gioco. Modifica una funzione di accessibilita per tutte le app; non riduce la latenza hardware."
    },
    "requiresRestart": false,
    "reversible": true,
    "available": true,
    "stateError": null
  }
];
  if (typeof module !== "undefined" && module.exports) module.exports = catalog;
  else root.TweakerCatalog = catalog;
})(this);
