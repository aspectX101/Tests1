'use strict';
// Light design: one filter turns the black-and-white UI white; real colours (photos, flags, risk lights) are turned
// back. The choice is applied before the first paint, so the start animation is white too.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', 'app', 'renderer', f), 'utf8');

test('light design: whole UI inverted, real colours turned back, stylesheet loaded last', () => {
  const css = read('theme.css');
  assert.match(css, /html\.light body \{ filter: invert\(1\) hue-rotate\(180deg\); \}/);
  assert.match(css, /html\.light body \.brand > \.brand-logo, html\.light \.h1t-gate-brand img \{\r?\n  content: url\("assets\/h1t-logo-white\.png"\);/);
  assert.match(css, /html\.light :is\(img, video, \.h1t-flag, \.risk-dot/);
  const html = read('index.html');
  const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map((m) => m[1]);
  assert.equal(links.at(-1), 'theme.css');
  assert.match(html, /<button id="h1t-theme"/);
});

test('the start animation is white from the first paint when light is chosen', () => {
  const head = read('boot-head.js');
  assert.match(head, /if \(localStorage\.getItem\('h1tTheme'\) === 'light'\) document\.documentElement\.classList\.add\('light'\);/);
  const html = read('index.html');
  assert.ok(html.indexOf('boot-head.js') < html.indexOf('<body'), 'runs in <head>');
});

test('sun button and Settings > Design switch and remember it, texts in three languages', () => {
  const app = read('app.js');
  assert.match(app, /if \(e\.target\.closest\('#h1t-theme'\)\) \{ setTheme\(!isLight\(\)\); return; \}/);
  assert.match(app, /store\.set\('h1tTheme', light \? 'light' : 'dark'\)/);
  assert.match(app, /card\('design', s\.design/);
  const texts = app.slice(app.indexOf('const SET_TEXT = {'), app.indexOf('const SET_ICONS'));
  for (const k of ['design', 'designDesc', 'dark', 'light', 'toLight', 'toDark']) assert.equal((texts.match(new RegExp(`\\b${k}: '`, 'g')) || []).length, 3, k);
});

test('the white logo has the same canvas as the dark one, so switching never moves or resizes it', () => {
  const size = (f) => { const b = fs.readFileSync(path.join(__dirname, '..', 'app', 'renderer', 'assets', f)); assert.equal(b.subarray(1, 4).toString(), 'PNG'); return [b.readUInt32BE(16), b.readUInt32BE(20), b[25]]; };
  assert.deepEqual(size('h1t-logo-white.png'), size('h1t-logo-main.png'));
  assert.equal(size('h1t-logo-white.png')[2], 6, 'RGBA with a transparent background');
});

test('silver scheme: theme.css matches build/light-theme.src.css and lands on exactly the intended colours', () => {
  const { render, pre, filtered, toHex } = require('../build/make-light-theme.cjs');
  const css = fs.readFileSync(path.join(__dirname, '..', 'app', 'renderer', 'theme.css'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(css, render(), 'run node build/make-light-theme.cjs after changing build/light-theme.src.css');
  const src = fs.readFileSync(path.join(__dirname, '..', 'build', 'light-theme.src.css'), 'utf8');
  for (const [, hex] of src.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
    const back = filtered(toHex(pre(hex)).slice(1));
    const want = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    assert.ok(back.every((v, i) => Math.abs(v - want[i]) <= 2), `#${hex} -> ${toHex(back)}`);
  }
  assert.match(css, /html\.light \{ background: #dfe3e8;/, 'the unfiltered html background is the final page colour');
});
