'use strict';

// ---------- Backend ----------
// In Electron über preload (window.tweaker), im Browser direkt der Mock + simulierte Auslastung.
const bridge = window.tweaker || {
  call: (request) => window.TweakerMock.call(request),
  mode: async () => 'browser',
  exportJson: async () => ({ ok: true, path: 'tweaker-export.json' }),
  importMod: (category, kind) => window.TweakerMock.call({ action: 'mods-import', category, modPath: kind === 'folder' ? 'C:\\Mods\\Neuer Ordner' : 'C:\\Downloads\\Neue Mod.zip' }),
  openDebloatTarget: async () => ({ ok: true }),
  openModsFolder: async () => ({ ok: true }),
  lastSafeMode: async () => null,
  onSafeMode() {},
  version: async () => 'dev',
  updateState: async () => ({ status: 'unsupported' }),
  onUpdate() {}, checkUpdate() {}, installUpdate() {}, openUpdateLog() {}, openReleasePage() {},
  appLocation: async () => ({ exe: 'C:\\Users\\Spieler\\Downloads\\UNDCC-Tweaker-0.6.0.exe' }),
  showExe: async () => ({ ok: true }),
  createShortcut: async (where) => ({ ok: true, path: where }),
  minimize() {}, close() {},
  onUsage(cb) {
    let u = { cpu: 9, gpu: 8, ram: 37 };
    const walk = (v, lo, hi) => Math.max(lo, Math.min(hi, v + (Math.random() - 0.5) * 8 + (Math.random() < 0.04 ? 35 : 0)));
    setInterval(() => {
      u = { cpu: walk(u.cpu * 0.85 + 2, 1, 100), gpu: walk(u.gpu * 0.85 + 2, 0, 100), ram: Math.max(20, Math.min(90, u.ram + (Math.random() - 0.5) * 2)) };
      cb(u);
    }, 1000);
  },
};

// ---------- Icons (Outline, weiß) ----------
const ICONS = {
  collapse: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  performance: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m7 15 3-4 3 3 4-6"/>',
  gaming: '<path d="M3 20h18"/><path d="m4 16 4-5 4 3 4-6 4 4"/><path d="M4 4v16"/>',
  network: '<rect x="8" y="3" width="8" height="11" rx="1"/><path d="M12 14v4M6 21h12M10 7h4M10 10h4"/>',
  privacy: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="m8 15 7-7 2 2-7 7H8z"/>',
  debloat: '<path d="M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14M10 10v6M14 10v6"/>',
  services: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  visuals: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  extra: '<path d="M12 4v16M4 12h16"/>',
  cleanup: '<path d="M6 6l12 12M18 6 6 18"/>',
  safemode: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  mods: '<path d="M12 2 3 7l9 5 9-5-9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
  graphics: '<circle cx="12" cy="12" r="3.5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  weapons: '<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="1.5"/>',
  minimap: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
  backups: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  mouse: '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 6v4"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6"/>',
  controller: '<path d="M6 11h4M8 9v4M15 12h.01M18 10h.01"/><path d="M17.3 5H6.7a4 4 0 0 0-4 3.6L2 15a3 3 0 0 0 5.2 2.2L9 15h6l1.8 2.2A3 3 0 0 0 22 15l-.7-6.4A4 4 0 0 0 17.3 5Z"/>',
  power: '<rect x="3" y="8" width="16" height="9" rx="1.5"/><path d="M21 11v3M6 11v3M9 11v3M12 11v3"/>',
  display: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
  other: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 12h6"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.other}</svg>`;

const MAIN_CATS = ['performance', 'debloat', 'network', 'privacy', 'gaming', 'services', 'visuals'];
const EXTRA_CATS = ['mouse', 'keyboard', 'controller', 'power', 'display'];

// ---------- State ----------
const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* egal */ } },
};

const state = {
  lang: ['de', 'en', 'it'].includes(store.get('lang')) ? store.get('lang') : 'de',
  route: { page: 'home' },
  filter: 'all',
  collapsed: store.get('collapsed') === '1',
  db: { data:null, startup:null, error:null, startupError:null, busy:false, selected:new Set(), result:null, startupOpen:false },
  tweaks: [],
  info: null,
  mode: null,
  loading: true,
  busy: new Set(),
  restartPending: false,
  metric: 'cpu',
  usage: { cpu: 0, gpu: 0, ram: 0 },
  history: { cpu: [], gpu: [], ram: [] },
  cache: null,       // letzte cache-info-Antwort
  cacheError: null,
  cacheBusy: null,   // 'info' | 'clean' | backupId
  safe: null,        // letzter SafeMode-Bericht (scan/enable/enforce/Monitor)
  safeError: null,
  safeBusy: null,    // 'scan' | 'enable' | 'disable' | 'enforce' | 'export'
  safeMonitorError: null,
  bk: null,          // letzte backup-list-Antwort
  bkError: null,
  bkBusy: null,      // 'list' | 'all' | backupId
  bkOpen: null,      // backupId mit geöffneter Vorschau
  bkPreview: {},     // backupId -> backup-preview-Antwort
  bkResult: null,    // letzte Wiederherstellungs-Antwort mit Einzelergebnissen
  version: '',
  update: { status: 'unsupported' },
  exe: null,         // Pfad der portablen Exe (null = nicht portabel, z. B. Entwicklung)
  mods: null,        // letzte mods-list-Antwort
  modsError: null,
  modsBusy: null,    // 'list' | 'import' | modId
  modsTab: 'all',
  res: null,         // letzte res-get/res-set-Antwort
  resError: null,
  resBusy: false,
  resForm: null,     // { width, height, windowed }
};
const MOD_CATS = ['graphics', 'sound', 'weapons', 'minimap', 'other'];
const RES_PRESETS = [
  [1920, 1080, '16:9'], [1728, 1080, '16:10 Stretched'], [1680, 1050, '16:10'], [1600, 900, '16:9'],
  [1440, 1080, '4:3 Stretched'], [1280, 1024, '5:4'], [1280, 960, '4:3'],
];

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const t = () => window.I18N[state.lang];

const catOf = (tw) => tw.category || 'other';
// Sammelaktion nur für Tweaks, die das Backend ausdrücklich freigibt (nie Bedienungshilfen).
const bulkOk = (tw) => tw.available !== false && tw.risk === 'low' && tw.bulkSafe === true;
const catName = (c) => t().cats[c]?.[0] || c;
const catDesc = (c) => t().cats[c]?.[1] || '';
const tweaksIn = (c) => state.tweaks.filter((tw) => catOf(tw) === c);
const extraCats = () => {
  const unknown = [...new Set(state.tweaks.map(catOf))].filter((c) => !MAIN_CATS.includes(c) && !EXTRA_CATS.includes(c));
  return [...EXTRA_CATS, ...unknown];
};

function fmtBytes(n) {
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toLocaleString(state.lang, { maximumFractionDigits: i >= 3 ? 2 : i ? 1 : 0 })} ${u[i]}`;
}
const fmtDate = (iso) => { try { return new Date(iso).toLocaleString(state.lang, { dateStyle: 'medium', timeStyle: 'short' }); } catch { return iso; } };

function errorText(code) {
  const e = t().errors;
  if (e[code]) return e[code];
  if (/_verification_failed$/.test(code || '')) return e.verification;
  return code || t().unknownError;
}

// ---------- Rendering ----------

function renderNav() {
  const r = state.route;
  const activeKey = r.page === 'cat' ? (r.parent || r.cat) : r.page;
  const item = (key, label, attrs) =>
    `<button class="nav-item${activeKey === key ? ' active' : ''}" ${attrs} title="${esc(label)}">
       ${icon(key)}<span class="nav-label">${esc(label)}</span></button>`;
  $('#nav').innerHTML =
    item('collapse', t().collapse, 'data-collapse') +
    item('home', t().home, 'data-go="home"') +
    MAIN_CATS.map((c) => item(c, catName(c), `data-cat="${c}"`)).join('') +
    item('mods', t().modsPage, 'data-go="mods"') +
    item('cleanup', t().cleanup, 'data-go="cleanup"') +
    item('safemode', t().safemode, 'data-go="safemode"') +
    item('backups', t().backupsPage, 'data-go="backups"') +
    item('extra', t().extra, 'data-go="extra"') +
    '<div class="nav-spacer"></div>' +
    item('settings', t().settings, 'data-go="settings"');
  $('#app').classList.toggle('collapsed', state.collapsed);
}

function renderCrumbs() {
  const r = state.route;
  let parts;
  if (r.page === 'cat') parts = r.parent ? [t().extra, catName(r.cat)] : [catName(r.cat)];
  else parts = [r.page === 'mods' ? t().modsPage : t()[r.page]];
  $('#crumbs').innerHTML = parts.map(esc).join('<span class="sep">·</span>');
}

const RING_C = 2 * Math.PI * 40;
function ring(key, label) {
  return `
    <div class="card ring-card">
      <div class="ring">
        <svg viewBox="0 0 92 92"><circle class="track" cx="46" cy="46" r="40"/>
          <circle class="bar" data-ring="${key}" cx="46" cy="46" r="40" stroke-dasharray="${RING_C}" stroke-dashoffset="${RING_C}"/></svg>
        <b data-ring-val="${key}">0%</b>
      </div>
      <span>${label}</span>
    </div>`;
}

function renderHome() {
  const i = state.info || {};
  const total = state.tweaks.length;
  const on = state.tweaks.filter((x) => x.applied).length;
  const pct = total ? Math.round((on / total) * 100) : 0;
  const seg = (k) => `<button data-metric="${k}" class="${state.metric === k ? 'active' : ''}">${k.toUpperCase()}</button>`;
  const adminTxt = i.isAdmin === false ? t().noAdmin : i.isAdmin ? t().admin : '';

  return `
    <div class="card hero">
      <img src="assets/logo-icon.png" alt="">
      <div>
        <h1>${t().welcome}<span>.</span></h1>
        <p>${esc([i.os, adminTxt].filter(Boolean).join(' · '))}</p>
      </div>
      <span class="badge">UND.CC</span>
    </div>
    <div class="rings">${ring('cpu', t().cpu)}${ring('gpu', t().gpu)}${ring('ram', t().ram)}</div>
    <div class="home-row">
      <div class="card chart-card">
        <div class="chart-head">
          <div><h2>${t()[state.metric]}</h2><p>${t().current} <span data-current>0</span>% · ${t().last60}</p></div>
          <div class="seg">${seg('cpu')}${seg('gpu')}${seg('ram')}</div>
        </div>
        <div class="chart">
          <div class="chart-y"><span>100%</span><span>80%</span><span>60%</span><span>40%</span><span>20%</span><span>0%</span></div>
          <svg viewBox="0 0 600 200" preserveAspectRatio="none">
            <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#e3112b" stop-opacity=".35"/><stop offset="1" stop-color="#e3112b" stop-opacity="0"/>
            </linearGradient></defs>
            ${[0, 40, 80, 120, 160].map((y) => `<line class="grid" x1="0" x2="600" y1="${y}" y2="${y}"/>`).join('')}
            <path class="area" data-area/><path class="line" data-line/>
          </svg>
        </div>
      </div>
      <div class="card status-card">
        <h3>UND.CC Tweaker</h3>
        <div><div class="stat-big">${pct}%</div><div class="stat-sub">${t().optimized} · ${t().tweaksActive(on, total)}</div></div>
        <div class="kv">
          <div><span>${t().processor}</span><b title="${esc(i.cpu)}">${esc(i.cpu || '—')}</b></div>
          <div><span>${t().graphics}</span><b title="${esc(i.gpu)}">${esc(i.gpu || '—')}</b></div>
          <div><span>${t().memory}</span><b>${i.ramGB != null ? esc(i.ramGB) + ' GB' : '—'}</b></div>
        </div>
        <button class="pill light" data-cat="performance">${t().toTweaks}</button>
      </div>
    </div>`;
}

function renderExtra() {
  return `<div class="tiles">${extraCats().map((c) => {
    const list = tweaksIn(c);
    const on = list.filter((x) => x.applied).length;
    return `
      <div class="card tile">
        <div class="tile-icon">${icon(c)}</div>
        <h3>${esc(catName(c))}</h3>
        <p>${esc(catDesc(c))}</p>
        <div class="meta">${list.length ? t().active(on, list.length) : '&nbsp;'}</div>
        <button class="pill dark" data-cat="${esc(c)}" data-parent="extra">${t().openSettings}</button>
      </div>`;
  }).join('')}</div>`;
}

function tweakRow(tw) {
  const busy = state.busy.has(tw.id);
  const risk = t().risk[tw.risk];
  return `
    <div class="card row">
      <div class="row-body">
        <div class="row-title">${esc(tw.name)}
          ${risk ? `<span class="tag${tw.risk === 'high' ? ' high' : ''}">${risk}</span>` : ''}
          ${tw.requiresRestart ? `<span class="tag">${t().restart}</span>` : ''}
        </div>
        <div class="row-desc">${busy ? t().working : esc(tw.description)}${tw.available === false ? `<br>${esc(errorText(tw.stateError))}` : ''}</div>
      </div>
      <label class="switch${busy ? ' busy' : ''}">
        <input type="checkbox" data-toggle="${esc(tw.id)}" ${tw.applied ? 'checked' : ''} ${busy || tw.available === false ? 'disabled' : ''} aria-label="${esc(tw.name)}">
        <span></span>
      </label>
    </div>`;
}

function renderCategory(c, parent) {
  if (c === 'debloat') return renderDebloat();
  if (c === 'performance') return renderOptimization();
  const all = tweaksIn(c);
  let list = all;
  if (state.filter === 'on') list = list.filter((x) => x.applied);
  if (state.filter === 'off') list = list.filter((x) => !x.applied);
  const safeOpen = all.some((x) => bulkOk(x) && !x.applied);
  const chip = (k) => `<button data-filter="${k}" class="${state.filter === k ? 'active' : ''}">${t()[k]}</button>`;

  return `
    <div class="card detail-head">
      <div class="tile-icon">${icon(c)}</div>
      <div><h1>${esc(catName(c))}</h1><p>${esc(catDesc(c))}</p></div>
      ${parent ? `<button class="pill dark big" data-go="${parent}">${t().back}</button>` : ''}
    </div>
    ${all.length ? `
      <p class="hint">${t().hint}</p>
      <div class="toolbar">
        <div class="seg">${chip('all')}${chip('on')}${chip('off')}</div>
        ${safeOpen ? `<button class="pill dark" id="apply-safe">${t().applySafe}</button>` : ''}
      </div>
      <div class="rows">${list.map(tweakRow).join('') || `<div class="card empty">—</div>`}</div>`
    : `<div class="card empty">${t().empty}</div>`}`;
}

function renderCleanup() {
  const c = state.cache;
  const busy = state.cacheBusy;
  let body;
  if (busy === 'info' && !c) {
    body = `<div class="cache-status muted">${t().analyzing}</div>`;
  } else if (state.cacheError && !c) {
    body = `<div class="cache-status">${esc(errorText(state.cacheError))}</div>
      <div class="cache-actions"><button class="pill dark" id="cache-info">${t().analyze}</button></div>`;
  } else if (c) {
    const list = c.candidates || [];
    body = `
      <div class="cache-total"><b>${fmtBytes(c.totalBytes || 0)}</b><span>${t().selectable}</span></div>
      <div class="cache-root" title="${esc(c.root)}">${esc(c.root)}</div>
      ${list.length ? `<div class="cache-list">${list.map((x) => `
        <div><span>${esc(x.relative)}</span><span class="muted">${esc(x.fileCount)} ${t().files}</span><b>${fmtBytes(x.bytes)}</b></div>`).join('')}
      </div>` : `<div class="cache-status muted">${t().nothingToClean}</div>`}
      <p class="cache-note">${esc(c.message || '')}</p>
      <p class="cache-note strong">${t().closeGame}</p>
      <div class="cache-actions">
        <button class="pill dark" id="cache-info" ${busy ? 'disabled' : ''}>${busy === 'info' ? t().analyzing : t().analyze}</button>
        <button class="pill light" id="cache-clean" ${busy || !list.length ? 'disabled' : ''}>${busy === 'clean' ? t().cleaning : t().clean}</button>
      </div>`;
  } else body = '';

  const backups = (c?.backups || []).slice().sort((a, b) => String(b.createdUtc).localeCompare(String(a.createdUtc)));
  const backupRow = (b) => {
    const canRestore = b.status === 'cleaned' || b.status === 'pending';
    const canPurge = b.status === 'cleaned';
    const mine = busy === b.backupId;
    return `
      <div class="card row">
        <div class="row-body">
          <div class="row-title">${esc(fmtDate(b.createdUtc))} <span class="tag">${esc(t().bStatus[b.status] || b.status)}</span></div>
          <div class="row-desc">${esc(b.backupId)}</div>
        </div>
        ${canRestore ? `<button class="pill dark" data-restore="${esc(b.backupId)}" ${busy ? 'disabled' : ''}>${mine ? '…' : t().restore}</button>` : ''}
        ${canPurge ? `<button class="pill dark danger" data-purge="${esc(b.backupId)}" data-date="${esc(fmtDate(b.createdUtc))}" ${busy ? 'disabled' : ''}>${t().purge}</button>` : ''}
      </div>`;
  };

  return `
    <div class="card detail-head">
      <div class="tile-icon">${icon('cleanup')}</div>
      <div><h1>${t().cacheTitle}</h1><p>${t().cacheDesc}</p></div>
    </div>
    <div class="card cache-card">${body}</div>
    ${c ? `<h3 class="section-title">${t().backups}</h3>
      <div class="rows">${backups.length ? backups.map(backupRow).join('') : `<div class="card empty">${t().noBackups}</div>`}</div>` : ''}`;
}

function renderSafeMode() {
  const r = state.safe;
  const busy = state.safeBusy;
  const btn = (id, label, cls = 'dark', disabled = false) =>
    `<button class="pill ${cls}" id="${id}" ${busy || disabled ? 'disabled' : ''}>${busy === id.slice(3) ? '…' : label}</button>`;
  let body;
  if (!r && busy === 'scan') body = `<div class="cache-status muted">${t().smScanning}</div>`;
  else if (!r) body = `<div class="cache-status">${esc(errorText(state.safeError))}</div><div class="cache-actions">${btn('sm-scan', t().smScan)}</div>`;
  else {
    const failed = (r.repairs || []).filter((x) => !x.ok);
    const unsupported = r.platform && r.platform.supported === false;
    body = `
      <div class="sm-top">
        <span class="health-dot ${esc(r.health)}"></span>
        <div class="sm-title"><b>${esc(t().smHealth[r.health] || r.health)}</b>
          <span>${r.enabled ? t().smOn : t().smOff} · ${esc(t().smChecked(fmtDate(r.checkedUtc)))}</span></div>
      </div>
      ${state.safeMonitorError ? `<div class="sm-alert">${t().smMonitorError}: ${esc(errorText(state.safeMonitorError))}</div>` : ''}
      ${unsupported ? `<div class="sm-alert">${t().smUnsupported}</div>` : ''}
      ${failed.length ? `<div class="sm-alert"><b>${t().smRepairFailed(failed.length)}</b>
        ${failed.map((x) => `<div>${esc(x.name)}: ${esc(errorText(x.error))}</div>`).join('')}</div>` : ''}
      <p class="cache-note">${esc(r.message || '')}</p>
      <p class="cache-note strong">${t().smMonitor}</p>
      <div class="cache-actions">
        ${r.enabled ? btn('sm-disable', t().smDisable) : btn('sm-enable', t().smEnable, 'light', unsupported)}
        ${btn('sm-scan', t().smScan)}
        ${r.enabled ? btn('sm-enforce', t().smRepair, 'dark', unsupported) : ''}
        ${btn('sm-export', t().smExport)}
      </div>`;
  }
  const order = { red: 0, yellow: 1, green: 2 };
  const rows = (r?.services || []).slice().sort((a, b) => (order[a.health] ?? 3) - (order[b.health] ?? 3));
  const svc = (x) => `
    <div class="card row sm-row">
      <span class="health-dot small ${esc(x.health)}"></span>
      <div class="row-body">
        <div class="row-title">${esc(x.displayName || x.name)} <span class="muted sm-name">${esc(x.name)}</span>
          ${x.mustRun ? `<span class="tag">${t().smMust}</span>` : !x.autoRepair ? `<span class="tag">${t().smAudit}</span>` : ''}</div>
        <div class="row-desc">${esc(t().states[x.state] || x.state)} · ${esc(t().modes2[x.startMode] || x.startMode)} · ${esc(t().smReason[x.reason] || x.reason)}</div>
      </div>
    </div>`;

  return `
    <div class="card detail-head">
      <div class="tile-icon">${icon('safemode')}</div>
      <div><h1>${t().safemode}</h1><p>${t().smDesc}</p></div>
    </div>
    <div class="card cache-card">${body}</div>
    ${rows.length ? `<h3 class="section-title">${t().smServices}</h3><div class="rows">${rows.map(svc).join('')}</div>` : ''}`;
}

function backupName(b) {
  if (b.kind === 'debloat') return t().debloat.removalRecord;
  if (b.kind === 'startup') return t().debloat.startup;
  if (b.kind === 'cache') return t().bkCacheName;
  if (b.kind === 'services') return t().bkServicesName;
  return state.tweaks.find((x) => x.id === b.tweakId)?.name || b.tweakId || b.backupId;
}
const bkReasonText = (code) => t().bkReason[code] || errorText(code);

function renderBackups() {
  const d = state.bk;
  const busy = state.bkBusy;
  if (!d && busy === 'list') return backupHead() + `<div class="card cache-card"><div class="cache-status muted">${t().bkLoading}</div></div>`;
  if (!d) return backupHead() + `<div class="card cache-card"><div class="cache-status">${esc(errorText(state.bkError))}</div>
    <div class="cache-actions"><button class="pill dark" id="bk-reload">${t().bkReload}</button></div></div>`;

  const list = d.backups || [];
  const restorable = list.filter((b) => b.canRestore).length;
  const warnings = d.warnings || [];
  const res = state.bkResult;
  const resItems = res?.results || [];
  const count = (st) => resItems.filter((x) => x.status === st).length;
  const byId = Object.fromEntries(list.map((b) => [b.backupId, b]));

  const row = (b) => {
    const open = state.bkOpen === b.backupId;
    const pv = state.bkPreview[b.backupId];
    const mine = busy === b.backupId;
    return `
      <div class="card bk-item">
        <div class="row">
          <div class="row-body">
            <div class="row-title">${esc(backupName(b))}
              <span class="tag">${esc(t().bkKind[b.kind] || b.kind)}</span>
              <span class="tag">${esc(t().bkStatus[b.status] || b.status)}</span></div>
            <div class="row-desc">${esc(fmtDate(b.createdUtc))}${!b.canRestore && b.reason ? ' · ' + esc(bkReasonText(b.reason)) : ''}</div>
          </div>
          <button class="pill dark" data-bk-preview="${esc(b.backupId)}" ${busy ? 'disabled' : ''}>${open ? t().bkHide : t().bkPreview}</button>
          ${b.canRestore ? `<button class="pill light" data-bk-restore="${esc(b.backupId)}" ${busy ? 'disabled' : ''}>${mine ? '…' : t().bkRestore}</button>` : ''}
          <button class="pill dark" data-bk-export="${esc(b.backupId)}" ${busy ? 'disabled' : ''}>${t().bkExport}</button>
        </div>
        ${open ? `<div class="bk-preview">
          ${!pv ? `<div class="muted">…</div>` : !pv.ok ? `<div class="sm-alert">${esc(errorText(pv.error))}</div>` : `
            <div class="${pv.backup?.canRestore ? 'muted' : 'sm-alert'}">${pv.backup?.canRestore ? t().bkReady : esc(bkReasonText(pv.backup?.reason))}</div>
            <div class="bk-label">${t().bkOriginal}</div>
            <pre>${esc(JSON.stringify(pv.snapshot, null, 2).slice(0, 6000))}</pre>`}
        </div>` : ''}
      </div>`;
  };

  return backupHead() + `
    <div class="card cache-card">
      <div class="cache-total"><b>${list.length}</b><span>${t().bkCount(list.length, restorable)}</span></div>
      ${warnings.length ? `<div class="sm-alert"><b>${t().bkWarnings}</b>${warnings.map((w) => `<div>${esc(w.file)}: ${esc(errorText(w.error))}</div>`).join('')}</div>` : ''}
      <p class="cache-note">${esc(d.message || '')}</p>
      <div class="cache-actions">
        <button class="pill light" id="bk-all" ${busy || !restorable ? 'disabled' : ''}>${busy === 'all' ? '…' : t().bkRestoreAll}</button>
        <button class="pill dark" id="bk-reload" ${busy ? 'disabled' : ''}>${t().bkReload}</button>
      </div>
    </div>
    ${resItems.length ? `
      <h3 class="section-title">${t().bkResult}</h3>
      <div class="card cache-card bk-result">
        <div class="${res.ok ? 'muted' : 'sm-alert'}">${res.ok ? t().bkDone : t().bkPartial} · ${t().bkSummary(count('restored'), count('skipped'), count('failed'))}</div>
        <div class="cache-list">${resItems.map((x) => `
          <div><span>${esc(byId[x.backupId] ? backupName(byId[x.backupId]) : x.backupId)}</span>
            <span class="muted">${x.reason ? esc(bkReasonText(x.reason)) : ''}</span>
            <b class="res-${esc(x.status)}">${esc(t().bkRes[x.status] || x.status)}</b></div>`).join('')}</div>
      </div>` : ''}
    <h3 class="section-title">${t().backupsPage}</h3>
    <div class="rows">${list.length ? list.map(row).join('') : `<div class="card empty">${t().bkEmpty}</div>`}</div>`;
}

function backupHead() {
  return `
    <div class="card detail-head">
      <div class="tile-icon">${icon('backups')}</div>
      <div><h1>${t().backupsPage}</h1><p>${t().bkDesc}</p></div>
    </div>`;
}

function updateText() {
  const u = state.update || {};
  const st = t().upStatus;
  if (u.status === 'downloading') return st.downloading(u.version || '', u.percent ?? 0);
  if (u.status === 'ready') return st.ready(u.version || '');
  if (u.status === 'error') return st.error(u.error || '');
  const base = st[u.status] || st.idle;
  return u.checkedAt && (u.status === 'latest' || u.status === 'error') ? `${base} · ${t().upChecked(fmtDate(u.checkedAt))}` : base;
}

// "gta:x64\audio\…" liegt im GTA-V-Ordner, alles andere unter FiveM.app
const showTarget = (t) => (t.startsWith('gta:') ? 'GTA V\\' + t.slice(4) : 'FiveM\\' + t);

function renderMods() {
  const d = state.mods;
  const busy = state.modsBusy;
  const head = `
    <div class="card detail-head">
      <div class="tile-icon">${icon('mods')}</div>
      <div><h1>${t().modsPage}</h1><p>${t().modsDesc}</p></div>
    </div>`;
  let status;
  if (!d && busy === 'list') status = `<div class="cache-status muted">${t().modsLoading}</div>`;
  else if (!d) status = `<div class="cache-status">${esc(errorText(state.modsError))}</div><div class="cache-actions"><button class="pill dark" id="mods-reload">${t().reload}</button></div>`;
  else status = `
    <div class="cache-total"><b>${d.mods.length}</b><span>${t().modsCount(d.mods.length, d.enabledCount)}</span></div>
    ${d.root ? `<div class="cache-root" title="${esc(d.root)}">FiveM: ${esc(d.root)}</div>` : ''}
    <div class="cache-root" title="${esc(d.gtaRoot || '')}">GTA V: ${d.gtaRoot ? esc(d.gtaRoot) : t().modsNoGta}</div>
    ${d.fivemFound ? '' : `<div class="sm-alert">${t().modsNoFivem}</div>`}
    <p class="cache-note">${esc(d.message || '')}</p>
    <div class="cache-actions">
      <button class="pill light" data-mod-import="file" ${busy ? 'disabled' : ''}>${busy === 'import' ? '…' : t().modsImportFile}</button>
      <button class="pill dark" data-mod-import="folder" ${busy ? 'disabled' : ''}>${t().modsImportFolder}</button>
      <button class="pill dark" id="mods-open" ${d.fivemFound ? '' : 'disabled'}>${t().modsOpenFolder}</button>
    </div>`;

  const list = (d?.mods || []).filter((m) => state.modsTab === 'all' || m.category === state.modsTab);
  const tab = (k) => `<button data-mod-tab="${k}" class="${state.modsTab === k ? 'active' : ''}">${k === 'all' ? t().all : t().modCats[k]}</button>`;
  const row = (m) => {
    const mine = busy === m.id;
    const more = m.fileCount > 1 ? ` +${m.fileCount - 1}` : '';
    return `
      <div class="card row mod-row${m.enabled ? ' on' : ''}">
        <div class="mod-icon">${icon(m.category)}</div>
        <div class="row-body">
          <div class="row-title">${esc(m.name)}
            <span class="tag">${esc(t().modCats[m.category] || m.category)}</span>
            ${m.skippedCount ? `<span class="tag" title="${esc(t().modsSkippedHint)}">${t().modsSkipped(m.skippedCount)}</span>` : ''}</div>
          <div class="row-desc">${fmtBytes(m.sizeBytes)} · ${t().modsFiles(m.fileCount)} · <span class="mono">${esc(showTarget(m.targets[0] || ''))}${more}</span></div>
        </div>
        <button class="pill dark danger" data-mod-remove="${esc(m.id)}" ${busy ? 'disabled' : ''}>${t().modsRemove}</button>
        <label class="switch${mine ? ' busy' : ''}">
          <input type="checkbox" data-mod-toggle="${esc(m.id)}" ${m.enabled ? 'checked' : ''} ${busy ? 'disabled' : ''} aria-label="${esc(m.name)}">
          <span></span>
        </label>
      </div>`;
  };
  const mods = d ? `
    <div class="toolbar"><div class="seg">${['all', ...MOD_CATS].map(tab).join('')}</div></div>
    ${state.modsTab === 'sound' ? `<p class="hint">${t().modsSoundHint}</p>` : ''}
    <div class="rows">${list.length ? list.map(row).join('') : `<div class="card empty">${t().modsEmpty}</div>`}</div>` : '';
  return head + `<div class="card cache-card">${status}</div>` + mods + renderResolution();
}

function renderResolution() {
  const r = state.res;
  const f = state.resForm;
  let body;
  if (!r && !state.resError) body = `<div class="cache-status muted">${t().modsLoading}</div>`;
  else if (!r) body = `<div class="cache-status">${esc(errorText(state.resError))}</div><div class="cache-actions"><button class="pill dark" id="res-reload">${t().reload}</button></div>`;
  else {
    const mode = (w) => `<button data-res-mode="${w}" class="${f.windowed === w ? 'active' : ''}">${t().resModes[w]}</button>`;
    const preset = ([w, h, label]) => `<button class="res-preset${f.width === w && f.height === h ? ' active' : ''}" data-res="${w}x${h}"><b>${w} × ${h}</b><span>${label}</span></button>`;
    const changed = f.width !== r.width || f.height !== r.height || f.windowed !== r.windowed;
    body = `
      <div class="res-now"><b>${r.width} × ${r.height}</b><span>${t().resModes[r.windowed] || ''}${r.refreshRate ? ' · ' + r.refreshRate + ' Hz' : ''}</span></div>
      <div class="cache-root" title="${esc(r.file)}">${esc(r.file)}</div>
      <div class="res-presets">${RES_PRESETS.map(preset).join('')}</div>
      <div class="res-custom">
        <label>${t().resWidth}<input type="number" id="res-w" min="640" max="7680" value="${f.width}"></label>
        <span class="res-x">×</span>
        <label>${t().resHeight}<input type="number" id="res-h" min="480" max="4320" value="${f.height}"></label>
        <div class="seg">${mode(0)}${mode(2)}${mode(1)}</div>
      </div>
      <p class="cache-note">${t().resHint}</p>
      <div class="cache-actions">
        <button class="pill light" id="res-apply" ${state.resBusy || !changed ? 'disabled' : ''}>${state.resBusy ? '…' : t().resApply}</button>
        ${r.hasBackup ? `<button class="pill dark" id="res-reset" ${state.resBusy ? 'disabled' : ''}>${t().resReset}</button>` : ''}
      </div>`;
  }
  return `<h3 class="section-title">${t().resTitle}</h3><div class="card cache-card res-card">${body}</div>`;
}

function renderSettings() {
  const u = state.update || {};
  const upBtn = u.status === 'ready'
    ? `<button class="pill light" id="up-install">${t().upInstall}</button>`
    : u.status === 'unsupported' ? '' : `<button class="pill dark" id="up-check" ${u.status === 'checking' || u.status === 'downloading' ? 'disabled' : ''}>${t().upCheck}</button>`;
  const langBtn = (l, label) => `<button data-lang="${l}" class="${state.lang === l ? 'active' : ''}">${label}</button>`;
  return `
    <div class="settings">
      <div class="card row"><div class="row-body"><div class="row-title">${t().updates} <span class="tag">${esc(t().version(state.version))}</span></div>
        <div class="row-desc">${esc(updateText())}</div></div>${upBtn}</div>
      ${u.status === 'unsupported' ? '' : `<div class="card row"><div class="row-body"><div class="row-title">${t().upHelp}</div><div class="row-desc">${t().upHelpDesc}</div></div>
        <button class="pill dark" id="up-log">${t().upLog}</button><button class="pill dark" id="up-page">${t().upPage}</button></div>`}
      ${state.exe ? `<div class="card row app-loc"><div class="row-body"><div class="row-title">${t().appLocTitle}</div>
        <div class="row-desc">${t().appLocDesc}</div><div class="mono app-path" title="${esc(state.exe)}">${esc(state.exe)}</div></div>
        <div class="app-loc-actions"><button class="pill dark" id="app-show">${t().appShow}</button>
        <button class="pill dark" id="app-lnk-desktop">${t().appLnkDesktop}</button>
        <button class="pill dark" id="app-lnk-start">${t().appLnkStart}</button></div></div>` : ''}
      <div class="card row"><div class="row-body"><div class="row-title">${t().language}</div><div class="row-desc">${t().languageDesc}</div></div>
        <div class="seg">${langBtn('de', 'Deutsch')}${langBtn('en', 'English')}${langBtn('it', 'Italiano')}</div></div>
      <div class="card row"><div class="row-body"><div class="row-title">${t().backend}</div><div class="row-desc">${t().backendDesc}</div></div>
        <b>${esc(t().modes[state.mode] || state.mode || '…')}</b></div>
      <div class="card row"><div class="row-body"><div class="row-title">${t().reload}</div><div class="row-desc">${t().reloadDesc}</div></div>
        <button class="pill dark" id="reload">${t().reload}</button></div>
    </div>`;
}

function render() {
  document.documentElement.lang = state.lang;
  renderNav();
  renderCrumbs();
  const r = state.route;
  const upReady = state.update?.status === 'ready'
    ? `<div class="restart"><span>${esc(t().upBanner(state.update.version || ''))}</span><button class="pill" id="up-install">${t().upInstall}</button></div>`
    : '';
  let html = upReady + (state.restartPending
    ? `<div class="restart"><span>${t().needsRestart}</span><button class="pill" id="restart-later">${t().later}</button></div>`
    : '');
  if (state.loading && !['settings', 'cleanup', 'safemode', 'backups', 'mods'].includes(r.page)) {
    html += '<div class="rows">' + '<div class="skeleton"></div>'.repeat(5) + '</div>';
  } else if (r.page === 'home') html += renderHome();
  else if (r.page === 'extra') html += renderExtra();
  else if (r.page === 'settings') html += renderSettings();
  else if (r.page === 'cleanup') html += renderCleanup();
  else if (r.page === 'safemode') html += renderSafeMode();
  else if (r.page === 'backups') html += renderBackups();
  else if (r.page === 'mods') html += renderMods();
  else html += renderCategory(r.cat, r.parent);
  const content = $('#content');
  content.innerHTML = html;
  // Seitenwechsel: Inhalte gestaffelt hereingleiten lassen (nicht bei jedem Neuzeichnen, z. B. Schalter)
  if (state.enter) {
    state.enter = false;
    content.classList.remove('enter');
    void content.offsetWidth; // Animation neu starten
    content.classList.add('enter');
    const stagger = (els) => els.forEach((el, i) => el.style.setProperty('--i', Math.min(i, 14)));
    stagger([...content.children]);
    content.querySelectorAll('.rows, .tiles, .rings, .home-row, .settings').forEach((g) => stagger([...g.children]));
    clearTimeout(state.enterTimer);
    state.enterTimer = setTimeout(() => content.classList.remove('enter'), 1600);
  }
  // Ringe erst im nächsten Frame setzen, damit sie sichtbar von 0 aus hochlaufen
  if (r.page === 'home') requestAnimationFrame(paintUsage);
}

// Live-Werte nur im DOM nachziehen, damit die Seite nicht jede Sekunde neu gebaut wird.
function paintUsage() {
  for (const k of ['cpu', 'gpu', 'ram']) {
    const v = Math.round(state.usage[k] ?? 0);
    const bar = document.querySelector(`[data-ring="${k}"]`);
    if (bar) bar.setAttribute('stroke-dashoffset', RING_C * (1 - v / 100));
    const val = document.querySelector(`[data-ring-val="${k}"]`);
    if (val) val.textContent = state.usage[k] == null ? '—' : `${v}%`;
  }
  const cur = document.querySelector('[data-current]');
  if (cur) cur.textContent = Math.round(state.usage[state.metric] ?? 0);
  const h = state.history[state.metric];
  const line = document.querySelector('[data-line]');
  if (!line || h.length < 2) return;
  const step = 600 / 59;
  const off = 60 - h.length;
  const pts = h.map((v, i) => `${((i + off) * step).toFixed(1)},${(200 - v * 2).toFixed(1)}`);
  line.setAttribute('d', 'M' + pts.join('L'));
  document.querySelector('[data-area]').setAttribute('d', `M${(off * step).toFixed(1)},200L${pts.join('L')}L600,200Z`);
}

// ---------- Aktionen ----------

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.classList.add('leaving'); setTimeout(() => el.remove(), 260); }, type === 'error' ? 6000 : 3000);
}

// Kategorie für einen Import wählen (wenn im Reiter "Alle" importiert wird).
function chooseCategory() {
  return new Promise((resolve) => {
    const modal = $('#modal');
    const extra = $('#modal-extra');
    $('#modal-title').textContent = t().modsChooseTitle;
    $('#modal-text').textContent = t().modsChooseText;
    $('#modal-cancel').textContent = t().cancel;
    $('#modal-ok').classList.add('hidden');
    extra.innerHTML = MOD_CATS.map((c) => `<button class="pill dark cat-pick" data-pick="${c}">${icon(c)}<span>${t().modCats[c]}</span></button>`).join('');
    modal.classList.remove('hidden');
    const done = (v) => {
      modal.classList.add('hidden');
      $('#modal-ok').classList.remove('hidden');
      extra.innerHTML = '';
      extra.onclick = $('#modal-cancel').onclick = modal.onclick = document.onkeydown = null;
      resolve(v);
    };
    extra.onclick = (e) => { const b = e.target.closest('[data-pick]'); if (b) done(b.dataset.pick); };
    $('#modal-cancel').onclick = () => done(null);
    modal.onclick = (e) => { if (e.target === modal) done(null); };
    document.onkeydown = (e) => { if (e.key === 'Escape') done(null); };
  });
}

const confirmRisk = (tw) => confirmDialog(t().riskyTitle(tw.name), `${tw.description} ${t().riskyText}`, t().applyAnyway);

function confirmDialog(title, text, okLabel) {
  return new Promise((resolve) => {
    $('#modal-title').textContent = title;
    $('#modal-text').textContent = text;
    $('#modal-cancel').textContent = t().cancel;
    $('#modal-ok').textContent = okLabel;
    const modal = $('#modal');
    modal.classList.remove('hidden');
    $('#modal-cancel').focus();
    const done = (v) => {
      modal.classList.add('hidden');
      $('#modal-ok').onclick = $('#modal-cancel').onclick = modal.onclick = document.onkeydown = null;
      resolve(v);
    };
    $('#modal-ok').onclick = () => done(true);
    $('#modal-cancel').onclick = () => done(false);
    modal.onclick = (e) => { if (e.target === modal) done(false); };
    document.onkeydown = (e) => { if (e.key === 'Escape') done(false); };
  });
}

async function call(action, id, extra = {}) {
  try {
    return await bridge.call({ action, id, lang: state.lang, ...extra });
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function setTweak(id, apply, { quiet = false } = {}) {
  const tw = state.tweaks.find((x) => x.id === id);
  if (!tw || tw.available === false || state.busy.has(id)) return false;
  state.busy.add(id);
  render();
  const res = await call(apply ? 'apply' : 'revert', id, { confirmDataLoss: apply && id === 'debloat.recall.off' });
  state.busy.delete(id);
  if (res?.ok) {
    tw.applied = !!res.applied;
    if (res.restartRequired) state.restartPending = true;
    if (!quiet) {
      const extra = t().statusMsg[res.status];
      toast(extra ? `${tw.name}: ${extra}` : (tw.applied ? t().applied(tw.name) : t().reverted(tw.name)));
    }
  } else {
    toast(`${tw.name}: ${errorText(res?.error)}`, 'error');
      // A failed native call may have rolled back or left a recoverable partial change.
      const refreshed = await call('list');
      if (refreshed?.ok) state.tweaks = refreshed.tweaks;
  }
  render();
  return !!res?.ok;
}

async function applySafe() {
  const list = tweaksIn(state.route.cat).filter((x) => bulkOk(x) && !x.applied);
  let ok = 0;
  for (const x of list) if (await setTweak(x.id, true, { quiet: true })) ok++;
  toast(t().safeDone(ok, list.length), ok === list.length ? 'info' : 'error');
}

async function cacheInfo() {
  state.cacheBusy = 'info';
  render();
  const res = await call('cache-info');
  state.cacheBusy = null;
  if (res?.ok) { state.cache = res; state.cacheError = null; }
  else { state.cache = null; state.cacheError = res?.error; }
  if (state.route.page === 'cleanup') render();
}

async function cacheOp(busyKey, action, extra, onOk) {
  state.cacheBusy = busyKey;
  render();
  const res = await call(action, undefined, extra);
  state.cacheBusy = null;
  if (res?.ok) onOk(res);
  else toast(errorText(res?.error), 'error');
  await cacheInfo();
}

async function cacheClean() {
  if (!(await confirmDialog(t().cleanTitle, t().cleanText, t().cleanOk))) return;
  cacheOp('clean', 'cache-clean', {}, (r) =>
    toast(r.status === 'unchanged' ? t().unchangedCache : t().cleaned(fmtBytes(r.removedFromActiveCacheBytes || 0))));
}

const cacheRestore = (backupId) => cacheOp(backupId, 'cache-restore', { backupId }, () => toast(t().restoredMsg));

async function cachePurge(backupId, date) {
  if (!(await confirmDialog(t().purgeTitle, t().purgeText(date), t().purgeOk))) return;
  cacheOp(backupId, 'cache-purge', { backupId, confirmPurge: true }, (r) => toast(t().purgedMsg(fmtBytes(r.freedBytes || 0))));
}

async function safeAction(kind) {
  if (kind === 'enable' && !(await confirmDialog(t().smEnableTitle, t().smEnableText, t().smEnableOk))) return;
  state.safeBusy = kind;
  render();
  const res = await call(`safemode-${kind}`);
  state.safeBusy = null;
  if (res?.ok) {
    state.safe = res;
    state.safeError = null;
    const failed = (res.repairs || []).filter((x) => !x.ok).length;
    const fixed = (res.repairs || []).length - failed;
    if (kind === 'enable') toast(t().smEnabled);
    if (kind === 'disable') toast(t().smDisabled);
    if (failed) toast(t().smRepairFailed(failed), 'error');
    else if (fixed && kind !== 'scan') toast(t().smRepaired(fixed));
  } else {
    if (kind === 'scan') state.safeError = res?.error;
    toast(errorText(res?.error), 'error');
  }
  if (state.route.page === 'safemode') render();
}

async function safeExport() {
  state.safeBusy = 'export';
  render();
  let res;
  try { res = await bridge.exportJson('safemode'); } catch (err) { res = { ok: false, error: err.message }; }
  state.safeBusy = null;
  if (res?.ok && !res.canceled) toast(t().smExported);
  else if (!res?.ok) toast(errorText(res?.error), 'error');
  render();
}

async function bkList() {
  state.bkBusy = 'list';
  render();
  const res = await call('backup-list');
  state.bkBusy = null;
  if (res?.ok) { state.bk = res; state.bkError = null; }
  else { state.bk = null; state.bkError = res?.error; }
  state.bkPreview = {};
  if (state.route.page === 'backups') render();
}

async function bkTogglePreview(id) {
  if (state.bkOpen === id) { state.bkOpen = null; render(); return; }
  state.bkOpen = id;
  render();
  if (!state.bkPreview[id]) {
    state.bkPreview[id] = await call('backup-preview', undefined, { backupId: id });
    if (state.route.page === 'backups') render();
  }
}

// Tweak-Status nach einer Wiederherstellung still neu einlesen (ohne Ladeanzeige).
async function refreshTweaks() {
  const list = await call('list');
  if (list?.ok) state.tweaks = list.tweaks || [];
  state.cache = null;
}

async function bkRestore(id, all) {
  const b = state.bk?.backups?.find((x) => x.backupId === id);
  const ok = all
    ? await confirmDialog(t().bkAllTitle, t().bkAllText, t().bkRestoreAll)
    : await confirmDialog(t().bkRestoreTitle, t().bkRestoreText(backupName(b)), t().bkRestore);
  if (!ok) return;
  state.bkBusy = all ? 'all' : id;
  render();
  const res = all ? await call('backup-restore-all') : await call('backup-restore', undefined, { backupId: id });
  state.bkBusy = null;
  // Teilerfolg kommt als ok:false MIT Einzelergebnissen – die immer anzeigen, nie zu einer Meldung zusammenfassen.
  if (Array.isArray(res?.results)) {
    state.bkResult = res;
    toast(res.ok ? t().bkDone : t().bkPartial, res.ok ? 'info' : 'error');
  } else {
    toast(errorText(res?.error), 'error');
  }
  state.bkOpen = null;
  await refreshTweaks();
  await bkList();
}

async function bkExport(id) {
  let res;
  try { res = await bridge.exportJson('backup', id); } catch (err) { res = { ok: false, error: err.message }; }
  if (res?.ok && !res.canceled) toast(t().bkExported);
  else if (!res?.ok) toast(errorText(res?.error), 'error');
}

async function modsLoad() {
  state.modsBusy = 'list';
  render();
  const [list, res] = await Promise.all([call('mods-list'), call('res-get')]);
  state.modsBusy = null;
  if (list?.ok) { state.mods = list; state.modsError = null; } else { state.mods = null; state.modsError = list?.error; }
  setRes(res);
  if (state.route.page === 'mods') render();
}

function setRes(res) {
  if (res?.ok) {
    state.res = res; state.resError = null;
    state.resForm = { width: res.width, height: res.height, windowed: res.windowed };
  } else { state.res = null; state.resError = res?.error; }
}

async function modImport(kind) {
  const category = state.modsTab === 'all' ? await chooseCategory() : state.modsTab;
  if (!category) return;
  state.modsBusy = 'import';
  render();
  let res;
  try { res = await bridge.importMod(category, kind); } catch (err) { res = { ok: false, error: err.message }; }
  state.modsBusy = null;
  if (res?.ok && !res.canceled) toast(t().modsImported(res.mod.name, res.mod.fileCount));
  else if (!res?.ok) toast(errorText(res?.error), 'error');
  await modsLoad();
}

async function modToggle(id, enable) {
  const m = state.mods?.mods.find((x) => x.id === id);
  state.modsBusy = id;
  render();
  const res = await call(enable ? 'mods-enable' : 'mods-disable', undefined, { modId: id });
  state.modsBusy = null;
  if (res?.ok) toast(enable ? t().modsEnabled(m.name) : t().modsDisabled(m.name));
  else toast(`${m?.name}: ${errorText(res?.error)}`, 'error');
  await modsLoad();
}

async function modRemove(id) {
  const m = state.mods?.mods.find((x) => x.id === id);
  if (!(await confirmDialog(t().modsRemoveTitle(m.name), t().modsRemoveText, t().modsRemove))) return;
  state.modsBusy = id;
  render();
  const res = await call('mods-remove', undefined, { modId: id });
  state.modsBusy = null;
  if (res?.ok) toast(t().modsRemoved(m.name)); else toast(errorText(res?.error), 'error');
  await modsLoad();
}

async function resApply(reset) {
  state.resBusy = true;
  render();
  const f = state.resForm;
  const res = reset ? await call('res-reset') : await call('res-set', undefined, { width: f.width, height: f.height, windowed: f.windowed });
  state.resBusy = false;
  if (res?.ok) { setRes(res); toast(reset ? t().resResetDone : t().resApplied(res.width, res.height)); }
  else toast(errorText(res?.error), 'error');
  render();
}

async function load() {
  state.loading = true;
  render();
  const [info, list] = await Promise.all([call('info'), call('list')]);
  state.loading = false;
  if (info?.ok) state.info = info;
  if (list?.ok) state.tweaks = list.tweaks || [];
  else toast(`${t().loadFailed}: ${errorText(list?.error)}`, 'error');
  state.enter = true;
  render();
  hideSplash();
}

function go(route) {
  state.route = route;
  state.filter = 'all';
  state.enter = true;
  render();
  $('#content').scrollTop = 0;
  if (route.cat === 'debloat') debloatLoad();
  if (route.page === 'cleanup' && !state.cacheBusy) cacheInfo();
  if (route.page === 'safemode' && !state.safeBusy) safeAction('scan');
  if (route.page === 'settings') bridge.checkUpdate();
  if (route.page === 'mods' && !state.modsBusy) modsLoad();
  if (route.page === 'backups' && !state.bkBusy) { state.bkResult = null; state.bkOpen = null; bkList(); }
}

// ---------- Events ----------

document.addEventListener('click', (e) => {
  const el = e.target.closest('button');
  if (!el) return;
  if (el.hasAttribute('data-collapse')) {
    state.collapsed = !state.collapsed;
    store.set('collapsed', state.collapsed ? '1' : '0');
    renderNav();
  } else if (el.dataset.go) go({ page: el.dataset.go });
  else if (el.dataset.cat) go({ page: 'cat', cat: el.dataset.cat, parent: el.dataset.parent });
  else if (el.dataset.filter) { state.filter = el.dataset.filter; render(); }
  else if (el.dataset.metric) { state.metric = el.dataset.metric; render(); }
  else if (el.dataset.lang) {
    state.lang = el.dataset.lang;
    store.set('lang', state.lang);
    state.cache = null;
    state.bk = null;
    state.mods = null;
    load();
  } else if (el.id === 'apply-safe') applySafe();
  else if (el.id === 'cache-info') cacheInfo();
  else if (el.id === 'cache-clean') cacheClean();
  else if (el.dataset.restore) cacheRestore(el.dataset.restore);
  else if (el.dataset.purge) cachePurge(el.dataset.purge, el.dataset.date);
  else if (el.id === 'sm-export') safeExport();
  else if (el.id === 'bk-reload') bkList();
  else if (el.dataset.modTab) { state.modsTab = el.dataset.modTab; render(); }
  else if (el.dataset.modImport) modImport(el.dataset.modImport);
  else if (el.dataset.modRemove) modRemove(el.dataset.modRemove);
  else if (el.id === 'mods-open') bridge.openModsFolder().then((r) => { if (!r?.ok) toast(errorText(r?.error), 'error'); });
  else if (el.id === 'mods-reload' || el.id === 'res-reload') modsLoad();
  else if (el.dataset.res) { const [w, h] = el.dataset.res.split('x').map(Number); Object.assign(state.resForm, { width: w, height: h }); render(); }
  else if (el.dataset.resMode) { state.resForm.windowed = Number(el.dataset.resMode); render(); }
  else if (el.id === 'res-apply') resApply(false);
  else if (el.id === 'res-reset') resApply(true);
  else if (el.id === 'up-check') bridge.checkUpdate();
  else if (el.id === 'up-install') bridge.installUpdate();
  else if (el.id === 'up-log') bridge.openUpdateLog();
  else if (el.id === 'app-show') bridge.showExe().then((r) => { if (!r?.ok) toast(errorText(r?.error), 'error'); });
  else if (el.id === 'app-lnk-desktop' || el.id === 'app-lnk-start') {
    const where = el.id === 'app-lnk-start' ? 'startmenu' : 'desktop';
    bridge.createShortcut(where).then((r) => toast(r?.ok ? t().appLnkDone(where) : errorText(r?.error), r?.ok ? 'info' : 'error'));
  }
  else if (el.id === 'up-page') bridge.openReleasePage();
  else if (el.id === 'bk-all') bkRestore(null, true);
  else if (el.dataset.bkPreview) bkTogglePreview(el.dataset.bkPreview);
  else if (el.dataset.bkRestore) bkRestore(el.dataset.bkRestore, false);
  else if (el.dataset.bkExport) bkExport(el.dataset.bkExport);
  else if (el.id.startsWith('sm-')) safeAction(el.id.slice(3));
  else if (el.id === 'reload') load();
  else if (el.id === 'restart-later') { state.restartPending = false; render(); }
});

// Eigene Auflösung: Eingaben ohne Neuzeichnen übernehmen, nur den Übernehmen-Knopf aktualisieren.
document.addEventListener('input', (e) => {
  if (!['res-w', 'res-h'].includes(e.target.id) || !state.resForm) return;
  const v = parseInt(e.target.value, 10);
  if (e.target.id === 'res-w') state.resForm.width = v; else state.resForm.height = v;
  const r = state.res; const f = state.resForm;
  const valid = f.width >= 640 && f.width <= 7680 && f.height >= 480 && f.height <= 4320;
  const changed = f.width !== r.width || f.height !== r.height || f.windowed !== r.windowed;
  $('#res-apply').disabled = !valid || !changed || state.resBusy;
  document.querySelectorAll('.res-preset').forEach((b) => b.classList.toggle('active', b.dataset.res === `${f.width}x${f.height}`));
});

document.addEventListener('change', async (e) => {
  if (e.target.dataset?.modToggle) { modToggle(e.target.dataset.modToggle, e.target.checked); return; }
  const id = e.target.dataset?.toggle;
  if (!id) return;
  const tw = state.tweaks.find((x) => x.id === id);
  const apply = e.target.checked;
  if (apply && tw.risk === 'high' && !(await confirmRisk(tw))) { e.target.checked = false; return; }
  setTweak(id, apply);
});

$('#win-min').addEventListener('click', () => bridge.minimize());
$('#win-close').addEventListener('click', () => bridge.close());

bridge.onUsage((u) => {
  state.usage = u;
  for (const k of ['cpu', 'gpu', 'ram']) {
    if (u[k] == null) continue;
    state.history[k].push(u[k]);
    if (state.history[k].length > 60) state.history[k].shift();
  }
  if (state.route.page === 'home' && !state.loading) paintUsage();
});

// Meldungen des SafeMode-Monitors (alle 30 s im Hauptprozess, solange die App offen ist).
function onSafeMode(msg) {
  if (!msg) return;
  if (msg.report) { state.safe = msg.report; state.safeMonitorError = null; }
  if (msg.error) state.safeMonitorError = msg.error;
  if (state.route.page === 'safemode' && !state.safeBusy) render();
}
bridge.onSafeMode(onSafeMode);
bridge.lastSafeMode().then(onSafeMode);

function onUpdate(st) {
  if (!st) return;
  state.update = st;
  // Nur neu zeichnen, wenn es sichtbar ist – sonst würde der Download-Fortschritt ständig die Seite neu bauen.
  if (st.status === 'ready' || st.status === 'error' || state.route.page === 'settings') render();
}
bridge.onUpdate(onUpdate);
bridge.updateState().then(onUpdate);
bridge.appLocation().then((l) => { state.exe = l?.exe || null; if (state.route.page === 'settings') render(); });
bridge.version().then((v) => {
  state.version = v;
  document.querySelector('.brand-ver').textContent = `V${v}`;
});

// Start-Animation: mindestens so lange zeigen, bis sie einmal durchgelaufen ist; spätestens nach 6 s weg.
const SPLASH_MIN = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 3900;
const splashStart = performance.now();
let splashDone = false;
function hideSplash() {
  if (splashDone) return;
  splashDone = true;
  const wait = Math.max(0, SPLASH_MIN - (performance.now() - splashStart));
  setTimeout(() => {
    const el = $('#splash');
    el.classList.add('out');
    document.body.classList.remove('booting');
    state.enter = true;
    render();
    setTimeout(() => el.remove(), 800);
  }, wait);
}
setTimeout(hideSplash, 6000);

bridge.mode().then((m) => { state.mode = m; if (state.route.page === 'settings') render(); });
load();

