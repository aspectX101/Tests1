'use strict';
// When PowerShell itself fails, the stable code stays and the Windows reason travels along as detail.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createBackendClient } = require('../electron/backend.cjs');

const client = (answer) => createBackendClient({ isPackaged: false }, { windowsRoot: 'C:\\Windows', execFile: (exe, args, opts, cb) => process.nextTick(() => answer(cb)) });
const failure = async (answer) => { try { await client(answer)({ action: 'list', lang: 'de' }); } catch (err) { return err; } throw new Error('expected a rejection'); };

test('script missing or blocked: exit code in hex plus the first stderr lines', async () => {
  const err = await failure((cb) => cb(Object.assign(new Error('Command failed'), { code: -196608 }), '', 'The argument tweaker.ps1 to the -File parameter does not exist.\r\nSecond line\r\nThird\r\nFourth'));
  assert.equal(err.message, 'backend_process_failed');
  assert.equal(err.detail, 'exit -196608 (0xfffd0000); The argument tweaker.ps1 to the -File parameter does not exist. | Second line | Third');
});

test('PowerShell cannot be started at all (removed, blocked by policy)', async () => {
  const err = await failure((cb) => cb(Object.assign(new Error('spawn EACCES'), { code: 'EACCES', errno: -4092 }), '', ''));
  assert.equal(err.message, 'backend_process_failed');
  assert.equal(err.detail, 'spawn EACCES');
});

test('killed by timeout or an antivirus keeps its own code', async () => {
  const err = await failure((cb) => cb(Object.assign(new Error('killed'), { code: null, killed: true, signal: 'SIGTERM' }), '', ''));
  assert.equal(err.message, 'backend_timeout_or_terminated');
  assert.match(err.detail, /signal SIGTERM/);
});

test('normal backend errors and successes are unchanged', async () => {
  const ok = await client((cb) => cb(null, '{"ok":true,"tweaks":[]}', ''))({ action: 'list', lang: 'de' });
  assert.equal(ok.ok, true);
  const res = await client((cb) => cb(Object.assign(new Error('x'), { code: 1 }), '{"ok":false,"error":"admin_required"}', ''))({ action: 'list', lang: 'de' });
  assert.equal(res.error, 'admin_required');
  const junk = await failure((cb) => cb(null, 'not json', 'At line:1 char:1 + Import-Module'));
  assert.equal(junk.message, 'invalid_backend_json');
  assert.equal(junk.detail, 'At line:1 char:1 + Import-Module');
});

test('the tweak, Gaming and other error toasts pass the Windows reason on (not only the code)', () => {
  const fs = require('node:fs'), path = require('node:path');
  const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const app = read('app/renderer/app.js');
  assert.match(app, /toast\(`\$\{tw\.name\}: \$\{errorText\(res\?\.error, res\?\.detail\)\}`, 'error'\)/);
  for (const f of ['app/renderer/app.js', 'app/renderer/debloat.js', 'app/renderer/h1t-mods.js']) {
    assert.doesNotMatch(read(f), /errorText\((res|r|on|list|result)\?\.error\)/, `${f} drops the detail`);
  }
});
