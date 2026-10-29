'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { createSupport, createRedactor } = require('../app/support');

const redact = createRedactor({ home: 'C:\\Users\\Kevin Meier', user: 'Kevin Meier' });
function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'h1t-support-'));
  const s = createSupport({ logDir: dir, version: '1.0.18', now: () => new Date('2026-10-29T10:00:00Z'), redact });
  return { s, dir, done: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test('failed requests are logged with code, detail and location; successes are not', () => {
  const t = setup();
  try {
    t.s.record({ action: 'apply', id: 'windows.cpu.unpark' }, { ok: false, error: 'power_setting_access_denied', detail: 'Windows power API error 5 (0x5); powercfg exit 1', at: 'OptimizationNative.ps1:233' });
    t.s.record({ action: 'apply', id: 'gaming.gpu.hags' }, { ok: true, applied: true });
    t.s.record({ action: 'list' }, null, new Error('backend_timeout_or_terminated'));
    const e = t.s.entries();
    assert.equal(e.length, 2);
    assert.deepEqual(e[0], { t: '2026-10-29T10:00:00.000Z', v: '1.0.18', action: 'apply', id: 'windows.cpu.unpark', error: 'power_setting_access_denied',
      detail: 'Windows power API error 5 (0x5); powercfg exit 1', at: 'OptimizationNative.ps1:233' });
    assert.equal(e[1].error, 'backend_timeout_or_terminated');
  } finally { t.done(); }
});

test('failed items of a batch (e.g. Restore all) are logged one by one', () => {
  const t = setup();
  try {
    t.s.record({ action: 'backup-restore-all' }, { ok: true, results: [{ backupId: 'a'.repeat(32), status: 'restored' }, { backupId: 'b'.repeat(32), status: 'failed', reason: 'conflict' }] });
    const e = t.s.entries();
    assert.equal(e.length, 1);
    assert.equal(e[0].item, 'b'.repeat(32));
    assert.equal(e[0].error, 'conflict');
  } finally { t.done(); }
});

test('user names and profile paths never reach the log or the report', () => {
  const t = setup();
  try {
    t.s.record({ action: 'mods-import' }, { ok: false, error: 'mod_source_not_found', detail: 'C:\\Users\\Kevin Meier\\Downloads\\nve.zip (kevin meier)' });
    fs.writeFileSync(path.join(t.dir, 'updater.log'), '2026 [info] start v1.0.17 exe=C:\\Users\\Kevin Meier\\Desktop\\H1T.CC-Tweaker.exe\n');
    const raw = fs.readFileSync(t.s.file, 'utf8');
    assert.doesNotMatch(raw, /Kevin/i);
    assert.equal(t.s.entries()[0].detail, '%USERPROFILE%\\Downloads\\nve.zip (%USERNAME%)');
    const r = t.s.report({ mode: 'powershell', license: { licensed: true }, update: { status: 'latest' }, backups: [] });
    assert.doesNotMatch(JSON.stringify(r), /Kevin/i);
    assert.match(r.updaterLog[0], /%USERPROFILE%\\Desktop/);
  } finally { t.done(); }
});

test('report carries system, license, update, backups and the recent backend log', () => {
  const t = setup();
  try {
    t.s.record({ action: 'apply', id: 'x' }, { ok: false, error: 'external_change_detected' });
    const r = t.s.report({ mode: 'powershell', license: { licensed: true, lifetime: true }, update: { status: 'latest', current: '1.0.18' }, backups: [{ kind: 'tweak', id: 'x', status: 'applied' }] });
    assert.equal(r.kind, 'h1t-support-report');
    assert.equal(r.app.version, '1.0.18');
    assert.ok(r.system.release && r.system.cores > 0 && r.system.ramGB >= 0);
    assert.equal(r.license.lifetime, true);
    assert.equal(r.backups.length, 1);
    assert.equal(r.backendLog.at(-1).error, 'external_change_detected');
    assert.deepEqual(r.swapLog, []);
  } finally { t.done(); }
});

test('the log rotates instead of growing without limit', () => {
  const t = setup();
  try {
    fs.writeFileSync(t.s.file, 'x'.repeat(600 * 1024));
    t.s.record({ action: 'apply', id: 'y' }, { ok: false, error: 'z' });
    assert.ok(fs.existsSync(t.s.file + '.old'));
    assert.equal(t.s.entries().length, 1);
  } finally { t.done(); }
});

test('app events: long texts are cut, the same event is written once per 10 minutes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'h1t-support-'));
  let t = Date.parse('2026-10-29T10:00:00Z');
  const s = createSupport({ logDir: dir, version: '1.0.20', now: () => new Date(t), redact });
  try {
    s.event({ kind: 'ui-error', message: 'x is not a function', source: 'app.js', line: 12, stack: 'S'.repeat(5000) });
    s.event({ kind: 'ui-error', message: 'x is not a function', source: 'app.js', line: 12 });
    t += 11 * 60000;
    s.event({ kind: 'ui-error', message: 'x is not a function' });
    s.event({ kind: 'renderer-gone', reason: 'crashed', exitCode: -1073741819 });
    const e = s.entries();
    assert.equal(e.length, 3);
    assert.equal(e[0].stack.length, 1200);
    assert.equal(e[0].line, 12);
    assert.equal(e[2].exitCode, -1073741819);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('every window channel logs failed answers and exceptions; routine refusals and the backend channel are skipped', async () => {
  const { wrapIpc } = require('../app/support');
  const events = [], handlers = {};
  const ipcMain = { handle: (ch, fn) => { handlers[ch] = fn; } };
  wrapIpc(ipcMain, { event: (x) => events.push(x) });
  ipcMain.handle('tweaker:h1t-login', async () => ({ ok: false, error: 'invalid_credentials' }));
  ipcMain.handle('tweaker:spotify', async () => ({ ok: false, error: 'license_required' }));
  ipcMain.handle('tweaker:call', async () => ({ ok: false, error: 'admin_required' }));
  ipcMain.handle('tweaker:color', async () => { throw new Error('display_api_failed'); });
  ipcMain.handle('tweaker:mode', async () => 'powershell');
  assert.equal((await handlers['tweaker:h1t-login']()).error, 'invalid_credentials');
  await handlers['tweaker:spotify']();
  await handlers['tweaker:call']();
  await assert.rejects(handlers['tweaker:color'](), /display_api_failed/);
  assert.equal(await handlers['tweaker:mode'](), 'powershell');
  assert.deepEqual(events.map((x) => `${x.channel}:${x.error}`), ['tweaker:h1t-login:invalid_credentials', 'tweaker:color:display_api_failed']);
});

test('the window error reporter loads before every other script', () => {
  const html = fs.readFileSync(path.join(__dirname, '../app/renderer/index.html'), 'utf8');
  const first = html.match(/<script src="([^"]+)"/)[1];
  assert.equal(first, 'error-report.js');
});
