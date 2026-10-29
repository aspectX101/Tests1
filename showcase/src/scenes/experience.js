// Scene 4 (25–35 s): faster montage on the beat grid. Rotating close-ups of the real sidebar and controls,
// a wall of real pages, and the three typography beats.
import { COPY, SCENES, UI } from '../config.js';
import {
  EASE, addSweep, chipOn, createChip, createScreen, el, hideText, img, revealText, scene, showScene, splitText, sweep,
} from '../lib/motion.js';

const WALL = ['profiles', 'safemode', 'hitreg', 'cleanup', 'home-after', 'services', 'privacy', 'net-done', 'perf-4'];

export function buildExperience(tl, ctx) {
  const { start: t0, end } = SCENES.experience;
  const root = scene(ctx.stage, 'experience');
  showScene(tl, root, t0, end);
  const shot = (name) => {
    const node = el('div', `shot ${name}`, root);
    gsap.set(node, { autoAlpha: 0 });
    return node;
  };
  const cut = (node, from, to) => {
    tl.set(node, { autoAlpha: 1 }, from);
    tl.set(node, { autoAlpha: 0 }, to);
  };
  ctx.atmo(tl, { level: 0.75, drift: -30, duration: 1.2 }, t0);

  // A · 25.0–26.5 — the real sidebar turning in space, "LESS CLUTTER."
  const a = shot('shot-sidebar');
  const aCam = el('div', 'cam', a);
  const sidebar = el('div', 'macro sidebar-macro', aCam);
  img(UI('el-sidebar'), 'macro-img', sidebar);
  const sidebarBand = addSweep(sidebar, { strength: 0.3, width: 40 });
  const aText = splitText(a, COPY.experience[0], { by: 'chars', className: 'headline xl left' });
  cut(a, t0, t0 + 1.5);
  gsap.set(sidebar, { rotationY: -58, rotationX: 10, z: -250, x: 260 });
  tl.to(sidebar, { rotationY: 24, rotationX: 4, z: 80, x: 420, duration: 1.5, ease: 'power2.inOut' }, t0);
  sweep(tl, sidebarBand, t0 + 0.3, { duration: 0.9 });
  revealText(tl, aText.units, t0 + 0.12, { duration: 0.8, stagger: 0.02 });
  hideText(tl, aText.units, t0 + 1.2, { duration: 0.3, stagger: 0.006 });
  ctx.cue('impact', t0, { gain: 0.55 });
  ctx.cue('whoosh', t0 + 0.1, { duration: 1.2, gain: 0.5 });

  // B · 26.5–27.5 — macro of a real switch turning on.
  const b = shot('shot-macro');
  const bCam = el('div', 'cam', b);
  const perfChip = createChip(bCam, 'el-perf-card-off', 'el-perf-card-on', { scale: 2.5, className: 'macro-chip' });
  cut(b, t0 + 1.5, t0 + 2.5);
  gsap.set(perfChip.root, { rotationY: 24, rotationX: 12, z: -160, x: 80 });
  tl.to(perfChip.root, { rotationY: -10, rotationX: 4, z: 60, x: -40, duration: 1.0, ease: 'power2.out' }, t0 + 1.5);
  chipOn(tl, perfChip, t0 + 1.9);
  sweep(tl, perfChip.band, t0 + 1.9, { duration: 0.6 });
  ctx.cue('click', t0 + 1.9);
  ctx.cue('whoosh', t0 + 1.5, { duration: 0.45, gain: 0.4 });

  // C · 27.5–28.5 — macro of a real Gaming toggle; "MORE CONTROL." lands on the beat.
  const c = shot('shot-macro');
  const cCam = el('div', 'cam', c);
  const gtChip = createChip(cCam, 'el-gt-card-off', 'el-gt-card-on', { scale: 2.3, className: 'macro-chip' });
  const cText = splitText(c, COPY.experience[1], { by: 'chars', className: 'headline xl right' });
  cut(c, t0 + 2.5, t0 + 3.5);
  gsap.set(gtChip.root, { rotationY: -26, rotationX: 8, z: -120, x: -600 });
  tl.to(gtChip.root, { rotationY: 12, rotationX: 2, z: 40, x: -520, duration: 1.0, ease: 'power2.out' }, t0 + 2.5);
  chipOn(tl, gtChip, t0 + 2.85);
  sweep(tl, gtChip.band, t0 + 2.85, { duration: 0.6 });
  revealText(tl, cText.units, t0 + 2.55, { duration: 0.75, stagger: 0.02 });
  ctx.cue('click', t0 + 2.85);
  ctx.cue('impact', t0 + 2.5, { gain: 0.5 });

  // D · 28.5–31.0 — the wall of real pages with a camera move across it.
  const d = shot('shot-wall');
  const dCam = el('div', 'cam', d);
  const wall = el('div', 'wall', dCam);
  const tiles = WALL.map((name) => {
    const tile = el('div', 'wall-tile', wall);
    img(UI(name), 'wall-img', tile);
    return tile;
  });
  const wallBand = addSweep(wall, { strength: 0.18, width: 18 });
  const dText = splitText(d, COPY.experience[1], { by: 'chars', className: 'headline xl right over' });
  cut(d, t0 + 3.5, t0 + 6.0);
  gsap.set(dText.units, { yPercent: 0 });
  gsap.set(wall, { rotationX: 52, rotationZ: -16, z: -200, x: 260, y: 40 });
  gsap.set(tiles, { opacity: 0, z: -220 });
  tl.to(tiles, { opacity: 1, z: 0, duration: 0.7, stagger: { each: 0.05, from: 'center' }, ease: EASE.out }, t0 + 3.5);
  tl.to(wall, { rotationX: 40, rotationZ: -8, z: 120, x: -260, y: -30, duration: 2.5, ease: 'power2.inOut' }, t0 + 3.5);
  sweep(tl, wallBand, t0 + 4.2, { duration: 1.4 });
  hideText(tl, dText.units, t0 + 4.4, { duration: 0.35, stagger: 0.006 });
  ctx.cue('whoosh', t0 + 3.5, { duration: 1.4, gain: 0.6 });
  ctx.cue('shimmer', t0 + 4.2, { duration: 1.3, gain: 0.6 });

  // E · 31.0–32.5 — the real dashboard after tweaking, a stat card flies forward.
  const e = shot('shot-dashboard');
  const eCam = el('div', 'cam', e);
  const eRig = el('div', 'rig', eCam);
  const dash = createScreen(eRig, ['home-after']);
  const stat = createChip(eCam, 'el-home-stat', null, { scale: 2.2, className: 'stat-chip' });
  cut(e, t0 + 6.0, t0 + 7.5);
  gsap.set(eRig, { rotationY: 26, rotationX: 10, z: -250, x: 160 });
  gsap.set(stat.root, { opacity: 0, z: -100, x: -330, y: 120, rotationY: 18 });
  tl.to(eRig, { rotationY: -6, rotationX: 6, z: -60, x: 0, duration: 1.5, ease: 'power2.out' }, t0 + 6.0);
  sweep(tl, dash.glare, t0 + 6.2, { duration: 1.0 });
  tl.to(stat.root, { opacity: 1, z: 260, x: -420, y: 150, rotationY: 8, duration: 1.0, ease: EASE.out }, t0 + 6.4);
  sweep(tl, stat.band, t0 + 6.8, { duration: 0.7 });
  ctx.cue('impact', t0 + 6.0, { gain: 0.45 });
  ctx.cue('whoosh', t0 + 6.35, { duration: 0.7, gain: 0.45 });

  // F · 32.5–35.0 — "BUILT FOR PERFORMANCE." over a blurred, turning app.
  const f = shot('shot-type');
  const fCam = el('div', 'cam', f);
  const fRig = el('div', 'rig blurred', fCam);
  createScreen(fRig, ['perf-4']);
  const fText = splitText(f, COPY.experience[2], { by: 'words', className: 'headline xxl' });
  const fRule = el('div', 'rule center', f);
  cut(f, t0 + 7.5, end);
  gsap.set(fRig, { rotationY: -24, z: -500, opacity: 0 });
  gsap.set(fRule, { scaleX: 0 });
  tl.to(fRig, { rotationY: 18, z: -380, opacity: 0.35, duration: 2.4, ease: 'none' }, t0 + 7.5);
  fText.units.forEach((unit, i) => {
    revealText(tl, [unit], t0 + 7.55 + i * 0.5, { duration: 0.9 });
    ctx.cue('impact', t0 + 7.55 + i * 0.5, { gain: 0.35 + i * 0.12 });
  });
  tl.to(fRule, { scaleX: 1, duration: 1.4, ease: EASE.inOut }, t0 + 8.2);
  ctx.atmo(tl, { level: 1, drift: -60, duration: 1.4 }, t0 + 7.5);
  tl.to(f, { opacity: 0, duration: 0.55, ease: 'power2.in' }, end - 0.6);
  ctx.atmo(tl, { level: 0.25, drift: 0, duration: 0.8 }, end - 0.6);
  ctx.cue('reverse', end - 0.9, { duration: 0.9 });
}
