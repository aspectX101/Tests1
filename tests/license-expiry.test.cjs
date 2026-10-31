'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { createLicenseExpiry, licenseEnd, GRACE } = require('../app/license-expiry');
const { createLicenseTask } = require('../app/license-task');

const DAY = 24 * 3600000;
const T0 = Date.parse('2026-10-24T12:00:00Z');
const week = new Date(T0 + 7 * DAY).toISOString();
const lic = (expires_at) => ({ id: 'l1', plan: '7 Days', expires_at });
const snap = (status, licenses = [lic(week)], extra = {}) => ({ ok: true, signed_in: status !== 'signed_out', status, licenses, ...extra });

// Fake backend with recovery records like Backup.ps1 returns them.
function fakeBackend({ backups, failIds = [], resolution = false, mods = [], failMods = [], fivemFound = true } = {}) {
  const calls = [];
  const list = backups || [
    { backupId: 'a'.repeat(32), kind: 'tweak', tweakId: 'gaming.gpu.hags', canRestore: true },
    { backupId: 'b'.repeat(32), kind: 'tweak', tweakId: 'windows.gamemode.on', canRestore: true },
    { backupId: 'c'.repeat(32), kind: 'startup', tweakId: 'startup.discord', canRestore: true },
    { backupId: 'd'.repeat(32), kind: 'tweak', tweakId: 'old', canRestore: false, reason: 'already_restored' },
    { backupId: 'e'.repeat(32), kind: 'cache', tweakId: 'cache', canRestore: true },
    { backupId: 'f'.repeat(32), kind: 'services', tweakId: 'safemode', canRestore: false },
  ];
  const fn = async (req) => {
    calls.push(req);
    if (req.action === 'backup-list') return { ok: true, backups: list };
    if (req.action === 'backup-restore') {
      const b = list.find((x) => x.backupId === req.backupId);
      if (failIds.includes(b.tweakId)) return { ok: false, error: 'restore_incomplete', results: [{ status: 'failed', reason: 'conflict' }] };
      b.canRestore = false;
      return { ok: true, restartRequired: b.tweakId === 'gaming.gpu.hags', results: [{ status: 'restored' }] };
    }
    if (req.action === 'res-get') return { ok: true, hasBackup: resolution };
    if (req.action === 'res-reset') return { ok: true };
    if (req.action === 'mods-list') return { ok: true, fivemFound, mods: mods.map((m) => ({ ...m })) };
    if (req.action === 'mods-disable') {
      if (failMods.includes(req.modId)) return { ok: false, error: 'fivem_running' };
      mods.find((m) => m.id === req.modId).enabled = false;
      return { ok: true };
    }
    return { ok: false, error: 'invalid_action' };
  };
  return { fn, calls, restored: () => calls.filter((c) => c.action === 'backup-restore').map((c) => list.find((x) => x.backupId === c.backupId).tweakId) };
}
function setup(opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'h1t-expiry-test-'));
  const clock = { t: T0 };
  const be = fakeBackend(opts);
  const task = { synced: [], removed: 0, sync: async (st) => { task.synced.push(st.expires_at); }, remove: async () => { task.removed++; } };
  const events = [];
  let colorSaved = opts.color === true;
  const make = () => createLicenseExpiry({ getPath: () => dir }, { backend: be.fn, task, now: () => clock.t, onChange: (s) => events.push(s),
    resetColor: async () => { const had = colorSaved; colorSaved = false; return had ? true : null; } });
  return { guard: make(), make, be, clock, task, events, dir, done: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test('license end: lifetime wins, otherwise the latest expiry counts', () => {
  assert.equal(JSON.stringify(licenseEnd([lic(null), lic(week)])), JSON.stringify({ lifetime: true, expires_at: null }));
  assert.equal(licenseEnd([lic('2026-10-25T00:00:00Z'), lic(week)]).expires_at, Date.parse(week));
  assert.equal(licenseEnd([lic(1798000000)]).expires_at, 1798000000 * 1000);
});

test('an expired license restores every tweak and startup change, nothing else', async () => {
  const t = setup({ resolution: true, color: true });
  try {
    await t.guard.observe(snap('active'));
    assert.equal(t.guard.state().licensed, true);
    assert.equal(t.task.synced.pop(), Date.parse(week));
    t.clock.t = T0 + 8 * DAY;
    const r = await t.guard.observe(snap('license_required', []));
    assert.equal(JSON.stringify(t.be.restored()), JSON.stringify(['gaming.gpu.hags', 'windows.gamemode.on', 'startup.discord']));
    assert.ok(t.be.calls.some((c) => c.action === 'res-reset'));
    assert.equal(r.result.reason, 'license_expired');
    assert.equal(r.result.restored, 5);
    assert.equal(r.result.failed, 0);
    assert.equal(r.result.restart_required, true);
    assert.equal(t.guard.state().licensed, false);
    assert.equal(t.task.removed, 1);
    assert.equal(t.events.some((e) => e.running), true);
    // A second "no license" answer does not run again.
    await t.guard.observe(snap('license_required', []));
    assert.equal(t.be.calls.filter((c) => c.action === 'backup-list').length, 1);
  } finally { t.done(); }
});

test('a key revoked before its end date is reported as no longer active, not as expired', async () => {
  const t = setup();
  try {
    await t.guard.observe(snap('active'));
    t.clock.t = T0 + 2 * DAY;
    const pending = t.guard.observe(snap('license_required', []));
    assert.equal(t.guard.publicState().reason, 'license_inactive');
    const r = await pending;
    assert.equal(r.result.reason, 'license_inactive');
    assert.equal(r.result.restored, 3);
    assert.equal(t.guard.publicState().reason, null);
  } finally { t.done(); }
});

test('the app shows a reason-specific message in all three languages', () => {
  const ui = fs.readFileSync(path.join(__dirname, '../app/renderer/h1t-account-ui.js'), 'utf8');
  const why = ui.match(/revertWhy: \{[^}]*\}/g);
  assert.equal(why.length, 3);
  for (const w of why) for (const k of ['license_expired', 'license_inactive', 'license_unconfirmed']) assert.match(w, new RegExp(k + ': \''));
  assert.equal((ui.match(/revertUnconfirmed: '/g) || []).length, 3);
});

test('an account that never had a license here keeps existing tweaks (e.g. from the free versions)', async () => {
  const t = setup();
  try {
    await t.guard.observe(snap('license_required', []));
    await t.guard.observe(snap('signed_out', []));
    assert.equal(t.be.calls.length, 0);
  } finally { t.done(); }
});

test('offline or signed out: restore only after the stored end date', async () => {
  const t = setup();
  try {
    await t.guard.observe(snap('active'));
    await t.guard.observe(snap('connection_unavailable'));
    await t.guard.observe(snap('signed_out', []));
    assert.equal(t.be.calls.length, 0);
    t.clock.t = Date.parse(week) + 1000;
    const r = await t.guard.observe(snap('signed_out', []));
    assert.equal(r.result.restored, 3);
    // The state survives a restart of the app.
    const again = t.make();
    await again.load();
    assert.equal(again.state().licensed, false);
    assert.ok(again.state().reverted_at > 0);
  } finally { t.done(); }
});

test('a stored end date also triggers after a restart while signed out', async () => {
  const t = setup();
  try {
    await t.guard.observe(snap('active'));
    const later = t.make();
    await later.load();
    t.clock.t = Date.parse(week) + 1000;
    assert.equal((await later.observe(snap('signed_out', []))).result.restored, 3);
  } finally { t.done(); }
});

test('lifetime licenses never expire by date, but end after 30 days without any confirmation', async () => {
  const t = setup();
  try {
    await t.guard.observe(snap('active', [lic(null)]));
    assert.equal(t.task.synced.length, 1);
    t.clock.t = T0 + GRACE - 60000;
    await t.guard.observe(snap('connection_timeout', [lic(null)]));
    await t.guard.observe(snap('signed_out', []));
    assert.equal(t.be.calls.length, 0);
    t.clock.t = T0 + GRACE + 60000;
    const r = await t.guard.observe(snap('signed_out', []));
    assert.equal(r.result.reason, 'license_unconfirmed');
    assert.equal(r.result.restored, 3);
    assert.equal(t.guard.state().licensed, false);
  } finally { t.done(); }
});

test('every server confirmation restarts the 30 days, also when the license is not active on this device yet', async () => {
  const t = setup();
  try {
    await t.guard.observe(snap('active', [lic(null)]));
    t.clock.t = T0 + 20 * DAY;
    await t.guard.observe(snap('device_consent_required', [lic(null)]));
    t.clock.t = T0 + 45 * DAY;
    assert.equal(await t.guard.observe(snap('connection_timeout', [lic(null)])), null);
    assert.equal(t.be.calls.length, 0);
    t.clock.t = T0 + 20 * DAY + GRACE + 60000;
    assert.equal((await t.guard.checkLocal()).result.reason, 'license_unconfirmed');
  } finally { t.done(); }
});

test('a state from before the grace period starts the 30 days at the update, not in the past', async () => {
  const t = setup();
  try {
    fs.writeFileSync(path.join(t.dir, 'h1t-license-state.json'), JSON.stringify({ v: 1, licensed: true, lifetime: true, expires_at: null }));
    t.clock.t = T0 + 400 * DAY;
    const g = t.make();
    await g.load();
    assert.equal(g.state().confirmed_at, t.clock.t);
    assert.equal(await g.checkLocal(), null);
    t.clock.t += GRACE + 60000;
    assert.equal((await g.checkLocal()).result.reason, 'license_unconfirmed');
  } finally { t.done(); }
});

test('enabled FiveM mods are switched off on restore; a running FiveM is retried later', async () => {
  const mods = [{ id: 'a1b2c3d4e5f6', enabled: true }, { id: '0123456789ab', enabled: false }, { id: 'ffffffffffff', enabled: true }];
  const t = setup({ mods, failMods: ['ffffffffffff'] });
  try {
    await t.guard.observe(snap('active'));
    t.clock.t = T0 + 8 * DAY;
    const r = await t.guard.observe(snap('license_required', []));
    const disabled = t.be.calls.filter((c) => c.action === 'mods-disable').map((c) => c.modId);
    assert.equal(JSON.stringify(disabled), JSON.stringify(['a1b2c3d4e5f6', 'ffffffffffff']));
    assert.equal(mods[0].enabled, false);
    assert.equal(r.result.failed, 1);
    assert.equal(r.result.items.find((x) => !x.ok).error, 'fivem_running');
    assert.equal(t.guard.state().licensed, true);
  } finally { t.done(); }
});

test('without a FiveM folder the mod step is skipped', async () => {
  const t = setup({ mods: [{ id: 'a1b2c3d4e5f6', enabled: true }], fivemFound: false });
  try {
    await t.guard.observe(snap('active'));
    t.clock.t = T0 + 8 * DAY;
    const r = await t.guard.observe(snap('license_required', []));
    assert.equal(t.be.calls.some((c) => c.action === 'mods-disable'), false);
    assert.equal(r.result.failed, 0);
  } finally { t.done(); }
});

test('failed restores are reported and retried an hour later, not on every check', async () => {
  const t = setup({ failIds: ['windows.gamemode.on'] });
  try {
    await t.guard.observe(snap('active'));
    t.clock.t = T0 + 8 * DAY;
    const r = await t.guard.observe(snap('license_required', []));
    assert.equal(r.result.failed, 1);
    assert.equal(r.result.items.find((x) => !x.ok).error, 'conflict');
    assert.equal(t.task.removed, 0);
    await t.guard.observe(snap('license_required', []));
    assert.equal(t.be.calls.filter((c) => c.action === 'backup-list').length, 1);
    t.clock.t += 61 * 60000;
    await t.guard.observe(snap('license_required', []));
    assert.equal(t.be.calls.filter((c) => c.action === 'backup-list').length, 2);
  } finally { t.done(); }
});

test('parallel triggers run one restore; a renewed license re-arms and clears the old result', async () => {
  const t = setup();
  try {
    await t.guard.observe(snap('active'));
    t.clock.t = T0 + 8 * DAY;
    await Promise.all([t.guard.observe(snap('license_required', [])), t.guard.observe(snap('license_required', [])), t.guard.checkLocal()]);
    assert.equal(t.be.calls.filter((c) => c.action === 'backup-list').length, 1);
    const renewed = new Date(T0 + 40 * DAY).toISOString();
    await t.guard.observe(snap('active', [lic(renewed)]));
    assert.equal(t.guard.state().licensed, true);
    assert.equal(t.guard.publicState().result, null);
    assert.equal(t.task.synced.pop(), Date.parse(renewed));
  } finally { t.done(); }
});

test('development mock and in-progress checks are ignored', async () => {
  const t = setup();
  try {
    await t.guard.observe({ ok: true, status: 'development', demo: true });
    await t.guard.observe(snap('checking'));
    assert.equal(t.guard.state().licensed, false);
    assert.equal(t.be.calls.length, 0);
  } finally { t.done(); }
});

test('scheduled task: daily check for every license, plus the end date for time-limited ones', async () => {
  const runs = [];
  const task = createLicenseTask({ exe: () => 'C:\\Tools\\UNDCC-Tweaker-0.9.28.exe', now: () => T0, run: async (env) => { runs.push(env); return 'ok'; } });
  const end = Date.parse(week);
  await task.sync({ licensed: true, lifetime: false, expires_at: end });
  await task.sync({ licensed: true, lifetime: false, expires_at: end });
  assert.equal(runs.length, 1);
  assert.equal(runs[0].H1T_TASK_MODE, 'register');
  assert.equal(runs[0].H1T_TASK_EXE, 'C:\\Tools\\UNDCC-Tweaker-0.9.28.exe');
  assert.equal(runs[0].H1T_TASK_AT, new Date(end + 60000).toISOString());
  assert.equal(runs[0].H1T_TASK_DAILY, new Date(T0 + 15 * 60000).toISOString());
  await task.sync({ licensed: true, lifetime: true, expires_at: null });
  assert.equal(runs[1].H1T_TASK_MODE, 'register');
  assert.equal(runs[1].H1T_TASK_AT, '');
  assert.ok(runs[1].H1T_TASK_DAILY);
  await task.sync({ licensed: false, lifetime: true, expires_at: null });
  assert.equal(runs[2].H1T_TASK_MODE, 'remove');
  const dev = createLicenseTask({ exe: () => null, run: async (env) => { runs.push(env); return 'ok'; } });
  await dev.sync({ licensed: true, lifetime: false, expires_at: end });
  assert.equal(runs.pop().H1T_TASK_MODE, 'remove');
});

test('Windows: the license check task is really registered with the expiry time and removed again', { skip: process.platform !== 'win32' }, async () => {
  const name = 'H1T.CC License Check (test)';
  const exe = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe');
  const task = createLicenseTask({ exe: () => exe, name });
  const end = Date.now() + 3 * DAY;
  try {
    assert.equal(await task.sync({ licensed: true, lifetime: false, expires_at: end }), 'registered');
    const q = JSON.parse(await task.query());
    assert.equal(q.execute.toLowerCase(), exe.toLowerCase());
    assert.equal(q.arguments, '--h1t-expiry-check');
    assert.ok(Math.abs(Date.parse(q.at) - (end + 60000)) < 2000, `${q.at} vs ${new Date(end + 60000).toISOString()}`);
    assert.equal(q.daily, true);
    // Lifetime: only the daily check remains.
    assert.equal(await task.sync({ licensed: true, lifetime: true, expires_at: null }), 'registered');
    const life = JSON.parse(await task.query());
    assert.equal(life.at, null);
    assert.equal(life.daily, true);
  } finally {
    await task.remove();
    assert.equal(await task.query(), 'none');
  }
});
