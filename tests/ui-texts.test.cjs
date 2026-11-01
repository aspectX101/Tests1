'use strict';
// Customers never see raw error codes or untranslated headings; the window never relies on blocked inline styles.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
global.window = {};
require('../app/renderer/i18n.js');

test('every error code of the displays backend is translated in all three languages', () => {
  const codes = new Set([...read('Displays.ps1').matchAll(/throw\s+'(display_[a-z_]+)'/g)].map((m) => m[1]));
  codes.add('display_read_failed'); codes.add('display_settings_failed'); codes.add('display_extra_unsupported');
  assert.ok(codes.size >= 8);
  for (const c of codes) for (const l of ['de', 'en', 'it']) assert.ok(window.I18N[l].errors[c], `${c} missing in ${l}`);
});

test('the displays page shows translated errors and headings', () => {
  const src = read('app/renderer/displays.js');
  assert.doesNotMatch(src, /w\.(error|failed)\+[^)]*\+d\.error[^)]/);
  assert.match(src, /errorText\(d\.error\)/);
  const W = eval('(' + src.match(/const displayWords = (\{[\s\S]*?\n\});/)[1] + ')');
  for (const k of ['max', 'move', 'extras']) for (const l of ['de', 'it']) assert.notEqual(W[l][k], W.en[k], `${l}.${k} untranslated`);
});

test('unknown internal codes read as "Unknown error (code)", free text stays as it is', () => {
  const app = read('app/renderer/app.js');
  const fn = app.match(/function errorText\(code, detail\) \{[\s\S]*?\n\}/)[0];
  const details = new Map([['backend_process_failed', 'exit -196608 (0xfffd0000)']]);
  const errorText = new Function('t', 'lastErrorDetail', fn + '; return errorText;')(() => window.I18N.en, details);
  // A page that passes only the code (e.g. Backups) still shows the Windows reason of the last failure.
  assert.equal(errorText('backend_process_failed'), `${window.I18N.en.errors.backend_process_failed} (exit -196608 (0xfffd0000))`);
  assert.equal(errorText('some_new_code'), 'Unknown error (some_new_code)');
  assert.equal(errorText('display_busy'), window.I18N.en.errors.display_busy);
  assert.equal(errorText('Die Eigenschaft X ist nicht vorhanden.'), 'Die Eigenschaft X ist nicht vorhanden.');
});

test('no inline style attributes in rendered HTML (CSP style-src self blocks them)', () => {
  for (const f of fs.readdirSync(path.join(root, 'app/renderer')).filter((x) => x.endsWith('.js'))) {
    assert.doesNotMatch(read('app/renderer/' + f), /<[a-z][^>]*\sstyle="/i, f);
  }
});
