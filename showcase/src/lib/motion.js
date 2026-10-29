// Reusable motion building blocks. Every helper adds tweens to the master timeline at absolute times,
// so the whole film is one seekable GSAP timeline (needed for the frame-accurate export).
//
// Convention: initial states are set with gsap.set at build time and changes are tl.to / tl.set,
// so seeking forwards and backwards always lands on the same frame.
import { UI_MAPS, UI_SIZE } from '../ui-map.js';
import { LANG, UI } from '../config.js';

const UI_MAP = UI_MAPS[LANG];

const { gsap } = window;

export const EASE = {
  out: 'expo.out',
  inOut: 'expo.inOut',
  camera: 'power3.inOut',
  settle: 'power4.out',
  exit: 'power3.in',
};

export function el(tag, className, parent, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  if (parent) parent.appendChild(node);
  return node;
}

export function img(src, className, parent) {
  const node = el('img', className, parent);
  node.src = src;
  node.alt = '';
  node.decoding = 'sync';
  return node;
}

// Deterministic random numbers, so glitches and particles look the same in every render.
export function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- scenes ----------

export function scene(stage, className) {
  const root = el('section', `scene ${className}`, stage);
  gsap.set(root, { autoAlpha: 0 });
  return root;
}

export function showScene(tl, root, start, end) {
  tl.set(root, { autoAlpha: 1 }, start);
  tl.set(root, { autoAlpha: 0 }, end);
}

// ---------- typography ----------

// Splits text into masked units: <span class="mask"><span class="unit">…</span></span>.
// maxWidth (px): shrinks the font until the line fits, for longer translations.
export function splitText(parent, text, { by = 'chars', className = '', maxWidth = 0 } = {}) {
  const line = el('div', `split ${className}`, parent);
  const units = [];
  const words = text.split(' ');
  words.forEach((word, wi) => {
    const wordBox = el('span', 'word', line);
    const parts = by === 'chars' ? [...word] : [word];
    for (const part of parts) {
      const mask = el('span', 'mask', wordBox);
      units.push(el('span', 'unit', mask, part.replace(/&/g, '&amp;').replace(/</g, '&lt;')));
    }
    if (wi < words.length - 1) el('span', 'space', line, ' ');
  });
  if (maxWidth) fitWidth(line, maxWidth);
  gsap.set(units, { yPercent: 115 });
  return { line, units };
}

function fitWidth(line, maxWidth) {
  const display = line.style.display;
  line.style.display = 'inline-block';
  line.style.whiteSpace = 'nowrap';
  const width = line.offsetWidth;
  if (width > maxWidth) {
    const size = parseFloat(getComputedStyle(line).fontSize);
    line.style.fontSize = `${Math.floor(size * (maxWidth / width))}px`;
  }
  line.style.display = display;
}

export function revealText(tl, units, at, { duration = 1.0, stagger = 0.025, ease = EASE.out } = {}) {
  tl.to(units, { yPercent: 0, duration, stagger, ease }, at);
}

export function hideText(tl, units, at, { duration = 0.45, stagger = 0.012, ease = EASE.exit } = {}) {
  tl.to(units, { yPercent: -115, duration, stagger, ease }, at);
}

// Wide tracking that settles: used for the wordmarks.
export function trackIn(tl, node, at, { from = '0.9em', to = '0.3em', duration = 1.6 } = {}) {
  gsap.set(node, { letterSpacing: from, opacity: 0, filter: 'blur(14px)' });
  tl.to(node, { letterSpacing: to, opacity: 1, filter: 'blur(0px)', duration, ease: EASE.out }, at);
}

// ---------- light ----------

// A soft diagonal band of light that travels across its parent (masked to a logo when mask is given).
export function addSweep(parent, { mask, strength = 0.55, width = 26 } = {}) {
  const box = el('div', 'sweep-box', parent);
  if (mask) box.style.setProperty('--mask', `url("${mask}")`);
  if (mask) box.classList.add('masked');
  const band = el('div', 'sweep-band', box);
  band.style.setProperty('--strength', strength);
  band.style.setProperty('--width', `${width}%`);
  gsap.set(band, { xPercent: -130 });
  return band;
}

export function sweep(tl, band, at, { duration = 1.2, ease = 'power2.inOut' } = {}) {
  tl.set(band, { xPercent: -130 }, at);
  tl.to(band, { xPercent: 130, duration, ease }, at);
}

// A thin horizontal streak of light: bridges cuts between scenes.
export function addStreak(parent, y = '50%') {
  const streak = el('div', 'streak', parent);
  streak.style.top = y;
  gsap.set(streak, { scaleX: 0, opacity: 0 });
  return streak;
}

export function streak(tl, node, at, { duration = 0.5 } = {}) {
  tl.set(node, { scaleX: 0, opacity: 1 }, at);
  tl.to(node, { scaleX: 1, duration: duration * 0.55, ease: EASE.out }, at);
  tl.to(node, { opacity: 0, duration: duration * 0.6, ease: 'power2.out' }, at + duration * 0.4);
}

// ---------- digital distortion ----------

// Short, stepped slice displacement of an image (like a signal tearing for a few frames).
// Restrained on purpose: one burst at the impact, nothing looping.
export function glitch(tl, box, at, { duration = 0.3, seed = 7, slices = 7, strength = 1, step = 1 / 30 } = {}) {
  const source = box.querySelector('img');
  const rand = random(seed);
  const layers = [];
  for (let i = 0; i < slices; i++) {
    const layer = source.cloneNode();
    layer.className = `${source.className} glitch-slice`;
    box.appendChild(layer);
    gsap.set(layer, { opacity: 0 });
    layers.push(layer);
  }
  const ghostA = source.cloneNode(); ghostA.className = `${source.className} glitch-ghost`; box.appendChild(ghostA);
  const ghostB = source.cloneNode(); ghostB.className = `${source.className} glitch-ghost`; box.appendChild(ghostB);
  gsap.set([ghostA, ghostB], { opacity: 0 });

  const steps = Math.max(2, Math.round(duration / step));
  for (let s = 0; s < steps; s++) {
    const t = at + s * step;
    const fade = 1 - s / steps;
    layers.forEach((layer) => {
      const on = rand() < 0.55;
      const top = rand() * 92;
      const height = 2 + rand() * 12;
      tl.set(layer, {
        opacity: on ? 1 : 0,
        x: (rand() - 0.5) * 90 * strength * fade,
        clipPath: `inset(${top}% 0 ${Math.max(0, 100 - top - height)}% 0)`,
      }, t);
    });
    tl.set(ghostA, { opacity: 0.45 * fade, x: -10 * strength * fade }, t);
    tl.set(ghostB, { opacity: 0.3 * fade, x: 12 * strength * fade }, t);
    tl.set(source, { x: (rand() - 0.5) * 14 * strength * fade, opacity: rand() < 0.15 ? 0.6 : 1 }, t);
  }
  const end = at + steps * step;
  tl.set(layers, { opacity: 0, x: 0 }, end);
  tl.set([ghostA, ghostB], { opacity: 0, x: 0 }, end);
  tl.set(source, { x: 0, opacity: 1 }, end);
}

// ---------- the real app window ----------

const CURSOR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 2.5v17.2l4.6-4.3 2.9 6.6 2.7-1.2-2.9-6.5h6.3z"/></svg>';

// One app window (1400×860 CSS px, like the real window) holding a stack of real captures.
// Changing frames cross-dissolves to the next capture, which reads as the UI updating in place.
export function createScreen(parent, frames, { className = '' } = {}) {
  const root = el('div', `screen ${className}`, parent);
  root.style.width = `${UI_SIZE.w}px`;
  root.style.height = `${UI_SIZE.h}px`;
  const view = el('div', 'screen-view', root);
  const images = new Map();
  frames.forEach((name, i) => {
    const frame = img(UI(name), 'screen-frame', view);
    frame.style.zIndex = i;
    gsap.set(frame, { opacity: i === 0 ? 1 : 0 });
    images.set(name, frame);
  });
  const pulses = el('div', 'screen-pulses', root);
  const cursor = el('div', 'cursor', root, CURSOR_SVG);
  gsap.set(cursor, { x: UI_SIZE.w * 0.55, y: UI_SIZE.h * 0.62, autoAlpha: 0 });
  const glare = addSweep(root, { strength: 0.16, width: 34 });
  const shade = el('div', 'screen-shade', root);
  gsap.set(shade, { opacity: 0 });
  return { root, view, images, pulses, cursor, glare, shade, z: frames.length };
}

export function showFrame(tl, screen, name, at, { duration = 0.32 } = {}) {
  const frame = screen.images.get(name);
  tl.set(frame, { zIndex: ++screen.z }, at);
  tl.to(frame, { opacity: 1, duration, ease: 'power2.out' }, at);
}

const centerOf = (key) => {
  const r = UI_MAP[key];
  if (!r) throw new Error(`ui-map has no control "${key}"`);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
};

export function cursorTo(tl, screen, key, at, { duration = 0.5 } = {}) {
  const { x, y } = centerOf(key);
  tl.to(screen.cursor, { autoAlpha: 1, duration: 0.2 }, at);
  tl.to(screen.cursor, { x: x - 4, y: y - 3, duration, ease: EASE.camera }, at);
}

export function cursorOut(tl, screen, at) {
  tl.to(screen.cursor, { autoAlpha: 0, duration: 0.25 }, at);
}

// A click on a real control: the cursor presses, a fine ring opens on the control.
export function click(tl, screen, key, at, cue) {
  const { x, y } = centerOf(key);
  const ring = el('div', 'pulse', screen.pulses);
  gsap.set(ring, { x, y, scale: 0.3, opacity: 0 });
  tl.to(screen.cursor, { keyframes: [{ scale: 0.82, duration: 0.07 }, { scale: 1, duration: 0.18, ease: 'power2.out' }] }, at);
  tl.to(ring, { keyframes: [{ opacity: 0.95, scale: 0.35, duration: 0.01 }, { opacity: 0, scale: 1.9, duration: 0.65, ease: EASE.out }] }, at);
  if (cue) cue('click', at);
}

// Natural sizes of the preloaded images (captures are 3× device pixels).
const sizes = new Map();
export const CAPTURE_SCALE = 3;
export function registerSize(src, width, height) { sizes.set(src, { width, height }); }

// A close-up of one real control in two states (off → on), shown as a floating panel.
export function createChip(parent, off, on, { scale = 1.5, className = '' } = {}) {
  const root = el('div', `chip ${className}`, parent);
  const a = img(UI(off), 'chip-img', root);
  const b = on ? img(UI(on), 'chip-img chip-on', root) : null;
  if (b) gsap.set(b, { opacity: 0 });
  const size = sizes.get(UI(off));
  if (size) {
    root.style.width = `${(size.width / CAPTURE_SCALE) * scale}px`;
    root.style.height = `${(size.height / CAPTURE_SCALE) * scale}px`;
  }
  addSweep(root, { strength: 0.22, width: 30 });
  return { root, off: a, on: b, band: root.querySelector('.sweep-band') };
}

export function chipOn(tl, chip, at) {
  tl.to(chip.on, { opacity: 1, duration: 0.22, ease: 'power2.out' }, at);
}
