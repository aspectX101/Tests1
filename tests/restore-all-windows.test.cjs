'use strict';
// Real Windows round trip (CI runner): apply every tweak that can run there, "Restore all", then every value must be
// exactly what it was before. See tests/RestoreAll.Live.Tests.ps1.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

test('Windows: apply all tweaks, restore all, every value is back to the original', { skip: process.platform !== 'win32', timeout: 900000 }, () => {
  let out;
  try {
    out = execFileSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'RestoreAll.Live.Tests.ps1')],
      { encoding: 'utf8', timeout: 880000, windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  } catch (err) { console.log(String(err.stdout || ''), String(err.stderr || '')); throw err; }
  console.log(out);
  assert.match(out, /PASS restore all: \d+ tweaks applied and every value restored exactly/);
});
