// Builds the whole film as one paused GSAP timeline.
//   Preview (index.html): plays in real time, fullscreen-fit. Space = play/pause, ←/→ = ±1 s, R = restart, F = fullscreen.
//   Export (index.html?render): no UI, scripts/render.cjs calls window.__showcase.seek(t) for every frame.
import { BRAND, LANG, UI, VIDEO } from './config.js';
import { Atmosphere } from './lib/atmosphere.js';
import { el, registerSize } from './lib/motion.js';
import { buildIntro } from './scenes/intro.js';
import { buildReveal } from './scenes/reveal.js';
import { buildFeatures } from './scenes/features.js';
import { buildExperience } from './scenes/experience.js';
import { buildFinale } from './scenes/finale.js';

const { gsap } = window;
const params = new URLSearchParams(location.search);
const renderMode = params.has('render');
document.documentElement.classList.toggle('render', renderMode);
document.documentElement.lang = LANG;

const UI_FILES = [
  'home', 'home-after', 'perf-0', 'perf-1', 'perf-2', 'perf-3', 'perf-4', 'gaming-0', 'gaming-1', 'gaming-2', 'gaming-3', 'gaming-4',
  'net-0', 'net-modal', 'net-done', 'debloat-0', 'profiles', 'safemode', 'cleanup', 'hitreg', 'privacy', 'services',
  'el-sidebar', 'el-home-stat', 'el-perf-card-off', 'el-perf-card-on', 'el-gt-card-off', 'el-gt-card-on', 'el-net-hero', 'el-net-hero-on',
].map(UI);

async function preload(sources) {
  await Promise.all(sources.map(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    registerSize(src, image.naturalWidth, image.naturalHeight);
  }));
}

async function main() {
  // Load the fonts before building: long translations are measured to fit.
  const fonts = [300, 400, 500, 600, 700, 800].map((w) => document.fonts.load(`${w} 64px "Inter Tight"`));
  fonts.push(document.fonts.load('500 16px "JetBrains Mono"'));
  await Promise.all([preload([...UI_FILES, BRAND.logo]), ...fonts]);

  const viewport = document.getElementById('viewport');
  const stage = el('div', 'stage', viewport);
  stage.style.width = `${VIDEO.width}px`;
  stage.style.height = `${VIDEO.height}px`;
  const dust = el('canvas', 'dust', stage);
  el('div', 'vignette', stage);
  const flashLayer = el('div', 'flash', stage);
  const grain = el('canvas', 'grain', stage);
  const atmosphere = new Atmosphere(dust, grain, { width: VIDEO.width, height: VIDEO.height });
  gsap.set(flashLayer, { opacity: 0 });

  const tl = gsap.timeline({ paused: true });
  const cues = [];
  const ctx = {
    stage,
    cue: (type, t, options = {}) => cues.push({ type, t: Math.round(t * 1000) / 1000, ...options }),
    atmo: (timeline, { duration = 1, ...values }, at) => timeline.to(atmosphere.state, { ...values, duration, ease: 'power1.inOut' }, at),
    flash: (timeline, at, amount = 0.15) => {
      timeline.to(flashLayer, { keyframes: [{ opacity: amount, duration: 0.04 }, { opacity: 0, duration: 0.5, ease: 'power2.out' }] }, at);
    },
  };

  buildIntro(tl, ctx);
  buildReveal(tl, ctx);
  buildFeatures(tl, ctx);
  buildExperience(tl, ctx);
  buildFinale(tl, ctx);
  tl.set({}, {}, VIDEO.duration); // pin the exact length
  cues.sort((a, b) => a.t - b.t);

  const seek = (t) => {
    tl.seek(t, false);
    atmosphere.render(t);
  };

  window.__showcase = {
    duration: VIDEO.duration, fps: VIDEO.fps, width: VIDEO.width, height: VIDEO.height, cues, seek,
    // Resolves after the next two frames, when the browser has painted the seek.
    frame: (t) => new Promise((resolve) => { seek(t); requestAnimationFrame(() => requestAnimationFrame(resolve)); }),
  };
  seek(0);

  if (renderMode) {
    window.__showcaseReady = true;
    return;
  }
  setupPreview(viewport, stage, tl, seek);
}

function setupPreview(viewport, stage, tl, seek) {
  const fit = () => {
    const scale = Math.min(window.innerWidth / VIDEO.width, window.innerHeight / VIDEO.height);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  };
  fit();
  window.addEventListener('resize', fit);

  const bar = el('div', 'progress', viewport);
  const fill = el('i', '', bar);
  const hint = el('div', 'hint', viewport, 'Space play / pause · ← → seek · R restart · F fullscreen');
  let time = 0;
  let playing = false;
  const update = () => {
    seek(time);
    fill.style.transform = `scaleX(${time / VIDEO.duration})`;
  };
  gsap.ticker.add((_t, delta) => {
    if (!playing) return;
    time = Math.min(VIDEO.duration, time + delta / 1000);
    if (time >= VIDEO.duration) playing = false;
    update();
  });
  const play = () => { if (time >= VIDEO.duration) time = 0; playing = true; hint.classList.add('hide'); };
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); playing ? (playing = false) : play(); }
    if (e.code === 'ArrowRight') { time = Math.min(VIDEO.duration, time + 1); update(); }
    if (e.code === 'ArrowLeft') { time = Math.max(0, time - 1); update(); }
    if (e.code === 'KeyR') { time = 0; update(); play(); }
    if (e.code === 'KeyF') (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});
  });
  bar.addEventListener('click', (e) => { time = (e.offsetX / bar.clientWidth) * VIDEO.duration; update(); });
  const startAt = Number(params.get('t'));
  if (startAt > 0) { time = startAt; update(); }
  if (!params.has('paused')) play();
}

main().catch((error) => {
  document.body.insertAdjacentHTML('beforeend', `<pre class="boot-error">${error.stack || error}</pre>`);
  throw error;
});
