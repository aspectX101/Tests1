'use strict';
// Extra > Energie: only fixed values reach PowerShell, the script is packaged, the main process forwards the fields,
// texts exist in three languages and the license end resets the page's changes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createBackendClient } = require('../electron/backend.cjs');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function client() {
  const calls = [];
  const call = createBackendClient({ isPackaged: false }, { windowsRoot: 'C:\\Windows', execFile(exe, args, opts, done) { calls.push(args); done(null, '{"ok":true}', ''); } });
  return { call, calls };
}

test('power actions: plan GUID, setting, mode and seconds are checked before PowerShell runs', async () => {
  const { call, calls } = client();
  await call({ action: 'power-get', lang: 'de' });
  await call({ action: 'power-plan', id: '381b4222-f694-41f0-9685-ff5bb260df2e', lang: 'de' });
  await call({ action: 'power-timeout', setting: 'monitor', mode: 'ac', seconds: 300, lang: 'de' });
  await call({ action: 'power-reset', lang: 'de' });
  assert.deepEqual(calls[1].slice(-2), ['-Id', '381b4222-f694-41f0-9685-ff5bb260df2e']);
  assert.deepEqual(calls[2].slice(-6), ['-Name', 'monitor', '-Extra', 'ac', '-Seconds', '300']);
  for (const bad of [{ id: 'balanced' }, { id: '381B4222-F694-41F0-9685-FF5BB260DF2E; calc' }, { id: undefined }]) {
    await assert.rejects(call({ action: 'power-plan', lang: 'de', ...bad }), /invalid_power_plan/);
  }
  for (const bad of [{ setting: 'cpu', mode: 'ac', seconds: 300 }, { setting: 'sleep', mode: 'both', seconds: 300 }, { setting: 'sleep', mode: 'ac', seconds: 7 }, { setting: 'sleep', mode: 'ac', seconds: '300' }]) {
    await assert.rejects(call({ action: 'power-timeout', lang: 'de', ...bad }), /invalid_power_value/);
  }
  assert.equal(calls.length, 4);
});

test('Power.ps1 is packaged, dispatched by the CLI, and the main process forwards setting/mode/seconds', () => {
  assert.match(read('packaging/electron-builder.cjs'), /'Power\.ps1'/);
  assert.match(read('tweaker.ps1'), /\. \(Join-Path \$PSScriptRoot 'Power\.ps1'\)/);
  assert.match(read('app/main.js'), /layout, extra, setting, mode, seconds \}\);/);
  const ps = read('Power.ps1');
  assert.match(ps, /\$script:PowerTimeoutChoices = @\(0,60,120,180,300,600,900,1200,1800,2700,3600,7200,10800,18000\)/);
  assert.match(ps, /plan = @\('windows\.power\.high'\); sleepAc = @\('windows\.power\.profile','windows\.power\.extras'\)/);
  assert.doesNotMatch(ps, /powercfg\.exe|Invoke-PowerCfg/, 'power API only, no localised powercfg text');
});

test('power page texts in three languages, error codes translated, page wired', () => {
  const i18n = read('app/renderer/i18n.js');
  for (const code of ['invalid_power_plan', 'invalid_power_value', 'power_owned_by_tweak', 'power_backup_not_found', 'power_plan_failed', 'power_setting_failed', 'power_reset_incomplete']) {
    assert.equal((i18n.match(new RegExp(`\\b${code}: '`, 'g')) || []).length, 3, code);
  }
  const page = read('app/renderer/power.js');
  for (const lang of ['de', 'en', 'it']) assert.match(page, new RegExp(`\\b${lang}: \\{ plan: '`));
  const app = read('app/renderer/app.js');
  assert.match(app, /if \(c === 'power'\) return catHero\(c, parent\) \+ window\.PowerPage\.html\(\);/);
  assert.match(app, /if \(route\.cat === 'power'\) window\.PowerPage\.load\(\);/);
  assert.match(read('app/renderer/index.html'), /<script src="power\.js"><\/script>/);
  assert.match(read('app/license-expiry.js'), /backend\(\{ action: 'power-reset' \}\)/);
});
