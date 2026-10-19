const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tweaker', {
  // request: { action, id?, lang, backupId?, confirmPurge? }
  call: (request) => ipcRenderer.invoke('tweaker:call', request),
  mode: () => ipcRenderer.invoke('tweaker:mode'),
  // what: 'safemode' | 'backup' (mit backupId) – speichert per Dialog als JSON
  exportJson: (what, backupId) => ipcRenderer.invoke('tweaker:export', what, backupId),
  // kind: 'file' | 'folder' – öffnet den Windows-Dialog im Hauptprozess
  importMod: (category, kind) => ipcRenderer.invoke('tweaker:mod-import', category, kind),
  openModsFolder: () => ipcRenderer.invoke('tweaker:open-mods-folder'),
  lastSafeMode: () => ipcRenderer.invoke('tweaker:safemode-last'),
  onSafeMode: (cb) => ipcRenderer.on('tweaker:safemode', (_e, msg) => cb(msg)),
  minimize: () => ipcRenderer.send('window:minimize'),
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
});
