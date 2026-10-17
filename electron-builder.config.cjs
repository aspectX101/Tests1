'use strict';
// Übernimmt packaging/electron-builder.cjs (Backend-Ressourcen inkl. electron/*.cjs) und ergänzt:
// - welche App-Dateien ins ASAR kommen (der Backend-Helper wird aus resources/backend geladen)
// - eine einzelne portable Exe ohne Installer (ab 0.6.0). Der Installer (0.4.0–0.5.3) scheiterte auf
//   Test-PCs immer wieder am Entfernen alter Versionen. Updates macht app/updater.js selbst.
const base = require('./packaging/electron-builder.cjs');

module.exports = {
  ...base,
  productName: 'UND.CC Tweaker',
  directories: { output: 'dist' },
  files: ['package.json', 'app/**/*'],
  win: {
    ...base.win,
    target: [{ target: 'portable', arch: ['x64'] }],
    icon: 'build/icon.ico',
    // Ohne Wine (Build auf macOS/Linux) kann electron-builder die Exe-Ressourcen nicht bearbeiten.
    signAndEditExecutable: process.platform === 'win32',
  },
  portable: {
    // Fester Name: der Updater sucht im GitHub-Release genau nach diesem Muster.
    artifactName: 'UNDCC-Tweaker-${version}.exe',
    // Der Starter fordert Adminrechte an; die App darin läuft dann erhöht.
    requestExecutionLevel: 'admin',
  },
  // Icon + Versionsinfos der inneren App-Exe setzen (geht ohne Windows/Wine, siehe build/after-pack.cjs)
  afterPack: './build/after-pack.cjs',
  // Keine latest.yml/app-update.yml mehr – app/updater.js fragt die GitHub-API direkt.
  publish: null,
};
