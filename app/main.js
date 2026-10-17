const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const usage = require('./usage');

const INDEX = path.join(__dirname, 'renderer', 'index.html');
const INDEX_URL = pathToFileURL(INDEX).href;

// Echtes Backend (ChatGPT, electron/backend.cjs) unter Windows, sonst oder mit --mock die Testdaten.
const useMock = process.argv.includes('--mock') || process.platform !== 'win32';
const backend = useMock ? null : require('../electron/backend.cjs').createBackendClient(app);
const mock = useMock ? require('./mock') : null;

let win;

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
  usage.start((u) => win && !win.isDestroyed() && win.webContents.send('tweaker:usage', u));
}

// Nur Anfragen aus unserer eigenen, lokal geladenen Oberfläche annehmen.
const trusted = (e) => e.senderFrame && e.senderFrame.url.split('#')[0] === INDEX_URL;

ipcMain.handle('tweaker:call', async (e, request) => {
  if (!trusted(e)) return { ok: false, error: 'untrusted_sender' };
  if (!request || typeof request !== 'object') return { ok: false, error: 'invalid_action' };
  // Nur die bekannten Felder weiterreichen; Pfade und Skripte kann die Oberfläche nicht setzen.
  const { action, id, lang, backupId, confirmPurge } = request;
  const req = { action, id, lang, backupId, confirmPurge: confirmPurge === true };
  try {
    return useMock ? await mock.call(req) : await backend(req);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('tweaker:mode', (e) => (trusted(e) ? (useMock ? 'mock' : 'powershell') : null));
ipcMain.on('window:minimize', (e) => trusted(e) && win?.minimize());
ipcMain.on('window:close', (e) => trusted(e) && win?.close());

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  usage.stop();
  app.quit();
});
