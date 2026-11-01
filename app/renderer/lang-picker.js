'use strict';
// Language picker in the title bar: small flags instead of DE/EN/IT, same dark style as the account menu.
// The native <select id="h1t-language"> stays (hidden) as the single source; app.js listens to its change event.
(() => {
  const LANGS = [['de', 'Deutsch'], ['en', 'English'], ['it', 'Italiano']];
  let uid = 0;
  // Flags as inline SVG (CSP: no external images needed). Each UK flag gets its own clip-path id.
  function flag(lang) {
    if (lang === 'de') return '<svg class="h1t-flag" viewBox="0 0 5 3" aria-hidden="true"><path fill="#000" d="M0 0h5v1H0z"/><path fill="#dd0000" d="M0 1h5v1H0z"/><path fill="#ffce00" d="M0 2h5v1H0z"/></svg>';
    if (lang === 'it') return '<svg class="h1t-flag" viewBox="0 0 3 2" aria-hidden="true"><path fill="#009246" d="M0 0h1v2H0z"/><path fill="#f1f2f1" d="M1 0h1v2H1z"/><path fill="#ce2b37" d="M2 0h1v2H2z"/></svg>';
    const id = 'uk' + (++uid);
    return `<svg class="h1t-flag" viewBox="0 0 60 30" aria-hidden="true"><clipPath id="${id}"><path d="M30 15h30v15zv15h-30zh-30v-15zv-15h30z"/></clipPath>` +
      '<path fill="#012169" d="M0 0h60v30H0z"/><path stroke="#fff" stroke-width="6" d="M0 0l60 30m0-30L0 30"/>' +
      `<path stroke="#c8102e" stroke-width="4" clip-path="url(#${id})" d="M0 0l60 30m0-30L0 30"/>` +
      '<path stroke="#fff" stroke-width="10" d="M30 0v30M0 15h60"/><path stroke="#c8102e" stroke-width="6" d="M30 0v30M0 15h60"/></svg>';
  }
  window.H1tFlag = flag;

  const select = document.getElementById('h1t-language');
  const holder = select?.closest('.h1t-lang');
  if (!select || !holder) return;
  holder.classList.add('h1t-lang-native');
  const wrap = document.createElement('div');
  wrap.className = 'h1t-langpick';
  wrap.innerHTML = '<button type="button" class="h1t-langpick-btn" aria-haspopup="listbox" aria-expanded="false"></button><div class="h1t-langpick-menu" role="listbox" hidden></div>';
  holder.after(wrap);
  const btn = wrap.querySelector('button'), menu = wrap.querySelector('[role=listbox]');
  const name = (l) => (LANGS.find(([k]) => k === l) || LANGS[0])[1];
  const chev = '<svg class="h1t-langpick-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const check = '<svg class="h1t-langpick-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>';

  function paint() {
    const cur = select.value;
    btn.innerHTML = `${flag(cur)}<span>${name(cur)}</span>${chev}`;
    btn.setAttribute('aria-label', `Language: ${name(cur)}`);
    menu.innerHTML = LANGS.map(([k, n]) => `<button type="button" role="option" data-lang="${k}" aria-selected="${k === cur}" tabindex="-1">${flag(k)}<span>${n}</span>${k === cur ? check : ''}</button>`).join('');
  }
  const open = (focus) => { menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); wrap.classList.add('open'); if (focus) menu.querySelector('[aria-selected=true]')?.focus(); };
  const close = (refocus) => { if (menu.hidden) return; menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); wrap.classList.remove('open'); if (refocus) btn.focus(); };
  function choose(lang) {
    close(true);
    if (lang === select.value) return;
    select.value = lang;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    paint();
  }
  btn.addEventListener('click', () => (menu.hidden ? open(false) : close()));
  btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); open(true); } });
  menu.addEventListener('click', (e) => { const o = e.target.closest('[data-lang]'); if (o) choose(o.dataset.lang); });
  menu.addEventListener('keydown', (e) => {
    const items = [...menu.querySelectorAll('[role=option]')], i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); close(true); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus(); }
    else if (e.key === 'Tab') close();
  });
  document.addEventListener('pointerdown', (e) => { if (!wrap.contains(e.target)) close(); });
  window.addEventListener('blur', () => close());
  // app.js sets <html lang> and the select on every render (also when the sign-in window switches language).
  new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  paint();
})();
