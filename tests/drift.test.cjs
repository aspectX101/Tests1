'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { find, key } = require('../app/renderer/drift.js');

const bk = (tweakId, status, kind = 'tweak') => ({ backupId: tweakId.padEnd(32, '0').slice(0, 32), kind, tweakId, status });
const tw = (id, applied, available = true) => ({ id, name: id, applied, available });

test('a tweak with an active backup that is no longer applied counts as reset by Windows', () => {
  const backups = [bk('gaming.gpu.hags', 'applied'), bk('windows.power.profile', 'applied'), bk('network.dns.fast', 'restored'), bk('cache', 'cleaned', 'cache'),
    bk('fivem.priority.high', 'applied'), bk('windows.cpu.unpark', 'applied'), bk('startup.discord', 'applied', 'startup')];
  const tweaks = [tw('gaming.gpu.hags', false), tw('windows.power.profile', true), tw('network.dns.fast', false), tw('fivem.priority.high', false),
    tw('windows.cpu.unpark', false, false), tw('startup.discord', false)];
  assert.deepEqual(find(backups, tweaks).map((x) => x.id), ['gaming.gpu.hags']);
});

test('nothing to report without backups or tweaks; the key ignores order', () => {
  assert.deepEqual(find(null, [tw('a', false)]), []);
  assert.deepEqual(find([bk('a', 'applied')], null), []);
  assert.equal(key([tw('b', false), tw('a', false)]), key([tw('a', false), tw('b', false)]));
});

test('the banner texts exist in all three languages and the script is loaded before app.js', () => {
  const app = fs.readFileSync(path.join(__dirname, '../app/renderer/app.js'), 'utf8');
  const block = app.slice(app.indexOf('const DRIFT_TEXT'), app.indexOf('const driftText'));
  for (const lang of ['de', 'en', 'it']) assert.match(block, new RegExp(`\\n  ${lang}: \\{ title:`));
  const html = fs.readFileSync(path.join(__dirname, '../app/renderer/index.html'), 'utf8');
  assert.ok(html.indexOf('src="drift.js"') > 0 && html.indexOf('src="drift.js"') < html.indexOf('src="app.js"'));
});
