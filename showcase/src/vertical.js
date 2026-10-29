// The 9:16 cut (1080×1920) for TikTok, Reels and Shorts: the same real UI and motion language as the film,
// recomposed for a phone. Text, logo and Discord stay inside the area TikTok's buttons and caption leave free
// (roughly x 60–940, y 220–1500).
import { BRAND, COPY, SCENES_VERTICAL as S, UI } from './config.js';
import {
  EASE, addStreak, addSweep, chipOn, click, createChip, createScreen, cursorOut, cursorTo, el, glitch, hideText, img, revealText,
  scene, showFrame, showScene, splitText, streak, sweep, trackIn,
} from './lib/motion.js';

export function buildVertical(tl, ctx) {
  hook(tl, ctx);
  reveal(tl, ctx);
  features(tl, ctx);
  montage(tl, ctx);
  finale(tl, ctx);
}

// 0–2.6 s: the logo lands within the first second.
function hook(tl, ctx) {
  const { start: t0, end } = S.hook;
  const root = scene(ctx.stage, 'v-hook');
  const cam = el('div', 'cam', root);
  const line = el('div', 'slit-line v-line', cam);
  const lineTop = el('div', 'slit-line v-line', cam);
  const lineBottom = el('div', 'slit-line v-line', cam);
  const logoBox = el('div', 'logo-box v-logo', cam);
  img(BRAND.logo, 'logo-img', logoBox);
  const band = addSweep(logoBox, { mask: BRAND.logo, strength: 0.9, width: 22 });
  const halo = el('div', 'logo-halo v-halo', cam);
  const title = el('div', 'v-hook-title', cam);
  const wordmark = el('div', 'wordmark', title, COPY.intro.wordmark);
  const lines = COPY.intro.tagline.map((text) => splitText(title, text, { by: 'words', className: 'headline v-xl', maxWidth: 820 }));
  const exit = addStreak(root, '50%');
  showScene(tl, root, t0, end);

  gsap.set(cam, { scale: 1.18, rotationX: 14, y: 30 });
  gsap.set(line, { scaleX: 0, opacity: 0 });
  gsap.set([lineTop, lineBottom], { opacity: 0 });
  gsap.set(logoBox, { clipPath: 'inset(50% 0% 50% 0%)', filter: 'brightness(2.2)' });
  gsap.set(halo, { opacity: 0, scale: 0.6 });

  ctx.cue('riser', t0, { duration: 0.6 });
  tl.to(line, { opacity: 1, duration: 0.15 }, t0 + 0.05);
  tl.to(line, { scaleX: 1, duration: 0.5, ease: EASE.inOut }, t0 + 0.05);
  ctx.atmo(tl, { level: 0.45, duration: 1.5 }, t0 + 0.3);

  const hit = t0 + 0.6;
  tl.set(line, { opacity: 0 }, hit);
  tl.set([lineTop, lineBottom], { opacity: 1, y: 0 }, hit);
  tl.to(lineTop, { y: -230, opacity: 0, duration: 0.8, ease: EASE.out }, hit);
  tl.to(lineBottom, { y: 230, opacity: 0, duration: 0.8, ease: EASE.out }, hit);
  tl.to(logoBox, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: EASE.out }, hit);
  tl.to(logoBox, { filter: 'brightness(1)', duration: 1.1, ease: 'power2.out' }, hit);
  tl.to(halo, { keyframes: [{ opacity: 1, scale: 1, duration: 0.2 }, { opacity: 0.3, duration: 1.4 }] }, hit);
  ctx.flash(tl, hit, 0.05);
  ctx.cue('impact', hit);
  ctx.cue('glitch', hit + 0.02, { duration: 0.28 });
  glitch(tl, logoBox, hit + 0.02, { duration: 0.28, seed: 5, strength: 1.2 });
  tl.to(cam, { scale: 1, rotationX: 0, y: 0, duration: 2, ease: EASE.settle }, hit);
  sweep(tl, band, t0 + 1.0, { duration: 0.9 });
  ctx.cue('shimmer', t0 + 1.0, { duration: 0.9 });

  trackIn(tl, wordmark, t0 + 0.9, { from: '1em', to: '0.42em', duration: 1.1 });
  lines.forEach((l, i) => { revealText(tl, l.units, t0 + 1.15 + i * 0.22, { duration: 0.8, stagger: 0.08 }); ctx.cue('tick', t0 + 1.15 + i * 0.22); });

  ctx.cue('whoosh', end - 0.4, { duration: 0.6 });
  tl.to(cam, { scale: 1.4, opacity: 0, filter: 'blur(10px)', duration: 0.45, ease: EASE.exit }, end - 0.45);
  streak(tl, exit, end - 0.2, { duration: 0.4 });
}

// 2.6–6.4 s: the real app rises, two real tab clicks, "CONTROL EVERY DETAIL."
function reveal(tl, ctx) {
  const { start: t0, end } = S.reveal;
  const root = scene(ctx.stage, 'v-reveal');
  const text = el('div', 'v-top', root);
  const label = el('div', 'mono-label', text, COPY.reveal.label);
  const headline = splitText(text, COPY.reveal.headline, { by: 'words', className: 'headline v-lg' });
  const cam = el('div', 'cam', root);
  const rig = el('div', 'rig', cam);
  const screen = createScreen(rig, ['home', 'perf-0', 'gaming-0']);
  showScene(tl, root, t0, end);

  gsap.set(rig, { scale: 0.74, rotationX: 48, rotationY: -26, rotationZ: 8, z: -1400, y: 320 });
  gsap.set(screen.shade, { opacity: 1 });
  gsap.set(label, { opacity: 0, y: 12 });

  ctx.cue('swell', t0, { duration: 1.4 });
  tl.to(rig, { scale: 0.8, rotationX: 8, rotationY: -12, rotationZ: 0, z: 0, y: 30, duration: 1.5, ease: EASE.settle }, t0);
  tl.to(screen.shade, { opacity: 0, duration: 1.1, ease: 'power2.inOut' }, t0 + 0.15);
  sweep(tl, screen.glare, t0 + 0.7, { duration: 1.1 });
  tl.to(label, { opacity: 1, y: 0, duration: 0.6, ease: EASE.out }, t0 + 0.3);
  revealText(tl, headline.units, t0 + 0.4, { duration: 0.85, stagger: 0.08 });
  ctx.cue('impact', t0 + 0.4, { gain: 0.5 });

  // Closer, onto the sidebar: real clicks.
  tl.to(rig, { scale: 1.05, rotationX: 4, rotationY: 6, x: 560, y: 60, duration: 1.0, ease: EASE.camera }, t0 + 1.4);
  cursorTo(tl, screen, 'nav.performance', t0 + 1.5, { duration: 0.5 });
  click(tl, screen, 'nav.performance', t0 + 2.05, ctx.cue);
  showFrame(tl, screen, 'perf-0', t0 + 2.1, { duration: 0.25 });
  cursorTo(tl, screen, 'nav.gaming', t0 + 2.3, { duration: 0.35 });
  click(tl, screen, 'nav.gaming', t0 + 2.7, ctx.cue);
  showFrame(tl, screen, 'gaming-0', t0 + 2.75, { duration: 0.25 });
  cursorOut(tl, screen, t0 + 3.1);

  hideText(tl, headline.units, end - 0.45, { duration: 0.35, stagger: 0.03 });
  tl.to(label, { opacity: 0, duration: 0.25 }, end - 0.45);
  tl.to(rig, { x: -900, rotationY: -40, opacity: 0, duration: 0.45, ease: EASE.exit }, end - 0.45);
  ctx.cue('whoosh', end - 0.45, { duration: 0.6 });
}

// 6.4–16.4 s: four real categories, 2.5 s each.
const BLOCKS = [
  {
    frames: ['perf-0', 'perf-1', 'perf-2', 'perf-3', 'perf-4'],
    chip: { off: 'el-perf-card-off', on: 'el-perf-card-on', scale: 2.0, at: 0.65 },
    play(tl, screen, s, cue) {
      [0, 1, 2, 3].forEach((i) => {
        const at = s + 0.6 + i * 0.3;
        cursorTo(tl, screen, `perf.switch${i}`, at - 0.26, { duration: 0.24 });
        click(tl, screen, `perf.switch${i}`, at, cue);
        showFrame(tl, screen, `perf-${i + 1}`, at + 0.03, { duration: 0.18 });
      });
    },
  },
  {
    frames: ['gaming-0', 'gaming-1', 'gaming-2', 'gaming-3', 'gaming-4'],
    chip: { off: 'el-gt-card-off', on: 'el-gt-card-on', scale: 1.4, at: 0.65 },
    play(tl, screen, s, cue) {
      [1, 2, 3, 4].forEach((step, i) => {
        const at = s + 0.6 + i * 0.3;
        cursorTo(tl, screen, `gaming.toggle${step}`, at - 0.26, { duration: 0.24 });
        click(tl, screen, `gaming.toggle${step}`, at, cue);
        showFrame(tl, screen, `gaming-${step}`, at + 0.03, { duration: 0.18 });
      });
    },
  },
  {
    frames: ['net-0', 'net-modal', 'net-done'],
    chip: { off: 'el-net-hero', on: 'el-net-hero-on', scale: 0.8, at: 1.5 },
    play(tl, screen, s, cue) {
      cursorTo(tl, screen, 'net.start', s + 0.25, { duration: 0.35 });
      click(tl, screen, 'net.start', s + 0.65, cue);
      showFrame(tl, screen, 'net-modal', s + 0.7, { duration: 0.22 });
      cursorTo(tl, screen, 'net.confirm', s + 0.85, { duration: 0.35 });
      click(tl, screen, 'net.confirm', s + 1.25, cue);
      showFrame(tl, screen, 'net-done', s + 1.3, { duration: 0.35 });
    },
  },
  {
    frames: ['debloat-0'],
    chip: null,
    play(tl, screen, s) {
      tl.to(screen.view, { scale: 1.25, x: -60, y: -90, duration: 2.1, ease: EASE.camera }, s + 0.25);
    },
  },
];

function features(tl, ctx) {
  const { start: t0, end } = S.features;
  const root = scene(ctx.stage, 'v-features');
  showScene(tl, root, t0, end);
  const length = (end - t0) / BLOCKS.length;

  BLOCKS.forEach((block, index) => {
    const copy = COPY.features[index];
    const s = t0 + index * length;
    const e = s + length;
    const side = index % 2 ? -1 : 1;
    const wrap = el('div', 'v-feature', root);
    const text = el('div', 'v-top', wrap);
    const counter = el('div', 'mono-label counter', text, `0${index + 1} <i></i> 0${BLOCKS.length}`);
    const label = el('div', 'mono-label v-label', text, copy.label);
    const headline = splitText(text, copy.headline, { by: 'words', className: 'headline v-lg' });
    const cam = el('div', 'cam', wrap);
    const rig = el('div', 'rig', cam);
    const screen = createScreen(rig, block.frames);
    const chip = block.chip ? createChip(cam, block.chip.off, block.chip.on, { scale: block.chip.scale, className: 'v-chip' }) : null;

    gsap.set(wrap, { autoAlpha: 0 });
    gsap.set(rig, { scale: 0.8, x: 700 * side, y: 110, rotationY: -36 * side, rotationX: 6, z: -300, opacity: 0 });
    gsap.set([counter, label], { opacity: 0, y: 12 });
    if (chip) gsap.set(chip.root, { opacity: 0, y: 520, z: -60 });
    tl.set(wrap, { autoAlpha: 1 }, s);
    tl.set(wrap, { autoAlpha: 0 }, e);

    tl.to(rig, { x: 0, rotationY: -10 * side, z: 0, opacity: 1, duration: 0.7, ease: EASE.out }, s);
    tl.to(rig, { rotationY: -5 * side, z: 50, duration: length - 0.7, ease: 'none' }, s + 0.7);
    sweep(tl, screen.glare, s + 0.2, { duration: 1.0 });
    tl.to([counter, label], { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: EASE.out }, s + 0.05);
    revealText(tl, headline.units, s + 0.15, { duration: 0.75, stagger: 0.06 });
    ctx.cue('whoosh', s, { duration: 0.5, gain: 0.55 });
    ctx.cue('tick', s + 0.15);

    block.play(tl, screen, s, ctx.cue);
    if (block.frames.length > 1) cursorOut(tl, screen, s + 1.9);
    if (chip) {
      const c = s + block.chip.at;
      tl.to(chip.root, { opacity: 1, y: 440, z: 120, duration: 0.6, ease: EASE.out }, c - 0.4);
      chipOn(tl, chip, c);
      sweep(tl, chip.band, c + 0.05, { duration: 0.8 });
    }

    const out = e - 0.32;
    hideText(tl, headline.units, out, { duration: 0.28, stagger: 0.02 });
    tl.to([counter, label], { opacity: 0, duration: 0.2 }, out);
    tl.to(rig, { x: -700 * side, rotationY: 30 * side, opacity: 0, duration: 0.34, ease: EASE.exit }, out);
    if (chip) tl.to(chip.root, { opacity: 0, z: 240, duration: 0.3, ease: EASE.exit }, out);
  });
}

// 16.4–21 s: faster montage and the three typography beats.
function montage(tl, ctx) {
  const { start: t0, end } = S.montage;
  const root = scene(ctx.stage, 'v-montage');
  showScene(tl, root, t0, end);
  const shot = (from, to) => {
    const node = el('div', 'shot', root);
    gsap.set(node, { autoAlpha: 0 });
    tl.set(node, { autoAlpha: 1 }, from);
    tl.set(node, { autoAlpha: 0 }, to);
    return node;
  };
  ctx.atmo(tl, { level: 0.8, drift: -30, duration: 1 }, t0);

  // The real sidebar turning, "LESS CLUTTER."
  const a = shot(t0, t0 + 1.5);
  const aText = el('div', 'v-top', a);
  const aHead = splitText(aText, COPY.experience[0], { by: 'words', className: 'headline v-xl' });
  const aCam = el('div', 'cam', a);
  const sidebar = el('div', 'macro v-sidebar', aCam);
  img(UI('el-sidebar'), 'macro-img', sidebar);
  const aBand = addSweep(sidebar, { strength: 0.3, width: 40 });
  gsap.set(sidebar, { rotationY: -55, rotationX: 10, z: -260, y: 120 });
  tl.to(sidebar, { rotationY: 28, rotationX: 4, z: 60, y: 140, duration: 1.5, ease: 'power2.inOut' }, t0);
  sweep(tl, aBand, t0 + 0.3, { duration: 0.8 });
  revealText(tl, aHead.units, t0 + 0.05, { duration: 0.7, stagger: 0.07 });
  ctx.cue('impact', t0, { gain: 0.55 });
  ctx.cue('whoosh', t0 + 0.05, { duration: 1.0, gain: 0.5 });

  // The wall of real pages, "MORE CONTROL."
  const b = shot(t0 + 1.5, t0 + 3.0);
  const bText = el('div', 'v-top', b);
  const bHead = splitText(bText, COPY.experience[1], { by: 'words', className: 'headline v-xl' });
  const bCam = el('div', 'cam', b);
  const wall = el('div', 'wall v-wall', bCam);
  const tiles = ['profiles', 'safemode', 'hitreg', 'cleanup', 'home-after', 'services', 'privacy', 'net-done', 'perf-4'].map((name) => {
    const tile = el('div', 'wall-tile', wall);
    img(UI(name), 'wall-img', tile);
    return tile;
  });
  const bBand = addSweep(wall, { strength: 0.18, width: 18 });
  gsap.set(wall, { rotationX: 50, rotationZ: -22, z: -300, y: 260 });
  gsap.set(tiles, { opacity: 0, z: -200 });
  tl.to(tiles, { opacity: 1, z: 0, duration: 0.5, stagger: { each: 0.035, from: 'center' }, ease: EASE.out }, t0 + 1.5);
  tl.to(wall, { rotationX: 38, rotationZ: -10, z: 80, y: 200, duration: 1.5, ease: 'power2.inOut' }, t0 + 1.5);
  sweep(tl, bBand, t0 + 1.9, { duration: 1.0 });
  revealText(tl, bHead.units, t0 + 1.55, { duration: 0.7, stagger: 0.07 });
  ctx.cue('impact', t0 + 1.5, { gain: 0.5 });
  ctx.cue('shimmer', t0 + 1.9, { duration: 1.0, gain: 0.6 });

  // "BUILT FOR PERFORMANCE." — one word per beat over a blurred, turning app.
  const c = shot(t0 + 3.0, end);
  const cCam = el('div', 'cam', c);
  const cRig = el('div', 'rig blurred', cCam);
  createScreen(cRig, ['perf-4']);
  const cBox = el('div', 'v-center', c);
  // One word per line, each fitted to the width (long words in German and Italian).
  const cHead = { units: COPY.experience[2].split(' ').flatMap((word) => splitText(cBox, word, { by: 'words', className: 'headline v-xxl', maxWidth: 900 }).units) };
  const rule = el('div', 'rule center v-rule', c);
  gsap.set(cRig, { scale: 0.9, rotationY: -24, z: -500, opacity: 0 });
  gsap.set(rule, { scaleX: 0 });
  tl.to(cRig, { rotationY: 18, z: -380, opacity: 0.35, duration: end - t0 - 3.0, ease: 'none' }, t0 + 3.0);
  const step = Math.min(0.32, 0.8 / Math.max(1, cHead.units.length - 1));
  cHead.units.forEach((unit, i) => {
    revealText(tl, [unit], t0 + 3.05 + i * step, { duration: 0.7 });
    ctx.cue('impact', t0 + 3.05 + i * step, { gain: 0.35 + i * 0.1 });
  });
  tl.to(rule, { scaleX: 1, duration: 1.0, ease: EASE.inOut }, t0 + 3.5);
  tl.to(c, { opacity: 0, duration: 0.35, ease: 'power2.in' }, end - 0.35);
  ctx.atmo(tl, { level: 0.3, drift: 0, duration: 0.5 }, end - 0.35);
}

// 21–25 s: logo, closing lines, Discord, fade to black (clean for TikTok's loop).
function finale(tl, ctx) {
  const { start: t0, end } = S.finale;
  const root = scene(ctx.stage, 'v-finale');
  const cam = el('div', 'cam', root);
  const halo = el('div', 'logo-halo v-halo', cam);
  const logoBox = el('div', 'logo-box v-logo v-final-logo', cam);
  img(BRAND.logo, 'logo-img', logoBox);
  const band = addSweep(logoBox, { mask: BRAND.logo, strength: 0.95, width: 20 });
  const block = el('div', 'v-final-text', cam);
  const wordmark = el('div', 'wordmark small', block, COPY.finale.wordmark);
  const headline = splitText(block, COPY.finale.headline, { by: 'words', className: 'headline v-md' });
  const call = el('div', 'mono-label call', block, COPY.finale.call);
  const discord = el('div', 'discord v-discord', block, `<span class="dot"></span>${COPY.finale.discord}`);
  showScene(tl, root, t0, end);

  gsap.set(cam, { scale: 1.1, y: 30 });
  gsap.set(logoBox, { opacity: 0, filter: 'brightness(0.15) blur(8px)' });
  gsap.set(halo, { opacity: 0, scale: 0.7 });
  gsap.set([call, discord], { opacity: 0, y: 16 });

  ctx.cue('swell', t0, { duration: 1.2, gain: 0.8 });
  tl.to(cam, { scale: 1, y: 0, duration: 3, ease: EASE.settle }, t0 + 0.1);
  tl.to(logoBox, { opacity: 1, filter: 'brightness(1) blur(0px)', duration: 1.0, ease: 'power2.out' }, t0 + 0.15);
  tl.to(halo, { opacity: 0.35, scale: 1, duration: 1.5, ease: 'power2.out' }, t0 + 0.3);
  ctx.cue('impact', t0 + 0.4, { gain: 0.85 });
  ctx.atmo(tl, { level: 0.55, drift: -6, duration: 1.2 }, t0 + 0.2);
  sweep(tl, band, t0 + 0.7, { duration: 1.1 });
  ctx.cue('shimmer', t0 + 0.7, { duration: 1.0 });
  trackIn(tl, wordmark, t0 + 0.8, { from: '1em', to: '0.5em', duration: 1.1 });
  revealText(tl, headline.units, t0 + 1.1, { duration: 0.85, stagger: 0.07 });
  ctx.cue('tick', t0 + 1.1);
  tl.to(call, { opacity: 1, y: 0, duration: 0.6, ease: EASE.out }, t0 + 1.7);
  tl.to(discord, { opacity: 1, y: 0, duration: 0.6, ease: EASE.out }, t0 + 1.95);
  ctx.cue('tick', t0 + 1.95);

  tl.to([block, halo], { opacity: 0, duration: 0.6, ease: 'power2.in' }, end - 0.8);
  tl.to(logoBox, { opacity: 0, filter: 'brightness(0.2) blur(4px)', duration: 0.7, ease: 'power2.inOut' }, end - 0.75);
  ctx.atmo(tl, { level: 0, duration: 0.7 }, end - 0.75);
  ctx.cue('tail', end - 1.0, { duration: 1.0 });
}
