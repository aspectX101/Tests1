#!/usr/bin/env node
// Builds the stream overlay: overlay/template.html → overlay/h1t-overlay.html with fonts and logo embedded,
// so the single file works as an OBS / Streamlabs browser source without a server or internet.
//
// Usage: node showcase/scripts/build-overlay.cjs [--video]
//   --video  also renders per language, as transparent WebM (VP9 with alpha, 1920×1080, 60 fps) in showcase/out/:
//              h1t-overlay-<lang>-loop.webm  the permanent banner as a seamless loop (media source with "Loop")
//              h1t-overlay-<lang>.webm       one appearance: in, rotating lines, out (for video editing)
//            Needs playwright + ffmpeg.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const fonts = path.join(root, 'assets', 'fonts');
const b64 = (file) => fs.readFileSync(file).toString('base64');

// The logo is shown 150 px wide; a 450 px WebP keeps it sharp at 3× and small.
const tmpLogo = path.join(os.tmpdir(), `h1t-overlay-logo-${process.pid}.webp`);
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(root, 'assets', 'brand', 'h1t-logo-main.png'),
  '-vf', 'scale=450:-1:flags=lanczos', '-c:v', 'libwebp', '-lossless', '0', '-quality', '95', tmpLogo]);

const html = fs.readFileSync(path.join(root, 'overlay', 'template.html'), 'utf8')
  .replaceAll('{{FONT_600}}', b64(path.join(fonts, 'inter-tight-latin-600-normal.woff2')))
  .replaceAll('{{FONT_700}}', b64(path.join(fonts, 'inter-tight-latin-700-normal.woff2')))
  .replaceAll('{{MONO_500}}', b64(path.join(fonts, 'jetbrains-mono-latin-500-normal.woff2')))
  .replaceAll('{{LOGO}}', b64(tmpLogo));
fs.rmSync(tmpLogo);
const target = path.join(root, 'overlay', 'h1t-overlay.html');
fs.writeFileSync(target, html);
console.log(`Overlay: ${path.relative(process.cwd(), target)} (${Math.round(html.length / 1024)} KB)`);

if (process.argv.includes('--video')) {
  renderVideos(target).catch((e) => { console.error(e); process.exit(1); });
}

async function renderVideos(file) {
  const { chromium } = require('playwright');
  const outDir = path.join(root, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const fps = 60;
  const browser = await chromium.launch();
  for (const lang of ['en', 'de', 'it']) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(`file://${file}?render&lang=${lang}`);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.__overlay.prepare(true));
    const loop = await page.evaluate(() => ({ start: window.__overlay.loopStart, length: window.__overlay.loop }));
    await encode(page, path.join(outDir, `h1t-overlay-${lang}-loop.webm`), loop.start, loop.length, fps);
    const duration = await page.evaluate(() => { window.__overlay.prepare(); return window.__overlay.duration; });
    await encode(page, path.join(outDir, `h1t-overlay-${lang}.webm`), 0, duration, fps);
    await page.close();
  }
  await browser.close();
}

async function encode(page, webm, from, duration, fps) {
  const ffmpeg = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '24', '-row-mt', '1', '-auto-alt-ref', '0', webm],
  { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}`)))));
  const frames = Math.round(duration * fps);
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => new Promise((r) => { window.__overlay.seek(t); requestAnimationFrame(() => requestAnimationFrame(r)); }), from + i / fps);
    const png = await page.screenshot({ omitBackground: true });
    if (!ffmpeg.stdin.write(png)) await new Promise((r) => ffmpeg.stdin.once('drain', r));
  }
  ffmpeg.stdin.end();
  await done;
  console.log(`Video: ${path.relative(process.cwd(), webm)}`);
}
