// Scene 5 (35–45 s): back to darkness, the logo with a light sweep, the closing lines, fade to black.
import { BRAND, COPY, SCENES } from '../config.js';
import { EASE, addSweep, el, img, revealText, scene, showScene, splitText, sweep, trackIn } from '../lib/motion.js';

export function buildFinale(tl, ctx) {
  const { start: t0, end } = SCENES.finale;
  const root = scene(ctx.stage, 'finale');
  const cam = el('div', 'cam', root);
  const halo = el('div', 'logo-halo', cam);
  const logoBox = el('div', 'logo-box finale-logo', cam);
  img(BRAND.logo, 'logo-img', logoBox);
  const band = addSweep(logoBox, { mask: BRAND.logo, strength: 0.95, width: 20 });
  const block = el('div', 'finale-text', cam);
  const wordmark = el('div', 'wordmark small', block, COPY.finale.wordmark);
  const headline = splitText(block, COPY.finale.headline, { by: 'words', className: 'headline md', maxWidth: 1600 });
  const call = el('div', 'mono-label call', block, COPY.finale.call);
  const discord = el('div', 'discord', block, `<span class="dot"></span>${COPY.finale.discord}`);
  showScene(tl, root, t0, end);

  gsap.set(cam, { scale: 1.12, y: 30 });
  gsap.set(logoBox, { opacity: 0, filter: 'brightness(0.15) blur(8px)' });
  gsap.set(halo, { opacity: 0, scale: 0.7 });
  gsap.set([call, discord], { opacity: 0, y: 16 });

  // Out of darkness.
  ctx.cue('swell', t0 + 0.2, { duration: 2.2, gain: 0.8 });
  tl.to(cam, { scale: 1, y: 0, duration: 4.2, ease: EASE.settle }, t0 + 0.3);
  tl.to(logoBox, { opacity: 1, filter: 'brightness(1) blur(0px)', duration: 2.0, ease: 'power2.out' }, t0 + 0.5);
  tl.to(halo, { opacity: 0.35, scale: 1, duration: 2.4, ease: 'power2.out' }, t0 + 0.8);
  ctx.cue('impact', t0 + 1.0, { gain: 0.85 });
  ctx.atmo(tl, { level: 0.55, drift: -6, duration: 2.5 }, t0 + 0.5);

  sweep(tl, band, t0 + 1.6, { duration: 1.5 });
  ctx.cue('shimmer', t0 + 1.6, { duration: 1.4 });

  trackIn(tl, wordmark, t0 + 2.0, { from: '1em', to: '0.5em', duration: 1.5 });
  revealText(tl, headline.units, t0 + 2.7, { duration: 1.1, stagger: 0.09 });
  ctx.cue('tick', t0 + 2.7);
  tl.to(call, { opacity: 1, y: 0, duration: 0.9, ease: EASE.out }, t0 + 4.0);
  ctx.cue('tick', t0 + 4.0);
  tl.to(discord, { opacity: 1, y: 0, duration: 0.9, ease: EASE.out }, t0 + 4.6);
  ctx.cue('tick', t0 + 4.6);

  // Slow final camera move, a second sweep, then everything settles into black.
  tl.to(cam, { scale: 0.965, duration: 4.5, ease: 'none' }, t0 + 4.5);
  sweep(tl, band, t0 + 6.0, { duration: 1.6 });
  tl.to([block], { opacity: 0, y: 10, duration: 1.0, ease: 'power2.in' }, end - 2.9);
  tl.to(halo, { opacity: 0, duration: 1.6 }, end - 2.4);
  tl.to(logoBox, { opacity: 0, filter: 'brightness(0.2) blur(4px)', duration: 1.9, ease: 'power2.inOut' }, end - 2.3);
  ctx.atmo(tl, { level: 0, duration: 1.8 }, end - 2.3);
  ctx.cue('tail', end - 2.4, { duration: 2.4 });
}
