'use strict';
// Übernimmt packaging/electron-builder.cjs (Backend-Ressourcen inkl. electron/*.cjs) und ergänzt:
// - welche App-Dateien ins ASAR kommen (der Backend-Helper wird aus resources/backend geladen)
// - einen NSIS-Installer statt der portablen Exe, weil nur der automatische Updates unterstützt
// - GitHub-Releases als Update-Quelle (erzeugt latest.yml und resources/app-update.yml)
const base = require('./packaging/electron-builder.cjs');

module.exports = {
  ...base,
  productName: 'UND.CC Tweaker',
  directories: { output: 'dist' },
  files: ['package.json', 'app/**/*'],
  win: {
    ...base.win,
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'build/icon.ico',
    // Ohne Wine (Build auf macOS/Linux) kann electron-builder die Exe-Ressourcen nicht bearbeiten.
    // Adminrechte holt sich die App dann beim Start selbst (app/elevate.js).
    signAndEditExecutable: process.platform === 'win32',
  },
  nsis: {
    artifactName: 'UNDCC-Tweaker-Setup-${version}.exe',
    oneClick: true,
    // Für alle Benutzer (Program Files) – der Installer läuft dadurch mit Adminrechten. Nötig, weil die App selbst
    // mit Adminrechten läuft: Ein Installer ohne Adminrechte (bis 0.5.1) konnte sie nicht beenden, und auch das
    // Deinstallationsprogramm der alten Version scheiterte daran. Eine alte Installation pro Benutzer wird dabei
    // automatisch mit entfernt. In-App-Updates laufen ohne zusätzliche Abfrage, weil die App schon erhöht ist.
    perMachine: true,
    runAfterFinish: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'UND.CC Tweaker',
    installerIcon: 'build/icon.ico',
    uninstallerIcon: 'build/icon.ico',
    installerHeaderIcon: 'build/icon.ico',
    include: 'build/installer.nsh', // beendet eine laufende (erhöhte) Instanz vor Installation/Update
  },
  publish: [{ provider: 'github', owner: 'aspectX101', repo: 'Tests1', releaseType: 'release' }],
};
