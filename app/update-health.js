'use strict';
// Update health: a freshly installed version that twice ends before its window is usable (crash, hang killed by
// the user, broken renderer) is rolled back to the exe it replaced. The updater keeps that exe when it installs an
// update (previous.json says which version it is and which update it belongs to). A rolled-back version is marked
// bad and never offered again; the next newer release is. Closing the app normally never counts as a failure,
// and a second copy started while the first is still running is not a failure either.
const fs = require('node:fs');
const path = require('node:path');

const FAILURES_FOR_ROLLBACK = 2;

const alive = (pid) => {
  if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) return false;
  try { process.kill(pid, 0); return true; } catch (err) { return err.code === 'EPERM'; }
};

function createUpdateHealth({ dir, version, pid = process.pid, isAlive = alive } = {}) {
  const file = path.join(dir, 'update-health.json');
  const prevFile = path.join(dir, 'previous.json');
  const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
  const write = (f, v) => { try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(f, JSON.stringify(v)); } catch { /* best effort */ } };

  let h = read(file);
  const bad = () => (Array.isArray(h?.bad) ? h.bad.filter((v) => typeof v === 'string').slice(-20) : []);
  const save = () => write(file, h);

  // Called once per start of the real (elevated) app. Returns { rollback: previous } when this version must go.
  function begin() {
    if (!h || h.version !== version) h = { version, failures: 0, healthy: false, running: false, pid: 0, bad: bad() };
    if (h.healthy) { h.running = true; h.pid = pid; save(); return null; }
    if (h.running && !isAlive(h.pid)) h.failures = (Number(h.failures) || 0) + 1;
    if (h.failures >= FAILURES_FOR_ROLLBACK) {
      const prev = read(prevFile);
      let usable = false;
      try { usable = !!prev && prev.forVersion === version && typeof prev.file === 'string' && fs.statSync(prev.file).size > 0; } catch { usable = false; }
      if (usable) {
        h = { ...h, running: false, bad: [...new Set([...bad(), version])] };
        save();
        return { rollback: { version: String(prev.version || ''), file: prev.file } };
      }
    }
    h.running = true; h.pid = pid; save();
    return null;
  }
  // The window rendered and the app is usable: this version stays.
  function healthy() { if (h && h.version === version && !h.healthy) { h.healthy = true; h.failures = 0; h.running = false; save(); } }
  // Normal quit: not a failure.
  function closed() { if (h && h.version === version && h.running) { h.running = false; save(); } }
  const isBad = (v) => bad().includes(String(v));
  // Before an update is installed: which exe is kept as the way back, and for which new version.
  function rememberPrevious({ version: from, file: exe, forVersion }) { write(prevFile, { version: from, file: exe, forVersion }); }
  const previousFile = () => path.join(dir, 'previous', 'H1T.CC-Tweaker-previous.exe');

  return { begin, healthy, closed, isBad, rememberPrevious, previousFile, state: () => ({ ...h }) };
}

module.exports = { createUpdateHealth, FAILURES_FOR_ROLLBACK };
