'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const CODES = ['power_setting_access_denied', 'power_setting_rejected', 'power_setting_write_failed'];

test('power refusal codes come from the backend and are translated in all three languages', () => {
  const backend = fs.readFileSync(path.join(root, 'OptimizationNative.ps1'), 'utf8');
  global.window = {};
  require(path.join(root, 'app/renderer/i18n.js'));
  for (const code of CODES) {
    assert.match(backend, new RegExp(`'${code}'`), `${code} missing in backend`);
    for (const lang of ['de', 'en', 'it']) assert.ok(window.I18N[lang].errors[code], `${code} missing in ${lang}`);
  }
});

test('Windows PowerShell: power API refusals retry via powercfg and keep the reason (simulated)', { skip: process.platform !== 'win32', timeout: 120000 }, () => {
  let output;
  try {
    output = execFileSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'PowerFallback.Tests.ps1')],
      { encoding: 'utf8', timeout: 110000, windowsHide: true, cwd: root });
  } catch (err) { console.log(String(err.stdout || ''), String(err.stderr || '')); throw err; }
  console.log(output);
  assert.match(output, /PASS fallback succeeds through powercfg/);
  assert.match(output, /PASS refusals keep the Windows reason/);
});
