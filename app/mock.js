// Mock-Backend: liefert dasselbe JSON wie tweaker.ps1, ohne etwas am System zu ändern.
// Die ersten 5 Einträge entsprechen ChatGPTs echtem Katalog, der Rest sind Platzhalter fürs Design.
// Läuft in Node (require) und im Browser (window.TweakerMock).
(function (root) {
  const L = (de, en, it) => ({ de, en, it });
  const T = (id, category, risk, name, description, extra = {}) =>
    ({ id, category, risk, name, description, requiresRestart: false, reversible: true, requiresAdmin: true, applied: false, ...extra });

  const catalog = [
    // Echte Backend-Tweaks (Stand codex/performance-backend)
    T('windows.power.high', 'performance', 'medium', L('Hohe Leistung', 'High performance', 'Prestazioni elevate'),
      L('Aktiviert den vorhandenen Windows-Energieplan Hohe Leistung. Kein garantierter FPS-Gewinn.', 'Activates the existing Windows High performance plan. No guaranteed FPS gain.', 'Attiva il piano Windows Prestazioni elevate esistente. Nessun aumento FPS garantito.')),
    T('fivem.priority.high', 'gaming', 'medium', L('FiveM-Prozesspriorität', 'FiveM process priority', 'Priorità del processo FiveM'),
      L('Setzt laufende FiveM-Spielprozesse auf Hoch. Endet mit dem Spielprozess.', 'Sets running FiveM game processes to High. Ends with the game process.', 'Imposta su Alta i processi di gioco FiveM attivi. Termina con il processo.'), { requiresAdmin: false }),
    T('keyboard.repeat.fast', 'gaming', 'medium', L('WASD: schnelle Tastenwiederholung', 'WASD: fast key repeat', 'WASD: ripetizione rapida dei tasti'),
      L('Kürzeste Wiederholverzögerung (ca. 250 ms) und höchste Wiederholrate (ca. 30/s).', 'Shortest repeat delay (about 250 ms) and highest repeat rate (about 30/s).', 'Ritardo minimo (circa 250 ms) e velocità massima (circa 30/s).')),
    T('keyboard.filterkeys.off', 'gaming', 'medium', L('Filtertasten deaktivieren', 'Disable Filter Keys', 'Disattiva Filtro tasti'),
      L('Deaktiviert Filtertasten und die Aktivierung über die rechte Umschalttaste.', 'Disables Filter Keys and its right-Shift activation shortcut.', 'Disattiva Filtro tasti e la scorciatoia con Maiusc destro.')),
    T('keyboard.stickykeys.off', 'gaming', 'medium', L('Einrastfunktion deaktivieren', 'Disable Sticky Keys', 'Disattiva Tasti permanenti'),
      L('Deaktiviert die Einrastfunktion und die Aktivierung durch 5× Umschalt.', 'Disables Sticky Keys and its five-Shift shortcut.', 'Disattiva Tasti permanenti e la scorciatoia con 5× Maiusc.')),

    // Platzhalter (noch nicht im Backend)
    T('mock.game-dvr.off', 'gaming', 'low', L('Game DVR deaktivieren', 'Disable Game DVR', 'Disattiva Game DVR'),
      L('Schaltet Xbox-Aufnahme im Hintergrund ab', 'Turns off Xbox background recording', 'Disattiva la registrazione Xbox in background'), { applied: true }),
    T('mock.mouse-accel.off', 'mouse', 'low', L('Mausbeschleunigung aus', 'Mouse acceleration off', 'Accelerazione mouse off'),
      L('Deaktiviert „Zeigerpräzision verbessern“', 'Disables “Enhance pointer precision”', 'Disattiva “Precisione puntatore avanzata”')),
    T('mock.dns.cloudflare', 'network', 'low', L('Cloudflare DNS', 'Cloudflare DNS', 'DNS Cloudflare'),
      L('Schnellere DNS-Auflösung über 1.1.1.1', 'Faster DNS resolution via 1.1.1.1', 'Risoluzione DNS più veloce con 1.1.1.1')),
    T('mock.telemetry.off', 'privacy', 'low', L('Telemetrie deaktivieren', 'Disable telemetry', 'Disattiva telemetria'),
      L('Minimiert Diagnosedaten an Microsoft', 'Minimises diagnostic data sent to Microsoft', 'Riduce i dati diagnostici inviati a Microsoft'), { requiresRestart: true }),
    T('mock.xbox-apps.remove', 'debloat', 'high', L('Xbox-Apps entfernen', 'Remove Xbox apps', 'Rimuovi app Xbox'),
      L('Deinstalliert vorinstallierte Xbox-Komponenten', 'Uninstalls preinstalled Xbox components', 'Disinstalla i componenti Xbox preinstallati')),
    T('mock.hibernate.off', 'power', 'low', L('Ruhezustand deaktivieren', 'Disable hibernation', 'Disattiva ibernazione'),
      L('Entfernt hiberfil.sys und gibt Speicher frei', 'Removes hiberfil.sys and frees disk space', 'Rimuove hiberfil.sys e libera spazio')),
  ];

  const delay = () => new Promise((r) => setTimeout(r, 250 + Math.random() * 600));

  // FiveM-Cache-Testdaten (Format wie CacheCleaner.ps1)
  const MB = 1024 * 1024;
  const fresh = () => [
    { relative: 'data\\cache\\browser', bytes: 412 * MB, fileCount: 1834 },
    { relative: 'data\\cache\\db', bytes: 96 * MB, fileCount: 211 },
    { relative: 'data\\server-cache', bytes: 2.7 * 1024 * MB, fileCount: 5120 },
    { relative: 'data\\server-cache-priv', bytes: 840 * MB, fileCount: 932 },
  ];
  let candidates = fresh();
  const backups = [];
  const cacheMsg = {
    de: 'Cache-Daten werden beim nächsten Serverbeitritt erneut geladen. Sichern und bereinigen gibt noch keinen Speicher frei; erst das endgültige Löschen der Sicherung. Einstellungen, Mods, Keybinds und Spielassets bleiben erhalten.',
    en: 'Cache data is downloaded again on the next server join. Quarantine does not free disk space; permanently purge the backup to reclaim space. Settings, mods, keybinds and game assets are preserved.',
    it: 'I dati cache vengono scaricati di nuovo al prossimo accesso al server. Lo spostamento nella copia di sicurezza non libera spazio; eliminarla definitivamente per recuperarlo. Impostazioni, mod, comandi e risorse di gioco vengono conservati.',
  };
  const hex = () => Array.from({ length: 32 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
  const sum = (list) => list.reduce((a, c) => a + c.bytes, 0);

  function cache(action, backupId, confirmPurge, lang) {
    const message = cacheMsg[lang];
    if (action === 'cache-info') {
      return { ok: true, root: 'C:\\Users\\Spieler\\AppData\\Local\\FiveM\\FiveM.app', candidates, totalBytes: sum(candidates),
        backups: backups.map(({ backupId, status, createdUtc }) => ({ backupId, status, createdUtc })), requiresClosedGame: true, message };
    }
    if (action === 'cache-clean') {
      if (!candidates.length) return { ok: true, status: 'unchanged', freedBytes: 0, removedFromActiveCacheBytes: 0, backupId: null, message };
      const b = { backupId: hex(), status: 'cleaned', createdUtc: new Date().toISOString(), entries: candidates };
      backups.unshift(b);
      const bytes = sum(candidates);
      candidates = [];
      return { ok: true, status: 'cleaned', backupId: b.backupId, removedFromActiveCacheBytes: bytes, freedBytes: 0, message };
    }
    const b = backups.find((x) => x.backupId === backupId);
    if (!/^[a-f0-9]{32}$/.test(backupId || '')) return { ok: false, error: 'invalid_backup_id' };
    if (!b) return { ok: false, error: 'cache_backup_not_found' };
    if (action === 'cache-restore') {
      if (b.status === 'purged') return { ok: false, error: 'cache_backup_purged' };
      if (candidates.length) return { ok: false, error: 'cache_restore_conflict' };
      b.status = 'restored';
      candidates = b.entries;
      return { ok: true, status: 'restored', backupId, message };
    }
    if (action === 'cache-purge') {
      if (confirmPurge !== true) return { ok: false, error: 'explicit_purge_confirmation_required' };
      if (b.status === 'restored') return { ok: false, error: 'cache_backup_already_restored' };
      b.status = 'purged';
      return { ok: true, status: 'purged', backupId, freedBytes: sum(b.entries), message };
    }
    return { ok: false, error: 'invalid_action' };
  }

  async function call({ action, id, lang = 'de', backupId, confirmPurge } = {}) {
    await delay();
    if (!['de', 'en', 'it'].includes(lang)) return { ok: false, error: 'invalid_language' };
    if (String(action).startsWith('cache-')) return cache(action, backupId, confirmPurge, lang);
    if (action === 'info') {
      return { ok: true, os: 'Microsoft Windows 11 Home (Mock)', cpu: 'AMD Ryzen 7 7800X3D', gpu: 'NVIDIA GeForce RTX 4070 Ti', ramGB: 32, isAdmin: true };
    }
    if (action === 'list') {
      return { ok: true, tweaks: catalog.map((t) => ({ ...t, name: t.name[lang], description: t.description[lang] })) };
    }
    const t = catalog.find((x) => x.id === id);
    if (!t) return { ok: false, error: 'invalid_tweak_id' };
    if (action === 'status') return { ok: true, id, applied: t.applied };
    if (action === 'apply' || action === 'revert') {
      const was = t.applied;
      t.applied = action === 'apply';
      const status = action === 'revert' ? 'restored' : was ? 'unchanged' : 'applied';
      return { ok: true, id, applied: t.applied, restartRequired: t.requiresRestart, status, message: '' };
    }
    return { ok: false, error: 'invalid_action' };
  }

  const api = { call };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TweakerMock = api;
})(this);
