const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tweaker', {
  // H1T.CC Cloudflare account: protected main-process auth/token operations.
  h1tAccountStatus: () => ipcRenderer.invoke('tweaker:h1t-status'),
  h1tAccountLogin: (email, password) => ipcRenderer.invoke('tweaker:h1t-login', email, password),
  h1tAccountBind: (licenseId, consent) => ipcRenderer.invoke('tweaker:h1t-bind', licenseId, consent === true),
  h1tAccountLogout: () => ipcRenderer.invoke('tweaker:h1t-logout'),
  h1tOpenAccountPortal: () => ipcRenderer.invoke('tweaker:h1t-portal'),
  h1tOpenAccountLink: (kind) => ipcRenderer.invoke('tweaker:h1t-open', String(kind)),
  h1tDiagnosticsAccept: () => ipcRenderer.invoke('tweaker:h1t-diag-accept'),
  h1tDiagnosticsWithdraw: () => ipcRenderer.invoke('tweaker:h1t-diag-withdraw'),
  h1tDiagnosticsPreview: () => ipcRenderer.invoke('tweaker:h1t-diag-preview'),
  h1tDiagnosticsSend: () => ipcRenderer.invoke('tweaker:h1t-diag-send'),
  h1tDiagnosticsDiscard: () => ipcRenderer.invoke('tweaker:h1t-diag-discard'),
  h1tDiagnosticsDelete: () => ipcRenderer.invoke('tweaker:h1t-diag-delete'),
  // request: { action, id?, lang, backupId?, confirmPurge? }
  call: (request) => ipcRenderer.invoke('tweaker:call', request),
  mode: () => ipcRenderer.invoke('tweaker:mode'),
  // what: 'safemode' | 'backup' (mit backupId) – speichert per Dialog als JSON
  exportJson: (what, backupId) => ipcRenderer.invoke('tweaker:export', what, backupId),
  // kind: 'file' | 'folder' – öffnet den Windows-Dialog im Hauptprozess
  importMod: (category, kind) => ipcRenderer.invoke('tweaker:mod-import', category, kind),
  openDebloatTarget: (id) => ipcRenderer.invoke('tweaker:debloat-target', id),
  openModsFolder: () => ipcRenderer.invoke('tweaker:open-mods-folder'),
  lastSafeMode: () => ipcRenderer.invoke('tweaker:safemode-last'),
  onSafeMode: (cb) => ipcRenderer.on('tweaker:safemode', (_e, msg) => cb(msg)),
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  onUsage: (cb) => ipcRenderer.on('tweaker:usage', (_e, u) => cb(u)),
  // Updates (GitHub-Releases)
  version: () => ipcRenderer.invoke('tweaker:version'),
  updateState: () => ipcRenderer.invoke('tweaker:update-state'),
  onUpdate: (cb) => ipcRenderer.on('tweaker:update', (_e, st) => cb(st)),
  checkUpdate: () => ipcRenderer.send('tweaker:update-check'),
  installUpdate: () => ipcRenderer.send('tweaker:update-install'),
  openUpdateLog: () => ipcRenderer.send('tweaker:update-log'),
  openReleasePage: () => ipcRenderer.send('tweaker:update-page'),
  // Portable Exe: Speicherort, im Explorer zeigen, Verknüpfung ('desktop' | 'startmenu')
  appLocation: () => ipcRenderer.invoke('tweaker:app-location'),
  showExe: () => ipcRenderer.invoke('tweaker:show-exe'),
  createShortcut: (where) => ipcRenderer.invoke('tweaker:create-shortcut', where),
  spotifyActive: (active) => ipcRenderer.send('tweaker:spotify-active', active === true),
  spotifyState: () => ipcRenderer.invoke('tweaker:spotify-state'),
  spotifyCommand: (action) => ipcRenderer.invoke('tweaker:spotify-command', action),
  openSpotify: () => ipcRenderer.invoke('tweaker:spotify-open'),
  onSpotify: (cb) => ipcRenderer.on('tweaker:spotify', (_e, value) => cb(value)),
  restartPc: () => ipcRenderer.invoke('tweaker:restart-pc'),
  // Extra > Color: { brightness, contrast, vibrance, hue } je 0-100
  colorState: () => ipcRenderer.invoke('tweaker:color-state'),
  colorSet: (look) => ipcRenderer.invoke('tweaker:color-set', look),
  colorSave: (look) => ipcRenderer.invoke('tweaker:color-save', look),
  colorReset: () => ipcRenderer.invoke('tweaker:color-reset'),
  onColor: (cb) => ipcRenderer.on('tweaker:color', (_e, value) => cb(value)),
  // FiveM > Hitreg: Live-Test zum Server (IP:Port oder cfx.re-Link)
  hitregTest: (target) => ipcRenderer.invoke('tweaker:hitreg-test', target),
  onHitregProgress: (cb) => ipcRenderer.on('tweaker:hitreg-progress', (_e, p) => cb(p)),
  // FiveM > H1T Mods
  h1tModsList: () => ipcRenderer.invoke('tweaker:h1tmods-list'),
  h1tModsInstall: (id) => ipcRenderer.invoke('tweaker:h1tmods-install', id),
  onH1tModsProgress: (cb) => ipcRenderer.on('tweaker:h1tmods-progress', (_e, p) => cb(p)),
});


