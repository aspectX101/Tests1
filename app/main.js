const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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

let win;
let currentLang = 'de';
let lastSafeMode = null; // letzte Meldung des SafeMode-Monitors, für Fenster die später laden

const sendToUi = (channel, payload) => win && !win.isDestroyed() && win.webContents.send(channel, payload);

// Echtes Backend (ChatGPT, electron/backend.cjs) unter Windows, sonst oder mit --mock die Testdaten.
// Eine einzige Instanz: sie startet auch den SafeMode-Monitor (alle 30 s, nur solange die App offen ist).
const useMock = process.argv.includes('--mock') || process.platform !== 'win32';
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

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 680,
    minWidth: 900,
    minHeight: 580,
    frame: false,
    backgroundColor: '#000000',
    title: 'UND.CC Tweaker',
    // Fenster-/Taskleisten-Icon zur Laufzeit; das Exe-Icon selbst lässt sich ohne Windows-Build nicht setzen.
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.loadFile(INDEX);
  usage.start((u) => sendToUi('tweaker:usage', u));
  win.webContents.once('did-finish-load', () => updater.start((st) => sendToUi('tweaker:update', st)));
}

// Nur Anfragen aus unserer eigenen, lokal geladenen Oberfläche annehmen.
const trusted = (e) => e.senderFrame && e.senderFrame.url.split('#')[0] === INDEX_URL;

ipcMain.handle('tweaker:call', async (e, request) => {
  if (!trusted(e)) return { ok: false, error: 'untrusted_sender' };
  if (!request || typeof request !== 'object') return { ok: false, error: 'invalid_action' };
  // Nur die bekannten Felder weiterreichen; Pfade und Skripte kann die Oberfläche nicht setzen.
  const { action, id, lang, backupId, confirmPurge } = request;
  if (LANGS.has(lang)) currentLang = lang;
  try {
    return await backend({ action, id, lang, backupId, confirmPurge: confirmPurge === true });
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// SafeMode-Bericht oder Wiederherstellungs-Nachweis als JSON speichern; den Ort wählt der Nutzer im Windows-Dialog.
ipcMain.handle('tweaker:export', async (e, what, backupId) => {
  if (!trusted(e)) return { ok: false, error: 'untrusted_sender' };
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

ipcMain.handle('tweaker:version', (e) => (trusted(e) ? app.getVersion() : null));
ipcMain.handle('tweaker:update-state', (e) => (trusted(e) ? updater.getState() : null));
ipcMain.on('tweaker:update-check', (e) => trusted(e) && updater.check());
ipcMain.on('tweaker:update-install', (e) => trusted(e) && updater.install());
ipcMain.handle('tweaker:mode', (e) => (trusted(e) ? (useMock ? 'mock' : 'powershell') : null));
ipcMain.handle('tweaker:safemode-last', (e) => (trusted(e) ? lastSafeMode : null));
ipcMain.on('window:minimize', (e) => trusted(e) && win?.minimize());
ipcMain.on('window:close', (e) => trusted(e) && win?.close());

if (!relaunched) app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  usage.stop();
  app.quit();
});
