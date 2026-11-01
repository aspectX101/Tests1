#!/usr/bin/env node
// Renders the H1T.CC QuickFlash logo animation frame by frame (Chromium canvas → ffmpeg).
//   node scripts/render.cjs                 all outputs into out/
//   node scripts/render.cjs --stills 0.3,0.45,1   single frames as PNG (out/still-<t>.png) to check the look
// Options: --shutter 4 (motion-blur sub-frames), --fps 60
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const out = path.join(root, 'out');
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : def; };
const FPS = Number(arg('fps', 60)), SHUTTER = Number(arg('shutter', 5));
const logo = fs.readFileSync(path.join(root, 'assets', 'h1t-logo@2x.png')).toString('base64');
const code = fs.readFileSync(path.join(root, 'src', 'quickflash.js'), 'utf8');
const page = (transparent) => `<!doctype html><html><body style="margin:0;background:${transparent ? 'transparent' : '#000'}">
<canvas id="c"></canvas><script>${code}</script><script>
  const img = new Image();
  window.ready = new Promise((res) => { img.onload = () => { window.anim = createQuickFlash(document.getElementById('c'), img, { transparent: ${transparent} }); res(window.anim.DUR); }; });
  img.src = 'data:image/png;base64,${logo}';
  window.frame = (t) => { window.anim.renderAt(t); return document.getElementById('c').toDataURL('image/png').slice(22); };
</script></body></html>`;

async function open(browser, transparent) {
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.setContent(page(transparent));
  const dur = await p.evaluate(() => window.ready);
  const cues = await p.evaluate(() => window.anim.CUES);
  return { p, dur, cues };
}

function ffmpeg(args) {
  const proc = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => proc.on('close', (c) => (c ? rej(new Error(`ffmpeg ${c}`)) : res())));
  return { proc, done };
}

async function renderPass(browser, transparent, file) {
  const { p, dur } = await open(browser, transparent);
  const n = Math.round(Number(arg("seconds", dur)) * FPS), sub = SHUTTER;
  // sub-frames at FPS*sub, averaged (tmix) and decimated back to FPS = motion blur with a 180°-ish shutter
  const blur = sub > 1 ? `tmix=frames=${sub},select=not(mod(n+1\\,${sub})),setpts=N/(${FPS}*TB),` : '';
  const ff = ffmpeg(['-f', 'image2pipe', '-framerate', String(FPS * sub), '-c:v', 'png', '-i', '-',
    '-vf', `format=rgba,${blur}format=bgra`, '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'bgra', '-r', String(FPS), file]);
  const t0 = Date.now();
  for (let i = 0; i < n * sub; i++) {
    // sub-frames spread over half a frame before each frame time (shutter 180°)
    const f = Math.floor(i / sub), k = i % sub;
    const t = (f + 1) / FPS - (sub > 1 ? (sub - 1 - k) / (sub - 1) * 0.5 / FPS : 0);
    const b64 = await p.evaluate((tt) => window.frame(tt), t);
    if (!ff.proc.stdin.write(Buffer.from(b64, 'base64'))) await new Promise((r) => ff.proc.stdin.once('drain', r));
    if (i % (FPS * sub) === 0) process.stdout.write(`\r${transparent ? 'alpha' : 'black'} ${(f / FPS).toFixed(1)}s / ${dur}s  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  ff.proc.stdin.end(); await ff.done; await p.close();
  process.stdout.write('\n');
  return { n, dur };
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const stills = arg('stills');
  if (stills) {
    for (const transparent of [false, process.argv.includes('--alpha')].filter((v, i, a) => a.indexOf(v) === i)) {
      const { p } = await open(browser, transparent);
      for (const t of stills.split(',').map(Number)) {
        fs.writeFileSync(path.join(out, `still${transparent ? '-alpha' : ''}-${t.toFixed(2)}.png`), Buffer.from(await p.evaluate((tt) => window.frame(tt), t), 'base64'));
      }
    }
    await browser.close(); return console.log('stills written');
  }
  const { cues } = await open(browser, false);
  fs.writeFileSync(path.join(out, 'cues.json'), JSON.stringify(cues, null, 2));
  // audio
  execFileSync('python3', [path.join(__dirname, 'sfx.py'), path.join(out, 'cues.json'), path.join(out, 'h1t-quickflash.wav')], { stdio: 'inherit' });
  // picture: one pass on black, one transparent
  const rawBlack = path.join(out, 'black.mkv'), rawAlpha = path.join(out, 'alpha.mkv');   // lossless intermediates
  await renderPass(browser, false, rawBlack);
  await renderPass(browser, true, rawAlpha);
  await browser.close();
  const raw = (f) => ['-i', f];
  const enc = (args) => ffmpeg(args).done;
  const wav = path.join(out, 'h1t-quickflash.wav');
  console.log('encoding …');
  await enc([...raw(rawBlack), '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '320k', '-shortest', path.join(out, 'h1t-quickflash.mp4')]);
  await enc([...raw(rawBlack), '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(out, 'h1t-quickflash-silent.mp4')]);
  await enc([...raw(rawAlpha), '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '18', '-row-mt', '1', '-auto-alt-ref', '0', path.join(out, 'h1t-quickflash-alpha.webm')]);
  await enc([...raw(rawAlpha), '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-c:a', 'pcm_s16le', '-shortest', path.join(out, 'h1t-quickflash-alpha.mov')]);
  await enc([...raw(rawBlack), '-vf', 'fps=30,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=200:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a', '-loop', '0', path.join(out, 'h1t-quickflash.gif')]);
  fs.unlinkSync(rawBlack); fs.unlinkSync(rawAlpha);
  for (const f of fs.readdirSync(out).filter((f) => f.startsWith('h1t-'))) console.log(`${f}  ${(fs.statSync(path.join(out, f)).size / 1e6).toFixed(1)} MB`);
})().catch((e) => { console.error(e); process.exit(1); });
