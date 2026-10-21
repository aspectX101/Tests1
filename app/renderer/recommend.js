'use strict';
/* Profile "Recommended": a read-only system check (backend action system-check) plus fixed, explainable rules
   that pick the tweaks that fit this PC. Local only: no data leaves the computer.
   The rules are a pure function (recommendTweaks) so they can be tested without a UI. */
(function (root) {
  const known = (v) => v === true || v === false;
  // [tweak id, (facts) => ['pick' | 'skip', reason]] in display order. Unknown facts never lead to a pick.
  const RULES = [
    ['windows.gamemode.on', () => ['pick', 'baseline']],
    ['windows.power.high', (f) => f.laptop === false ? ['pick', 'desktop_power'] : ['skip', f.laptop ? 'laptop_battery' : 'unknown_chassis']],
    ['network.throttle.off', () => ['pick', 'network_gaming']],
    ['network.winsock.udp', () => ['pick', 'udp_game']],
    ['network.delivery.off', () => ['pick', 'background_upload']],
    ['network.nic.powersave.off', (f) => f.laptop === false ? ['pick', 'desktop_nic'] : ['skip', f.laptop ? 'laptop_battery' : 'unknown_chassis']],
    ['network.wifisense.off', (f) => f.wifi === true ? ['pick', 'wifi_present'] : ['skip', f.wifi === false ? 'no_wifi' : 'unknown_network']],
    ['network.teredo.off', (f) => f.xboxApp === false ? ['pick', 'no_xbox_app'] : ['skip', f.xboxApp ? 'xbox_app_needs_teredo' : 'unknown_xbox']],
    ['network.dns.fast', (f) => f.customDns === false ? ['pick', 'dhcp_dns'] : ['skip', f.customDns ? 'custom_dns' : 'unknown_dns']],
    ['windows.hibernate.off', (f) => f.laptop === false && f.systemDisk === 'SSD' ? ['pick', 'desktop_hibernate'] : ['skip', f.laptop ? 'laptop_battery' : 'unknown_chassis']],
    ['keyboard.mouse.accel.off', () => ['pick', 'mouse_precision']],
    ['windows.gamebar.quiet', () => ['pick', 'baseline_quiet']],
    ['windows.suggestions.off', () => ['pick', 'background_ads']],
    // Deliberately not recommended, with the reason shown to the user.
    ['windows.prefetch.off', (f) => ['skip', f.systemDisk === 'HDD' ? 'hdd_keeps_prefetch' : 'no_gain_ssd']],
    ['windows.service.sysmain.off', (f) => ['skip', f.systemDisk === 'HDD' ? 'hdd_keeps_prefetch' : 'no_gain_ssd']],
    ['windows.cpu.unpark', (f) => ['skip', /X3D/i.test(f.cpu?.name || '') ? 'x3d_cpu' : f.laptop ? 'laptop_battery' : 'scheduler_risk']],
    ['network.nagle.off', () => ['skip', 'udp_game_nagle']],
    ['network.qos.reserve.off', () => ['skip', 'not_measurable']],
    ['windows.gpu.tdr', () => ['skip', 'debug_only']],
    ['keyboard.mouse.speed.native', () => ['skip', 'personal_preference']],
  ];
  function recommendTweaks(facts, tweaks) {
    const f = facts || {};
    const byId = new Map((tweaks || []).map((tw) => [tw.id, tw]));
    const picks = [], skips = [];
    for (const [id, rule] of RULES) {
      const tw = byId.get(id);
      if (!tw) continue;
      const [kind, reason] = rule(f);
      if (kind === 'pick' && tw.available !== false) picks.push({ id, reason, tweak: tw });
      else skips.push({ id, reason: kind === 'pick' ? 'unavailable' : reason, tweak: tw });
    }
    return { picks, skips };
  }

  const TEXT = {
    de: { name: 'Recommended', desc: 'Prüft deinen PC und empfiehlt nur die Tweaks, die zu ihm passen. Läuft komplett lokal, es werden keine Daten gesendet.',
      badge: 'Für deinen PC', check: 'System prüfen', recheck: 'Neu prüfen', checking: 'System wird geprüft …', failed: 'Systemprüfung fehlgeschlagen.',
      first: 'Starte die Systemprüfung, um deine Empfehlung zu sehen.', why: 'Warum diese Auswahl?', skipped: 'Bewusst nicht empfohlen',
      laptop: 'Laptop', desktop: 'Desktop', unknown: 'unbekannt', wifi: 'WLAN', lan: 'LAN', xbox: 'Xbox-App', customDns: 'eigener DNS', ram: (g) => `${Math.round(g)} GB RAM`,
      reasons: {
        baseline: 'Sinnvolle Grundeinstellung für jeden Spiele-PC.', baseline_quiet: 'Weniger Game-Bar-Hinweise während des Spielens.', background_ads: 'Keine App-Vorschläge und Werbe-Installationen im Hintergrund.',
        desktop_power: 'Desktop am Netzteil: volle Leistung ohne Akku-Nachteil.', desktop_nic: 'Desktop: Netzwerkkarte soll nie zum Stromsparen abschalten.', desktop_hibernate: 'Desktop mit SSD: Ruhezustand wird nicht gebraucht, spart Speicherplatz.',
        network_gaming: 'Keine Netzwerkdrossel, wenn Musik im Hintergrund läuft.', udp_game: 'FiveM nutzt UDP: Pakete gehen über den schnellen Pfad.', background_upload: 'Kein Teilen von Updates mit fremden PCs im Hintergrund.',
        wifi_present: 'WLAN-Karte gefunden: keine automatischen Hotspot-Verbindungen.', no_xbox_app: 'Keine Xbox-App installiert: IPv6-Tunnel werden nicht gebraucht.', dhcp_dns: 'Kein eigener DNS eingerichtet: schnellster öffentlicher DNS bringt schnellere Namensauflösung.',
        mouse_precision: 'Gleichmäßige Mausbewegung in Menüs und Spielen ohne Raw Input.',
        laptop_battery: 'Laptop: würde Akkulaufzeit und Temperatur verschlechtern.', unknown_chassis: 'Laptop/Desktop nicht erkennbar – sicherheitshalber ausgelassen.',
        no_wifi: 'Keine WLAN-Karte vorhanden.', unknown_network: 'Netzwerkkarten nicht lesbar – ausgelassen.', xbox_app_needs_teredo: 'Xbox-App installiert: Partychat braucht Teredo.', unknown_xbox: 'Xbox-App nicht prüfbar – ausgelassen.',
        custom_dns: 'Eigener DNS (z. B. Pi-hole) eingerichtet – bleibt unangetastet.', unknown_dns: 'DNS-Einstellung nicht lesbar – ausgelassen.',
        hdd_keeps_prefetch: 'Windows liegt auf einer HDD: Prefetch/SysMain beschleunigen dort Programmstarts.', no_gain_ssd: 'Auf SSDs kein belegter Spielvorteil.',
        x3d_cpu: 'X3D-Prozessor: Kerne-Entparken kann die Cache-Zuordnung verschlechtern.', scheduler_risk: 'Hohes Risiko, kein belegter Vorteil auf modernen CPUs.',
        udp_game_nagle: 'FiveM-Spielverkehr ist UDP – Nagle betrifft nur TCP.', not_measurable: 'Effekt in der Praxis nicht messbar.', debug_only: 'Treiber-Diagnose, keine Leistungsoptimierung.',
        personal_preference: 'Ändert dein Mausgefühl – lieber selbst entscheiden.', unavailable: 'Auf diesem PC nicht verfügbar.' } },
    en: { name: 'Recommended', desc: 'Checks your PC and recommends only the tweaks that fit it. Runs entirely locally; no data is sent.',
      badge: 'For your PC', check: 'Check system', recheck: 'Check again', checking: 'Checking your system …', failed: 'System check failed.',
      first: 'Run the system check to see your recommendation.', why: 'Why this selection?', skipped: 'Deliberately not recommended',
      laptop: 'Laptop', desktop: 'Desktop', unknown: 'unknown', wifi: 'Wi-Fi', lan: 'LAN', xbox: 'Xbox app', customDns: 'custom DNS', ram: (g) => `${Math.round(g)} GB RAM`,
      reasons: {
        baseline: 'Sensible baseline for every gaming PC.', baseline_quiet: 'Fewer Game Bar tips while you play.', background_ads: 'No app suggestions or promoted installs in the background.',
        desktop_power: 'Desktop on mains power: full performance without a battery penalty.', desktop_nic: 'Desktop: the network card should never sleep to save power.', desktop_hibernate: 'Desktop with SSD: hibernation is not needed and frees disk space.',
        network_gaming: 'No network throttling while music plays in the background.', udp_game: 'FiveM uses UDP: packets take the fast path.', background_upload: 'No sharing of updates with other PCs in the background.',
        wifi_present: 'Wi-Fi card found: no automatic hotspot connections.', no_xbox_app: 'No Xbox app installed: IPv6 tunnels are not needed.', dhcp_dns: 'No custom DNS set up: the fastest public DNS speeds up lookups.',
        mouse_precision: 'Consistent mouse movement in menus and games without raw input.',
        laptop_battery: 'Laptop: would cost battery life and raise temperatures.', unknown_chassis: 'Laptop/desktop not detectable – left out to be safe.',
        no_wifi: 'No Wi-Fi card present.', unknown_network: 'Network cards not readable – left out.', xbox_app_needs_teredo: 'Xbox app installed: party chat needs Teredo.', unknown_xbox: 'Xbox app not checkable – left out.',
        custom_dns: 'Custom DNS (e.g. Pi-hole) set up – left untouched.', unknown_dns: 'DNS setting not readable – left out.',
        hdd_keeps_prefetch: 'Windows is on an HDD: Prefetch/SysMain speed up program starts there.', no_gain_ssd: 'No proven gaming benefit on SSDs.',
        x3d_cpu: 'X3D processor: unparking cores can hurt cache scheduling.', scheduler_risk: 'High risk, no proven benefit on modern CPUs.',
        udp_game_nagle: 'FiveM gameplay traffic is UDP – Nagle only affects TCP.', not_measurable: 'Effect not measurable in practice.', debug_only: 'Driver diagnostics, not a performance tweak.',
        personal_preference: 'Changes how your mouse feels – your call.', unavailable: 'Not available on this PC.' } },
    it: { name: 'Recommended', desc: 'Controlla il tuo PC e consiglia solo le modifiche adatte. Funziona solo in locale; nessun dato viene inviato.',
      badge: 'Per il tuo PC', check: 'Controlla sistema', recheck: 'Controlla di nuovo', checking: 'Controllo del sistema …', failed: 'Controllo del sistema non riuscito.',
      first: 'Avvia il controllo per vedere il tuo consiglio.', why: 'Perché questa scelta?', skipped: 'Non consigliati di proposito',
      laptop: 'Portatile', desktop: 'Desktop', unknown: 'sconosciuto', wifi: 'Wi-Fi', lan: 'LAN', xbox: 'App Xbox', customDns: 'DNS personalizzato', ram: (g) => `${Math.round(g)} GB RAM`,
      reasons: {
        baseline: 'Impostazione di base utile per ogni PC da gioco.', baseline_quiet: 'Meno suggerimenti della Game Bar mentre giochi.', background_ads: 'Nessun suggerimento di app o installazione promossa in background.',
        desktop_power: 'Desktop alimentato da rete: piene prestazioni senza svantaggi per la batteria.', desktop_nic: 'Desktop: la scheda di rete non deve mai spegnersi per risparmio.', desktop_hibernate: 'Desktop con SSD: l’ibernazione non serve e libera spazio.',
        network_gaming: 'Nessuna limitazione di rete con musica in sottofondo.', udp_game: 'FiveM usa UDP: i pacchetti prendono il percorso rapido.', background_upload: 'Nessuna condivisione di aggiornamenti con altri PC in background.',
        wifi_present: 'Scheda Wi-Fi trovata: nessuna connessione automatica agli hotspot.', no_xbox_app: 'App Xbox non installata: i tunnel IPv6 non servono.', dhcp_dns: 'Nessun DNS personalizzato: il DNS pubblico più veloce accelera la risoluzione.',
        mouse_precision: 'Movimento del mouse uniforme in menu e giochi senza raw input.',
        laptop_battery: 'Portatile: peggiorerebbe autonomia e temperature.', unknown_chassis: 'Portatile/desktop non rilevabile – escluso per sicurezza.',
        no_wifi: 'Nessuna scheda Wi-Fi presente.', unknown_network: 'Schede di rete non leggibili – escluso.', xbox_app_needs_teredo: 'App Xbox installata: la chat di gruppo richiede Teredo.', unknown_xbox: 'App Xbox non verificabile – escluso.',
        custom_dns: 'DNS personalizzato (es. Pi-hole) – lasciato invariato.', unknown_dns: 'Impostazione DNS non leggibile – escluso.',
        hdd_keeps_prefetch: 'Windows è su un HDD: Prefetch/SysMain velocizzano l’avvio dei programmi.', no_gain_ssd: 'Nessun vantaggio dimostrato sugli SSD.',
        x3d_cpu: 'CPU X3D: sbloccare i core può peggiorare l’uso della cache.', scheduler_risk: 'Rischio alto, nessun vantaggio dimostrato sulle CPU moderne.',
        udp_game_nagle: 'Il traffico di gioco FiveM è UDP – Nagle riguarda solo TCP.', not_measurable: 'Effetto non misurabile in pratica.', debug_only: 'Diagnostica del driver, non un’ottimizzazione.',
        personal_preference: 'Cambia la sensazione del mouse – decidi tu.', unavailable: 'Non disponibile su questo PC.' } },
  };

  // ---------- UI (Profile page) ----------
  const rec = { facts: null, busy: false, error: null };
  const tx = () => TEXT[(typeof state !== 'undefined' && state.lang) || 'de'] || TEXT.en;
  const result = () => recommendTweaks(rec.facts, typeof state !== 'undefined' ? state.tweaks : []);
  // Tweaks the "Recommended" profile applies: picks not active yet and not deselected.
  const candidates = () => rec.facts ? result().picks.map((p) => p.tweak) : [];
  async function check() {
    if (rec.busy) return;
    rec.busy = true; rec.error = null; render();
    try { const r = await call('system-check'); if (r?.ok) rec.facts = r.facts || {}; else rec.error = r?.error || 'failed'; }
    catch (e) { rec.error = e.message; }
    finally { rec.busy = false; if (state.route.page === 'profiles') render(); }
  }
  function summary(f) {
    const w = tx(), chip = (s) => `<span class="rec-fact">${esc(s)}</span>`;
    const gpu = Array.isArray(f.gpu) ? f.gpu.join(', ') : f.gpu;
    return [
      chip(f.laptop === true ? w.laptop : f.laptop === false ? w.desktop : `${w.desktop}/${w.laptop}: ${w.unknown}`),
      f.cpu?.name ? chip(f.cpu.name) : '', gpu ? chip(gpu) : '', typeof f.ramGB === 'number' ? chip(w.ram(f.ramGB)) : '',
      f.systemDisk ? chip(f.systemDisk) : '', f.ethernetUp ? chip(w.lan) : '', f.wifi ? chip(w.wifi) : '',
      f.xboxApp ? chip(w.xbox) : '', f.customDns ? chip(w.customDns) : '',
    ].join('');
  }
  // Same structure and classes as the other profile cards; tier-go/pchip clicks are handled by app.js.
  function card() {
    const w = tx(), run = state.profileRun, mine = run?.tier === 'recommended';
    const head = `<div class="tier-head"><div class="tier-badge">${esc(w.badge)}</div><h2>${esc(w.name)}</h2><p>${esc(w.desc)}</p></div>`;
    const checkBtn = `<button class="pill dark rec-check" id="rec-check" ${rec.busy || run ? 'disabled' : ''}>${esc(rec.busy ? w.checking : rec.facts ? w.recheck : w.check)}</button>`;
    if (!rec.facts) {
      return `<div class="card tier tier-recommended">${head}
        <p class="muted">${esc(rec.error ? `${w.failed} ${errorText(rec.error)}` : rec.busy ? w.checking : w.first)}</p>${checkBtn}</div>`;
    }
    const { picks, skips } = result();
    const todo = picks.filter((p) => !p.tweak.applied && !state.profileOff.has(p.id));
    const done = picks.filter((p) => p.tweak.applied).length;
    const chips = picks.map((p) => {
      const off = state.profileOff.has(p.id);
      return `<button class="pchip risk-${esc(p.tweak.risk)}${p.tweak.applied ? ' done' : ''}${off ? ' off' : ''}" data-pchip="${esc(p.id)}" ${p.tweak.applied || run ? 'disabled' : ''} title="${esc(w.reasons[p.reason] || '')}">${esc(p.tweak.name)}</button>`;
    }).join('');
    const line = (x) => `<li><b>${esc(x.tweak.name)}</b> – ${esc(w.reasons[x.reason] || x.reason)}</li>`;
    return `<div class="card tier tier-recommended${mine ? ' running' : ''}">${head}
      <div class="rec-facts">${summary(rec.facts)}</div>
      <div class="tier-count"><b data-count="${todo.length}">${todo.length}</b><span>${t().tierTodo(done, picks.length)}</span></div>
      <div class="pchips">${chips || `<span class="muted">${t().empty}</span>`}</div>
      <details class="rec-why"><summary>${esc(w.why)}</summary><ul>${picks.map(line).join('')}</ul>
        ${skips.length ? `<p class="muted">${esc(w.skipped)}</p><ul class="rec-skips">${skips.map(line).join('')}</ul>` : ''}</details>
      ${mine ? `<div class="tier-progress"><div class="cat-meter"><i data-pct="${Math.round((run.i / run.n) * 100)}"></i></div><span>${esc(t().tierRunning(run.i, run.n, run.current || ''))}</span></div>` : ''}
      <div class="rec-actions">${checkBtn}<button class="pill light big tier-go" data-tier="recommended" ${run || !todo.length ? 'disabled' : ''}>${icon('bolt')}<span>${t().tierGo(todo.length)}</span></button></div>
    </div>`;
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => { if (e.target.closest('#rec-check')) check(); });
    // Profile name for the shared confirm dialog and result toast.
    for (const lang of ['de', 'en', 'it']) {
      const tiers = root.I18N?.[lang]?.tiers;
      if (tiers) tiers.recommended = [TEXT[lang].name, TEXT[lang].desc];
    }
  }
  const api = { recommendTweaks, RULES, TEXT, card, candidates, check, state: rec };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Recommend = api;
})(this);
