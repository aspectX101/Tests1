#!/usr/bin/env node
// Captures the real H1T.CC interface for the showcase.
//
// Runs the app's own renderer (app/renderer/index.html) in Chromium with its built-in browser demo
// (mock backend + demo account), clicks through real pages and switches, and saves:
//   assets/ui/<name>.webp   full window shots (1400×860 CSS px at 3×) and element close-ups
//   src/ui-map.js           positions of the controls that get clicked (CSS px in the 1400×860 window)
//
// Usage: node showcase/scripts/capture-ui.cjs <path to an app checkout>
//   e.g. git worktree add ../h1t-app origin/codex/performance-backend
//        node showcase/scripts/capture-ui.cjs ../h1t-app
// Needs playwright and ffmpeg (for WebP).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const appRoot = path.resolve(process.argv[2] || '');
const appDir = path.join(appRoot, 'app');
if (!fs.existsSync(path.join(appDir, 'renderer', 'index.html'))) {
  console.error('Pass the path of an app checkout (folder containing app/renderer/index.html).');
  process.exit(1);
}
const showcase = path.resolve(__dirname, '..');
const outDir = path.join(showcase, 'assets', 'ui');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'h1t-capture-'));
const WIDTH = 1400, HEIGHT = 860, SCALE = 3;

// Brand rule: the film never names other tools. Capturing fails if such a name is visible; until the app
// text is fixed, an entry [from, to] here replaces it in the served copy (the app checkout is not changed).
const TEXT_FIXES = [];
const FORBIDDEN = /\b(elux|aqua)\b/i;

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const file = path.join(appDir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(appDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  if (path.extname(file) !== '.js') return fs.createReadStream(file).pipe(res);
  let source = fs.readFileSync(file, 'utf8');
  for (const [from, to] of TEXT_FIXES) source = source.split(from).join(to);
  res.end(source);
});

(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/renderer/index.html`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: SCALE });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // English UI, normal (non-Halloween) design.
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'en');
    localStorage.setItem('h1tHalloween', JSON.stringify({ year: new Date().getFullYear(), on: false }));
  });

  const map = {};
  const wait = (ms) => page.waitForTimeout(ms);
  const checkText = async (name) => {
    const hit = (await page.evaluate(() => document.body.innerText)).match(FORBIDDEN);
    if (hit) throw new Error(`"${hit[0]}" is visible in ${name}: add a TEXT_FIXES entry`);
  };
  const shot = async (name, settle = 1600) => {
    await wait(settle);
    await checkText(name);
    await page.screenshot({ path: path.join(tmp, `${name}.png`) });
    console.log('shot', name);
  };
  const crop = async (name, selector) => { await page.locator(selector).first().screenshot({ path: path.join(tmp, `${name}.png`) }); console.log('crop', name); };
  const rect = async (key, locator) => {
    const b = await locator.boundingBox();
    map[key] = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
  };
  const nav = async (sel) => { await page.click(`.nav ${sel}`); };
  const confirm = async () => { if (await page.locator('#modal:not(.hidden)').count()) { await wait(700); await page.click('#modal-ok'); } };

  // Demo account signed in with an active license.
  await page.goto(`${base}#acc=active&accepted`);
  await shot('home', 8000);
  await crop('el-sidebar', '.sidebar');
  await crop('el-home-stat', '.h1t-dashboard .card >> nth=1');
  for (const [key, sel] of [['performance', '[data-cat="performance"]'], ['gaming', '[data-cat="gaming"]'], ['network', '[data-cat="network"]'],
    ['debloat', '[data-cat="debloat"]'], ['profiles', '[data-go="profiles"]'], ['home', '[data-go="home"]']]) {
    await rect(`nav.${key}`, page.locator(`.nav ${sel}`));
  }

  // PC Optimization: real switches, one after another.
  await nav('[data-cat="performance"]');
  await shot('perf-0');
  await crop('el-perf-card-off', '.opt-tweaks .tile2');
  const switches = page.locator('.opt-tweaks .switch');
  for (let i = 0; i < 4; i++) {
    await rect(`perf.switch${i}`, switches.nth(i));
    await switches.nth(i).click(); await wait(300); await confirm();
    await shot(`perf-${i + 1}`, 1200);
    if (i === 0) await crop('el-perf-card-on', '.opt-tweaks .tile2');
  }

  // Gaming Tweaks: On/Off buttons (skip the TDR card, which PC Optimization already switched on).
  await nav('[data-cat="gaming"]');
  await shot('gaming-0');
  await crop('el-gt-card-off', '.gt-card');
  const toggles = page.locator('.gt-toggle');
  for (const [step, index] of [[1, 0], [2, 2], [3, 3], [4, 6]]) {
    await rect(`gaming.toggle${step}`, toggles.nth(index));
    await toggles.nth(index).click(); await wait(300); await confirm();
    await shot(`gaming-${step}`, 1000);
  }
  await crop('el-gt-card-on', '.gt-card');

  // Network: Start Network with its real confirmation dialog.
  await nav('[data-cat="network"]');
  await shot('net-0');
  await crop('el-net-hero', '.cat-hero');
  const start = page.getByRole('button', { name: 'Start Network' });
  await rect('net.start', start);
  await start.click();
  await shot('net-modal', 900);
  await rect('net.confirm', page.locator('#modal-ok'));
  await page.click('#modal-ok');
  for (let i = 0; i < 30; i++) {
    await wait(1000);
    const stats = await page.$eval('.cat-stats', (e) => e.textContent);
    if (!/· 0 active/.test(stats) && !(await page.locator('text=Checking settings').count())) break;
  }
  await shot('net-done', 2500);
  await crop('el-net-hero-on', '.cat-hero');

  // Debloat.
  await nav('[data-cat="debloat"]');
  await shot('debloat-0', 2200);

  // Remaining real pages for the montage.
  for (const [name, sel] of [['profiles', '[data-go="profiles"]'], ['safemode', '[data-go="safemode"]'], ['cleanup', '[data-go="cleanup"]'],
    ['hitreg', '[data-go="hitreg"]'], ['privacy', '[data-cat="privacy"]'], ['services', '[data-cat="services"]']]) {
    await nav(sel); await shot(name, 2200);
  }
  await nav('[data-go="home"]');
  await shot('home-after', 2500);

  await browser.close();
  server.close();
  if (errors.length) console.warn('Renderer errors:', errors);

  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(tmp)) {
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(tmp, f), '-c:v', 'libwebp', '-quality', '92', '-compression_level', '6',
      path.join(outDir, f.replace(/\.png$/, '.webp'))]);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  const header = '// Generated by scripts/capture-ui.cjs: control positions in the 1400×860 app window (CSS px).\n';
  fs.writeFileSync(path.join(showcase, 'src', 'ui-map.js'), `${header}export const UI_SIZE = { w: ${WIDTH}, h: ${HEIGHT} };\nexport const UI_MAP = ${JSON.stringify(map, null, 2)};\n`);
  console.log(`Saved ${fs.readdirSync(outDir).length} images to ${path.relative(process.cwd(), outDir)}`);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
