#!/usr/bin/env node
// Frame-accurate export of the showcase to MP4 (H.264, 1920×1080, 60 fps).
//
// Seeks the GSAP timeline to every frame in headless Chromium and pipes the frames into ffmpeg.
// Motion blur: each output frame averages --shutter sub-frames (default 2 = 180° shutter).
// Sound: writes the animation's audio cues to out/cues.json, builds the original sound design
// with scripts/make-audio.py (Python 3 + NumPy) into out/h1t-sound-design.wav and muxes it in at -14 LUFS.
// With --music <file>, the song plays from its first note under the cue effects (no synthesised bed).
//
// Usage: node showcase/scripts/render.cjs [--lang en|de|it] [--music song.mp3] [--shutter 2] [--from 0] [--to 45]
//                                         [--crf 14] [--no-audio]
// Output: showcase/out/h1t-showcase-<lang>.mp4 (with sound) and h1t-showcase-<lang>-silent.mp4
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { chromium } = require('playwright');
const { createServer } = require('./serve.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const shutter = Math.max(1, Number(opt('shutter', 2)));
const crf = String(opt('crf', 14));
const withAudio = !args.includes('--no-audio');
const lang = opt('lang', 'en');
const music = opt('music', '');
if (!['en', 'de', 'it'].includes(lang)) { console.error('--lang must be en, de or it'); process.exit(1); }
if (music && !fs.existsSync(music)) { console.error(`Music file not found: ${music}`); process.exit(1); }
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'out');
fs.mkdirSync(outDir, { recursive: true });

function run(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} failed`);
}

(async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, r));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto(`http://localhost:${server.address().port}/index.html?render&lang=${lang}`);
  await page.waitForFunction(() => window.__showcaseReady === true, null, { timeout: 120000 });
  const info = await page.evaluate(() => {
    const s = window.__showcase;
    return { duration: s.duration, fps: s.fps, cues: s.cues };
  });

  const from = Number(opt('from', 0));
  const to = Math.min(info.duration, Number(opt('to', info.duration)));
  const rate = info.fps * shutter;
  const frames = Math.round((to - from) * rate);
  const silent = path.join(outDir, `h1t-showcase-${lang}-silent.mp4`);
  console.log(`Rendering ${(to - from).toFixed(2)} s: ${frames} frames at ${rate} fps → ${info.fps} fps (shutter ${shutter})`);

  const filters = shutter > 1 ? ['-vf', `tmix=frames=${shutter},fps=${info.fps}`] : [];
  const ffmpeg = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(rate), '-c:v', 'mjpeg', '-i', '-',
    ...filters, '-r', String(info.fps), '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))));

  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    // Sub-frames sit inside each output frame's exposure, so the blur trails behind the motion.
    const t = from + i / rate;
    await page.evaluate((time) => window.__showcase.frame(time), t);
    const jpeg = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ffmpeg.stdin.write(jpeg)) await new Promise((r) => ffmpeg.stdin.once('drain', r));
    if (i % (rate * 2) === 0) {
      const elapsed = (Date.now() - started) / 1000;
      const eta = i ? (elapsed / i) * (frames - i) : 0;
      console.log(`  ${t.toFixed(1)} s  (${Math.round((i / frames) * 100)} %, ~${Math.round(eta)} s left)`);
    }
  }
  ffmpeg.stdin.end();
  await done;
  await browser.close();
  server.close();
  console.log(`Video: ${path.relative(process.cwd(), silent)}`);

  if (!withAudio) return;
  const cuesFile = path.join(outDir, 'cues.json');
  fs.writeFileSync(cuesFile, `${JSON.stringify({ duration: info.duration, cues: info.cues }, null, 2)}\n`);
  const wav = path.join(outDir, music ? 'h1t-sfx-only.wav' : 'h1t-sound-design.wav');
  const py = spawnSync('python3', [path.join(__dirname, 'make-audio.py'), cuesFile, wav, ...(music ? ['--sfx-only'] : [])], { stdio: 'inherit' });
  if (py.status !== 0) { console.warn('Sound design skipped (needs Python 3 with NumPy). The silent video is ready.'); return; }
  const final = path.join(outDir, `h1t-showcase-${lang}.mp4`);
  const offset = ['-ss', String(from), '-t', String(to - from)];
  const encode = ['-ar', '48000', '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart', final];
  if (music) {
    // Song from its first note (leading silence removed), faded out with the logo; cue effects quietly on top.
    const length = to - from;
    const song = `[1:a]aresample=48000,silenceremove=start_periods=1:start_threshold=-50dB,atrim=${from}:${to},asetpts=PTS-STARTPTS,`
      + `afade=t=in:st=0:d=0.05,afade=t=out:st=${Math.max(0, length - 3.2)}:d=3,volume=0.9[m]`;
    run('ffmpeg', ['-loglevel', 'error', '-y', '-i', silent, '-i', music, ...offset, '-i', wav, '-filter_complex',
      `${song};[2:a]volume=0.6[s];[m][s]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1:LRA=11[a]`,
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', ...encode]);
  } else {
    run('ffmpeg', ['-loglevel', 'error', '-y', '-i', silent, ...offset, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
      '-af', 'loudnorm=I=-14:TP=-1:LRA=11', ...encode]);
  }
  console.log(`Video with sound: ${path.relative(process.cwd(), final)}`);
})().catch((e) => { console.error(e); process.exit(1); });
