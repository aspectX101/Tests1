'use strict';
// Übernimmt packaging/electron-builder.cjs (Backend-Ressourcen inkl. electron/*.cjs, portable Exe, Adminrechte)
// und ergänzt nur, welche App-Dateien ins ASAR kommen. Der Backend-Helper wird aus resources/backend geladen.
const base = require('./packaging/electron-builder.cjs');

module.exports = {
  ...base,
  directories: { output: 'dist' },
  files: ['package.json', 'app/**/*'],
  win: {
    ...base.win,
    // Ohne Wine (Build auf macOS/Linux) kann electron-builder die Exe-Ressourcen nicht bearbeiten.
    // Die Adminabfrage kommt dann vom portablen Starter (portable.requestExecutionLevel).
    signAndEditExecutable: process.platform === 'win32',
  },
  portable: { requestExecutionLevel: 'admin' },
};
