const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tweaker', {
  // request: { action, id?, lang, backupId?, confirmPurge? }
  call: (request) => ipcRenderer.invoke('tweaker:call', request),
  mode: () => ipcRenderer.invoke('tweaker:mode'),
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close'),
  onUsage: (cb) => ipcRenderer.on('tweaker:usage', (_e, u) => cb(u)),
});
