// Startet die installierte App unter Windows mit Adminrechten neu (UAC-Abfrage), falls sie ohne gestartet wurde.
// Nötig, weil der Installer pro Benutzer installiert (Updates ohne UAC) und die Exe kein Admin-Manifest hat.
// Gleicher Windows-Benutzer, damit Tastatur-Einstellungen und FiveM-Pfade des richtigen Kontos betroffen sind.
const { execFileSync, spawnSync } = require('child_process');
const path = require('path');

function isAdmin() {
  try {
    execFileSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'net.exe'), ['session'], { stdio: 'ignore', windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

// true = erhöhte Instanz wurde gestartet, diese hier soll sich beenden.
// false = weiter ohne Adminrechte (z. B. UAC abgelehnt); das UI zeigt dann „Keine Adminrechte“.
function relaunchElevated() {
  if (process.platform !== 'win32' || process.argv.includes('--elevated') || isAdmin()) return false;
  const ps = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  // Exe-Pfad per Umgebungsvariable statt im Befehl, damit nichts escaped werden muss.
  const res = spawnSync(ps, ['-NoProfile', '-NonInteractive', '-Command',
    "try { Start-Process -FilePath $env:TWEAKER_EXE -ArgumentList '--elevated' -Verb RunAs; exit 0 } catch { exit 1 }"],
  { env: { ...process.env, TWEAKER_EXE: process.execPath }, windowsHide: true });
  return res.status === 0;
}

module.exports = { relaunchElevated };
