'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('H1T.CC rebrand is consistent across Electron UI and application metadata', () => {
  const index = read('app/renderer/index.html');
  const main = read('app/main.js');
  const config = read('electron-builder.config.cjs');
  const packaged = read('build/after-pack.cjs');
  assert.match(index, /<title>H1T\.CC \| Tweak Utility<\/title>/);
  assert.match(index, /class="brand-name">H1T<span>\.CC<\/span>/);
  assert.match(index, /class="brand-sub">TWEAK UTILITY/);
  assert.match(index, /<link rel="stylesheet" href="h1t\.css">/);
  assert.match(main, /title: 'H1T\.CC Tweak Utility'/);
  assert.match(config, /productName: 'H1T\.CC Tweak Utility'/);
  assert.match(packaged, /ProductName: 'H1T\.CC Tweak Utility'/);
});

test('the provided globe logo is embedded locally and used for splash and dashboard', () => {
  const logo = read('app/renderer/assets/h1t-emblem.svg');
  const index = read('app/renderer/index.html');
  const app = read('app/renderer/app.js');
  assert.match(logo, /^<svg[^>]+>/);
  assert.match(logo, /data:image\/jpeg;base64,/);
  const payload = logo.match(/data:image\/jpeg;base64,([^"]+)/)?.[1];
  assert.ok(payload, 'embedded offline logo must be present');
  const bytes = Buffer.from(payload, 'base64');
  assert.equal(bytes.length, 4655);
  assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),
    '9d3702f4213f79caa88eb0c193cddeb7caf03d6c873c827c7a93f03fdbd60a02');

  assert.match(index, /class="h1t-splash-emblem"/);
  assert.match(app, /class="h1t-dash-hero"/);
  assert.match(read("app/renderer/h1t-dashboard.css"), /assets\/h1t-emblem\.svg/);
});

test('all routes retain navigation while page transitions honor reduced motion', () => {
  const app = read('app/renderer/app.js');
  const css = read('app/renderer/h1t.css');
  assert.match(app, /function go\(route\)/);
  assert.match(app, /state\.enter = true/);
  assert.match(app, /class="h1t-quick-grid"/);
  assert.match(app, /data-go="backups"/);
  assert.match(app, /data-cat="performance"/);
  assert.match(app, /data-cat="network"/);
  assert.match(css, /@keyframes h1t-enter/);
  const referenceCss = read('app/renderer/h1t-dashboard.css');
  assert.match(referenceCss, /\.h1t-metrics/);
  assert.match(referenceCss, /\.h1t-activity-panel/);
  assert.match(referenceCss, /\.h1t-quick\.primary/);
  assert.match(css, /\.enter > \*/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('old portable update filename remains compatible while only visible brand changes', () => {
  const updater = read('app/updater.js');
  const builder = read('electron-builder.config.cjs');
  assert.match(updater, /UNDCC-Tweaker-/);
  assert.match(builder, /artifactName: 'UNDCC-Tweaker-\$\{version\}\.exe'/);
});
