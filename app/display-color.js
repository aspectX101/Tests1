'use strict';
// Extra > Color: live screen color via app/display-color.ps1 (Windows full-screen color matrix).
// The helper only runs while a look is active; when it ends, Windows drops the effect.
// Saved look: <userData>/color-look.json, re-applied on the next start.
const path = require('node:path');
const fsp = require('node:fs/promises');
const { spawn } = require('node:child_process');
const KEYS = ['brightness', 'contrast', 'vibrance', 'hue'];
const NEUTRAL = Object.freeze({ brightness: 0, contrast: 0, vibrance: 0, hue: 0 });

function cleanLook(value) {
  if (!value || typeof value !== 'object') return null;
  const look = {};
  for (const key of KEYS) {
    const v = value[key];
    if (!Number.isInteger(v) || v < 0 || v > 100) return null;
    look[key] = v;
  }
  return look;
}
const isNeutral = (look) => KEYS.every((k) => look[k] === 0);

function createDisplayColor(app, options = {}) {
  const platform = options.platform || process.platform;
  const spawnProcess = options.spawn || spawn;
  const fs = options.fs || fsp;
  const ps = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const script = app.isPackaged ? path.join(process.resourcesPath, 'media', 'display-color.ps1') : path.join(__dirname, 'display-color.ps1');
  const file = () => path.join(app.getPath('userData'), 'color-look.json');
  let worker = null, current = { ...NEUTRAL }, saved = null, status = platform === 'win32' ? 'ready' : 'unsupported', listener = () => {};
  const state = () => ({ status, look: { ...current }, saved: saved ? { ...saved } : null });
  const emit = () => listener(state());

  function stopWorker() { const old = worker; worker = null; if (old) { try { old.stdin.end(); } catch {} old.kill(); } }
  function startWorker() {
    let child;
    try { child = spawnProcess(ps, ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'], shell: false }); }
    catch { status = 'unavailable'; emit(); return null; }
    worker = child;
    let buffer = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      if (worker !== child) return;
      buffer = (buffer + chunk).slice(-4096);
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end).trim(); buffer = buffer.slice(end + 1);
        let msg; try { msg = JSON.parse(line); } catch { continue; }
        const next = msg.ok ? 'ready' : 'unavailable';
        if (next !== status) { status = next; emit(); }
      }
    });
    const gone = () => { if (worker !== child) return; worker = null; if (!isNeutral(current)) { status = 'unavailable'; emit(); } };
    child.on('error', gone); child.on('exit', gone);
    return child;
  }
  function apply(look) {
    if (platform !== 'win32') return;
    if (isNeutral(look)) { stopWorker(); return; } // nothing to show: the helper ends and Windows drops the effect
    const child = worker || startWorker();
    if (!child) return;
    try { child.stdin.write(KEYS.map((k) => look[k]).join(' ') + '\n'); } catch { status = 'unavailable'; emit(); }
  }

  return {
    getState: state,
    onChange(cb) { listener = cb; },
    // Live change while dragging; not persisted until save().
    set(value) {
      const look = cleanLook(value);
      if (!look) return { ok: false, error: 'invalid_color_value' };
      if (status === 'unsupported') return { ok: false, error: 'color_unavailable' };
      current = look; apply(look);
      return { ok: true };
    },
    async save(value) {
      const look = cleanLook(value);
      if (!look) return { ok: false, error: 'invalid_color_value' };
      if (status === 'unsupported') return { ok: false, error: 'color_unavailable' };
      current = look; apply(look);
      try {
        if (isNeutral(look)) await fs.rm(file(), { force: true });
        else await fs.writeFile(file(), JSON.stringify(look), 'utf8');
      } catch { return { ok: false, error: 'color_save_failed' }; }
      saved = isNeutral(look) ? null : look; emit();
      return { ok: true };
    },
    // Back to the normal picture and forget the saved look.
    async reset() {
      current = { ...NEUTRAL }; stopWorker();
      if (status === 'unavailable') status = 'ready';
      try { await fs.rm(file(), { force: true }); } catch { return { ok: false, error: 'color_save_failed' }; }
      saved = null; emit();
      return { ok: true };
    },
    // On startup: re-apply the saved look.
    async restore() {
      try { saved = cleanLook(JSON.parse(await fs.readFile(file(), 'utf8'))); } catch { saved = null; }
      if (saved && status !== 'unsupported') { current = { ...saved }; apply(current); }
      emit();
    },
    stop() { stopWorker(); },
  };
}
module.exports = { createDisplayColor, cleanLook };
