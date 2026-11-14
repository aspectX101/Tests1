'use strict';
// The portable exe's starter deletes its shared %TEMP% folder when the same exe starts a second time (license task,
// double-click). The app runs its scripts from a private copy so the open app keeps working.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { prepareRuntime, removeRuntime } = require('../app/runtime-copy.js');

function resources() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'h1t-res-'));
  fs.mkdirSync(path.join(dir, 'backend', 'electron'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'media'));
  fs.writeFileSync(path.join(dir, 'backend', 'tweaker.ps1'), 'x');
  fs.writeFileSync(path.join(dir, 'backend', 'electron', 'backend.cjs'), 'y');
  fs.writeFileSync(path.join(dir, 'media', 'display-color.ps1'), 'z');
  return dir;
}

test('copies backend and media; the copy survives when the original temp folder is deleted', () => {
  const res = resources(), base = fs.mkdtempSync(path.join(os.tmpdir(), 'h1t-run-'));
  const r = prepareRuntime({ resources: res, base, version: '1.0.36', pid: 4242 });
  assert.equal(r.root, path.join(base, '1.0.36-4242'));
  fs.rmSync(res, { recursive: true, force: true });
  for (const f of ['backend/tweaker.ps1', 'backend/electron/backend.cjs', 'media/display-color.ps1']) assert.ok(fs.existsSync(path.join(r.root, f)), f);
  removeRuntime(r.own);
  assert.ok(!fs.existsSync(r.root));
});

test('copies of ended processes are removed, copies of running ones stay', () => {
  const res = resources(), base = fs.mkdtempSync(path.join(os.tmpdir(), 'h1t-run-'));
  for (const n of ['1.0.35-100', '1.0.35-200', 'other']) fs.mkdirSync(path.join(base, n));
  prepareRuntime({ resources: res, base, version: '1.0.36', pid: 300, isAlive: (pid) => pid === 200 });
  assert.deepEqual(fs.readdirSync(base).sort(), ['1.0.35-200', '1.0.36-300', 'other']);
});

test('without the scripts the original folder is used, as before', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'h1t-run-'));
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'h1t-res-'));
  const r = prepareRuntime({ resources: empty, base, version: '1.0.36', pid: 5 });
  assert.equal(r.root, empty); assert.equal(r.own, null); assert.equal(r.error, 'runtime_copy_incomplete');
});

test('main process runs backend, Spotify and colour scripts from the copy and keeps one instance', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', 'app', 'main.js'), 'utf8');
  assert.match(main, /path\.join\(runtime\.root, 'backend', 'electron', 'backend\.cjs'\)/);
  assert.match(main, /resourcesPath: runtime\.root,/);
  assert.match(main, /createSpotify\(app, \{ resourcesPath: runtime\.root \}\)/);
  assert.match(main, /createDisplayColor\(app, \{ resourcesPath: runtime\.root \}\)/);
  assert.match(main, /requestSingleInstanceLock\(\)/);
  assert.match(main, /app\.on\('second-instance'/);
  for (const f of ['spotify.js', 'display-color.js']) assert.match(fs.readFileSync(path.join(__dirname, '..', 'app', f), 'utf8'), /options\.resourcesPath \|\| process\.resourcesPath/);
});
