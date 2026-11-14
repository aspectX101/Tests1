'use strict';
// Dashboard tiles open the list of their tweaks; the lists match the numbers on the tiles.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { listFor, total, TEXT, KINDS } = require('../app/renderer/tweak-list.js');

const catOf = (tw) => tw.category;
const bulkOk = (tw) => tw.available !== false && tw.risk === 'low' && tw.bulkSafe === true;
const tweaks = [
  { id: 'a', name: 'Zeta', category: 'network', applied: true, risk: 'low', bulkSafe: true },
  { id: 'b', name: 'Alpha', category: 'network', applied: true, risk: 'medium' },
  { id: 'c', name: 'Beta', category: 'services', applied: true, risk: 'high' },
  { id: 'd', name: 'Gamma', category: 'privacy', applied: false, risk: 'low', bulkSafe: true, description: 'Telemetry off' },
  { id: 'e', name: 'Delta', category: 'services', applied: false, risk: 'high' },
];
const ids = (groups) => groups.flatMap(([, l]) => l.map((t) => t.id));

test('each list has exactly the tweaks counted on its tile, grouped by area and sorted by name', () => {
  const applied = listFor('applied', tweaks, { catOf, bulkOk });
  assert.deepEqual(applied.map(([c]) => c), ['network', 'services']);
  assert.deepEqual(ids(applied), ['b', 'a', 'c']);
  assert.equal(total(applied), tweaks.filter((t) => t.applied).length);
  assert.equal(total(listFor('available', tweaks, { catOf, bulkOk })), tweaks.length);
  assert.deepEqual(ids(listFor('safe', tweaks, { catOf, bulkOk })), ['d']);
  assert.deepEqual(ids(listFor('services', tweaks, { catOf, bulkOk })), ['c']);
});

test('search matches name, description and area', () => {
  assert.deepEqual(ids(listFor('available', tweaks, { catOf, bulkOk, query: 'telemetry' })), ['d']);
  assert.deepEqual(ids(listFor('available', tweaks, { catOf, bulkOk, query: 'DIENSTE', catName: (c) => (c === 'services' ? 'Dienste' : c) })), ['c', 'e']);
  assert.equal(total(listFor('applied', tweaks, { catOf, bulkOk, query: 'nothing' })), 0);
});

test('texts in all three languages; every dashboard tile opens a list', () => {
  for (const lang of ['de', 'en', 'it']) for (const k of [...KINDS, 'search', 'none', 'noHit', 'close', 'open', 'on', 'hint']) assert.ok(TEXT[lang][k], `${lang}:${k}`);
  for (const lang of ['de', 'en', 'it']) for (const k of KINDS) assert.ok(TEXT[lang].sub[k], `${lang}:sub.${k}`);
  const app = fs.readFileSync(path.join(__dirname, '..', 'app', 'renderer', 'app.js'), 'utf8');
  assert.match(app, /data-tlist="\$\{id\}" role="button" tabindex="0"/);
  for (const k of KINDS) assert.match(app, new RegExp(`metric\\('${k}',`));
  const html = fs.readFileSync(path.join(__dirname, '..', 'app', 'renderer', 'index.html'), 'utf8');
  assert.match(html, /<script src="tweak-list.js"><\/script>/);
  assert.match(html, /href="tweak-list.css"/);
});
