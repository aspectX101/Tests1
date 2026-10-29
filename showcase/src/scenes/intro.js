// Scene 1 (0–5 s): black, a thin line of light opens on the logo, one bass impact, the title settles.
import { BRAND, COPY, SCENES } from '../config.js';
import { EASE, addStreak, addSweep, el, glitch, img, revealText, scene, showScene, splitText, streak, sweep, trackIn } from '../lib/motion.js';

export function buildIntro(tl, ctx) {
  const { start: t0, end } = SCENES.intro;
  const root = scene(ctx.stage, 'intro');
  const cam = el('div', 'cam', root);
  const line = el('div', 'slit-line', cam);
  const lineTop = el('div', 'slit-line split-line', cam);
  const lineBottom = el('div', 'slit-line split-line', cam);
  const logoBox = el('div', 'logo-box intro-logo', cam);
  img(BRAND.logo, 'logo-img', logoBox);
  const band = addSweep(logoBox, { mask: BRAND.logo, strength: 0.9, width: 22 });
  const halo = el('div', 'logo-halo', cam);
  const title = el('div', 'intro-title', cam);
  const wordmark = el('div', 'wordmark', title, COPY.intro.wordmark);
  const tagline = splitText(title, COPY.intro.tagline.join(' '), { by: 'words', className: 'tagline' });
  const exitStreak = addStreak(root, '50%');
  showScene(tl, root, t0, end);

  gsap.set(cam, { scale: 1.16, rotationX: 16, y: 40 });
  gsap.set(line, { scaleX: 0, opacity: 0 });
  gsap.set([lineTop, lineBottom], { opacity: 0 });
  gsap.set(logoBox, { clipPath: 'inset(50% 0% 50% 0%)', filter: 'brightness(2.2)' });
  gsap.set(halo, { opacity: 0, scale: 0.6 });

  // 0.3 s: the line of light draws itself from the centre.
  ctx.cue('riser', t0 + 0.2, { duration: 1.4 });
  tl.to(line, { opacity: 1, duration: 0.4 }, t0 + 0.3);
  tl.to(line, { scaleX: 1, duration: 1.25, ease: EASE.inOut }, t0 + 0.3);
  ctx.atmo(tl, { level: 0.35, duration: 3 }, t0 + 0.6);

  // 1.55 s: the slit opens on the logo with the impact.
  const hit = t0 + 1.55;
  tl.set(line, { opacity: 0 }, hit);
  tl.set([lineTop, lineBottom], { opacity: 1, y: 0 }, hit);
  tl.to(lineTop, { y: -190, opacity: 0, duration: 0.9, ease: EASE.out }, hit);
  tl.to(lineBottom, { y: 190, opacity: 0, duration: 0.9, ease: EASE.out }, hit);
  tl.to(logoBox, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: EASE.out }, hit);
  tl.to(logoBox, { filter: 'brightness(1)', duration: 1.4, ease: 'power2.out' }, hit);
  tl.to(halo, { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out' }, hit);
  tl.to(halo, { opacity: 0.28, duration: 1.8, ease: 'power2.out' }, hit + 0.25);
  ctx.flash(tl, hit, 0.08);
  ctx.cue('impact', hit);
  ctx.cue('glitch', hit + 0.02, { duration: 0.3 });
  glitch(tl, logoBox, hit + 0.02, { duration: 0.3, seed: 3, strength: 1 });

  // Camera settles for the rest of the scene.
  tl.to(cam, { scale: 1, rotationX: 0, y: 0, duration: 3.3, ease: EASE.settle }, hit);
  sweep(tl, band, t0 + 2.35, { duration: 1.15 });
  ctx.cue('shimmer', t0 + 2.35, { duration: 1.1 });

  // Title.
  trackIn(tl, wordmark, t0 + 2.75, { from: '1.1em', to: '0.42em', duration: 1.6 });
  revealText(tl, tagline.units, t0 + 3.3, { duration: 1.0, stagger: 0.16 });
  ctx.cue('tick', t0 + 3.3);
  ctx.cue('tick', t0 + 3.46);

  // 4.4 s: push through into the app.
  ctx.cue('whoosh', t0 + 4.45, { duration: 0.8 });
  tl.to(cam, { scale: 1.35, opacity: 0, filter: 'blur(10px)', duration: 0.6, ease: EASE.exit }, t0 + 4.4);
  streak(tl, exitStreak, t0 + 4.7, { duration: 0.5 });
}
