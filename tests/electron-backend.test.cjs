'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createBackendClient } = require('../electron/backend.cjs');

function client(callback, packaged = false) {
  return createBackendClient({ isPackaged: packaged }, {
    resourcesPath: 'C:\\Program Files\\Tweaker\\resources', windowsRoot: 'C:\\Windows', execFile: callback
  });
}
test('packaged EXE uses external resources and hidden argument-array invocation', async () => {
  const backend = client((exe, args, options, done) => {
    assert.match(exe, /WindowsPowerShell\\v1\.0\\powershell\.exe$/);
    assert.equal(args[args.indexOf('-File') + 1], path.join('C:\\Program Files\\Tweaker\\resources', 'backend', 'tweaker.ps1'));
    assert.equal(options.windowsHide, true);
    assert.equal(options.shell, false);
    assert.equal(options.encoding, 'utf8');
    done(null, '{"ok":true,"tweaks":[]}', '');
  }, true);
  assert.equal((await backend({ action: 'list' })).ok, true);
});
test('valid backend errors on exit 1 remain available to UI', async () => {
  const backend = client((exe, args, options, done) => done({ code: 1 }, '{"ok":false,"error":"close_fivem_first"}', ''));
  assert.deepEqual(await backend({ action: 'cache-clean' }), { ok: false, error: 'close_fivem_first' });
});
test('invalid requests and unconfirmed purge never start a process', async () => {
  const backend = client(() => assert.fail('must not spawn'));
  for (const request of [
    { action: 'execute' }, { action: 'apply', id: 'untrusted' }, { action: 'list', lang: 'unknown' },
    { action: 'cache-purge', backupId: 'a'.repeat(32) },
    { action: 'cache-restore', backupId: '../other' },
    { action: 'backup-restore', backupId: '../other' },
    { action: 'cache-info', fiveMPath: '..\\outside' }
  ]) await assert.rejects(backend(request));
});
test('custom installation path is a literal argument; purge requires explicit confirmation', async () => {
  const backend = client((exe, args, options, done) => {
    assert.equal(args[args.indexOf('-FiveMPath') + 1], 'D:\\Games & Mods\\FiveM.app');
    assert.ok(args.includes('-ConfirmPurge'));
    done(null, '{"ok":true,"status":"purged"}', '');
  });
  await backend({ action: 'cache-purge', fiveMPath: 'D:\\Games & Mods\\FiveM.app', backupId: 'b'.repeat(32), confirmPurge: true });
});
test('invalid output and process failures are rejected', async () => {
  for (const [error, stdout, stderr] of [
    [null, 'log\n{"ok":true}', ''], [null, '{"ok":false}', ''],
    [{ code: 1 }, '{"ok":true}', ''], [{ code: 'ENOENT' }, '', ''],
    [null, '{"ok":true}', 'unexpected diagnostics'], [null, '[]', '']
  ]) {
    const backend = client((exe, args, options, done) => done(error, stdout, stderr));
    await assert.rejects(backend({ action: 'cache-info' }));
  }
});
test('EXE packaging includes all backend dependencies outside ASAR', () => {
  const config = require('../packaging/electron-builder.cjs');
  assert.equal(config.win.target[0].target, 'portable');
  assert.equal(config.win.requestedExecutionLevel, 'requireAdministrator');
  const shipped = config.extraResources[0];
  assert.equal(shipped.to, 'backend');
  for (const file of ['tweaker.ps1', 'Tweaker.psm1', 'Keyboard.ps1', 'CacheCleaner.ps1', 'SafeMode.ps1', 'Backup.ps1', 'native/Keyboard.cs', 'electron/backend.cjs', 'electron/safemode-monitor.cjs']) assert.ok(shipped.filter.includes(file));
});
test('SafeMode actions use the same allowlisted JSON backend', async () => {
  const backend = client((exe, args, options, done) => {
    assert.ok(args.includes('safemode-enable'));
    done(null, '{"ok":true,"enabled":true,"health":"green"}', '');
  });
  assert.equal((await backend({ action: 'safemode-enable', lang: 'it' })).enabled, true);
});
test('shared recovery passes validated IDs and preserves partial outcomes on exit 1', async () => {
  const backend = client((exe, args, options, done) => {
    assert.ok(args.includes('backup-restore'));
    assert.equal(args[args.indexOf('-BackupId') + 1], 'a'.repeat(32));
    done({ code: 1 }, '{"ok":false,"error":"restore_incomplete","status":"partial","results":[{"status":"failed","reason":"external_change_detected"}]}', '');
  });
  const result=await backend({ action: 'backup-restore', backupId: 'a'.repeat(32), lang: 'en' });
  assert.equal(result.status, 'partial');
  assert.equal(result.results[0].reason, 'external_change_detected');
});
