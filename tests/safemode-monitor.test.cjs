'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSafeModeMonitor } = require('../electron/safemode-monitor.cjs');
const { createBackendClient } = require('../electron/backend.cjs');

function timers() {
  let callback;
  let cleared = false;
  return {
    setTimer(fn, delay) { assert.equal(delay, 30000); callback = fn; return 1; },
    clearTimer() { cleared = true; callback = undefined; },
    async next() { assert.ok(callback); const fn = callback; callback = undefined; fn(); await new Promise(resolve => setImmediate(resolve)); },
    get cleared() { return cleared; },
    get scheduled() { return !!callback; }
  };
}
test('disabled mode only scans; active mode enforces; stopping cancels timer', async () => {
  const clock = timers();
  let enabled = false;
  const calls = [];
  const monitor = createSafeModeMonitor(async ({ action }) => { calls.push(action); return { ok: true, enabled }; }, clock);
  await monitor.start();
  assert.deepEqual(calls, ['safemode-scan']);
  enabled = true;
  await clock.next();
  assert.deepEqual(calls, ['safemode-scan', 'safemode-scan', 'safemode-enforce']);
  monitor.stop();
  assert.equal(clock.cleared, true);
  assert.equal(clock.scheduled, false);
});
test('repeated start never overlaps; quitting during scan prevents a new repair', async () => {
  const clock = timers();
  let finish;
  let count = 0;
  const monitor = createSafeModeMonitor(() => { count++; return new Promise(resolve => { finish = resolve; }); }, clock);
  const first = monitor.start();
  const second = monitor.start();
  assert.equal(count, 1);
  monitor.stop();
  finish({ ok: true, enabled: true });
  await Promise.all([first, second]);
  assert.equal(count, 1);
  assert.equal(clock.scheduled, false);
});
test('backend failure is surfaced and retries on next interval', async () => {
  const clock = timers();
  const errors = [];
  const monitor = createSafeModeMonitor(async () => ({ ok: false, error: 'admin_required' }), { ...clock, onError: e => errors.push(e.message) });
  await monitor.start();
  assert.deepEqual(errors, ['admin_required']);
  await clock.next();
  assert.equal(errors.length, 2);
  monitor.stop();
});
test('real-app lifecycle wiring resumes enabled protection and stops before quit', async () => {
  const listeners = [];
  const calls = [];
  const app = { isPackaged: false, whenReady: () => Promise.resolve(), once: (event, fn) => { assert.equal(event, 'before-quit'); listeners.push(fn); } };
  createBackendClient(app, {
    windowsRoot: 'C:\\Windows',
    execFile(exe, args, options, done) { calls.push(args[args.indexOf('-Action') + 1]); done(null, '{"ok":true,"enabled":true}', ''); }
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ['safemode-scan', 'safemode-enforce']);
  for (const listener of listeners) listener();
});
