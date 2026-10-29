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
