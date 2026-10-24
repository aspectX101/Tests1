'use strict';
/* FiveM > H1T Mods: our own NVEs and minimaps with preview, installed with one click
   (download, checksum, normal Mod Manager import, enable). Data comes from app/h1t-mods.js. */
(function (root) {
  const TEXT = {
    de: { title: 'H1T Mods', desc: 'Eigene NVEs und Minimaps von H1T.CC – mit Vorschau ansehen und mit einem Klick installieren.',
      all: 'Alle', nve: 'NVE', minimap: 'Minimaps', install: 'Installieren', update: 'Aktualisieren', installed: 'Installiert', loading: 'Wird geladen …',
      downloading: (p) => `Lädt … ${p}%`, empty: 'Noch keine H1T Mods veröffentlicht – schau bald wieder vorbei.', retry: 'Neu laden', by: 'von',
      done: (n) => `${n} installiert und aktiviert.`, doneOff: (n) => `${n} installiert. Aktivieren im FiveM Mod Manager, sobald FiveM geschlossen ist.`,
      note: 'Installiert über den FiveM Mod Manager: Originaldateien werden gesichert, ausführbare Dateien nie installiert. Manche Server erlauben keine Client-Mods.' },
    en: { title: 'H1T Mods', desc: 'H1T.CC’s own NVEs and minimaps – preview them and install with one click.',
      all: 'All', nve: 'NVE', minimap: 'Minimaps', install: 'Install', update: 'Update', installed: 'Installed', loading: 'Loading …',
      downloading: (p) => `Downloading … ${p}%`, empty: 'No H1T mods published yet – check back soon.', retry: 'Reload', by: 'by',
      done: (n) => `${n} installed and enabled.`, doneOff: (n) => `${n} installed. Enable it in the FiveM Mod Manager once FiveM is closed.`,
      note: 'Installed through the FiveM Mod Manager: original files are backed up, executables are never installed. Some servers do not allow client mods.' },
    it: { title: 'H1T Mods', desc: 'NVE e minimappe di H1T.CC – guarda l’anteprima e installa con un clic.',
      all: 'Tutte', nve: 'NVE', minimap: 'Minimappe', install: 'Installa', update: 'Aggiorna', installed: 'Installata', loading: 'Caricamento …',
      downloading: (p) => `Download … ${p}%`, empty: 'Nessuna mod H1T pubblicata – torna presto.', retry: 'Ricarica', by: 'di',
      done: (n) => `${n} installata e attivata.`, doneOff: (n) => `${n} installata. Attivala nel FiveM Mod Manager quando FiveM è chiuso.`,
      note: 'Installata tramite il FiveM Mod Manager: i file originali vengono salvati, mai file eseguibili. Alcuni server non consentono mod client.' },
  };
  const ui = { mods: null, error: null, loading: false, filter: 'all', progress: {}, busy: null };
  let bridge;
  const tx = () => TEXT[state.lang] || TEXT.en;
  const size = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

  async function load() {
    if (ui.loading || !bridge?.h1tModsList) return;
    ui.loading = true; ui.error = null; if (state.route.page === 'h1tmods') render();
    try { const r = await bridge.h1tModsList(); if (r?.ok) ui.mods = r.mods || []; else ui.error = r?.error || 'h1t_mods_offline'; }
    catch (e) { ui.error = e.message; }
    finally { ui.loading = false; if (state.route.page === 'h1tmods') render(); }
  }
  async function install(id) {
    if (ui.busy) return;
    const m = ui.mods?.find((x) => x.id === id); if (!m) return;
    ui.busy = id; ui.progress[id] = 0; render();
    const r = await bridge.h1tModsInstall(id);
    ui.busy = null; delete ui.progress[id];
    if (r?.ok) { m.installed = true; m.update = false; m.installedVersion = m.version; toast(r.enabled ? tx().done(m.name) : tx().doneOff(m.name)); state.mods = null; }
    else toast(`${m.name}: ${errorText(r?.error)}`, 'error');
    render();
  }

  function card(m) {
    const w = tx(), p = ui.progress[m.id], mine = ui.busy === m.id;
    const label = mine ? w.downloading(p ?? 0) : m.update ? w.update : m.installed ? w.installed : w.install;
    return `<article class="card h1t-mod">
      <div class="h1t-mod-preview">${m.preview ? `<img src="${m.preview}" alt="">` : `<div class="h1t-mod-noprev">${icon(m.category === 'minimap' ? 'minimap' : 'graphics')}</div>`}
        <span class="h1t-mod-cat">${esc(w[m.category] || m.category)}</span></div>
      <div class="h1t-mod-body">
        <h3>${esc(m.name)}</h3>
        <p class="h1t-mod-meta">${esc(w.by)} ${esc(m.author)} · v${esc(m.version)} · ${size(m.size)}</p>
        <p class="h1t-mod-desc">${esc(m.description?.[state.lang] || m.description?.en || '')}</p>
        ${mine ? `<div class="cat-meter"><i data-pct="${p ?? 0}"></i></div>` : ''}
        <button class="pill ${m.installed && !m.update ? 'dark' : 'light'} h1t-mod-go" data-h1t-install="${esc(m.id)}" ${ui.busy || (m.installed && !m.update) ? 'disabled' : ''}>${icon(m.installed && !m.update ? 'safemode' : 'bolt')}<span>${esc(label)}</span></button>
      </div></article>`;
  }
  function html() {
    const w = tx();
    const seg = (k) => `<button data-h1t-filter="${k}" class="${ui.filter === k ? 'active' : ''}">${esc(w[k])}</button>`;
    const list = (ui.mods || []).filter((m) => ui.filter === 'all' || m.category === ui.filter);
    let body;
    if (ui.loading && !ui.mods) body = `<div class="h1t-mods-grid">${'<div class="skeleton h1t-mod-skel"></div>'.repeat(3)}</div>`;
    else if (ui.error && !ui.mods) body = `<div class="card empty h1t-mods-empty"><p>${esc(errorText(ui.error))}</p><button class="pill dark" id="h1t-reload">${esc(w.retry)}</button></div>`;
    else if (!list.length) body = `<div class="card empty h1t-mods-empty"><p>${esc(w.empty)}</p><button class="pill dark" id="h1t-reload">${esc(w.retry)}</button></div>`;
    else body = `<div class="h1t-mods-grid">${list.map(card).join('')}</div>`;
    return `<div class="card detail-head cat-hero"><div class="tile-icon">${icon('h1tmods')}</div>
        <div class="cat-hero-body"><h1>${esc(w.title)}</h1><p>${esc(w.desc)}</p></div></div>
      <div class="toolbar"><div class="seg">${seg('all')}${seg('nve')}${seg('minimap')}</div></div>
      ${body}
      <p class="hint">${esc(w.note)}</p>`;
  }
  function bind(api) {
    bridge = api;
    api.onH1tModsProgress?.((p) => { if (!p || ui.busy !== p.id) return; ui.progress[p.id] = p.percent; const bar = document.querySelector(`[data-h1t-install="${p.id}"]`)?.closest('.h1t-mod-body'); if (bar) { const i = bar.querySelector('.cat-meter i'); if (i) i.style.width = `${p.percent}%`; const s = bar.querySelector('.h1t-mod-go span'); if (s) s.textContent = tx().downloading(p.percent); } });
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-h1t-install], [data-h1t-filter], #h1t-reload'); if (!b || b.disabled) return;
      if (b.dataset.h1tInstall) install(b.dataset.h1tInstall);
      else if (b.dataset.h1tFilter) { ui.filter = b.dataset.h1tFilter; render(); }
      else { ui.mods = null; load(); }
    });
  }
  root.H1tMods = { html, load, bind, state: ui };
})(this);
