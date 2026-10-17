// Automatische Updates über GitHub-Releases (aspectX101/Tests1, siehe publish in electron-builder.config.cjs).
// Sucht beim Start, beim Öffnen der Einstellungen und alle 2 Stunden, lädt im Hintergrund und installiert
// beim Beenden oder auf Knopfdruck. Jeder Schritt landet in %APPDATA%\<App>\logs\updater.log.
const { app, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const CHECK_EVERY = 2 * 60 * 60 * 1000;
const RELEASES_URL = 'https://github.com/aspectX101/Tests1/releases/latest';
const LOG_MAX = 512 * 1024;

let state = { status: 'unsupported', current: app.getVersion() };
let updater = null;
let notify = () => {};
let logFile = null;

function log(level, msg) {
  if (!logFile) return;
  try {
    if (fs.existsSync(logFile) && fs.statSync(logFile).size > LOG_MAX) fs.renameSync(logFile, logFile + '.old');
    fs.appendFileSync(logFile, `${new Date().toISOString()} [${level}] ${String(msg).split('\n').slice(0, 6).join(' | ')}\n`);
  } catch { /* Protokoll ist nur Hilfe, nie ein Grund für einen Absturz */ }
}

function set(patch) {
  state = { ...state, ...patch };
  notify(state);
}

function start(onChange) {
  notify = onChange;
  // Nur in der installierten Windows-App; im Entwicklungsmodus und auf macOS gibt es nichts zu aktualisieren.
  if (!app.isPackaged || process.platform !== 'win32') return;
  logFile = path.join(app.getPath('logs'), 'updater.log');
  try { fs.mkdirSync(path.dirname(logFile), { recursive: true }); } catch { /* egal */ }
  log('info', `start v${app.getVersion()} elevated=${process.argv.includes('--elevated')}`);

  ({ autoUpdater: updater } = require('electron-updater'));
  updater.logger = { info: (m) => log('info', m), warn: (m) => log('warn', m), error: (m) => log('error', m), debug() {} };
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.on('checking-for-update', () => set({ status: 'checking', error: null }));
  updater.on('update-not-available', (info) => set({ status: 'latest', latest: info?.version, checkedAt: new Date().toISOString() }));
  updater.on('update-available', (info) => set({ status: 'downloading', version: info.version, percent: 0, checkedAt: new Date().toISOString() }));
  updater.on('download-progress', (p) => set({ status: 'downloading', percent: Math.round(p.percent) }));
  updater.on('update-downloaded', (info) => set({ status: 'ready', version: info.version }));
  updater.on('error', (err) => set({ status: 'error', error: String(err?.message || err).split('\n')[0], checkedAt: new Date().toISOString() }));
  set({ status: 'idle' });
  check();
  setInterval(check, CHECK_EVERY).unref();
}

function check() {
  if (!updater || state.status === 'checking' || state.status === 'downloading' || state.status === 'ready') return;
  log('info', 'check requested');
  updater.checkForUpdates().catch(() => { /* kommt über das error-Event */ });
}

function install() {
  if (updater && state.status === 'ready') {
    log('info', `quitAndInstall ${state.version}`);
    updater.quitAndInstall(true, true);
  }
}

const openLog = () => logFile && shell.openPath(logFile);
const openReleases = () => shell.openExternal(RELEASES_URL);

module.exports = { start, check, install, openLog, openReleases, getState: () => state };
