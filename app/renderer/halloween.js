'use strict';
// Halloween mode: on by default during the season (15 Oct – 1 Nov, local time), switchable with the effects button
// in the title bar. Outside the season the button keeps its normal job (ambient effects).
// Scene (moon, fog, graveyard, bats, watching eyes) sits behind the app; reactive effects (cursor lantern, embers on
// click, a ghost when a tweak is switched) sit above it without catching clicks. Reduced motion: colours only.
(() => {
  const KEY = 'h1tHalloween';
  const TEXT = {
    de: { on: 'Halloween-Modus an', off: 'Halloween-Modus aus' },
    en: { on: 'Halloween mode on', off: 'Halloween mode off' },
    it: { on: 'Modalità Halloween attiva', off: 'Modalità Halloween disattivata' },
  };
  const now = () => new Date();
  // Season: 15 October to 1 November (All Saints') inclusive.
  function inSeason(d = now()) {
    const m = d.getMonth(), day = d.getDate();
    return (m === 9 && day >= 15) || (m === 10 && day <= 1);
  }
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
  const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* preference only */ } };
  // The user's choice counts for this year's season; next year it starts on again.
  function wanted() {
    if (!inSeason()) return false;
    const p = read();
    return !(p && p.year === now().getFullYear() && p.on === false);
  }
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lang = () => (TEXT[document.documentElement.lang] ? document.documentElement.lang : 'de');

  const PUMPKIN = '<svg viewBox="0 0 24 24" aria-hidden="true" class="hw-pumpkin"><path d="M12 7.5c-.3-2.2.6-3.8 2.6-4.6"/><path d="M12 7.2c-2.6-1.6-6.7-.6-8.1 2.9-1.4 3.5.3 8.4 3.7 9.6 1.6.6 3.2.2 4.4-.6 1.2.8 2.8 1.2 4.4.6 3.4-1.2 5.1-6.1 3.7-9.6-1.4-3.5-5.5-4.5-8.1-2.9Z"/><path d="m8 12.3 1.4-1.3 1.3 1.3M13.3 12.3l1.3-1.3 1.4 1.3M8.3 15.4c1.2.6 2.3.3 3.7-.4 1.4.7 2.5 1 3.7.4"/></svg>';
  const BAT = '<svg viewBox="0 0 64 30" aria-hidden="true"><path d="M32 11c-1.6-3.6-5-5.4-5-5.4s.9 3.4-.7 5.4c-2.8-2.6-8.3-3.6-12-1.8 2.8 1 4.6 2.9 4.6 5.6-3.7-1.8-8.3-.9-12 1.8 5.5 0 8.3 1.8 10.1 4.6 2.8-1.8 6.4-2.7 9.2-1.8 1.8.9 3.7 2.7 5.8 5.4 2.1-2.7 4-4.5 5.8-5.4 2.8-.9 6.4 0 9.2 1.8 1.8-2.8 4.6-4.6 10.1-4.6-3.7-2.7-8.3-3.6-12-1.8 0-2.7 1.8-4.6 4.6-5.6-3.7-1.8-9.2-.8-12 1.8-1.6-2-.7-5.4-.7-5.4S33.6 7.4 32 11Z"/></svg>';
  const GHOST = '<svg viewBox="0 0 40 48" aria-hidden="true"><path d="M20 3C10.6 3 5 10.4 5 19.5V44l5-4 5 4 5-4 5 4 5-4 5 4V19.5C35 10.4 29.4 3 20 3Z"/><circle cx="14.5" cy="19" r="2.6"/><circle cx="25.5" cy="19" r="2.6"/><ellipse cx="20" cy="28" rx="3" ry="3.6"/></svg>';
  // Graveyard silhouette (hills, crooked tree, graves, fence), drawn once, scales with the window.
  const GRAVEYARD = `<svg class="hw-ground" viewBox="0 0 1600 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <path class="hw-hill b" d="M0 210 C200 150 380 190 560 170 S920 120 1120 160 1420 140 1600 170 V300 H0Z"/>
    <path class="hw-hill" d="M0 240 C240 200 420 230 640 215 S1040 190 1260 215 1500 205 1600 220 V300 H0Z"/>
    <g class="hw-tree"><path d="M150 230 C152 180 148 140 160 100 C150 86 132 80 118 62 M160 100 C172 82 196 74 210 50 M156 140 C140 130 118 128 96 116 M158 160 C178 150 204 150 222 132 M160 100 C160 80 164 60 172 42"/>
      <path class="hw-trunk" d="M140 238 C146 200 146 150 156 104 L166 104 C162 150 164 200 172 238Z"/></g>
    <g class="hw-graves"><path d="M380 236 v-34 a18 18 0 0 1 36 0 v34Z"/><path d="M442 238 v-22 a12 12 0 0 1 24 0 v22Z"/><path d="M1210 228 h10 v-30 h-12 v-8 h12 v-12 h8 v12 h12 v8 h-12 v30 h10 v6 h-28Z"/>
      <path d="M1320 232 v-40 a20 20 0 0 1 40 0 v40Z"/><path d="M1380 236 v-26 a14 14 0 0 1 28 0 v26Z"/></g>
    <g class="hw-fence">${Array.from({ length: 14 }, (_, i) => `<path d="M${720 + i * 22} 236 v-34 l4 -6 l4 6 v34Z"/>`).join('')}<path d="M716 214 h312 v4 h-312Z M716 226 h312 v4 h-312Z"/></g>
  </svg>`;

  let on = false, built = false, scene, fx, eyes = [], timers = [], raf = 0, mx = innerWidth / 2, my = innerHeight / 2;

  function build() {
    if (built) return;
    built = true;
    scene = document.createElement('div');
    scene.className = 'hw-scene';
    scene.setAttribute('aria-hidden', 'true');
    scene.innerHTML = `<div class="hw-sky"></div><div class="hw-stars"></div><div class="hw-moon"><i></i></div>
      <div class="hw-fog a"></div><div class="hw-fog b"></div>${GRAVEYARD}
      <div class="hw-eyes"><span><i></i></span><span><i></i></span></div>
      <div class="hw-eyes two"><span><i></i></span><span><i></i></span></div>
      <div class="hw-fog c"></div>`;
    fx = document.createElement('div');
    fx.className = 'hw-fx';
    fx.setAttribute('aria-hidden', 'true');
    fx.innerHTML = '<div class="hw-lantern"></div><div class="hw-flash"></div><div class="hw-web tl"></div><div class="hw-web br"></div>';
    document.body.prepend(scene);
    document.body.append(fx);
    eyes = [...scene.querySelectorAll('.hw-eyes span i')];
    // Spider hanging from the sidebar; drops lower while the logo is hovered.
    const side = document.querySelector('.sidebar');
    if (side && !side.querySelector('.hw-spider')) {
      const spider = document.createElement('div');
      spider.className = 'hw-spider';
      spider.setAttribute('aria-hidden', 'true');
      spider.innerHTML = '<i></i><svg viewBox="0 0 40 40"><path d="M20 14c-5 0-8 4-8 9s3 9 8 9 8-4 8-9-3-9-8-9Z"/><circle cx="20" cy="11" r="5"/><path class="legs" d="M12 20 2 13M12 24 1 24M13 28 3 35M28 20l10-7M28 24h11M27 28l10 7"/><circle class="eye" cx="18" cy="11" r="1.2"/><circle class="eye" cx="22" cy="11" r="1.2"/></svg>';
      side.append(spider);
    }
  }

  // ---------- reactive effects ----------
  function onMove(e) {
    mx = e.clientX; my = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      document.documentElement.style.setProperty('--hx', `${mx}px`);
      document.documentElement.style.setProperty('--hy', `${my}px`);
      // Eyes in the dark follow the cursor.
      for (const pupil of eyes) {
        const r = pupil.parentElement.getBoundingClientRect();
        const dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 2), d = Math.hypot(dx, dy) || 1;
        pupil.style.transform = `translate(${(dx / d) * 2.6}px, ${(dy / d) * 2.2}px)`;
      }
    });
  }
  function spawn(cls, html, x, y, life) {
    if (!fx || reduced()) return;
    const el = document.createElement('div');
    el.className = cls;
    if (html) el.innerHTML = html;
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    fx.append(el);
    setTimeout(() => el.remove(), life);
  }
  let clicks = 0;
  function onDown(e) {
    if (e.button !== 0 || e.target.closest('input[type=text], input[type=search], input[type=email], input[type=password], textarea')) return;
    for (let i = 0; i < 7; i++) {
      const a = (Math.PI * 2 * i) / 7 + Math.random() * .6, dist = 26 + Math.random() * 34;
      spawn('hw-ember', '', e.clientX, e.clientY, 900);
      const el = fx.lastElementChild;
      if (el) { el.style.setProperty('--dx', `${Math.cos(a) * dist}px`); el.style.setProperty('--dy', `${Math.sin(a) * dist - 18}px`); }
    }
    if (++clicks % 6 === 0) spawn('hw-bat solo', BAT, e.clientX, e.clientY, 1600);
  }
  function onToggle(e) {
    const t = e.target.closest('[data-toggle], [data-gt], [data-mod-toggle]');
    if (!t) return;
    const r = (t.closest('.switch') || t).getBoundingClientRect();
    spawn('hw-ghost', GHOST, r.left + r.width / 2, r.top, 1800);
  }
  function flock() {
    if (!on || reduced() || document.hidden) return;
    const n = 3 + Math.floor(Math.random() * 4), top = 8 + Math.random() * 30, ltr = Math.random() < .5;
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        if (!on) return;
        spawn(`hw-bat fly${ltr ? '' : ' rtl'}`, BAT, ltr ? -60 : innerWidth + 60, innerHeight * (top + Math.random() * 10) / 100, 7000);
      }, i * (180 + Math.random() * 260));
    }
  }
  function lightning() {
    if (!on || reduced() || document.hidden || !fx) return;
    const f = fx.querySelector('.hw-flash');
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  }
  const every = (fn, min, max) => {
    let id;
    const loop = () => { id = setTimeout(() => { fn(); loop(); }, min + Math.random() * (max - min)); timers.push(id); };
    loop();
  };

  // ---------- switching ----------
  function apply(state) {
    on = state;
    document.body.classList.toggle('halloween', on);
    if (on) {
      build();
      if (!timers.length) { every(flock, 9000, 17000); every(lightning, 26000, 48000); setTimeout(flock, 2200); }
    } else { timers.forEach(clearTimeout); timers = []; }
    paintButton();
  }
  function paintButton() {
    const b = document.getElementById('h1t-ambient');
    if (!b || !inSeason()) return;
    if (!b.dataset.icon) b.dataset.icon = b.innerHTML;
    b.innerHTML = on ? PUMPKIN : b.dataset.icon;
    b.classList.toggle('hw-on', on);
    b.setAttribute('aria-pressed', String(on));
    const label = TEXT[lang()][on ? 'on' : 'off'];
    b.setAttribute('aria-label', label); b.title = label;
  }
  // During the season the button switches Halloween instead of the ambient effects (capture runs first).
  document.addEventListener('click', (e) => {
    if (!inSeason() || !e.target.closest('#h1t-ambient')) return;
    e.stopImmediatePropagation();
    set(!on);
    if (typeof state !== 'undefined' && state.route?.page === 'settings' && typeof render === 'function') render();
  }, true);
  document.addEventListener('pointermove', (e) => { if (on) onMove(e); }, { passive: true });
  document.addEventListener('pointerdown', (e) => { if (on) onDown(e); }, { passive: true });
  document.addEventListener('change', (e) => { if (on) onToggle(e); });
  document.addEventListener('click', (e) => { if (on && e.target.closest('[data-gt]')) onToggle(e); });
  new MutationObserver(paintButton).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  // Season can begin or end while the app stays open.
  setInterval(() => { if (wanted() !== on && (inSeason() || on)) apply(wanted()); }, 60 * 60000);

  // Settings switch: same as the title-bar button.
  function set(v) { if (!inSeason()) return; write({ year: now().getFullYear(), on: !!v }); apply(!!v); }
  window.H1tHalloween = { inSeason, wanted, apply, set, isOn: () => on };
  apply(wanted());
})();
