// Scene 3 (12–25 s): four real categories, each with real interaction in the app window
// and a close-up of the control that changes.
import { COPY, SCENES } from '../config.js';
import {
  EASE, chipOn, click, createChip, createScreen, cursorOut, cursorTo, el, hideText, revealText, scene, showFrame, showScene, splitText, sweep,
} from '../lib/motion.js';

// What happens in the app for each feature (times relative to the block start).
const BLOCKS = [
  {
    frames: ['perf-0', 'perf-1', 'perf-2', 'perf-3', 'perf-4'],
    chip: { off: 'el-perf-card-off', on: 'el-perf-card-on', scale: 1.55, at: 0.85 },
    play(tl, screen, s, cue) {
      [0, 1, 2, 3].forEach((i) => {
        const at = s + 0.75 + i * 0.42;
        cursorTo(tl, screen, `perf.switch${i}`, at - 0.36, { duration: 0.32 });
        click(tl, screen, `perf.switch${i}`, at, cue);
        showFrame(tl, screen, `perf-${i + 1}`, at + 0.04, { duration: 0.22 });
      });
    },
  },
  {
    frames: ['gaming-0', 'gaming-1', 'gaming-2', 'gaming-3', 'gaming-4'],
    chip: { off: 'el-gt-card-off', on: 'el-gt-card-on', scale: 1.25, at: 0.85 },
    play(tl, screen, s, cue) {
      [1, 2, 3, 4].forEach((step, i) => {
        const at = s + 0.75 + i * 0.42;
        cursorTo(tl, screen, `gaming.toggle${step}`, at - 0.36, { duration: 0.32 });
        click(tl, screen, `gaming.toggle${step}`, at, cue);
        showFrame(tl, screen, `gaming-${step}`, at + 0.04, { duration: 0.22 });
      });
    },
  },
  {
    frames: ['net-0', 'net-modal', 'net-done'],
    chip: { off: 'el-net-hero', on: 'el-net-hero-on', scale: 0.82, at: 1.95, wide: true },
    play(tl, screen, s, cue) {
      cursorTo(tl, screen, 'net.start', s + 0.35, { duration: 0.5 });
      click(tl, screen, 'net.start', s + 0.9, cue);
      showFrame(tl, screen, 'net-modal', s + 0.95, { duration: 0.28 });
      cursorTo(tl, screen, 'net.confirm', s + 1.15, { duration: 0.45 });
      click(tl, screen, 'net.confirm', s + 1.7, cue);
      showFrame(tl, screen, 'net-done', s + 1.78, { duration: 0.45 });
    },
  },
  {
    frames: ['debloat-0'],
    chip: null,
    play(tl, screen, s) {
      // Slow push onto the real list of removable app groups.
      tl.to(screen.view, { scale: 1.16, x: -50, y: -70, duration: 2.6, ease: EASE.camera }, s + 0.35);
    },
  },
];

const BLOCK_LENGTH = (SCENES.features.end - SCENES.features.start) / BLOCKS.length;

export function buildFeatures(tl, ctx) {
  const { start: t0, end } = SCENES.features;
  const root = scene(ctx.stage, 'features');
  showScene(tl, root, t0, end);
  ctx.atmo(tl, { level: 0.32, drift: 0, duration: 1 }, t0);

  BLOCKS.forEach((block, index) => {
    const copy = COPY.features[index];
    const s = t0 + index * BLOCK_LENGTH;
    const e = s + BLOCK_LENGTH;
    const mirrored = index % 2 === 1;
    const side = mirrored ? -1 : 1;

    const wrap = el('div', `feature${mirrored ? ' mirrored' : ''}`, root);
    const cam = el('div', 'cam', wrap);
    const rig = el('div', 'rig feature-rig', cam);
    const screen = createScreen(rig, block.frames);
    const chip = block.chip ? createChip(cam, block.chip.off, block.chip.on, { scale: block.chip.scale, className: block.chip.wide ? 'wide' : '' }) : null;
    const text = el('div', 'feature-text', wrap);
    const counter = el('div', 'mono-label counter', text, `0${index + 1} <i></i> 0${BLOCKS.length}`);
    const label = el('div', 'mono-label feature-label', text, copy.label);
    const headline = splitText(text, copy.headline, { by: 'words', className: 'headline lg' });
    const rule = el('div', 'rule', text);

    gsap.set(wrap, { autoAlpha: 0 });
    gsap.set(rig, { x: 520 * side, rotationY: -40 * side, rotationX: 6, z: -500, opacity: 0 });
    gsap.set([counter, label], { opacity: 0, y: 14 });
    gsap.set(rule, { scaleX: 0 });
    if (chip) gsap.set(chip.root, { opacity: 0, y: 60, z: -80, rotationY: -10 * side });

    tl.set(wrap, { autoAlpha: 1 }, s);
    tl.set(wrap, { autoAlpha: 0 }, e);

    // In.
    tl.to(rig, { x: 0, rotationY: -15 * side, rotationX: 5, z: 0, opacity: 1, duration: 1.0, ease: EASE.out }, s);
    tl.to(rig, { rotationY: -9 * side, z: 70, duration: BLOCK_LENGTH - 1.0, ease: 'none' }, s + 1.0);
    sweep(tl, screen.glare, s + 0.25, { duration: 1.3 });
    tl.to(counter, { opacity: 1, y: 0, duration: 0.7, ease: EASE.out }, s + 0.1);
    tl.to(label, { opacity: 1, y: 0, duration: 0.7, ease: EASE.out }, s + 0.18);
    revealText(tl, headline.units, s + 0.26, { duration: 0.95, stagger: 0.07 });
    tl.to(rule, { scaleX: 1, duration: 1.4, ease: EASE.inOut }, s + 0.3);
    ctx.cue('whoosh', s, { duration: 0.7, gain: index === 0 ? 0.8 : 0.55 });
    ctx.cue('tick', s + 0.26);

    // Real interaction.
    block.play(tl, screen, s, ctx.cue);
    if (block.frames.length > 1) cursorOut(tl, screen, s + 2.55);
    if (chip) {
      const c = s + block.chip.at;
      tl.to(chip.root, { opacity: 1, y: 0, z: 140, rotationY: -6 * side, duration: 0.8, ease: EASE.out }, c - 0.55);
      chipOn(tl, chip, c);
      sweep(tl, chip.band, c + 0.05, { duration: 0.9 });
      tl.to(chip.root, { y: -18, duration: 1.6, ease: 'none' }, c + 0.25);
    }

    // Out.
    const out = e - 0.42;
    hideText(tl, headline.units, out, { duration: 0.36, stagger: 0.03 });
    tl.to([counter, label, rule], { opacity: 0, duration: 0.3 }, out);
    tl.to(rig, { x: -560 * side, rotationY: 30 * side, z: -300, opacity: 0, duration: 0.46, ease: EASE.exit }, out);
    if (chip) tl.to(chip.root, { opacity: 0, z: 260, duration: 0.4, ease: EASE.exit }, out);
  });
}
