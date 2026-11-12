'use strict';
/* Dashboard tiles open a list of their tweaks (customer idea): "Applied tweaks" shows every active tweak,
   the other tiles show available, safe-and-ready and applied service tweaks. Grouped by area, with a search
   field. A click on a tweak opens it in the search page, where its switch is. Uses globals of app.js
   (state, catOf, catName, esc, bulkOk, render). listFor() is pure so it can be tested without a UI. */
(function (root) {
  const KINDS = ['applied', 'available', 'safe', 'services'];
  const TEXT = {
    de: { applied: 'Angewendete Tweaks', available: 'Verfügbare Tweaks', safe: 'Sicher verfügbar', services: 'Dienste optimiert',
      sub: { applied: 'Diese Tweaks sind gerade auf deinem PC aktiv.', available: 'Alle Tweaks, die auf deinem PC verfügbar sind.',
        safe: 'Sichere Tweaks, die noch nicht aktiv sind.', services: 'Aktive Tweaks an Windows-Diensten.' },
      search: 'Tweaks durchsuchen …', none: 'Hier ist noch kein Tweak.', noHit: 'Kein Tweak passt zur Suche.', close: 'Schließen',
      open: 'Klicke auf einen Tweak, um ihn ein- oder auszuschalten.', on: 'Aktiv', hint: 'Klicken für die Liste' },
    en: { applied: 'Applied tweaks', available: 'Available tweaks', safe: 'Safe & ready', services: 'Services optimized',
      sub: { applied: 'These tweaks are currently active on your PC.', available: 'Every tweak available on your PC.',
        safe: 'Safe tweaks that are not active yet.', services: 'Active tweaks on Windows services.' },
      search: 'Search tweaks …', none: 'No tweak here yet.', noHit: 'No tweak matches your search.', close: 'Close',
      open: 'Click a tweak to switch it on or off.', on: 'Active', hint: 'Click for the list' },
    it: { applied: 'Modifiche applicate', available: 'Modifiche disponibili', safe: 'Sicure e pronte', services: 'Servizi ottimizzati',
      sub: { applied: 'Queste modifiche sono attive ora sul tuo PC.', available: 'Tutte le modifiche disponibili sul tuo PC.',
        safe: 'Modifiche sicure non ancora attive.', services: 'Modifiche attive ai servizi di Windows.' },
      search: 'Cerca modifiche …', none: 'Ancora nessuna modifica qui.', noHit: 'Nessuna modifica corrisponde alla ricerca.', close: 'Chiudi',
      open: 'Fai clic su una modifica per attivarla o disattivarla.', on: 'Attiva', hint: 'Clic per l’elenco' },
  };

  // -> [[category, [tweaks sorted by name]]], categories in catalog order. Same counts as the dashboard tiles.
  function listFor(kind, tweaks, { catOf, bulkOk, query = '', catName = (c) => c, lang = 'de' }) {
    const all = tweaks || [];
    const pick = {
      applied: (tw) => tw.applied,
      available: () => true,
      safe: (tw) => bulkOk(tw) && !tw.applied,
      services: (tw) => catOf(tw) === 'services' && tw.applied,
    }[kind] || (() => false);
    const q = String(query).trim().toLowerCase();
    const hit = (tw) => !q || `${tw.name} ${tw.description || ''} ${catName(catOf(tw))}`.toLowerCase().includes(q);
    const groups = new Map();
    for (const tw of all) {
      if (!pick(tw) || !hit(tw)) continue;
      const c = catOf(tw);
      if (!groups.has(c)) groups.set(c, []);
      groups.get(c).push(tw);
    }
    const coll = new Intl.Collator(lang);
    return [...groups].map(([c, l]) => [c, l.sort((a, b) => coll.compare(a.name, b.name))]);
  }
  const total = (groups) => groups.reduce((n, [, l]) => n + l.length, 0);

  // ---------- UI ----------
  const ui = { kind: null, query: '' };
  const tx = () => TEXT[state.lang] || TEXT.en;
  const el = () => document.getElementById('twl');
  function ensure() {
    if (el()) return el();
    const box = document.createElement('div');
    box.id = 'twl'; box.className = 'twl-backdrop hidden';
    box.innerHTML = `<div class="twl" role="dialog" aria-modal="true" aria-labelledby="twl-title">
      <div class="twl-head"><div><h2 id="twl-title"></h2><p id="twl-sub" class="muted"></p></div>
        <button class="twl-close" id="twl-close" type="button"></button></div>
      <input class="twl-search" id="twl-search" type="search" autocomplete="off" spellcheck="false">
      <div class="twl-body" id="twl-body"></div>
      <p class="twl-foot muted" id="twl-foot"></p></div>`;
    document.body.appendChild(box);
    box.addEventListener('click', (e) => {
      if (e.target === box || e.target.closest('#twl-close')) return close();
      const item = e.target.closest('[data-twl]');
      if (item) openTweak(item.dataset.twl);
    });
    box.addEventListener('input', (e) => { if (e.target.id === 'twl-search') { ui.query = e.target.value; body(); } });
    box.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
    return box;
  }
  function body() {
    const w = tx(), groups = listFor(ui.kind, state.tweaks, { catOf, bulkOk, query: ui.query, catName, lang: state.lang });
    const n = total(groups), all = total(listFor(ui.kind, state.tweaks, { catOf, bulkOk, lang: state.lang }));
    document.getElementById('twl-title').textContent = `${w[ui.kind]} (${all})`;
    document.getElementById('twl-foot').textContent = n ? w.open : '';
    document.getElementById('twl-body').innerHTML = n
      ? groups.map(([c, l]) => `<section class="twl-group"><div class="twl-group-head"><span>${esc(catName(c))}</span><b>${l.length}</b></div>
          ${l.map((tw) => `<button type="button" class="twl-item risk-${esc(tw.risk)}" data-twl="${esc(tw.id)}" title="${esc(tw.description || '')}">
            <span class="risk-dot" aria-hidden="true"></span><span class="twl-name">${esc(tw.name)}</span>${tw.applied && ui.kind !== 'applied' && ui.kind !== 'services' ? `<em>${esc(w.on)}</em>` : ''}</button>`).join('')}
        </section>`).join('')
      : `<p class="twl-empty muted">${esc(ui.query.trim() ? w.noHit : w.none)}</p>`;
  }
  function open(kind) {
    if (!KINDS.includes(kind)) return;
    const box = ensure(), w = tx();
    ui.kind = kind; ui.query = '';
    document.getElementById('twl-sub').textContent = w.sub[kind];
    const search = document.getElementById('twl-search');
    search.value = ''; search.placeholder = w.search; search.setAttribute('aria-label', w.search);
    const x = document.getElementById('twl-close');
    x.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'; x.setAttribute('aria-label', w.close); x.title = w.close;
    body();
    box.classList.remove('hidden');
    search.focus();
  }
  function close() {
    const box = el();
    if (!box || box.classList.contains('hidden')) return;
    box.classList.add('hidden');
    document.querySelector(`[data-tlist="${ui.kind}"]`)?.focus();
    ui.kind = null;
  }
  // Same place as the sidebar search: the search page shows the tweak with its switch.
  function openTweak(id) {
    const tw = (state.tweaks || []).find((x) => x.id === id);
    if (!tw) return;
    close();
    if (state.route.page !== 'search') state.prevRoute = state.route;
    state.search = tw.name; state.route = { page: 'search' }; state.enter = true;
    const sb = document.getElementById('nav-search');
    if (sb) sb.value = tw.name;
    render();
    const c = document.getElementById('content'); if (c) c.scrollTop = 0;
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => { const tile = e.target.closest('[data-tlist]'); if (tile) open(tile.dataset.tlist); });
    document.addEventListener('keydown', (e) => {
      const tile = e.target.closest?.('[data-tlist]');
      if (tile && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(tile.dataset.tlist); }
    });
  }
  const api = { listFor, total, TEXT, KINDS, open, close, hint: () => tx().hint };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TweakList = api;
})(this);
