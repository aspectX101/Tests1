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

test('the H1T logos are used for the opening animations, sidebar, dashboard and app icon', () => {
  const index = read('app/renderer/index.html');
  const logo = fs.readFileSync(path.join(__dirname, '..', 'app/renderer/assets/h1t-logo.png'));
  assert.equal(logo.subarray(1, 4).toString(), 'PNG');
  assert.equal(logo[25], 6, 'RGBA PNG with transparency');
  assert.match(index, /class="splash boot"/);
  assert.match(index, /<img src="assets\/h1t-logo\.png" alt="" class="boot-logo">/);
  assert.match(index, /WELCOME BACK/);
  assert.match(index, /href="boot\.css"/);
  // The specular sweep is masked by the logo itself (CSP: img-src 'self').
  assert.match(read('app/renderer/boot.css'), /mask: url\(assets\/h1t-logo\.png\)/);
  assert.match(read('app/renderer/boot.css'), /prefers-reduced-motion: reduce/);
  // sidebar: the standard H1T artwork, and the Halloween edition while Halloween mode is on (brand.css)
  assert.match(index, /class="brand-logo" src="assets\/h1t-logo-main\.webp"/);
  assert.match(index, /class="brand-halloween-logo" src="assets\/h1t-logo-halloween\.webp"/);
  assert.match(index, /href="brand\.css"/);
  for (const f of ['h1t-logo-main.webp', 'h1t-logo-halloween.webp']) {
    const img = fs.readFileSync(path.join(__dirname, '..', 'app/renderer/assets', f));
    assert.equal(img.subarray(0, 4).toString() + img.subarray(8, 12).toString(), 'RIFFWEBP', `${f} is a WebP image`);
  }
  assert.match(read('app/renderer/glock-boot.js'), /assets\/h1t-logo-main\.webp/);
  assert.match(read('app/renderer/halloween-boot.js'), /assets\/h1t-logo-halloween\.webp/);
  assert.match(read('app/renderer/mono.css'), /\.h1t-dash-hero:after \{ display: none !important; \}/);
  const ico = fs.readFileSync(path.join(__dirname, '..', 'build/icon.ico'));
  assert.equal(ico.readUInt16LE(2), 1); assert.equal(ico.readUInt16LE(4), 7, 'icon has 7 sizes (16-256 px)');
  assert.ok(fs.readFileSync(path.join(__dirname, '..', 'app/assets/icon.ico')).equals(ico), 'window/taskbar icon matches the exe icon');
});

test('all routes retain navigation while page transitions honor reduced motion', () => {
  const app = read('app/renderer/app.js');
  const css = read('app/renderer/h1t.css');
  assert.match(app, /function go\(route\)/);
  assert.match(app, /state\.enter = true/);
  // Dashboard: live monitor with chart and Spotify instead of quick actions/activity (user request)
  assert.match(app, /class="card chart-card"/);
  assert.match(app, /window\.DashboardMedia\.html\(state\.lang\)/);
  assert.doesNotMatch(app, /class="h1t-quick-grid"|h1t-activity-panel/);
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
