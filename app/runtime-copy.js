'use strict';
// Private copy of the PowerShell scripts for the running app.
// The portable exe unpacks itself to %TEMP%\<build id>, the same folder for every start of the same version, and its
// starter deletes that folder before unpacking and after the app exits (RMDir /r). A second start of the same exe
// (the daily license check task, a double-click while the app is open) therefore deleted the scripts of the open
// app: "-File ...\resources\backend\tweaker.ps1 does not exist". Temp cleaners can do the same.
// At start the app copies resources\backend and resources\media to
// %LOCALAPPDATA%\H1T.CC Tweak Utility\runtime\<version>-<pid> and runs the scripts from there. Copies of
// processes that no longer run are removed. If copying fails, the original resources folder is used as before.
const fs = require('node:fs');
const path = require('node:path');

const PARTS = ['backend', 'media'];
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

function prepareRuntime({ resources, base, version, pid = process.pid, isAlive = alive, fsm = fs } = {}) {
  if (!resources || !base) return { root: resources, own: null };
  try {
    fsm.mkdirSync(base, { recursive: true });
    for (const name of fsm.readdirSync(base)) {
      const m = /^[\w.]+-(\d+)$/.exec(name);
      if (!m || (Number(m[1]) !== pid && isAlive(Number(m[1])))) continue;
      try { fsm.rmSync(path.join(base, name), { recursive: true, force: true }); } catch { /* still in use, next start */ }
    }
    const own = path.join(base, `${String(version).replace(/[^\w.]/g, '_')}-${pid}`);
    for (const part of PARTS) {
      const from = path.join(resources, part);
      if (fsm.existsSync(from)) fsm.cpSync(from, path.join(own, part), { recursive: true, force: true });
    }
    if (!fsm.existsSync(path.join(own, 'backend', 'tweaker.ps1'))) throw new Error('runtime_copy_incomplete');
    return { root: own, own };
  } catch (err) {
    return { root: resources, own: null, error: err?.message || String(err) };
  }
}

function removeRuntime(own, fsm = fs) {
  if (own) try { fsm.rmSync(own, { recursive: true, force: true }); } catch { /* removed at the next start */ }
}

module.exports = { prepareRuntime, removeRuntime };
