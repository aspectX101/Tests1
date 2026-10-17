'use strict';
// Übernimmt packaging/electron-builder.cjs (Backend-Ressourcen, portable Exe, Adminrechte)
// und ergänzt nur, welche App-Dateien ins ASAR kommen.
const base = require('./packaging/electron-builder.cjs');

module.exports = {
  ...base,
  directories: { output: 'dist' },
  files: ['package.json', 'app/**/*', 'electron/backend.cjs'],
  win: {
    ...base.win,
    // Ohne Wine (Build auf macOS/Linux) kann electron-builder die Exe-Ressourcen nicht bearbeiten.
    // Die Adminabfrage kommt dann vom portablen Starter (portable.requestExecutionLevel).
    signAndEditExecutable: process.platform === 'win32',
  },
  portable: { requestExecutionLevel: 'admin' },
};
