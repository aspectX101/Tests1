'use strict';
/* Extra > Energie: Windows power plan, display-off and sleep timeouts (mains / battery), battery state and the
   power-related tweaks. Backend: Power.ps1 (power-get / power-plan / power-timeout / power-reset); originals are saved
   on the first change and "Reset" restores them. A value an applied tweak owns is locked here, with that tweak named,
   so its own backup stays restorable. Uses app.js globals (state, call, render, esc, errorText, toast, confirmDialog,
   tweakRow, t). */
(function (root) {
  const TEXT = {
    de: { plan: 'Energieplan', planDesc: 'Welcher Windows-Energieplan aktiv ist. Wechseln wirkt sofort.', active: 'Aktiv',
      times: 'Bildschirm & Energiesparen', timesDesc: 'Wann Windows den Bildschirm ausschaltet und in den Energiesparmodus geht.',
      monitor: 'Bildschirm ausschalten nach', sleep: 'Energiesparmodus nach', ac: 'Am Netzteil', dc: 'Im Akkubetrieb',
      never: 'Nie', min: (n) => `${n} Min.`, hours: (n) => `${n} Std.`, custom: (s) => `${Math.round(s / 60)} Min. (eigener Wert)`,
      battery: 'Akku', onAc: 'am Netzteil', onBattery: 'im Akkubetrieb', noBattery: 'Kein Akku – Desktop am Netzteil.',
      reset: 'Zurücksetzen', resetHint: 'Stellt Energieplan und Zeiten so her, wie sie vor der ersten Änderung hier waren.',
      resetTitle: 'Energie-Einstellungen zurücksetzen?', resetText: 'Energieplan und Zeiten werden auf die Werte vor der ersten Änderung im Tweaker gesetzt.',
      noChanges: 'Noch nichts geändert – Originalwerte werden beim ersten Ändern automatisch gesichert.',
      owned: (names) => `Wird vom Tweak „${names}“ gesteuert. Schalte ihn aus, um das hier zu ändern.`,
      tweaks: 'Energie-Tweaks', tweaksDesc: 'Tweaks, die Energie-Einstellungen ändern. Jeder lässt sich einzeln zurücksetzen.',
      loading: 'Energie-Einstellungen werden gelesen …', saved: 'Gespeichert', done: 'Zurückgesetzt' },
    en: { plan: 'Power plan', planDesc: 'Which Windows power plan is active. Switching takes effect at once.', active: 'Active',
      times: 'Screen & sleep', timesDesc: 'When Windows turns off the screen and goes to sleep.',
      monitor: 'Turn off the screen after', sleep: 'Sleep after', ac: 'Plugged in', dc: 'On battery',
      never: 'Never', min: (n) => `${n} min`, hours: (n) => `${n} h`, custom: (s) => `${Math.round(s / 60)} min (custom)`,
      battery: 'Battery', onAc: 'plugged in', onBattery: 'on battery', noBattery: 'No battery – desktop on mains power.',
      reset: 'Reset', resetHint: 'Puts the power plan and times back as they were before the first change here.',
      resetTitle: 'Reset power settings?', resetText: 'The power plan and times go back to the values before the first change in the tweaker.',
      noChanges: 'Nothing changed yet – the original values are saved automatically on the first change.',
      owned: (names) => `Controlled by the tweak “${names}”. Turn it off to change this here.`,
      tweaks: 'Power tweaks', tweaksDesc: 'Tweaks that change power settings. Each one can be reset on its own.',
      loading: 'Reading power settings …', saved: 'Saved', done: 'Reset done' },
    it: { plan: 'Combinazione per il risparmio di energia', planDesc: 'Quale combinazione di Windows è attiva. Il cambio è immediato.', active: 'Attiva',
      times: 'Schermo e sospensione', timesDesc: 'Quando Windows spegne lo schermo e va in sospensione.',
      monitor: 'Spegni lo schermo dopo', sleep: 'Sospendi dopo', ac: 'Alimentazione da rete', dc: 'A batteria',
      never: 'Mai', min: (n) => `${n} min`, hours: (n) => `${n} h`, custom: (s) => `${Math.round(s / 60)} min (personalizzato)`,
      battery: 'Batteria', onAc: 'collegato alla rete', onBattery: 'a batteria', noBattery: 'Nessuna batteria – desktop collegato alla rete.',
      reset: 'Ripristina', resetHint: 'Riporta combinazione e tempi come erano prima della prima modifica qui.',
      resetTitle: 'Ripristinare le impostazioni di energia?', resetText: 'Combinazione e tempi tornano ai valori precedenti alla prima modifica nel tweaker.',
      noChanges: 'Ancora nessuna modifica – i valori originali vengono salvati automaticamente alla prima modifica.',
      owned: (names) => `Controllato dalla modifica “${names}”. Disattivala per cambiare questo qui.`,
      tweaks: 'Modifiche energia', tweaksDesc: 'Modifiche che cambiano le impostazioni di energia. Ognuna si ripristina singolarmente.',
      loading: 'Lettura delle impostazioni di energia …', saved: 'Salvato', done: 'Ripristinato' },
  };
  // Tweaks that own a value of this page while applied (same list as Power.ps1), and the power tweaks shown below.
  const OWNERS = { plan: ['windows.power.high'], sleepAc: ['windows.power.profile', 'windows.power.extras'] };
  const TWEAKS = ['windows.power.high', 'windows.power.profile', 'windows.power.extras', 'windows.hibernate.off', 'windows.cpu.unpark', 'hitreg.input.power'];
  const pw = { data: null, error: null, busy: null };
  const tx = () => TEXT[state.lang] || TEXT.en;
  const tweak = (id) => (state.tweaks || []).find((x) => x.id === id);
  const ownersOf = (key) => OWNERS[key].map(tweak).filter((x) => x?.applied);

  function label(s) {
    const w = tx();
    if (s === 0) return w.never;
    if (s % 3600 === 0) return w.hours(s / 3600);
    if (s % 60 === 0) return w.min(s / 60);
    return w.custom(s);
  }
  function select(name, mode, value, locked) {
    const choices = pw.data.choices || [];
    const opts = choices.includes(value) ? choices : [...choices, value].sort((a, b) => (a || Infinity) - (b || Infinity));
    return `<select class="pw-select" data-pw-setting="${name}" data-pw-mode="${mode}" ${pw.busy || locked ? 'disabled' : ''} aria-label="${esc(`${tx()[name]} – ${tx()[mode]}`)}">
      ${opts.map((s) => `<option value="${s}" ${s === value ? 'selected' : ''} ${choices.includes(s) ? '' : 'disabled'}>${esc(label(s))}</option>`).join('')}</select>`;
  }

  function html() {
    const w = tx();
    if (!pw.data) {
      return `<div class="card pw-empty">${pw.error ? `<p>${esc(errorText(pw.error))}</p><button class="pill dark" data-pw-reload>${esc(t().reload)}</button>` : `<p class="muted">${esc(w.loading)}</p>`}</div>`;
    }
    const d = pw.data, bat = d.battery?.present === true;
    const planOwners = ownersOf('plan'), sleepOwners = ownersOf('sleepAc');
    const note = (list) => (list.length ? `<p class="pw-owned">${esc(w.owned(list.map((x) => x.name).join('“, „')))}</p>` : '');
    const plans = (d.plans || []).map((p) => `<button type="button" class="pw-plan${p.active ? ' active' : ''}" data-pw-plan="${esc(p.guid)}" ${p.active || pw.busy || planOwners.length ? 'disabled' : ''} aria-pressed="${p.active}">
        <span class="pw-radio" aria-hidden="true"></span><span class="pw-plan-name">${esc(p.name)}</span>${p.active ? `<em>${esc(w.active)}</em>` : ''}</button>`).join('');
    const row = (name) => `<div class="pw-row"><span>${esc(w[name])}</span>
        <label><small>${esc(w.ac)}</small>${select(name, 'ac', d.timeouts[name].ac, name === 'sleep' && sleepOwners.length > 0)}</label>
        ${bat ? `<label><small>${esc(w.dc)}</small>${select(name, 'dc', d.timeouts[name].dc, false)}</label>` : ''}</div>`;
    const tweaks = TWEAKS.map(tweak).filter(Boolean);
    return `<div class="pw-grid">
      <section class="card pw-card"><h3>${esc(w.plan)}</h3><p class="muted">${esc(w.planDesc)}</p><div class="pw-plans">${plans}</div>${note(planOwners)}</section>
      <section class="card pw-card"><h3>${esc(w.times)}</h3><p class="muted">${esc(w.timesDesc)}</p>${row('monitor')}${row('sleep')}${note(sleepOwners)}</section>
      <section class="card pw-card pw-side">
        <h3>${esc(w.battery)}</h3>
        <p class="pw-battery">${bat ? `<b>${d.battery.percent ?? '–'} %</b> · ${esc(d.battery.onAc ? w.onAc : w.onBattery)}` : esc(w.noBattery)}</p>
        <div class="pw-reset">
          <p class="muted">${esc(d.hasBackup ? w.resetHint : w.noChanges)}</p>
          ${d.hasBackup ? `<button class="pill dark" data-pw-reset ${pw.busy ? 'disabled' : ''}>${esc(pw.busy === 'reset' ? '…' : w.reset)}</button>` : ''}
        </div>
      </section>
    </div>
    ${tweaks.length ? `<h3 class="section-title">${esc(w.tweaks)}</h3><p class="pw-hint muted">${esc(w.tweaksDesc)}</p><div class="tgrid">${tweaks.map((x) => tweakRow(x)).join('')}</div>` : ''}`;
  }

  async function run(kind, action, id, extra) {
    pw.busy = kind; render();
    const res = await call(action, id, extra);
    pw.busy = null;
    if (res?.ok) { pw.data = res; pw.error = null; if (action === 'power-reset') toast(tx().done); }
    else toast(errorText(res?.error, res?.detail), 'error');
    if (state.route.page === 'cat' && state.route.cat === 'power') render();
  }
  async function load() {
    if (pw.busy === 'load') return;
    pw.busy = 'load';
    const res = await call('power-get');
    pw.busy = null;
    if (res?.ok) { pw.data = res; pw.error = null; } else { pw.data = null; pw.error = res?.error || 'power_state_unavailable'; }
    if (state.route.page === 'cat' && state.route.cat === 'power') render();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', async (e) => {
      const plan = e.target.closest('[data-pw-plan]');
      if (plan && !plan.disabled) return run('plan', 'power-plan', plan.dataset.pwPlan);
      if (e.target.closest('[data-pw-reload]')) return load();
      if (e.target.closest('[data-pw-reset]') && !pw.busy) {
        const w = tx();
        if (await confirmDialog(w.resetTitle, w.resetText, w.reset)) run('reset', 'power-reset');
      }
    });
    document.addEventListener('change', (e) => {
      const s = e.target.closest('[data-pw-setting]');
      if (s) run('timeout', 'power-timeout', undefined, { setting: s.dataset.pwSetting, mode: s.dataset.pwMode, seconds: Number(s.value) });
    });
  }
  const api = { html, load, TEXT, OWNERS, TWEAKS, state: pw };
  root.PowerPage = api;
})(this);
