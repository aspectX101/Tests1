// Mock-Backend: liefert dasselbe JSON wie tweaker.ps1, ohne etwas am System zu ändern.
// Die ersten 5 Einträge entsprechen ChatGPTs echtem Katalog, der Rest sind Platzhalter fürs Design.
// Läuft in Node (require) und im Browser (window.TweakerMock).
(function (root) {
  const L = (de, en, it) => ({ de, en, it });
  const T = (id, category, risk, name, description, extra = {}) =>
    ({ id, category, risk, bulkSafe: risk === 'low', name, description, requiresRestart: false, reversible: true, requiresAdmin: true, applied: false, ...extra });

  const catalog = [
    // Echte Backend-Tweaks (Kategorie/Risiko/bulkSafe wie Tweaker.psm1)
    T('windows.power.high', 'performance', 'low', L('Hohe Leistung', 'High performance', 'Prestazioni elevate'),
      L('Aktiviert den vorhandenen Windows-Energieplan Hohe Leistung. Kein garantierter FPS-Gewinn.', 'Activates the existing Windows High performance plan. No guaranteed FPS gain.', 'Attiva il piano Windows Prestazioni elevate esistente. Nessun aumento FPS garantito.')),
    T('fivem.priority.high', 'gaming', 'medium', L('FiveM-Prozesspriorität', 'FiveM process priority', 'Priorità del processo FiveM'),
      L('Setzt laufende FiveM-Spielprozesse auf Hoch. Endet mit dem Spielprozess.', 'Sets running FiveM game processes to High. Ends with the game process.', 'Imposta su Alta i processi di gioco FiveM attivi. Termina con il processo.'), { requiresAdmin: false }),
    T('keyboard.repeat.fast', 'keyboard', 'low', L('WASD: schnelle Tastenwiederholung', 'WASD: fast key repeat', 'WASD: ripetizione rapida dei tasti'),
      L('Kürzeste Wiederholverzögerung (ca. 250 ms) und höchste Wiederholrate (ca. 30/s).', 'Shortest repeat delay (about 250 ms) and highest repeat rate (about 30/s).', 'Ritardo minimo (circa 250 ms) e velocità massima (circa 30/s).')),
    T('keyboard.filterkeys.off', 'keyboard', 'medium', L('Filtertasten deaktivieren', 'Disable Filter Keys', 'Disattiva Filtro tasti'),
      L('Deaktiviert Filtertasten und die Aktivierung über die rechte Umschalttaste.', 'Disables Filter Keys and its right-Shift activation shortcut.', 'Disattiva Filtro tasti e la scorciatoia con Maiusc destro.')),
    T('keyboard.stickykeys.off', 'keyboard', 'medium', L('Einrastfunktion deaktivieren', 'Disable Sticky Keys', 'Disattiva Tasti permanenti'),
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

  // Gemeinsamer Wiederherstellungs-Katalog (Format wie Backup.ps1). Jede Änderung legt automatisch einen Eintrag an.
  const recovery = [];
  const hex32 = () => Array.from({ length: 32 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
  function register(kind, tweakId, payload) {
    // Neuere Sicherung desselben Tweaks verdrängt ältere (backup_superseded).
    if (kind === 'tweak') recovery.filter((r) => r.tweakId === tweakId && r.status === 'applied').forEach((r) => { r.status = 'superseded'; });
    const r = { backupId: hex32(), kind, tweakId, createdUtc: new Date().toISOString(), status: kind === 'services' ? 'evidence' : kind === 'cache' ? 'cleaned' : 'applied', payload };
    recovery.unshift(r);
    return r;
  }
  const reasonOf = (r) => ({ superseded: 'backup_superseded', evidence: 'service_evidence_only', restored: 'already_restored', purged: 'cache_backup_purged' }[r.status] || '');
  const pub = (r) => ({ backupId: r.backupId, kind: r.kind, tweakId: r.tweakId, createdUtc: r.createdUtc, status: r.status, canRestore: !reasonOf(r), reason: reasonOf(r) });
  const backupMsg = {
    de: 'Wiederherstellung nutzt die Originalwerte des jeweiligen Vorgangs. Konflikte werden gemeldet; Dienstsicherungen bleiben aus Sicherheitsgründen Nachweise. Bei Teilerfolg Details prüfen.',
    en: 'Recovery uses the original values saved for each operation. Conflicts are reported; service snapshots remain evidence for safety. Check item details after partial recovery.',
    it: 'Il ripristino usa i valori originali di ogni operazione. I conflitti vengono segnalati; le copie dei servizi restano prove per sicurezza. Controllare i dettagli in caso di risultato parziale.',
  };
  function restoreOne(r) {
    const reason = reasonOf(r);
    if (reason) throw new Error(reason);
    if (r.kind === 'tweak') { const tw = catalog.find((x) => x.id === r.tweakId); if (tw) tw.applied = false; }
    if (r.kind === 'cache') {
      if (candidates.length) throw new Error('cache_restore_conflict');
      const b = backups.find((x) => x.backupId === r.payload.id);
      if (b) { b.status = 'restored'; candidates = b.entries; }
    }
    r.status = 'restored';
  }
  function backup(action, backupId, lang) {
    const message = backupMsg[lang];
    if (action === 'backup-list') return { ok: true, backups: recovery.map(pub), warnings: [], message };
    if (action === 'backup-restore-all') {
      const results = recovery.map((r) => {
        const reason = reasonOf(r);
        if (reason) return { backupId: r.backupId, status: 'skipped', reason };
        try { restoreOne(r); return { backupId: r.backupId, status: 'restored', reason: '' }; }
        catch (e) { return { backupId: r.backupId, status: 'failed', reason: e.message }; }
      });
      const failed = results.some((x) => x.status === 'failed');
      return { ok: !failed, status: failed ? 'partial' : 'completed', results, warnings: [], restartRequired: false, message, ...(failed ? { error: 'restore_incomplete' } : {}) };
    }
    if (!/^[a-f0-9]{32}$/.test(backupId || '')) return { ok: false, error: 'invalid_backup_id' };
    const r = recovery.find((x) => x.backupId === backupId);
    if (!r) return { ok: false, error: 'backup_not_found' };
    if (action === 'backup-preview') return { ok: true, backup: pub(r), snapshot: r.payload, warnings: [], message };
    if (action === 'backup-export') return { ok: true, format: 'tweaker-recovery-export-v1', record: { ...pub(r), payload: r.payload }, importSupported: false };
    if (action === 'backup-restore') {
      let item;
      try { restoreOne(r); item = { backupId, status: 'restored', reason: '' }; }
      catch (e) { item = { backupId, status: 'failed', reason: e.message }; }
      const ok = item.status === 'restored';
      return { ok, status: ok ? 'completed' : 'partial', results: [item], warnings: [], restartRequired: false, message, ...(ok ? {} : { error: 'restore_incomplete' }) };
    }
    return { ok: false, error: 'invalid_action' };
  }

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
      register('cache', null, { id: b.backupId, root: 'C:\\Users\\Spieler\\AppData\\Local\\FiveM\\FiveM.app', entries: candidates.map((c) => c.relative) });
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
      recovery.filter((x) => x.kind === 'cache' && x.payload.id === backupId).forEach((x) => { x.status = 'purged'; });
      return { ok: true, status: 'purged', backupId, freedBytes: sum(b.entries), message };
    }
    return { ok: false, error: 'invalid_action' };
  }

  // SafeMode-Testdaten (Format wie SafeMode.ps1)
  const S = (name, displayName, state, startMode, mustRun, autoRepair = true) => ({ name, displayName, state, startMode, mustRun, autoRepair });
  const services = [
    S('RpcSs', 'Remoteprozeduraufruf (RPC)', 'Running', 'Automatic', true),
    S('EventLog', 'Windows-Ereignisprotokoll', 'Running', 'Automatic', true),
    S('Schedule', 'Aufgabenplanung', 'Running', 'Automatic', true),
    S('Winmgmt', 'Windows-Verwaltungsinstrumentation', 'Running', 'Automatic', true),
    S('MpsSvc', 'Windows Defender Firewall', 'Running', 'Automatic', true),
    S('Dnscache', 'DNS-Client', 'Running', 'Automatic', true),
    S('Dhcp', 'DHCP-Client', 'Stopped', 'Disabled', true),
    S('wuauserv', 'Windows Update', 'Stopped', 'Manual', false),
    S('BITS', 'Intelligenter Hintergrundübertragungsdienst', 'Stopped', 'Manual', false),
    S('SysMain', 'SysMain', 'Stopped', 'Disabled', false, false),
    S('WinDefend', 'Microsoft Defender Antivirus', 'Running', 'Automatic', false, false),
  ];
  const safe = { enabled: false, lastCheckUtc: null };
  const safeMsg = {
    de: 'SafeMode prüft wichtige Dienste. Der App-Monitor prüft alle 30 Sekunden bei geöffneter Anwendung. Bedarfsdienste dürfen inaktiv sein. Ausschalten beendet den Schutz, lässt reparierte Dienste aber aktiv. Dies ist kein Windows-Werksreset.',
    en: 'SafeMode checks important services. The app monitor checks every 30 seconds while the application is open. On-demand services may be inactive. Disabling protection leaves repaired services enabled. This is not a Windows factory reset.',
    it: 'SafeMode controlla i servizi importanti ogni 30 secondi mentre la app è aperta. I servizi su richiesta possono essere inattivi. Disattivare la protezione lascia abilitati i servizi riparati. Non è un ripristino di fabbrica di Windows.',
  };
  function safeReport(lang) {
    const rows = services.map((sv) => {
      let health = 'green', reason = 'available';
      if (sv.startMode === 'Disabled') { health = sv.autoRepair ? 'red' : 'yellow'; reason = 'service_disabled'; }
      else if (sv.mustRun && sv.state !== 'Running') { health = 'red'; reason = 'required_service_not_running'; }
      else if (sv.state !== 'Running') reason = 'on_demand_or_inactive';
      return { ...sv, exists: true, delayedAutoStart: false, health, reason, protected: true };
    });
    const health = rows.some((r) => r.health === 'red') ? 'red' : rows.some((r) => r.health === 'yellow') ? 'yellow' : 'green';
    return { ok: true, enabled: safe.enabled, health, checkedUtc: new Date().toISOString(), platform: { build: 26100, supported: true },
      services: rows, monitorScope: 'while_app_running', intervalSeconds: 30, lastCheckUtc: safe.lastCheckUtc,
      changedServices: [], affectedTweaks: [], baseline: 'keep_enabled_policy_not_factory_defaults', message: safeMsg[lang] };
  }
  function safemode(action, lang) {
    if (action === 'safemode-scan' || action === 'safemode-report') return safeReport(lang);
    if (action === 'safemode-disable') { safe.enabled = false; return safeReport(lang); }
    if (action === 'safemode-enforce' && !safe.enabled) return safeReport(lang);
    if (!safe.enabled) register('services', null, { services: services.map((x) => ({ name: x.name, originalStartMode: x.startMode, originalState: x.state })) });
    safe.enabled = true;
    const repairs = [];
    for (const sv of services.filter((x) => x.autoRepair)) {
      if (sv.startMode === 'Disabled') sv.startMode = 'Automatic';
      if (sv.mustRun && sv.state !== 'Running') sv.state = 'Running';
      else continue;
      repairs.push({ name: sv.name, ok: true });
    }
    safe.lastCheckUtc = new Date().toISOString();
    return { ...safeReport(lang), repairs };
  }

  // Mod-Manager-Testdaten (Format wie ModManager.ps1)
  const hex12 = () => hex32().slice(0, 12);
  const now = () => new Date().toISOString();
  const M = (name, category, sizeBytes, targets, enabled, skippedCount = 0) =>
    ({ id: hex12(), name, category, enabled, sizeBytes, fileCount: targets.length, skippedCount, importedUtc: now(), enabledUtc: enabled ? now() : null, targets });
  const mods = [
    M('NaturalVision Evolved', 'graphics', 1.9 * 1024 * MB, ['mods\\nve_graphics.rpf', 'mods\\nve_timecycle.rpf'], true, 3),
    M('Glock Sound Pack', 'sound', 84 * MB, ['citizen\\platform\\audio\\sfx\\RESIDENT.awc', 'citizen\\platform\\audio\\sfx\\WEAPONS_PLAYER.awc'], false, 1),
    M('Gold Weapon Skins', 'weapons', 212 * MB, ['mods\\weapons_gold.rpf'], true),
    M('Clean Minimap', 'minimap', 6 * MB, ['mods\\minimap.rpf'], false),
  ];
  const res = { width: 1920, height: 1080, windowed: 0, refreshRate: 144, original: null };
  const resOut = () => ({ ok: true, file: 'C:\\Users\\Spieler\\AppData\\Roaming\\CitizenFX\\gta5_settings.xml', width: res.width, height: res.height, windowed: res.windowed, refreshRate: res.refreshRate, hasBackup: !!res.original });
  const modMsg = {
    de: 'Mods werden aus eigenen Dateien importiert und lassen sich jederzeit deaktivieren; überschriebene Originaldateien werden gesichert. Manche Server erlauben keine Client-Mods. Ausführbare Dateien werden nie installiert.',
    en: 'Mods are imported from your own files and can be disabled at any time; overwritten original files are backed up. Some servers do not allow client mods. Executable files are never installed.',
    it: 'Le mod vengono importate dai propri file e si possono disattivare in qualsiasi momento; i file originali sovrascritti vengono salvati. Alcuni server non consentono mod client. I file eseguibili non vengono mai installati.',
  };
  function modsAction(action, { modId, modPath, category, width, height, windowed }, lang) {
    const message = modMsg[lang];
    const find = () => mods.find((m) => m.id === modId);
    if (action === 'mods-list') return { ok: true, fivemFound: true, root: 'C:\\Users\\Spieler\\AppData\\Local\\FiveM\\FiveM.app', mods, enabledCount: mods.filter((m) => m.enabled).length, categories: ['graphics', 'sound', 'weapons', 'minimap', 'other'], message };
    if (action === 'mods-import') {
      if (!['graphics', 'sound', 'weapons', 'minimap', 'other'].includes(category)) return { ok: false, error: 'invalid_mod_category' };
      const file = String(modPath || 'Neue Mod.zip').split(/[\\/]/).pop();
      const base = file.replace(/\.[^.]+$/, '');
      if (/\.(rar|7z)$/i.test(file)) return { ok: false, error: 'mod_archive_unsupported' };
      const m = M(base, category, Math.round((20 + Math.random() * 300) * MB), [`mods\\${base.toLowerCase().replace(/\s+/g, '_')}.rpf`], false, Math.round(Math.random() * 2));
      mods.unshift(m);
      return { ok: true, mod: m, message };
    }
    if (action.startsWith('res-')) {
      if (action === 'res-set') {
        if (!(width >= 640 && width <= 7680 && height >= 480 && height <= 4320 && [0, 1, 2].includes(windowed))) return { ok: false, error: 'invalid_resolution' };
        if (!res.original) res.original = { width: res.width, height: res.height, windowed: res.windowed };
        Object.assign(res, { width, height, windowed });
      }
      if (action === 'res-reset') {
        if (!res.original) return { ok: false, error: 'resolution_backup_not_found' };
        Object.assign(res, res.original); res.original = null;
      }
      return { ...resOut(), message };
    }
    const m = find();
    if (!/^[a-f0-9]{12}$/.test(modId || '')) return { ok: false, error: 'invalid_mod_id' };
    if (!m) return { ok: false, error: 'mod_not_found' };
    if (action === 'mods-enable') {
      const clash = mods.some((o) => o.enabled && o.id !== m.id && o.targets.some((t) => m.targets.includes(t)));
      if (clash) return { ok: false, error: 'mod_conflict' };
      m.enabled = true; m.enabledUtc = now();
    }
    if (action === 'mods-disable') { m.enabled = false; m.enabledUtc = null; }
    if (action === 'mods-remove') { mods.splice(mods.indexOf(m), 1); return { ok: true, id: modId, message }; }
    return { ok: true, mod: m, message };
  }

  async function call(req = {}) {
    const { action, id, lang = 'de', backupId, confirmPurge } = req;
    await delay();
    if (!['de', 'en', 'it'].includes(lang)) return { ok: false, error: 'invalid_language' };
    if (String(action).startsWith('cache-')) return cache(action, backupId, confirmPurge, lang);
    if (String(action).startsWith('safemode-')) return safemode(action, lang);
    if (String(action).startsWith('backup-')) return backup(action, backupId, lang);
    if (/^(mods|res)-/.test(String(action))) return modsAction(action, req, lang);
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
      if (action === 'apply' && !was) register('tweak', id, { id, before: { applied: false }, target: { applied: true } });
      if (action === 'revert') recovery.filter((r) => r.tweakId === id && r.status === 'applied').forEach((r) => { r.status = 'restored'; });
      const status = action === 'revert' ? 'restored' : was ? 'unchanged' : 'applied';
      return { ok: true, id, applied: t.applied, restartRequired: t.requiresRestart, status, message: '' };
    }
    return { ok: false, error: 'invalid_action' };
  }

  const api = { call };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TweakerMock = api;
})(this);
