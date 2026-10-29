const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { pathToFileURL } = require('url');
const usage = require('./usage');
const updater = require('./updater');
const { relaunchElevated } = require('./elevate');

// Installierte Windows-App: ohne Adminrechte gestartet → einmal mit UAC neu starten und diese Instanz beenden.
const relaunched = app.isPackaged && relaunchElevated();
if (relaunched) app.exit(0);

const INDEX = path.join(__dirname, 'renderer', 'index.html');
const INDEX_URL = pathToFileURL(INDEX).href;
const LANGS = new Set(['de', 'en', 'it']);

const spotify = require('./spotify').createSpotify(app);
const displayColor = require('./display-color').createDisplayColor(app);
let win;
let currentLang = 'de';
let lastSafeMode = null; // letzte Meldung des SafeMode-Monitors, für Fenster die später laden

const sendToUi = (channel, payload) => win && !win.isDestroyed() && win.webContents.send(channel, payload);

// Echtes Backend (ChatGPT, electron/backend.cjs) unter Windows, sonst oder mit --mock die Testdaten.
// Eine einzige Instanz: sie startet auch den SafeMode-Monitor (alle 30 s, nur solange die App offen ist).
const useMock = (!app.isPackaged && process.argv.includes('--mock')) || process.platform !== 'win32';
const h1tAccount = require('./h1t-account').createH1tAccount(app, { bypass: !app.isPackaged && useMock });
let backend;
if (relaunched) {
  backend = async () => ({ ok: false, error: 'relaunching' });
} else if (useMock) {
  const mock = require('./mock');
  backend = (req) => mock.call(req);
} else {
  const helper = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'electron', 'backend.cjs')
    : path.join(__dirname, '..', 'electron', 'backend.cjs');
  backend = require(helper).createBackendClient(app, {
    getLanguage: () => currentLang,
    onSafeModeReport: (report) => { lastSafeMode = { report }; sendToUi('tweaker:safemode', lastSafeMode); },
    onSafeModeError: (err) => { lastSafeMode = { error: err.message }; sendToUi('tweaker:safemode', lastSafeMode); },
  });
}

// Support log: every failed backend request lands in logs\backend.log (code, technical detail, where it happened).
const support = require('./support').createSupport({ logDir: path.join(app.getPath('userData'), 'logs'), version: app.getVersion() });
// Everything else that can go wrong lands in the same log: failed window requests of any channel, script errors
// in the window, main-process exceptions (monitor only, Electron's own handling stays), crashed child processes.
require('./support').wrapIpc(ipcMain, support);
process.on('uncaughtExceptionMonitor', (err, origin) => support.event({ kind: 'main-exception', origin, error: err?.message || String(err), stack: err?.stack }));
process.on('unhandledRejection', (reason) => support.event({ kind: 'main-rejection', error: reason?.message || String(reason), stack: reason?.stack }));
app.on('render-process-gone', (_e, _wc, d) => support.event({ kind: 'renderer-gone', reason: d?.reason, exitCode: d?.exitCode }));
app.on('child-process-gone', (_e, d) => { if (d?.reason !== 'clean-exit') support.event({ kind: 'process-gone', type: d?.type, reason: d?.reason, exitCode: d?.exitCode, name: d?.name }); });
{
  const raw = backend;
  backend = async (req) => {
    try { const res = await raw(req); support.record(req, res); return res; } catch (err) { support.record(req, null, err); throw err; }
  };
}

// License expiry: when the license ends, restore every change the tweaker made (same records as "Revert All").
// Started invisibly by the "H1T.CC License Check" task with --h1t-expiry-check when the app is not open.
const expiryCheckOnly = process.argv.includes('--h1t-expiry-check');
const licenseTask = require('./license-task').createLicenseTask({ exe: () => portableExe() });
const licenseExpiry = require('./license-expiry').createLicenseExpiry(app, {
  backend: (req) => backend({ ...req, lang: currentLang }),
  resetColor: async () => { const had = !!displayColor.getState()?.saved; const r = await displayColor.reset(); return had ? r?.ok === true : null; },
  task: licenseTask,
  onChange: (st) => sendToUi('tweaker:h1t-expiry', st),
});
h1tAccount.onSnapshot((snap) => { licenseExpiry.observe(snap).catch(() => {}); });
const withLicense = async (pending) => {
  const snap = await pending;
  return snap && snap.ok !== false ? { ...snap, license_revert: licenseExpiry.publicState() } : snap;
};

// FiveM > H1T Mods: Katalog aus dem GitHub-Release "h1t-mods"; Installation über den normalen Mod-Import.
const h1tMods = require('./h1t-mods').createH1tMods(app, (req) => backend(req));
h1tMods.onProgress((p) => sendToUi('tweaker:h1tmods-progress', p));
ipcMain.handle('tweaker:h1tmods-list', (e) => trusted(e) ? h1tMods.list() : { ok: false });
ipcMain.handle('tweaker:h1tmods-install', async (e, id) => trusted(e) && typeof id === 'string' && await h1tAccount.checkAccess() ? h1tMods.install(id) : { ok: false, error: 'license_required' });

// FiveM > Hitreg: Live-Verbindungstest (UDP-Serverabfrage) mit Fortschritt für das Diagramm.
const hitregNet = require('./hitreg-net');
let hitregBusy = false;
ipcMain.handle('tweaker:hitreg-test', async (e, target) => {
  if (!trusted(e) || typeof target !== 'string' || hitregBusy) return { ok: false, error: 'hitreg_busy' };
  if (!await h1tAccount.checkAccess()) return { ok: false, error: 'license_required' };
  hitregBusy = true;
  try { return await hitregNet.runTest(target, (p) => sendToUi('tweaker:hitreg-progress', p)); }
  finally { hitregBusy = false; }
});

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 960,
    minHeight: 660,
    frame: false,
    backgroundColor: '#000000',
    title: 'H1T.CC Tweak Utility',
    // Fenster-/Taskleisten-Icon zur Laufzeit; das Exe-Icon selbst lässt sich ohne Windows-Build nicht setzen.
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // the boot animation plays its own synthesized sound before the user has clicked anything
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.loadFile(INDEX);
  usage.start((u) => sendToUi('tweaker:usage', u));
  win.webContents.once('did-finish-load', () => updater.start((st) => sendToUi('tweaker:update', st), { health }));
}

// Nur Anfragen aus unserer eigenen, lokal geladenen Oberfläche annehmen.
const trusted = (e) => e.senderFrame && e.senderFrame.url.split('#')[0] === INDEX_URL;

// H1T.CC desktop API: credentials/tokens stay in this privileged process only.
ipcMain.handle('tweaker:h1t-status', (e) => trusted(e) ? withLicense(h1tAccount.refresh(true)) : {ok:false,error:'untrusted_sender'});
ipcMain.handle('tweaker:h1t-login', (e,email,password) => trusted(e) ? withLicense(h1tAccount.login(email,password)) : {ok:false,error:'untrusted_sender'});
ipcMain.handle('tweaker:h1t-bind', (e,licenseId,consent) => trusted(e) ? withLicense(h1tAccount.bind(licenseId,consent,app.getVersion())) : {ok:false,error:'untrusted_sender'});
ipcMain.handle('tweaker:h1t-logout', (e) => trusted(e) ? withLicense(h1tAccount.logout()) : {ok:false,error:'untrusted_sender'});
ipcMain.handle('tweaker:h1t-expiry-state', (e) => trusted(e) ? licenseExpiry.publicState() : null);
ipcMain.handle('tweaker:h1t-portal', async (e) => {
  if(!trusted(e))return {ok:false,error:'untrusted_sender'};
  try { await shell.openExternal(h1tAccount.link('customer_area') || 'https://h1tutility.cc/account'); return {ok:true}; }
  catch{return {ok:false,error:'portal_open_failed'};}
});
// Voluntary diagnostics: collection, token, device_id and device_proof stay in this process.
// The renderer can only request a preview, accept/send that exact preview, withdraw, or delete.
ipcMain.handle('tweaker:h1t-diag-accept', (e) => trusted(e) ? h1tAccount.acceptDiagnostics() : {ok:false,error:'untrusted_sender'});
ipcMain.handle('tweaker:h1t-diag-withdraw', (e) => trusted(e) ? h1tAccount.withdrawDiagnostics() : {ok:false,error:'untrusted_sender'});
ipcMain.handle('tweaker:h1t-diag-preview', (e) => trusted(e) ? h1tAccount.previewDiagnostics(app.getVersion()) : {ok:false,error:'untrusted_sender'});
ipcMain.handle('tweaker:h1t-diag-send', (e) => trusted(e) ? h1tAccount.sendDiagnostics() : {ok:false,error:'untrusted_sender'});
ipcMain.handle('tweaker:h1t-diag-discard', (e) => trusted(e) ? h1tAccount.discardDiagnosticsPreview() : {ok:false,error:'untrusted_sender'});
ipcMain.handle('tweaker:h1t-diag-delete', (e) => trusted(e) ? h1tAccount.deleteDiagnostics() : {ok:false,error:'untrusted_sender'});
// Customer area / licenses / support: fixed kinds only; URLs come from the account module (own HTTPS hosts only).
ipcMain.handle('tweaker:h1t-open', async (e, kind) => {
  if(!trusted(e))return {ok:false,error:'untrusted_sender'};
  const url=typeof kind==='string'?h1tAccount.link(kind):null;
  if(!url)return {ok:false,error:'invalid_link'};
  try { await shell.openExternal(url); return {ok:true}; }
  catch{return {ok:false,error:'portal_open_failed'};}
});
spotify.onChange((value) => sendToUi('tweaker:spotify', value));
ipcMain.on('tweaker:spotify-active', (e, active) => { if (trusted(e)) spotify.setActive(active === true); });
ipcMain.handle('tweaker:spotify-state', (e) => trusted(e) ? spotify.getState() : null);
ipcMain.handle('tweaker:spotify-command', (e, action) => trusted(e) ? spotify.command(action) : {ok:false});
ipcMain.handle('tweaker:spotify-open', async (e) => {
  if (!trusted(e)) return {ok:false};
  try { await shell.openExternal('spotify:'); return {ok:true}; } catch { return {ok:false}; }
});
app.on('before-quit', () => spotify.stop());

// Extra > Color: Werte nur als Ganzzahlen 0-100, Prüfung in display-color.js.
displayColor.onChange((value) => sendToUi('tweaker:color', value));
ipcMain.handle('tweaker:color-state', (e) => trusted(e) ? displayColor.getState() : null);
ipcMain.handle('tweaker:color-set', async (e, look) => trusted(e) && await h1tAccount.checkAccess() ? displayColor.set(look) : {ok:false,error:'license_required'});
ipcMain.handle('tweaker:color-save', async (e, look) => trusted(e) && await h1tAccount.checkAccess() ? displayColor.save(look) : {ok:false,error:'license_required'});
ipcMain.handle('tweaker:color-reset', async (e) => trusted(e) && await h1tAccount.checkAccess() ? displayColor.reset() : {ok:false,error:'license_required'});
app.on('before-quit', () => displayColor.stop());

ipcMain.handle('tweaker:call', async (e, request) => {
  if (!trusted(e)) return { ok: false, error: 'untrusted_sender' };
  if (!request || typeof request !== 'object') return { ok: false, error: 'invalid_action' };
  if (!await h1tAccount.checkAccess()) return { ok: false, error: 'license_required' };
  // Nur die bekannten Felder weiterreichen; Pfade und Skripte kann die Oberfläche nicht setzen.
  // modPath fehlt bewusst: Mod-Pfade kommen nur aus dem Datei-Dialog (tweaker:mod-import).
  const { action, id, lang, backupId, confirmPurge, modId, category, width, height, windowed, appIds, previewToken, confirmDataLoss, layout, extra } = request;
  if (action === 'mods-import') return { ok: false, error: 'invalid_action' };
  if (LANGS.has(lang)) currentLang = lang;
  try {
    return await backend({ action, id, lang, backupId, confirmPurge: confirmPurge === true, modId, category, width, height, windowed, appIds, previewToken, confirmDataLoss: confirmDataLoss === true, layout, extra });
  } catch (err) {
    return { ok: false, error: err.message, ...(err.detail ? { detail: err.detail } : {}) };
  }
});

// Support-Bericht: Systeminfos, Lizenz-/Update-Stand, aktive Sicherungen und die letzten Protokolle in einer Datei.
async function supportReport() {
  let backups = null;
  try {
    const list = await backend({ action: 'backup-list' });
    if (list?.ok) backups = list.backups.map((b) => ({ kind: b.kind, id: b.tweakId, status: b.status, created: b.createdUtc, canRestore: b.canRestore, reason: b.reason || undefined }));
  } catch { /* report without backups */ }
  return support.report({ mode: useMock ? 'mock' : 'powershell', license: licenseExpiry.state(), update: updater.getState(), backups });
}

// SafeMode-Bericht, Wiederherstellungs-Nachweis oder Support-Bericht als JSON speichern; den Ort wählt der Nutzer im Windows-Dialog.
ipcMain.handle('tweaker:export', async (e, what, backupId) => {
  if (!trusted(e)) return { ok: false, error: 'untrusted_sender' };
  if (what === 'support') {
    const data = await supportReport();
    const { canceled, filePath } = await dialog.showSaveDialog(win, { defaultPath: `h1t-support-${new Date().toISOString().slice(0, 10)}.json`, filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (canceled || !filePath) return { ok: true, canceled: true };
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { ok: true, path: filePath };
  }
  let req;
  if (what === 'safemode') req = { action: 'safemode-report', lang: currentLang };
  else if (what === 'backup' && typeof backupId === 'string' && /^[a-f0-9]{32}$/.test(backupId)) req = { action: 'backup-export', backupId, lang: currentLang };
  else return { ok: false, error: 'invalid_action' };
  let data;
  try {
    data = await backend(req);
  } catch (err) {
    return { ok: false, error: err.message };
  }
  if (!data?.ok) return data;
  const stamp = new Date().toISOString().slice(0, 10);
  const name = what === 'safemode' ? `tweaker-safemode-${stamp}.json` : `tweaker-backup-${backupId.slice(0, 8)}-${stamp}.json`;
  const { canceled, filePath } = await dialog.showSaveDialog(win, { defaultPath: name, filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (canceled || !filePath) return { ok: true, canceled: true };
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  return { ok: true, path: filePath };
});

// PC neu starten: fester Windows-Befehl mit 10 s Vorlauf (abbrechen mit "shutdown /a").
ipcMain.handle('tweaker:restart-pc', async (e) => {
  if (!trusted(e)) return { ok: false, error: 'untrusted_sender' };
  if (!await h1tAccount.checkAccess()) return { ok: false, error: 'license_required' };
  if (process.platform !== 'win32') return { ok: false, error: 'not_portable' };
  const exe = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'shutdown.exe');
  require('child_process').spawn(exe, ['/r', '/t', '10', '/c', 'H1T.CC Tweak Utility: Neustart in 10 Sekunden'], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  return { ok: true };
});

ipcMain.handle('tweaker:version', (e) => (trusted(e) ? app.getVersion() : null));

// Wo liegt die portable Exe? (Der Updater ersetzt sie an Ort und Stelle, der Dateiname bleibt der alte.)
const portableExe = () => process.env.PORTABLE_EXECUTABLE_FILE || null;
ipcMain.handle('tweaker:app-location', (e) => (trusted(e) ? { exe: portableExe() } : null));
ipcMain.handle('tweaker:show-exe', (e) => {
  if (!trusted(e) || !portableExe()) return { ok: false, error: 'not_portable' };
  shell.showItemInFolder(portableExe());
  return { ok: true };
});
// Verknüpfung auf dem Desktop oder im Startmenü; zeigt auf die portable Exe und bleibt nach Updates gültig.
ipcMain.handle('tweaker:create-shortcut', (e, where) => {
  if (!trusted(e) || !portableExe()) return { ok: false, error: 'not_portable' };
  const dir = where === 'startmenu'
    ? path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs')
    : app.getPath('desktop');
  const lnk = path.join(dir, 'H1T.CC Tweak Utility.lnk');
  // 'create' legt an oder überschreibt eine vorhandene Verknüpfung
  const ok = shell.writeShortcutLink(lnk, 'create', {
    target: portableExe(), cwd: path.dirname(portableExe()), icon: portableExe(), iconIndex: 0, description: 'H1T.CC Tweak Utility',
  });
  return ok ? { ok: true, path: lnk } : { ok: false, error: 'shortcut_failed' };
});
ipcMain.handle('tweaker:update-state', (e) => (trusted(e) ? updater.getState() : null));
ipcMain.on('tweaker:update-check', (e) => trusted(e) && updater.check());
ipcMain.on('tweaker:update-install', (e) => trusted(e) && updater.install());
ipcMain.on('tweaker:update-log', (e) => trusted(e) && updater.openLog());
ipcMain.on('tweaker:update-page', (e) => trusted(e) && updater.openReleases());
// Mod importieren: Datei oder Ordner im Windows-Dialog wählen, dann ans Backend geben.
ipcMain.handle('tweaker:mod-import', async (e, category, kind) => {
  if (!trusted(e)) return { ok: false, error: 'untrusted_sender' };
  if (!await h1tAccount.checkAccess()) return {ok:false,error:'license_required'};
  const folder = kind === 'folder';
  const pick = await dialog.showOpenDialog(win, folder
    ? { properties: ['openDirectory'] }
    : { properties: ['openFile'], filters: [{ name: 'Mods', extensions: ['zip', 'rpf', 'awc', 'ytd', 'ydr', 'yft', 'gfx', 'meta', 'dat', 'xml'] }, { name: '*', extensions: ['*'] }] });
  if (pick.canceled || !pick.filePaths[0]) return { ok: true, canceled: true };
  try {
    return await backend({ action: 'mods-import', modPath: pick.filePaths[0], category, lang: currentLang });
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// FiveM-Mods-Ordner im Explorer öffnen (Pfad kommt vom Backend, nicht von der Oberfläche).
ipcMain.handle('tweaker:open-mods-folder', async (e) => {
  if (!trusted(e)) return { ok: false, error: 'untrusted_sender' };
  if (!await h1tAccount.checkAccess()) return {ok:false,error:'license_required'};
  try {
    const list = await backend({ action: 'mods-list', lang: currentLang });
    if (!list?.ok || !list.root) return { ok: false, error: 'fivem_not_found' };
    const modsDir = path.join(list.root, 'mods');
    const err = await shell.openPath(require('fs').existsSync(modsDir) ? modsDir : list.root);
    return err ? { ok: false, error: err } : { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('tweaker:mode', (e) => (trusted(e) ? (useMock ? 'mock' : 'powershell') : null));
ipcMain.handle('tweaker:safemode-last', (e) => (trusted(e) ? lastSafeMode : null));
ipcMain.on('window:minimize', (e) => trusted(e) && win?.minimize());
ipcMain.on('window:maximize', (e) => { if (trusted(e) && win) { if (win.isMaximized()) win.unmaximize(); else win.maximize(); } });
ipcMain.on('window:close', (e) => trusted(e) && win?.close());

// Update health (app/update-health.js): a new version that twice ends before its UI is ready goes back to the
// exe it replaced. Only the real portable app counts, not the invisible license check or the mock.
const health = app.isPackaged && !useMock && !expiryCheckOnly && process.env.PORTABLE_EXECUTABLE_FILE
  ? require('./update-health').createUpdateHealth({ dir: app.getPath('userData'), version: app.getVersion() }) : null;
ipcMain.on('tweaker:ui-ready', (e) => { if (trusted(e)) health?.healthy(); });
ipcMain.on('tweaker:ui-error', (e, info) => {
  if (!trusted(e) || !info || typeof info !== 'object') return;
  support.event({ kind: 'ui-error', message: info.message, source: info.source, line: Number(info.line) || undefined, stack: info.stack });
});
app.on('will-quit', () => health?.closed());

if (!relaunched) app.whenReady().then(async () => {
  const back = health?.begin();
  if (back?.rollback && updater.rollback(back.rollback)) { app.exit(0); return; }
  await h1tAccount.load(); await licenseExpiry.load();
  if (expiryCheckOnly) {
    // Invisible run from the scheduled task: check the license, restore if it ended, then exit.
    try { await licenseExpiry.observe(await h1tAccount.refresh(true)); } catch {}
    app.quit();
    return;
  }
  createWindow(); displayColor.restore();
  // Signed out or offline at start: the stored end date still counts (no window needed for that).
  h1tAccount.refresh().then((snap) => licenseExpiry.observe(snap)).catch(() => {});
  // Accepted data-transfer notice: refresh the report on start (at most weekly or after an update).
  h1tAccount.autoReport(app.getVersion()).catch(() => {});
});
app.on('window-all-closed', () => {
  usage.stop();
  spotify.stop();
  displayColor.stop();
  app.quit();
});


// Only fixed first-party destinations; the renderer never supplies a URI.
ipcMain.handle('tweaker:display-settings', async (e) => {
  if (!trusted(e)) return {ok:false,error:'untrusted_sender'};
  try {await shell.openExternal('ms-settings:display');return {ok:true};}
  catch {return {ok:false,error:'display_settings_failed'};}
});
ipcMain.handle('tweaker:debloat-target', async (e, id) => {
  if (!trusted(e)) return { ok:false, error:'untrusted_sender' };
  const url = require('./debloat-links').getInstallUrl(id);
  if (!url) return { ok:false, error:'invalid_debloat_selection' };
  try { await shell.openExternal(url); return {ok:true}; }
  catch { return {ok:false,error:'debloat_open_failed'}; }
});

