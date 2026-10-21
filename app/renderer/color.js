/* Extra > Color: four vertical bars (0-100) that change the whole screen live; Save look / Reset display. */
(() => {
  const KEYS = ['brightness', 'contrast', 'vibrance', 'hue'];
  const words = {
    de: { title:'Farbe', desc:'Helligkeit, Kontrast, Farbsättigung und Farbton deines Bildschirms', hint:'Ziehe einen Balken, um den Wert zu setzen. Änderungen wirken sofort auf den ganzen Bildschirm, auch in randlosen Spielen. 0 = unverändert.',
      note:'Der Look bleibt aktiv, solange Tweaker läuft. „Save look“ stellt ihn beim nächsten Start wieder her; beim Beenden ist das Bild automatisch wieder normal. Exklusiver Vollbildmodus kann den Effekt umgehen.',
      brightness:'Helligkeit', contrast:'Kontrast', vibrance:'Vibrance', hue:'Farbton', save:'Save look', reset:'Reset display', back:'Zurück', saved:'Look gespeichert – wird beim nächsten Start wieder angewendet.', cleared:'Bildschirm zurückgesetzt.', unchanged:'Gespeicherter Look aktiv', unsaved:'Nicht gespeichert',
      unavailable:'Windows hat die Farbanpassung abgelehnt. Bildschirm bleibt unverändert.', unsupported:'Nur unter Windows verfügbar.', failed:'Speichern fehlgeschlagen.' },
    en: { title:'Color', desc:'Brightness, contrast, vibrance and hue on your display', hint:'Drag a bar to set its level. Changes apply to your whole screen straight away, including borderless games. 0 = unchanged.',
      note:'The look stays active while Tweaker is running. "Save look" brings it back on the next start; when you quit, the picture returns to normal automatically. Exclusive fullscreen can bypass the effect.',
      brightness:'Brightness', contrast:'Contrast', vibrance:'Vibrance', hue:'Hue', save:'Save look', reset:'Reset display', back:'Back', saved:'Look saved – applied again on the next start.', cleared:'Display reset.', unchanged:'Saved look active', unsaved:'Not saved',
      unavailable:'Windows rejected the color adjustment. Your screen is unchanged.', unsupported:'Only available on Windows.', failed:'Saving failed.' },
    it: { title:'Colore', desc:'Luminosità, contrasto, vivacità e tonalità del tuo schermo', hint:'Trascina una barra per impostarne il livello. Le modifiche valgono subito su tutto lo schermo, anche nei giochi senza bordi. 0 = invariato.',
      note:'Il look resta attivo finché Tweaker è in esecuzione. "Save look" lo ripristina al prossimo avvio; alla chiusura l’immagine torna normale automaticamente. Lo schermo intero esclusivo può aggirare l’effetto.',
      brightness:'Luminosità', contrast:'Contrasto', vibrance:'Vivacità', hue:'Tonalità', save:'Save look', reset:'Reset display', back:'Indietro', saved:'Look salvato: verrà riapplicato al prossimo avvio.', cleared:'Schermo ripristinato.', unchanged:'Look salvato attivo', unsaved:'Non salvato',
      unavailable:'Windows ha rifiutato la regolazione del colore. Lo schermo resta invariato.', unsupported:'Disponibile solo su Windows.', failed:'Salvataggio non riuscito.' }
  };
  const palette = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0 0 22 9.8C22 6 17.5 3 12 3Z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7" r="1.2"/></svg>';
  let bridge, lang = 'de', look = { brightness:0, contrast:0, vibrance:0, hue:0 }, saved = null, status = 'ready', message = '', pending = null, sending = false;
  const w = () => words[lang] || words.en;
  const same = (a, b) => !!a && !!b && KEYS.every((k) => a[k] === b[k]);
  const neutral = (a) => KEYS.every((k) => a[k] === 0);

  // Live updates: at most one request in flight, the latest value always wins.
  async function push() {
    if (sending || !pending) return;
    sending = true; const next = pending; pending = null;
    try { const r = await bridge?.colorSet?.(next); if (r && !r.ok) { message = w()[r.error === 'color_unavailable' ? 'unsupported' : 'unavailable']; paint(); } }
    finally { sending = false; if (pending) push(); }
  }
  function setValue(key, value) {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    if (look[key] === v) return;
    look = { ...look, [key]: v }; message = ''; pending = { ...look }; paint(); push();
  }
  function paint() {
    const root = document.getElementById('color-page'); if (!root) return;
    for (const key of KEYS) {
      const bar = root.querySelector(`[data-color="${key}"]`); if (!bar) continue;
      bar.style.setProperty('--v', look[key] / 100);
      bar.setAttribute('aria-valuenow', look[key]);
      root.querySelector(`[data-color-val="${key}"]`).textContent = look[key];
    }
    const state = root.querySelector('[data-color-state]');
    state.textContent = status === 'unsupported' ? w().unsupported : status === 'unavailable' ? w().unavailable : message || (saved && same(look, saved) ? w().unchanged : neutral(look) ? '' : w().unsaved);
    state.classList.toggle('bad', status !== 'ready' || message === w().failed);
    root.querySelector('#color-save').disabled = status === 'unsupported';
    root.querySelector('#color-reset').disabled = status === 'unsupported';
  }
  function html(language) {
    lang = language; const t = w();
    const bar = (key) => `<div class="color-col">
        <span class="color-val" data-color-val="${key}">${look[key]}</span>
        <div class="color-bar" data-color="${key}" role="slider" tabindex="0" aria-label="${t[key]}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${look[key]}" style="--v:${look[key] / 100}"><i></i></div>
        <b>${t[key]}</b>
      </div>`;
    return `<div class="card detail-head cat-hero"><div class="tile-icon">${palette}</div>
        <div class="cat-hero-body"><h1>${t.title}</h1><p>${t.desc}</p></div>
        <button class="pill dark big" data-go="extra">${t.back}</button></div>
      <section id="color-page" class="color-page">
        <p class="hint">${t.hint}</p>
        <div class="color-bars">${KEYS.map(bar).join('')}</div>
        <div class="color-actions"><button class="pill light big" id="color-save">${t.save}</button><button class="pill dark big" id="color-reset">${t.reset}</button><span class="color-state" data-color-state role="status"></span></div>
        <p class="hint color-note">${t.note}</p>
      </section>`;
  }
  function mount(language) { lang = language; paint(); }
  function bind(api) {
    bridge = api;
    api.onColor?.((st) => { if (!st) return; status = st.status; saved = st.saved; paint(); });
    api.colorState?.().then((st) => { if (!st) return; status = st.status; saved = st.saved; look = { ...st.look }; paint(); });
  }
  // Dragging: value follows the pointer from the bottom (0) to the top (100) of the bar.
  let drag = null;
  const fromPointer = (bar, e) => { const r = bar.getBoundingClientRect(); return (1 - (e.clientY - r.top) / r.height) * 100; };
  document.addEventListener('pointerdown', (e) => {
    const bar = e.target.closest('.color-bar'); if (!bar || status === 'unsupported') return;
    drag = bar; bar.setPointerCapture?.(e.pointerId); bar.focus(); setValue(bar.dataset.color, fromPointer(bar, e)); e.preventDefault();
  });
  document.addEventListener('pointermove', (e) => { if (drag) setValue(drag.dataset.color, fromPointer(drag, e)); });
  document.addEventListener('pointerup', () => { drag = null; });
  document.addEventListener('keydown', (e) => {
    const bar = e.target.closest?.('.color-bar'); if (!bar) return;
    const key = bar.dataset.color, step = { ArrowUp:1, ArrowRight:1, ArrowDown:-1, ArrowLeft:-1, PageUp:10, PageDown:-10 }[e.key];
    if (step) setValue(key, look[key] + step); else if (e.key === 'Home') setValue(key, 0); else if (e.key === 'End') setValue(key, 100); else return;
    e.preventDefault();
  });
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('#color-save, #color-reset'); if (!b || b.disabled || !bridge) return;
    if (b.id === 'color-save') {
      const r = await bridge.colorSave?.({ ...look });
      if (r?.ok) { saved = neutral(look) ? null : { ...look }; message = w().saved; } else message = w().failed;
    } else {
      const r = await bridge.colorReset?.();
      if (r?.ok) { look = { brightness:0, contrast:0, vibrance:0, hue:0 }; saved = null; message = w().cleared; } else message = w().failed;
    }
    paint();
  });
  window.ColorPage = { html, mount, bind, icon: palette };
})();
