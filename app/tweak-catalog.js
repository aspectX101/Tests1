/* Generated from Get-TweakerCatalog; shared by browser and Electron mock. */
(function(root) {
  const catalog = [
  {
    "id": "windows.capture.off",
    "category": "performance",
    "risk": "medium",
    "bulkSafe": false,
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
    "requiresAdmin": true,
    "available": true,
    "stateError": null
  },
  {
    "id": "windows.gamemode.on",
    "category": "performance",
    "risk": "low",
    "bulkSafe": false,
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
    "requiresAdmin": true,
    "available": true,
    "stateError": null
  },
  {
    "id": "windows.audio.ducking.off",
    "category": "performance",
    "risk": "low",
    "bulkSafe": false,
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
    "requiresAdmin": true,
    "available": true,
    "stateError": null
  },
  {
    "id": "windows.power.high",
    "category": "performance",
    "risk": "low",
    "bulkSafe": true,
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
    "requiresAdmin": true,
    "available": true,
    "stateError": null
  },
  {
    "id": "fivem.priority.high",
    "category": "gaming",
    "risk": "medium",
    "bulkSafe": false,
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
    "requiresAdmin": false,
    "available": true,
    "stateError": null
  },
  {
    "id": "keyboard.repeat.fast",
    "category": "keyboard",
    "risk": "low",
    "bulkSafe": true,
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
    "requiresAdmin": true,
    "available": true,
    "stateError": null
  },
  {
    "id": "keyboard.filterkeys.off",
    "category": "keyboard",
    "risk": "medium",
    "bulkSafe": false,
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
    "requiresAdmin": true,
    "available": true,
    "stateError": null
  },
  {
    "id": "keyboard.stickykeys.off",
    "category": "keyboard",
    "risk": "medium",
    "bulkSafe": false,
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
    "requiresAdmin": true,
    "available": true,
    "stateError": null
  }
];
  if (typeof module !== 'undefined' && module.exports) module.exports = catalog;
  else root.TweakerCatalog = catalog;
})(this);

