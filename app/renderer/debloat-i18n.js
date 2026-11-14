'use strict';
const debloatTranslations={
  "de": {
    "subtitle": "Apps gezielt entfernen und Autostart aufräumen.",
    "refresh": "Aktualisieren",
    "notice": "Keine App ist vorausgewählt. Entfernt wird nur für deinen Windows-Benutzer. Die Sicherung enthält die App-Liste, keine App-Daten.",
    "unknown": "Noch nicht geprüft",
    "installed": "Installiert",
    "absent": "Nicht installiert",
    "install": "Installationsseite",
    "preview": "Auswahl prüfen",
    "windowsApps": "Windows: Installierte Apps",
    "startup": "Autostart-Apps",
    "startupScope": "Hier verwaltest du die Run-Einträge deines Benutzers. Weitere Autostarts findest du in den Windows-Einstellungen. Das Entfernen eines Eintrags beendet keine laufende App.",
    "windowsStartup": "Windows-Autostart öffnen",
    "noStartup": "Keine verwaltbaren Einträge gefunden.",
    "disabled": "Autostart-Eintrag entfernt",
    "registered": "Autostart-Eintrag vorhanden",
    "restore": "Wiederherstellen",
    "disable": "Deaktivieren",
    "removed": "Entfernt",
    "partial": "Nicht vollständig entfernt",
    "reinstallNotice": "Über „Installationsseite“ kannst du eine Neuinstallation suchen. Verfügbarkeit und alte App-Daten sind nicht garantiert.",
    "confirmTitle": "Ausgewählte Apps deinstallieren?",
    "confirmBody": "App-Daten können dauerhaft verloren gehen. Gesichert wird nur die App-Liste mit Versionen. Eine spätere Neuinstallation stellt diese Daten nicht wieder her; manche Apps sind nicht mehr verfügbar. Nur die unten genannten Apps deines Benutzers werden entfernt. Bei OneDrive bleiben Cloud-Dateien und synchronisierte Ordner erhalten; erneute Anmeldung und Einrichtung können nötig sein.",
    "remove": "Deinstallieren",
    "restorePrompt": "Den gesicherten Autostart-Eintrag mit seinem ursprünglichen Wert wiederherstellen?",
    "disablePrompt": "Diesen Autostart-Eintrag sichern und entfernen? Die App bleibt installiert und kann weiterhin manuell geöffnet werden.",
    "removalRecord": "App-Entfernung · Nachweis",
    "groups": {
      "consumer": [
        "Consumer-Apps",
        "Weather, News, Teams, Spiele und weitere optionale Apps werden bei Start Debloat entfernt."
      ],
      "xbox": [
        "Xbox Game Bar / Xbox-App",
        "Entfernt alle verfügbaren Apps dieser Gruppe. Aufnahme und Xbox-Funktionen können dadurch fehlen."
      ],
      "mail-camera": [
        "Mail / Kamera",
        "Mail, Kalender, Kamera, OneNote und Paint 3D – werden bei Start Debloat entfernt."
      ],
      "onedrive": [
        "OneDrive",
        "Deinstallation und Synchronisierungssperre sind getrennte Aktionen. Vor erneuter Nutzung die Sperre zurücknehmen."
      ],
      "ai": [
        "Recall / Copilot",
        "Copilot deinstallieren oder Recall abschalten. Recall-Abschaltung löscht vorhandene Momentaufnahmen."
      ],
      "widgets": [
        "Widgets ausblenden",
        "Widgets und Nachrichten deaktivieren. Unterstützung hängt von Windows-Version und Edition ab."
      ],
      "tools": [
        "PC Manager / Edge Game Assist",
        "Optionale Zusatz-Apps entfernen. Der Edge-Browser bleibt erhalten."
      ],
      "reinstalls": [
        "Automatische App-Vorschläge",
        "Reduziert beworbene App-Installationen. Verhindert nicht jede Neuinstallation durch Windows, Hersteller oder Store."
      ]
    }
  },
  "en": {
    "subtitle": "Remove selected apps and manage startup entries.",
    "refresh": "Refresh",
    "notice": "No app is selected by default. Removal applies to your Windows user only. The backup contains an app list, not app data.",
    "unknown": "Not checked yet",
    "installed": "Installed",
    "absent": "Not installed",
    "install": "Installation page",
    "preview": "Review selection",
    "windowsApps": "Windows: Installed apps",
    "startup": "Startup apps",
    "startupScope": "Manage your user’s Run entries here. Other startup types are available in Windows Settings. Removing an entry does not stop a running app.",
    "windowsStartup": "Open Windows startup settings",
    "noStartup": "No manageable entries found.",
    "disabled": "Startup entry removed",
    "registered": "Startup entry present",
    "restore": "Restore",
    "disable": "Disable",
    "removed": "Removed",
    "partial": "Removal incomplete",
    "reinstallNotice": "Use “Installation page” to look for a reinstall. Availability and previous app data are not guaranteed.",
    "confirmTitle": "Uninstall selected apps?",
    "confirmBody": "App data may be permanently lost. Only the app inventory and versions are saved. Reinstalling does not restore that data; some apps may no longer be available. Only the listed apps for your user will be removed. OneDrive cloud files and synced folders are retained; signing in and setting up again may be necessary.",
    "remove": "Uninstall",
    "restorePrompt": "Restore the saved startup entry with its original value?",
    "disablePrompt": "Save and remove this startup entry? The app stays installed and can still be opened manually.",
    "removalRecord": "App removal · Record",
    "groups": {
      "consumer": [
        "Consumer apps",
        "Select Weather, News, Teams, games and other optional apps individually."
      ],
      "xbox": [
        "Xbox Game Bar / Xbox app",
        "Remove selected apps. Recording and Xbox features may become unavailable."
      ],
      "mail-camera": [
        "Mail / Camera",
        "Mail, Calendar, Camera, OneNote and Paint 3D – select only what you do not need."
      ],
      "onedrive": [
        "OneDrive",
        "Uninstalling and blocking sync are separate actions. Undo the block before using OneDrive again."
      ],
      "ai": [
        "Recall / Copilot",
        "Uninstall Copilot or turn off Recall. Turning off Recall deletes existing snapshots."
      ],
      "widgets": [
        "Hide widgets",
        "Disable widgets and news. Support depends on Windows version and edition."
      ],
      "tools": [
        "PC Manager / Edge Game Assist",
        "Remove optional add-on apps. The Edge browser stays installed."
      ],
      "reinstalls": [
        "Automatic app suggestions",
        "Reduce promoted app installations. This cannot prevent every reinstall by Windows, manufacturers or the Store."
      ]
    }
  },
  "it": {
    "subtitle": "Rimuovi le app selezionate e gestisci l’avvio automatico.",
    "refresh": "Aggiorna",
    "notice": "Nessuna app è preselezionata. La rimozione riguarda solo il tuo utente Windows. La copia contiene l’elenco delle app, non i loro dati.",
    "unknown": "Non ancora verificato",
    "installed": "Installata",
    "absent": "Non installata",
    "install": "Pagina di installazione",
    "preview": "Controlla selezione",
    "windowsApps": "Windows: App installate",
    "startup": "App di avvio",
    "startupScope": "Qui puoi gestire le voci Run del tuo utente. Altri tipi di avvio sono nelle impostazioni di Windows. Rimuovere una voce non chiude un’app in esecuzione.",
    "windowsStartup": "Apri avvio di Windows",
    "noStartup": "Nessuna voce gestibile trovata.",
    "disabled": "Voce di avvio rimossa",
    "registered": "Voce di avvio presente",
    "restore": "Ripristina",
    "disable": "Disattiva",
    "removed": "Rimossa",
    "partial": "Rimozione incompleta",
    "reinstallNotice": "Usa “Pagina di installazione” per cercare una reinstallazione. Disponibilità e dati precedenti non sono garantiti.",
    "confirmTitle": "Disinstallare le app selezionate?",
    "confirmBody": "I dati delle app possono andare persi definitivamente. Vengono salvati solo elenco e versioni. La reinstallazione non ripristina i dati; alcune app potrebbero non essere più disponibili. Saranno rimosse solo le app elencate del tuo utente. File cloud e cartelle sincronizzate di OneDrive vengono conservati; potrebbe essere necessario accedere e configurare nuovamente.",
    "remove": "Disinstalla",
    "restorePrompt": "Ripristinare la voce di avvio salvata con il valore originale?",
    "disablePrompt": "Salvare e rimuovere questa voce di avvio? L’app resta installata e può essere aperta manualmente.",
    "removalRecord": "Rimozione app · Registro",
    "groups": {
      "consumer": [
        "App consumer",
        "Seleziona singolarmente Meteo, News, Teams, giochi e altre app opzionali."
      ],
      "xbox": [
        "Xbox Game Bar / App Xbox",
        "Rimuovi le app selezionate. Registrazione e funzioni Xbox potrebbero non essere disponibili."
      ],
      "mail-camera": [
        "Posta / Fotocamera",
        "Posta, Calendario, Fotocamera, OneNote e Paint 3D: seleziona solo ciò che non usi."
      ],
      "onedrive": [
        "OneDrive",
        "Disinstallazione e blocco della sincronizzazione sono azioni separate. Annulla il blocco prima di riutilizzare OneDrive."
      ],
      "ai": [
        "Recall / Copilot",
        "Disinstalla Copilot o disattiva Recall. Disattivare Recall elimina le istantanee esistenti."
      ],
      "widgets": [
        "Nascondi widget",
        "Disattiva widget e notizie. Il supporto dipende dalla versione ed edizione di Windows."
      ],
      "tools": [
        "PC Manager / Edge Game Assist",
        "Rimuovi le app aggiuntive opzionali. Il browser Edge resta installato."
      ],
      "reinstalls": [
        "Suggerimenti automatici di app",
        "Riduce le installazioni promozionali. Non impedisce ogni reinstallazione da Windows, produttori o Store."
      ]
    }
  }
};
const debloatErrors={
  "it": {
    "invalid_debloat_selection": "Selezione non valida.",
    "protected_package": "Pacchetto protetto o non supportato.",
    "onedrive_manual_uninstall": "Usa App installate di Windows per questa versione di OneDrive.",
    "close_onedrive_first": "Chiudi OneDrive prima di continuare.",
    "debloat_preview_changed": "La selezione è cambiata. Aggiorna e controlla di nuovo.",
    "explicit_debloat_confirmation_required": "Conferma prima la possibile perdita di dati.",
    "app_reinstall_required": "È possibile solo reinstallare; i dati delle app non sono salvati.",
    "debloat_inventory_unavailable": "Impossibile leggere le app installate.",
    "startup_inventory_unavailable": "Impossibile leggere l’avvio automatico.",
    "debloat_partial": "Alcune app non sono state rimosse. Controlla il risultato.",
    "debloat_selection_unavailable": "Selezione non più disponibile. Aggiorna l’elenco.",
    "recall_policy_unavailable": "Criterio Recall non supportato su questa versione di Windows.",
    "onedrive_uninstall_in_progress": "Operazione non completata. Aggiorna e verifica lo stato.",
    "onedrive_uninstall_failed": "Operazione non completata. Aggiorna e verifica lo stato.",
    "onedrive_uninstall_incomplete": "Operazione non completata. Aggiorna e verifica lo stato.",
    "debloat_removal_incomplete": "Operazione non completata. Aggiorna e verifica lo stato.",
    "invalid_startup_entry": "Operazione non completata. Aggiorna e verifica lo stato.",
    "invalid_startup_backup": "Operazione non completata. Aggiorna e verifica lo stato.",
    "startup_verification_failed": "Operazione non completata. Aggiorna e verifica lo stato.",
    "debloat_open_failed": "Operazione non completata. Aggiorna e verifica lo stato."
  },
  "en": {
    "invalid_debloat_selection": "Invalid app selection.",
    "protected_package": "Protected or unsupported package.",
    "onedrive_manual_uninstall": "Use Windows Installed apps for this OneDrive installation.",
    "close_onedrive_first": "Close OneDrive before continuing.",
    "debloat_preview_changed": "Selection changed. Refresh and review again.",
    "explicit_debloat_confirmation_required": "Confirm possible data loss first.",
    "app_reinstall_required": "Reinstallation only; app data is not backed up.",
    "debloat_inventory_unavailable": "Could not read installed apps.",
    "startup_inventory_unavailable": "Could not read startup entries.",
    "debloat_partial": "Some apps were not removed. Check the result.",
    "debloat_selection_unavailable": "Selection is no longer available. Refresh the list.",
    "recall_policy_unavailable": "Recall policy is unsupported on this Windows version.",
    "onedrive_uninstall_in_progress": "Operation incomplete. Refresh and check the status.",
    "onedrive_uninstall_failed": "Operation incomplete. Refresh and check the status.",
    "onedrive_uninstall_incomplete": "Operation incomplete. Refresh and check the status.",
    "debloat_removal_incomplete": "Operation incomplete. Refresh and check the status.",
    "invalid_startup_entry": "Operation incomplete. Refresh and check the status.",
    "invalid_startup_backup": "Operation incomplete. Refresh and check the status.",
    "startup_verification_failed": "Operation incomplete. Refresh and check the status.",
    "debloat_open_failed": "Operation incomplete. Refresh and check the status."
  },
  "de": {
    "invalid_debloat_selection": "Ungültige App-Auswahl.",
    "protected_package": "Geschütztes oder nicht unterstütztes Paket.",
    "onedrive_manual_uninstall": "Diese OneDrive-Installation bitte über Windows „Installierte Apps“ entfernen.",
    "close_onedrive_first": "OneDrive bitte zuerst beenden.",
    "debloat_preview_changed": "Die Auswahl hat sich geändert. Aktualisieren und erneut prüfen.",
    "explicit_debloat_confirmation_required": "Möglichen Datenverlust bitte zuerst ausdrücklich bestätigen.",
    "app_reinstall_required": "Nur Neuinstallation möglich; App-Daten sind nicht gesichert.",
    "debloat_inventory_unavailable": "Installierte Apps konnten nicht gelesen werden.",
    "startup_inventory_unavailable": "Autostart-Einträge konnten nicht gelesen werden.",
    "debloat_partial": "Einige Apps wurden nicht entfernt. Bitte Ergebnis prüfen.",
    "debloat_selection_unavailable": "Auswahl nicht mehr verfügbar. Liste aktualisieren.",
    "recall_policy_unavailable": "Recall-Richtlinie auf dieser Windows-Version nicht unterstützt.",
    "onedrive_uninstall_in_progress": "Vorgang nicht abgeschlossen. Aktualisieren und Status prüfen.",
    "onedrive_uninstall_failed": "Vorgang nicht abgeschlossen. Aktualisieren und Status prüfen.",
    "onedrive_uninstall_incomplete": "Vorgang nicht abgeschlossen. Aktualisieren und Status prüfen.",
    "debloat_removal_incomplete": "Vorgang nicht abgeschlossen. Aktualisieren und Status prüfen.",
    "invalid_startup_entry": "Vorgang nicht abgeschlossen. Aktualisieren und Status prüfen.",
    "invalid_startup_backup": "Vorgang nicht abgeschlossen. Aktualisieren und Status prüfen.",
    "startup_verification_failed": "Vorgang nicht abgeschlossen. Aktualisieren und Status prüfen.",
    "debloat_open_failed": "Vorgang nicht abgeschlossen. Aktualisieren und Status prüfen."
  }
};
for (const lang of ['de','en','it']) { window.I18N[lang].debloat=debloatTranslations[lang]; Object.assign(window.I18N[lang].errors,debloatErrors[lang]); window.I18N[lang].bkReason.app_reinstall_required=debloatErrors[lang].app_reinstall_required; }

const dbActionTexts={"de": {"start": "Start Debloat", "selectHint": "Bereiche öffnen und gewünschte Änderungen auswählen.", "alreadyApplied": "Bereits angewendet", "completed": "Vorgang abgeschlossen", "applied": "Angewendet", "restored": "Wiederhergestellt", "settingsConfirm": "Die ausgewählten Einstellungen werden geändert. Prüfe die folgenden Auswirkungen; Recall kann vorhandene Momentaufnahmen dauerhaft löschen.", "reinstallNotice": "Deinstallierte Apps müssen bei Bedarf separat neu installiert werden. App-Daten sind nicht gesichert.", "revertLimit": "Deinstallierte Apps und gelöschte App-/Recall-Daten wurden nicht wiederhergestellt. Apps müssen separat neu installiert werden.", "nothingToRestore": "Keine gesicherten Debloat- oder Autostart-Änderungen zum Wiederherstellen vorhanden.", "revertScope": "Gesicherte Debloat-Einstellungen und Autostart-Einträge wurden geprüft. Andere Tweaks bleiben unverändert.", "revertConfirm": "Gesicherte Debloat-Einstellungen und Autostart-Einträge wiederherstellen? Andere Tweaks bleiben unverändert. Deinstallierte Apps und gelöschte App-/Recall-Daten können damit nicht zurückgeholt werden."}, "en": {"start": "Start Debloat", "selectHint": "Open a group and select the changes you want.", "alreadyApplied": "Already applied", "completed": "Operation completed", "applied": "Applied", "restored": "Restored", "settingsConfirm": "The selected settings will change. Review the effects below; Recall may permanently delete existing snapshots.", "reinstallNotice": "Removed apps must be reinstalled separately if needed. App data is not backed up.", "revertLimit": "Uninstalled apps and deleted app/Recall data were not restored. Apps require separate reinstallation.", "nothingToRestore": "No saved Debloat or startup changes to restore.", "revertScope": "Saved Debloat settings and startup entries were checked. Other tweaks remain unchanged.", "revertConfirm": "Restore saved Debloat settings and startup entries? Other tweaks remain unchanged. This cannot recover uninstalled apps or deleted app/Recall data."}, "it": {"start": "Start Debloat", "selectHint": "Apri un gruppo e seleziona le modifiche desiderate.", "alreadyApplied": "Già applicato", "completed": "Operazione completata", "applied": "Applicato", "restored": "Ripristinato", "settingsConfirm": "Le impostazioni selezionate verranno modificate. Controlla gli effetti: Recall può eliminare definitivamente le istantanee esistenti.", "reinstallNotice": "Le app rimosse vanno reinstallate separatamente se necessarie. I dati delle app non sono salvati.", "revertLimit": "Le app disinstallate e i dati eliminati di app/Recall non sono stati ripristinati. Le app richiedono una reinstallazione separata.", "nothingToRestore": "Nessuna modifica Debloat o di avvio salvata da ripristinare.", "revertScope": "Impostazioni Debloat e voci di avvio salvate controllate. Gli altri tweak restano invariati.", "revertConfirm": "Ripristinare impostazioni Debloat e voci di avvio salvate? Gli altri tweak restano invariati. Non recupera app disinstallate o dati eliminati di app/Recall."}};
for(const lang of ["de","en","it"])Object.assign(window.I18N[lang].debloat,dbActionTexts[lang]);

const dbAllTexts={"de": {"selectHint": "Start Debloat führt nach Bestätigung alle verfügbaren Aktionen in diesem Tab aus.", "allConfirm": "Alle unten aufgeführten Apps werden entfernt, Einstellungen angewendet und aktiven Autostart-Einträge deaktiviert. Prüfe die gesamte Liste vor der Bestätigung.", "notice": "Start Debloat berücksichtigt alle verfügbaren Aktionen. Apps werden nur für deinen Windows-Benutzer entfernt. App-Daten und Recall-Momentaufnahmen werden nicht gesichert.", "partial": "Nicht alle Aktionen wurden erfolgreich abgeschlossen."}, "en": {"selectHint": "Start Debloat runs all available actions in this tab after confirmation.", "allConfirm": "All apps listed below will be removed, settings applied and active startup entries disabled. Review the full list before confirming.", "notice": "Start Debloat includes all available actions. Apps are removed for your Windows user only. App data and Recall snapshots are not backed up.", "partial": "Not all actions completed successfully."}, "it": {"selectHint": "Start Debloat esegue tutte le azioni disponibili della scheda dopo conferma.", "allConfirm": "Tutte le app elencate saranno rimosse, le impostazioni applicate e le voci di avvio attive disabilitate. Controlla l’intero elenco prima di confermare.", "notice": "Start Debloat include tutte le azioni disponibili. Le app sono rimosse solo per il tuo utente Windows. Dati delle app e istantanee Recall non vengono salvati.", "partial": "Non tutte le azioni sono state completate."}};
for(const lang of ["de","en","it"])Object.assign(window.I18N[lang].debloat,dbAllTexts[lang]);

const dbLoadTexts={"de": {"loading": "Wird geladen …", "nothingToDo": "Nichts mehr zu tun: Alle verfügbaren Apps, Einstellungen und Autostart-Einträge sind bereits erledigt."}, "en": {"loading": "Loading …", "nothingToDo": "Nothing left to do: all available apps, settings and startup entries are already handled."}, "it": {"loading": "Caricamento …", "nothingToDo": "Niente da fare: tutte le app, impostazioni e voci di avvio disponibili sono già state gestite."}};
for(const lang of ["de","en","it"])Object.assign(window.I18N[lang].debloat,dbLoadTexts[lang]);
