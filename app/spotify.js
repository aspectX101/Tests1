'use strict';
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');
const ACTIONS = new Set(['playpause', 'next', 'previous']);
const empty = (status = 'empty') => ({ status });
function clean(value) {
  if (value?.status !== 'ready') return empty(value?.status === 'unavailable' ? 'unavailable' : 'empty');
  const number = (v) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(v, 604800)) : 0;
  const duration = number(value.duration);
  return { status: 'ready', title: String(value.title || '').slice(0, 512), artist: String(value.artist || '').slice(0, 512),
    playing: value.playing === true, duration, position: Math.min(number(value.position), duration || 604800),
    art: typeof value.art === 'string' && value.art.length <= 1400000 && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(value.art) ? value.art : null,
    controls: Object.fromEntries([...ACTIONS].map(k => [k, value.controls?.[k] === true])) };
}
function createSpotify(app, options = {}) {
  const platform = options.platform || process.platform;
  const spawnProcess = options.spawn || spawn, execute = options.execFile || execFile;
  const ps = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const script = app.isPackaged ? path.join(process.resourcesPath, 'media', 'spotify-session.ps1') : path.join(__dirname, 'spotify-session.ps1');
  const args = action => ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-Action', action];
  let worker = null, watchdog = null, wanted = false, state = empty(), listener = () => {}, busy = false;
  const emit = value => { state = clean(value); listener(state); };
  function stopWorker() { clearInterval(watchdog); watchdog = null; const old = worker; worker = null; old?.kill(); }
  function setActive(active) {
    wanted = active === true;
    if (!wanted) { stopWorker(); return; }
    if (platform !== 'win32') { emit(empty('unavailable')); return; }
    if (worker) return;
    let child;
    try { child = spawnProcess(ps, [...args('status'), '-Watch'], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'], shell: false }); }
    catch { emit(empty('unavailable')); return; }
    worker = child;
    let buffer = '', last = Date.now();
    const fail = () => { if (worker !== child) return; stopWorker(); emit(empty('unavailable')); };
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      if (worker !== child) return;
      buffer += chunk;
      if (buffer.length > 1800000) { fail(); return; }
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end).trim(); buffer = buffer.slice(end + 1);
        if (!line) continue;
        try { emit(JSON.parse(line)); last = Date.now(); } catch { fail(); return; }
      }
    });
    child.on('error', fail); child.on('exit', fail);
    watchdog = setInterval(() => { if (Date.now() - last > 15000) fail(); }, 5000);
    watchdog.unref?.();
  }
  async function command(action) {
    if (!ACTIONS.has(action) || platform !== 'win32' || busy || !wanted || state.status !== 'ready' || !state.controls[action]) return { ok: false };
    busy = true;
    try { return await new Promise(resolve => {
      execute(ps, args(action), { windowsHide: true, shell: false, timeout: 12000, maxBuffer: 4096, encoding: 'utf8' }, (err, stdout) => {
        try { resolve({ ok: !err && JSON.parse(stdout).ok === true }); } catch { resolve({ ok: false }); }
      });
    }); } finally { busy = false; }
  }
  return { setActive, command, getState: () => state, onChange(cb) { listener = cb; }, stop() { wanted = false; stopWorker(); } };
}
module.exports = { createSpotify, clean };
