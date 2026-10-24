'use strict';
// Gaming Tweaks page in the layout of the user's reference: four columns of centred cards with an icon, a bold title,
// a one-line description and a big On/Off button. The full description is the card tooltip. Switching uses setTweak
// (same backup/restore as everywhere); memory integrity asks first because it lowers kernel protection.
const GAMING_ICONS = {
  laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  camera: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3Z"/>',
  gamepad: '<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="8.5" cy="12" r="1.5"/><circle cx="15.5" cy="12" r="1.5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 16-5-5-9 9"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
  rings: '<circle cx="8" cy="13" r="3.5"/><circle cx="16.5" cy="11" r="3.5"/>',
  mouse: '<rect x="7" y="3" width="10" height="16" rx="5"/><path d="M12 7v3M8 22h8"/>',
  expand: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  power: '<path d="M12 3v8"/><path d="M6.3 7.3a8 8 0 1 0 11.4 0"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  square: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
};
// Order and short texts follow the reference; ids map to our real tweaks.
const GAMING_CARDS = [
  ['gaming.gpu.hags', 'laptop', { de: ['Hardware-GPU-Scheduling', 'Die GPU plant ihre Arbeit selbst.'], en: ['Hardware GPU scheduling', 'Lets the GPU schedule its own work.'], it: ['Pianificazione GPU hardware', 'La GPU pianifica da sola il lavoro.'] }],
  ['windows.gpu.tdr', 'clock', { de: ['GPU-TDR-Verzögerung erhöhen', 'Mehr Zeit vor einem Treiber-Reset.'], en: ['Raise GPU TDR delay', 'Gives the GPU longer before a driver reset.'], it: ['Aumenta ritardo TDR GPU', 'Più tempo prima di un reset del driver.'] }],
  ['windows.capture.off', 'camera', { de: ['Game-DVR-Aufnahme aus', 'Keine Spielaufnahme im Hintergrund.'], en: ['Disable Game DVR capture', 'Turns off background game recording.'], it: ['Disattiva acquisizione Game DVR', 'Nessuna registrazione in background.'] }],
  ['windows.gamemode.on', 'gamepad', { de: ['Spielmodus aktivieren', 'Schaltet den Spielmodus ein.'], en: ['Enable Game Mode', 'Turns on Game Mode.'], it: ['Attiva modalità gioco', 'Attiva la modalità gioco.'] }],
  ['windows.mmcss.games', 'image', { de: ['Spiele-Multimedia-Priorität', 'Spiele vor anderen Apps.'], en: ['Games multimedia priority', 'Gives games priority over other apps.'], it: ['Priorità multimediale giochi', 'Giochi prima delle altre app.'] }],
  ['windows.mmcss.latency', 'bolt', { de: ['Low-Latency-Multimedia', 'Weniger Reserve für Hintergrund-Apps.'], en: ['Low-latency multimedia', 'Less reserve for background apps.'], it: ['Multimedia a bassa latenza', 'Meno riserva per le app in background.'] }],
  ['gaming.gpu.latency', 'monitor', { de: ['GPU- / Energie-Latenz', 'Weniger GPU-Stromspar-Latenz.'], en: ['GPU / power latency keys', 'Cuts GPU power-saving latency.'], it: ['Latenza GPU / energia', 'Meno latenza di risparmio GPU.'] }],
  ['gaming.gpu.iommu', 'rings', { de: ['DpiMapIommuContiguous', 'Kleiner GPU-Speicher-Tweak.'], en: ['DpiMapIommuContiguous', 'Small GPU memory mapping tweak.'], it: ['DpiMapIommuContiguous', 'Piccolo tweak memoria GPU.'] }],
  ['gaming.mouse.queue', 'mouse', { de: ['Maus-Datenpuffer', 'Kompakter Eingabepuffer der Maus.'], en: ['Mouse data queue', 'Compact mouse input queue.'], it: ['Coda dati mouse', 'Coda di input del mouse compatta.'] }],
  ['windows.legacy.fps', 'expand', { de: ['Vollbildoptimierungen aus', 'Schaltet Vollbildoptimierungen ab.'], en: ['Disable fullscreen optimisations', 'Turns off fullscreen optimisations.'], it: ['Disattiva ottimizzazioni schermo intero', 'Spegne le ottimizzazioni a schermo intero.'] }],
  ['windows.gamebar.quiet', 'power', { de: ['Game-Bar-Start leise', 'Keine Game-Bar-Tipps mehr.'], en: ['Quiet Game Bar startup', 'Stops the Game Bar tip popping up.'], it: ['Avvio Game Bar silenzioso', 'Niente più suggerimenti Game Bar.'] }],
  ['gaming.mpo.off', 'monitor', { de: ['Multiplane Overlay aus', 'Verhindert MPO-Ruckler auf manchen GPUs.'], en: ['Disable multiplane overlay', 'Turns off MPO, which can hitch on some GPUs.'], it: ['Disattiva multiplane overlay', 'Spegne MPO, che può scattare su alcune GPU.'] }],
  ['gaming.hvci.off', 'lock', { de: ['Speicherintegrität aus', 'VBS / Kernisolierung aus für mehr FPS. Neustart nötig.'], en: ['Disable memory integrity', 'Turns off VBS / core isolation for more FPS. Needs a restart.'], it: ['Disattiva integrità memoria', 'Spegne VBS / isolamento core per più FPS. Riavvio necessario.'] }],
  ['gaming.gamebar.off', 'square', { de: ['Game-Bar-Overlay aus', 'Kein Game-Bar-Overlay über Spielen.'], en: ['Disable Game Bar overlay', 'Stops Game Bar from opening over games.'], it: ['Disattiva overlay Game Bar', 'La Game Bar non si apre sui giochi.'] }],
];
const GAMING_TEXT = {
  de: { title: 'Gaming Tweaks', on: 'On', off: 'Off', working: '…', confirm: 'Speicherintegrität ausschalten?', confirmGo: 'Ausschalten' },
  en: { title: 'Gaming Tweaks', on: 'On', off: 'Off', working: '…', confirm: 'Turn off memory integrity?', confirmGo: 'Turn off' },
  it: { title: 'Gaming Tweaks', on: 'On', off: 'Off', working: '…', confirm: 'Disattivare l’integrità della memoria?', confirmGo: 'Disattiva' },
};
const gamingText = () => GAMING_TEXT[state.lang] || GAMING_TEXT.en;
const gamingIcon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${GAMING_ICONS[k] || GAMING_ICONS.square}</svg>`;

function renderGamingTweaks() {
  const w = gamingText();
  const cards = GAMING_CARDS.map(([id, ic, texts]) => {
    const tw = state.tweaks.find((x) => x.id === id);
    if (!tw) return '';
    const [title, short] = texts[state.lang] || texts.en;
    const busy = state.busy.has(id), off = tw.available === false;
    const tip = tw.description + (off ? `\n${errorText(tw.stateError)}` : '');
    return `<article class="gt-card${tw.applied ? ' is-on' : ''}${off ? ' is-na' : ''}" title="${esc(tip)}">
      <div class="gt-icon">${gamingIcon(ic)}</div>
      <h3>${esc(title)}</h3>
      <p>${esc(short)}</p>
      <button class="gt-toggle${tw.applied ? ' on' : ''}" data-gt="${esc(id)}" ${busy || off ? 'disabled' : ''} aria-pressed="${!!tw.applied}" aria-label="${esc(title)}">${busy ? w.working : tw.applied ? w.on : w.off}</button>
    </article>`;
  }).join('');
  return `<div class="gt-page"><h1 class="gt-title">${esc(w.title)}</h1><div class="gt-grid">${cards}</div></div>`;
}

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-gt]');
  if (!b || b.disabled) return;
  const tw = state.tweaks.find((x) => x.id === b.dataset.gt);
  if (!tw) return;
  if (!tw.applied && tw.risk === 'high' && tw.id === 'gaming.hvci.off') {
    if (!(await confirmDialog(gamingText().confirm, tw.description, gamingText().confirmGo))) return;
  }
  await setTweak(tw.id, !tw.applied);
});
