const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { pathToFileURL } = require('url');
const usage = require('./usage');

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
if (useMock) {
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
    title: 'Tweaker',
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

// SafeMode-Bericht als JSON speichern; den Speicherort wählt der Nutzer im Windows-Dialog.
ipcMain.handle('tweaker:export-report', async (e) => {
  if (!trusted(e)) return { ok: false, error: 'untrusted_sender' };
  let report;
  try {
    report = await backend({ action: 'safemode-report', lang: currentLang });
  } catch (err) {
    return { ok: false, error: err.message };
  }
  if (!report?.ok) return report;
  const stamp = new Date().toISOString().slice(0, 10);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: `tweaker-safemode-${stamp}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { ok: true, canceled: true };
  await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf8');
  return { ok: true, path: filePath };
});

ipcMain.handle('tweaker:mode', (e) => (trusted(e) ? (useMock ? 'mock' : 'powershell') : null));
ipcMain.handle('tweaker:safemode-last', (e) => (trusted(e) ? lastSafeMode : null));
ipcMain.on('window:minimize', (e) => trusted(e) && win?.minimize());
ipcMain.on('window:close', (e) => trusted(e) && win?.close());

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  usage.stop();
  app.quit();
});
