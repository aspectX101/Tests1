// Scene 2 (5–12 s): the real app window rises out of the dark, the camera moves in on the sidebar
// and switches tabs with real clicks, then pulls back for "CONTROL EVERY DETAIL."
import { COPY, SCENES } from '../config.js';
import {
  EASE, addStreak, click, createScreen, cursorOut, cursorTo, el, hideText, revealText, scene, showFrame, showScene, splitText, streak, sweep,
} from '../lib/motion.js';

export function buildReveal(tl, ctx) {
  const { start: t0, end } = SCENES.reveal;
  const root = scene(ctx.stage, 'reveal');
  const cam = el('div', 'cam', root);
  const rig = el('div', 'rig', cam);
  const screen = createScreen(rig, ['home', 'perf-0', 'gaming-0', 'profiles']);
  const floor = el('div', 'floor-glow', cam);
  const text = el('div', 'reveal-text', root);
  const label = el('div', 'mono-label', text, COPY.reveal.label);
  const headline = splitText(text, COPY.reveal.headline, { by: 'chars', className: 'headline xl', maxWidth: 1680 });
  const exitStreak = addStreak(root, '52%');
  showScene(tl, root, t0, end);

  gsap.set(rig, { rotationX: 50, rotationY: -30, rotationZ: 9, z: -1500, y: 180 });
  gsap.set(screen.shade, { opacity: 1 });
  gsap.set(floor, { opacity: 0 });
  gsap.set(label, { opacity: 0, y: 12 });

  // 5.0: emerges from darkness.
  ctx.cue('swell', t0, { duration: 2.4 });
  tl.to(rig, { rotationX: 9, rotationY: -15, rotationZ: 0, z: -180, y: 0, duration: 2.6, ease: EASE.settle }, t0);
  tl.to(screen.shade, { opacity: 0, duration: 1.8, ease: 'power2.inOut' }, t0 + 0.25);
  tl.to(floor, { opacity: 1, duration: 2 }, t0 + 0.6);
  sweep(tl, screen.glare, t0 + 1.2, { duration: 1.5 });
  ctx.atmo(tl, { level: 0.5, drift: -8, duration: 2 }, t0);

  // 7.3: camera moves in on the sidebar; real tab switching.
  const near = t0 + 2.3;
  tl.to(rig, { rotationX: 3, rotationY: 7, z: 420, x: 520, y: 120, duration: 1.4, ease: EASE.camera }, near);
  ctx.cue('whoosh', near, { duration: 1.0, gain: 0.5 });
  cursorTo(tl, screen, 'nav.performance', near + 0.5, { duration: 0.55 });
  click(tl, screen, 'nav.performance', near + 1.1, ctx.cue);
  showFrame(tl, screen, 'perf-0', near + 1.15);
  cursorTo(tl, screen, 'nav.gaming', near + 1.45, { duration: 0.4 });
  click(tl, screen, 'nav.gaming', near + 1.9, ctx.cue);
  showFrame(tl, screen, 'gaming-0', near + 1.95);
  tl.to(rig, { x: 380, y: 60, rotationY: 4, duration: 1.2, ease: EASE.camera }, near + 1.5);
  cursorTo(tl, screen, 'nav.profiles', near + 2.2, { duration: 0.4 });
  click(tl, screen, 'nav.profiles', near + 2.65, ctx.cue);
  showFrame(tl, screen, 'profiles', near + 2.7);
  cursorOut(tl, screen, near + 3.1);

  // 9.9: pull back, dim the UI, headline.
  const back = t0 + 4.8;
  tl.to(rig, { rotationX: 7, rotationY: -9, z: -420, x: 0, y: -10, duration: 1.6, ease: EASE.camera }, back - 0.3);
  tl.to(screen.shade, { opacity: 0.74, duration: 0.9, ease: 'power2.inOut' }, back);
  tl.to(label, { opacity: 1, y: 0, duration: 0.8, ease: EASE.out }, back + 0.1);
  revealText(tl, headline.units, back + 0.2, { duration: 1.0, stagger: 0.022 });
  ctx.cue('impact', back + 0.2, { gain: 0.45 });

  // 11.4: exit to the side.
  const out = end - 0.65;
  hideText(tl, headline.units, out, { duration: 0.4, stagger: 0.008 });
  tl.to(label, { opacity: 0, duration: 0.3 }, out);
  tl.to(rig, { rotationY: -42, x: -900, z: -700, opacity: 0, duration: 0.65, ease: EASE.exit }, out);
  ctx.cue('whoosh', out, { duration: 0.7 });
  streak(tl, exitStreak, end - 0.3, { duration: 0.45 });
}
