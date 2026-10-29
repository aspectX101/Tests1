'use strict';
// Tweak texts never mention other tools or products (user rule, 29.10.2026).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const OTHER_TOOLS = /\belux\b|no-?lazy-?mode|\balternative (to|zu)\b|\balternativa a\b|\bstatt \w+:/i;
const root = path.join(__dirname, '..');

test('no tweak name or description mentions another tool, in any language', () => {
  const backend = JSON.parse(fs.readFileSync(path.join(root, 'OptimizationCatalog.json'), 'utf8').replace(/^﻿/, '')).tweaks;
  const ui = require('../app/tweak-catalog.js');
  for (const tw of [...backend, ...ui]) {
    for (const lang of ['de', 'en', 'it']) {
      for (const field of ['name', 'description']) assert.doesNotMatch(String(tw[field]?.[lang] || ''), OTHER_TOOLS, `${tw.id} ${field}.${lang}`);
    }
  }
  for (const file of ['Tweaker.psm1', 'app/renderer/i18n.js', 'app/renderer/app.js']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /\belux\b|no-?lazy-?mode/i, file);
  }
});

test('tweaks that FiveM screenshares check carry the warning, and configs never include them', () => {
  const ui = require('../app/tweak-catalog.js');
  const notes = { de: /FiveM-Server.*Screenshare/, en: /FiveM servers.*screenshares/, it: /server FiveM.*screenshare/ };
  for (const id of ['windows.service.sysmain.off', 'windows.service.diagtrack.off', 'windows.prefetch.off', 'windows.activity.off']) {
    const tw = ui.find((x) => x.id === id);
    for (const lang of ['de', 'en', 'it']) assert.match(tw.description[lang], notes[lang], `${id}.${lang}`);
  }
  const app = fs.readFileSync(path.join(root, 'app/renderer/app.js'), 'utf8');
  assert.match(app, /const profileCandidates[\s\S]{0,400}!neverInConfig\(tw\)/);
  assert.match(app, /neverInConfig = \(tw\) => NEVER_IN_CONFIG\.has\(tw\.id\) \|\| catOf\(tw\) === 'services'/);
});
