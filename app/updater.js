// Automatische Updates über GitHub-Releases (aspectX101/Tests1, siehe publish in electron-builder.config.cjs).
// Sucht beim Start und alle 2 Stunden, lädt im Hintergrund und installiert beim Beenden oder auf Knopfdruck.
const { app } = require('electron');

const CHECK_EVERY = 2 * 60 * 60 * 1000;
let state = { status: 'unsupported', current: app.getVersion() };
let updater = null;
let notify = () => {};

function set(patch) {
  state = { ...state, ...patch };
  notify(state);
}

function start(onChange) {
  notify = onChange;
  // Nur in der installierten Windows-App; im Entwicklungsmodus und auf macOS gibt es nichts zu aktualisieren.
  if (!app.isPackaged || process.platform !== 'win32') return;
  ({ autoUpdater: updater } = require('electron-updater'));
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.on('checking-for-update', () => set({ status: 'checking', error: null }));
  updater.on('update-not-available', () => set({ status: 'latest', checkedAt: new Date().toISOString() }));
  updater.on('update-available', (info) => set({ status: 'downloading', version: info.version, percent: 0 }));
  updater.on('download-progress', (p) => set({ status: 'downloading', percent: Math.round(p.percent) }));
  updater.on('update-downloaded', (info) => set({ status: 'ready', version: info.version }));
  updater.on('error', (err) => set({ status: 'error', error: String(err?.message || err).split('\n')[0] }));
  set({ status: 'idle' });
  check();
  setInterval(check, CHECK_EVERY).unref();
}

function check() {
  if (!updater || state.status === 'downloading' || state.status === 'ready') return;
  updater.checkForUpdates().catch(() => { /* kommt über das error-Event */ });
}

function install() {
  if (updater && state.status === 'ready') updater.quitAndInstall(true, true);
}

module.exports = { start, check, install, getState: () => state };
