'use strict';
// H1T.CC account UI: premium sign-in gate, top-right account button + menu, and the in-app account page.
// The privileged main process owns tokens, license checks and the device binding; this file only renders snapshots.
(() => {
  // Browser preview (no Electron bridge): a local demo so the screens can be checked. Never used in the app.
  const bridge = window.tweaker ? (window.tweaker.h1tAccountStatus ? window.tweaker : null) : (window.TweakerMock ? demoBridge() : null);
  if (!bridge) return;

  const T = {
    de: {
      kicker: 'CLIENT ACCESS', welcome: 'Willkommen zurück.', tagline: 'Melde dich mit deinem H1T.CC-Konto an, um den Tweaker freizuschalten.',
      f1: 'Serverseitig geprüfte Lizenzen', f2: 'Verschlüsselte Sitzung auf diesem PC', f3: 'Datensparsame Geräteverknüpfung',
      signIn: 'Anmelden', signInTitle: 'Bei H1T.CC anmelden', email: 'E-Mail-Adresse', password: 'Passwort', show: 'Anzeigen', hide: 'Verbergen',
      noAccount: 'Noch kein Konto oder Passwort vergessen?', openArea: 'Customer Area öffnen', wait: 'Lizenz wird geprüft…',
      noLicTitle: 'Keine aktive Lizenz', noLic: 'Dein Konto hat noch keine aktive Lizenz. Aktiviere einen Key in der Customer Area und prüfe dann erneut.',
      linkTitle: 'Diesen PC verknüpfen', link: 'Wähle die Lizenz, mit der dieser PC laufen soll.', license: 'Lizenz',
      consent: 'Ich stimme zu, dass eine pseudonyme Kennung dieser Windows-Installation zur Lizenzbindung übertragen wird. Es werden keine Hardware-Seriennummern übertragen.',
      bind: 'Gerät aktivieren', errTitle: 'Prüfung fehlgeschlagen', err: 'Keine Verbindung oder die Lizenzprüfung ist fehlgeschlagen.',
      check: 'Erneut prüfen', signOut: 'Abmelden', foot: 'HTTPS · Serverseitige Lizenzprüfung · Token bleibt verschlüsselt im Hauptprozess',
      myAccount: 'Mein Account', customerArea: 'Customer Area', licenses: 'Lizenzen', support: 'Support', account: 'Account',
      lifetime: 'Lifetime', expires: 'Läuft ab', plan: 'Plan', status: 'Status', devices: 'Geräte', key: 'Key', thisDevice: 'Dieser PC',
      profile: 'Profil', displayName: 'Anzeigename', username: 'Benutzername', accountId: 'Konto-ID', memberSince: 'Mitglied seit',
      device: 'Dieses Gerät', deviceState: 'Verknüpfung', verified: 'Verifiziert', notLinked: 'Nicht verknüpft', deviceLabel: 'Gerätename',
      linkedSince: 'Verknüpft seit', lastSeen: 'Zuletzt gesehen', appVersion: 'App-Version', linkDevice: 'Gerät verknüpfen',
      deviceNote: 'Gebunden wird nur ein Einweg-Hash der Windows-Installations-ID – keine Seriennummern, keine Hardwaredaten.',
      session: 'Sitzung & Sicherheit', sessionStore: 'Anmeldung', sessionEnc: 'Verschlüsselt mit Windows-Datenschutz', lastCheck: 'Letzte Prüfung',
      autoCheck: 'Automatische Prüfung', every2: 'alle 2 Minuten', help: 'Hilfe & Verwaltung',
      helpText: 'Lizenzen, Keys, Geräte-Resets und Tickets verwaltest du in der Customer Area.',
      manage: 'In der Customer Area verwalten', noLicenses: 'Keine Lizenzen auf diesem Konto.', devMode: 'Entwicklungs-Build: Lizenzprüfung ist lokal übersprungen.',
      developer: 'Entwickler', avatarHint: 'Profilbild aus deinem H1T.CC-Konto', never: '–',
      st: { active: 'Aktiv', development: 'Entwicklung', license_required: 'Keine Lizenz', device_consent_required: 'Gerät nicht verknüpft', device_unbound: 'Gerät nicht verknüpft', checking: 'Wird geprüft', signed_out: 'Abgemeldet', error: 'Prüfung fehlgeschlagen' },
      lst: { active: 'Aktiv', expired: 'Abgelaufen', revoked: 'Gesperrt', suspended: 'Pausiert', pending: 'Ausstehend' },
      errors: { invalid_credentials: 'E-Mail oder Passwort ist falsch.', rate_limited: 'Zu viele Versuche. Bitte kurz warten.', connection_timeout: 'Der Server antwortet nicht. Bitte erneut versuchen.', connection_unavailable: 'Keine Verbindung zum H1T.CC-Server.', consent_required: 'Bitte zuerst der Geräteverknüpfung zustimmen.', license_required: 'Diese Lizenz ist nicht (mehr) aktiv.', device_bind_denied: 'Die Lizenz erlaubt kein weiteres Gerät. Setze ein Gerät in der Customer Area zurück.', windows_device_required: 'Geräteverknüpfung ist nur unter Windows möglich.', device_id_unavailable: 'Die Windows-Installations-ID konnte nicht gelesen werden.', invalid_server_response: 'Unerwartete Antwort vom Server.', server_rejected: 'Der Server hat die Anfrage abgelehnt.' },
    },
    en: {
      kicker: 'CLIENT ACCESS', welcome: 'Welcome back.', tagline: 'Sign in with your H1T.CC account to unlock the tweaker.',
      f1: 'Server-verified licenses', f2: 'Encrypted session on this PC', f3: 'Privacy-first device binding',
      signIn: 'Sign in', signInTitle: 'Sign in to H1T.CC', email: 'Email address', password: 'Password', show: 'Show', hide: 'Hide',
      noAccount: 'No account yet or forgot your password?', openArea: 'Open Customer Area', wait: 'Checking license…',
      noLicTitle: 'No active license', noLic: 'Your account has no active license yet. Activate a key in the Customer Area, then check again.',
      linkTitle: 'Link this PC', link: 'Choose the license this PC should run on.', license: 'License',
      consent: 'I consent to transmitting a pseudonymous identifier for this Windows installation to bind the license. No hardware serial numbers are transmitted.',
      bind: 'Activate device', errTitle: 'Verification failed', err: 'Network unavailable or license verification failed.',
      check: 'Check again', signOut: 'Sign out', foot: 'HTTPS · Server-side license checks · Token stays encrypted in the main process',
      myAccount: 'My Account', customerArea: 'Customer Area', licenses: 'Licenses', support: 'Support', account: 'Account',
      lifetime: 'Lifetime', expires: 'Expires', plan: 'Plan', status: 'Status', devices: 'Devices', key: 'Key', thisDevice: 'This PC',
      profile: 'Profile', displayName: 'Display name', username: 'Username', accountId: 'Account ID', memberSince: 'Member since',
      device: 'This device', deviceState: 'Binding', verified: 'Verified', notLinked: 'Not linked', deviceLabel: 'Device name',
      linkedSince: 'Linked since', lastSeen: 'Last seen', appVersion: 'App version', linkDevice: 'Link device',
      deviceNote: 'Only a one-way hash of the Windows installation ID is bound — no serial numbers, no hardware data.',
      session: 'Session & security', sessionStore: 'Sign-in', sessionEnc: 'Encrypted with Windows data protection', lastCheck: 'Last check',
      autoCheck: 'Automatic check', every2: 'every 2 minutes', help: 'Help & management',
      helpText: 'Manage licenses, keys, device resets and tickets in the Customer Area.',
      manage: 'Manage in Customer Area', noLicenses: 'No licenses on this account.', devMode: 'Development build: license check is skipped locally.',
      developer: 'Developer', avatarHint: 'Profile picture from your H1T.CC account', never: '–',
      st: { active: 'Active', development: 'Development', license_required: 'No license', device_consent_required: 'Device not linked', device_unbound: 'Device not linked', checking: 'Checking', signed_out: 'Signed out', error: 'Check failed' },
      lst: { active: 'Active', expired: 'Expired', revoked: 'Revoked', suspended: 'Suspended', pending: 'Pending' },
      errors: { invalid_credentials: 'Email or password is incorrect.', rate_limited: 'Too many attempts. Please wait a moment.', connection_timeout: 'The server is not responding. Please try again.', connection_unavailable: 'Cannot reach the H1T.CC server.', consent_required: 'Please consent to the device binding first.', license_required: 'This license is not active (anymore).', device_bind_denied: 'This license allows no further device. Reset a device in the Customer Area.', windows_device_required: 'Device binding only works on Windows.', device_id_unavailable: 'Could not read the Windows installation ID.', invalid_server_response: 'Unexpected response from the server.', server_rejected: 'The server rejected the request.' },
    },
    it: {
      kicker: 'ACCESSO CLIENTI', welcome: 'Bentornato.', tagline: 'Accedi con il tuo account H1T.CC per sbloccare il tweaker.',
      f1: 'Licenze verificate dal server', f2: 'Sessione cifrata su questo PC', f3: 'Collegamento del dispositivo rispettoso della privacy',
      signIn: 'Accedi', signInTitle: 'Accedi a H1T.CC', email: 'Indirizzo email', password: 'Password', show: 'Mostra', hide: 'Nascondi',
      noAccount: 'Non hai un account o hai dimenticato la password?', openArea: 'Apri Customer Area', wait: 'Verifica licenza…',
      noLicTitle: 'Nessuna licenza attiva', noLic: 'Il tuo account non ha ancora una licenza attiva. Attiva una chiave nella Customer Area, poi riprova.',
      linkTitle: 'Collega questo PC', link: 'Scegli la licenza con cui usare questo PC.', license: 'Licenza',
      consent: 'Acconsento alla trasmissione di un identificatore pseudonimo di questa installazione Windows per la licenza. Nessun numero di serie hardware viene trasmesso.',
      bind: 'Attiva dispositivo', errTitle: 'Verifica fallita', err: 'Connessione non disponibile o verifica della licenza fallita.',
      check: 'Riprova', signOut: 'Esci', foot: 'HTTPS · Verifica licenze lato server · Il token resta cifrato nel processo principale',
      myAccount: 'Il mio account', customerArea: 'Customer Area', licenses: 'Licenze', support: 'Supporto', account: 'Account',
      lifetime: 'Lifetime', expires: 'Scade', plan: 'Piano', status: 'Stato', devices: 'Dispositivi', key: 'Chiave', thisDevice: 'Questo PC',
      profile: 'Profilo', displayName: 'Nome visualizzato', username: 'Nome utente', accountId: 'ID account', memberSince: 'Membro dal',
      device: 'Questo dispositivo', deviceState: 'Collegamento', verified: 'Verificato', notLinked: 'Non collegato', deviceLabel: 'Nome dispositivo',
      linkedSince: 'Collegato dal', lastSeen: 'Ultimo accesso', appVersion: 'Versione app', linkDevice: 'Collega dispositivo',
      deviceNote: 'Viene collegato solo un hash unidirezionale dell’ID di installazione di Windows: nessun numero di serie, nessun dato hardware.',
      session: 'Sessione e sicurezza', sessionStore: 'Accesso', sessionEnc: 'Cifrato con la protezione dati di Windows', lastCheck: 'Ultima verifica',
      autoCheck: 'Verifica automatica', every2: 'ogni 2 minuti', help: 'Aiuto e gestione',
      helpText: 'Gestisci licenze, chiavi, reset dei dispositivi e ticket nella Customer Area.',
      manage: 'Gestisci nella Customer Area', noLicenses: 'Nessuna licenza su questo account.', devMode: 'Build di sviluppo: verifica licenza saltata in locale.',
      developer: 'Sviluppatore', avatarHint: 'Immagine del profilo dal tuo account H1T.CC', never: '–',
      st: { active: 'Attiva', development: 'Sviluppo', license_required: 'Nessuna licenza', device_consent_required: 'Dispositivo non collegato', device_unbound: 'Dispositivo non collegato', checking: 'Verifica', signed_out: 'Disconnesso', error: 'Verifica fallita' },
      lst: { active: 'Attiva', expired: 'Scaduta', revoked: 'Revocata', suspended: 'Sospesa', pending: 'In attesa' },
      errors: { invalid_credentials: 'Email o password errata.', rate_limited: 'Troppi tentativi. Attendi un momento.', connection_timeout: 'Il server non risponde. Riprova.', connection_unavailable: 'Impossibile raggiungere il server H1T.CC.', consent_required: 'Acconsenti prima al collegamento del dispositivo.', license_required: 'Questa licenza non è (più) attiva.', device_bind_denied: 'La licenza non consente altri dispositivi. Reimposta un dispositivo nella Customer Area.', windows_device_required: 'Il collegamento funziona solo su Windows.', device_id_unavailable: 'Impossibile leggere l’ID di installazione di Windows.', invalid_server_response: 'Risposta inattesa dal server.', server_rejected: 'Il server ha rifiutato la richiesta.' },
    },
  };
  const lang = () => (T[document.documentElement.lang] ? document.documentElement.lang : 'de');
  const tx = () => T[lang()];
  const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICON = {
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>',
    out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h11"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
    pc: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    min: '<path d="M6 12h12"/>', close: '<path d="M6 6l12 12M18 6 6 18"/>',
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;

  let profile = null, busy = false, error = '', previouslyAuthorized = false, lastEmail = '', pendingScroll = '', shownLang = '';

  // ---------- helpers ----------
  const AVATAR_RE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
  function initials(p) {
    const u = p?.user || {};
    const src = (u.display_name || u.username || (u.email || '').split('@')[0] || '').trim();
    if (!src) return p?.status === 'development' ? 'DV' : 'H1';
    const parts = src.split(/[\s._-]+/).filter(Boolean);
    const out = parts.length > 1 ? parts[0][0] + parts[1][0] : src.slice(0, 2);
    return out.toUpperCase();
  }
  const displayName = (p) => p?.user?.display_name || p?.user?.username || (p?.user?.email || '').split('@')[0] || (p?.status === 'development' ? tx().developer : 'H1T.CC');
  function avatar(p, size) {
    const data = p?.user?.avatar;
    const inner = typeof data === 'string' && AVATAR_RE.test(data) ? `<img src="${esc(data)}" alt="">` : `<span>${esc(initials(p))}</span>`;
    return `<span class="h1t-avatar h1t-avatar-${size}" aria-hidden="true">${inner}</span>`;
  }
  const statusKey = (p) => {
    const s = p?.status || 'signed_out';
    return tx().st[s] ? s : 'error';
  };
  const statusTone = (p) => (p?.authorized ? 'ok' : ['checking', 'signed_out'].includes(p?.status) ? 'idle' : 'warn');
  const statusPill = (p) => `<span class="h1t-status ${statusTone(p)}"><i></i>${esc(tx().st[statusKey(p)])}</span>`;
  function fmtDate(v) {
    if (v == null || v === '') return tx().never;
    const d = new Date(typeof v === 'number' && v < 1e12 ? v * 1000 : v);
    return Number.isNaN(d.getTime()) ? tx().never : d.toLocaleDateString(lang(), { dateStyle: 'medium' });
  }
  function fmtTime(v) {
    if (!v) return tx().never;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? tx().never : d.toLocaleTimeString(lang(), { timeStyle: 'short' });
  }
  const errorMessage = (code) => tx().errors[code] || tx().err;
  const appVersion = () => (document.querySelector('.brand-ver')?.textContent || '').replace(/^V/i, '') || tx().never;
  const openLink = (kind) => (bridge.h1tOpenAccountLink ? bridge.h1tOpenAccountLink(kind) : bridge.h1tOpenAccountPortal?.());
  function goAccount(section) {
    pendingScroll = section || '';
    closeMenu();
    if (typeof go === 'function') go({ page: 'account' });
  }

  // ---------- sign-in gate ----------
  const gate = document.createElement('section');
  gate.id = 'h1t-license-gate';
  gate.setAttribute('role', 'dialog');
  gate.setAttribute('aria-modal', 'true');
  gate.setAttribute('aria-labelledby', 'h1t-gate-title');
  gate.hidden = true;
  document.body.append(gate);

  function gateBody(p, t) {
    const actions = (...b) => `<div class="h1t-gate-actions">${b.join('')}</div>`;
    const btn = (action, label, kind = 'ghost', icon = '') => `<button type="button" class="h1t-btn ${kind}" data-acc="${action}" ${busy ? 'disabled' : ''}>${icon ? svg(icon) : ''}<span>${esc(label)}</span></button>`;
    const who = p.user ? `<div class="h1t-gate-who">${avatar(p, 'md')}<div><b>${esc(displayName(p))}</b><small>${esc(p.user.email || '')}</small></div>${statusPill(p)}</div>` : '';
    if (!p.signed_in) {
      return `<h2 id="h1t-gate-title">${esc(t.signInTitle)}</h2>
        <form id="h1t-login-form" class="h1t-form" novalidate>
          <label class="h1t-field"><span>${esc(t.email)}</span><input name="email" required type="email" maxlength="190" autocomplete="username" spellcheck="false" value="${esc(lastEmail)}" ${busy ? 'disabled' : ''}></label>
          <label class="h1t-field"><span>${esc(t.password)}</span><span class="h1t-pass"><input name="password" required type="password" maxlength="128" autocomplete="current-password" ${busy ? 'disabled' : ''}>
            <button type="button" class="h1t-reveal" data-acc="reveal" aria-label="${esc(t.show)}" aria-pressed="false">${svg('eye')}</button></span></label>
          <button type="submit" class="h1t-btn primary wide" ${busy ? 'disabled' : ''}>${busy ? '<i class="h1t-spin"></i>' : ''}<span>${esc(busy ? t.wait : t.signIn)}</span></button>
        </form>
        <p class="h1t-gate-alt">${esc(t.noAccount)} <button type="button" class="h1t-link" data-acc="customer_area">${esc(t.openArea)}</button></p>`;
    }
    if (busy || p.status === 'checking') return `${who}<h2 id="h1t-gate-title">${esc(t.wait)}</h2><div class="h1t-gate-wait"><i class="h1t-spin"></i></div>`;
    if (p.status === 'license_required') {
      return `${who}<h2 id="h1t-gate-title">${esc(t.noLicTitle)}</h2><p class="h1t-gate-text">${esc(t.noLic)}</p>
        ${actions(btn('customer_area', t.openArea, 'primary', 'ext'), btn('check', t.check, 'ghost', 'refresh'), btn('logout', t.signOut, 'quiet', 'out'))}`;
    }
    if (p.status === 'device_consent_required' || p.status === 'device_unbound') {
      const opts = (p.licenses || []).map((l) => {
        const plan = l.plan || 'H1T.CC', term = l.expires_at ? `${t.expires} ${fmtDate(l.expires_at)}` : t.lifetime;
        return `<option value="${esc(l.id)}">${esc(plan.toLowerCase() === term.toLowerCase() ? plan : `${plan} · ${term}`)}</option>`;
      }).join('');
      return `${who}<h2 id="h1t-gate-title">${esc(t.linkTitle)}</h2><p class="h1t-gate-text">${esc(t.link)}</p>
        <form id="h1t-device-form" class="h1t-form">
          <label class="h1t-field"><span>${esc(t.license)}</span><span class="h1t-select"><select name="license_id" required>${opts}</select>${svg('chev')}</span></label>
          <label class="h1t-consent"><input type="checkbox" name="consent" required><i aria-hidden="true"></i><span>${esc(t.consent)}</span></label>
          <button type="submit" class="h1t-btn primary wide" disabled>${svg('pc')}<span>${esc(t.bind)}</span></button>
        </form>
        ${actions(btn('check', t.check, 'ghost', 'refresh'), btn('logout', t.signOut, 'quiet', 'out'))}`;
    }
    return `${who}<h2 id="h1t-gate-title">${esc(t.errTitle)}</h2><p class="h1t-gate-text">${esc(errorMessage(p.status))}</p>
      ${actions(btn('check', t.check, 'primary', 'refresh'), btn('logout', t.signOut, 'quiet', 'out'))}`;
  }

  function renderGate() {
    const t = tx(), p = profile || { status: 'checking', signed_in: false };
    const show = !p.authorized;
    // Entrance animation only when the gate appears, not on every re-render.
    if (show && gate.hidden) { gate.classList.add('entering'); setTimeout(() => gate.classList.remove('entering'), 700); }
    gate.hidden = !show;
    document.body.classList.toggle('h1t-gated', show);
    if (!show) { gate.innerHTML = ''; return; }
    // Keep a half-typed password when only a periodic check re-renders.
    const keep = gate.querySelector('#h1t-login-form input[name=password]')?.value || '';
    const err = error ? `<p class="h1t-alert" role="alert">${esc(errorMessage(error))}${tx().errors[error] ? '' : ` <code>${esc(error)}</code>`}</p>` : '';
    const langs = ['de', 'en', 'it'].map((l) => `<button type="button" data-acc-lang="${l}" class="${l === lang() ? 'on' : ''}" aria-pressed="${l === lang()}">${l.toUpperCase()}</button>`).join('');
    gate.innerHTML = `
      <div class="h1t-gate-bar"><div class="h1t-gate-langs" role="group" aria-label="Language">${langs}</div>
        <div class="h1t-gate-win"><button type="button" data-acc="win-min" aria-label="Minimize">${svg('min')}</button><button type="button" data-acc="win-close" class="x" aria-label="Close">${svg('close')}</button></div></div>
      <div class="h1t-gate-shell">
        <aside class="h1t-gate-aside">
          <div class="h1t-gate-brand"><img src="assets/h1t-logo.png" alt="" width="44" height="44"><div><b>H1T<span>.CC</span></b><small>TWEAK UTILITY</small></div></div>
          <div class="h1t-gate-hero"><span class="h1t-kicker">${esc(t.kicker)}</span><h1>${esc(t.welcome)}</h1><p>${esc(t.tagline)}</p></div>
          <ul class="h1t-gate-points"><li>${svg('shield')}${esc(t.f1)}</li><li>${svg('lock')}${esc(t.f2)}</li><li>${svg('pc')}${esc(t.f3)}</li></ul>
          <div class="h1t-gate-orb" aria-hidden="true"></div>
        </aside>
        <div class="h1t-gate-card">${gateBody(p, t)}${err}<small class="h1t-gate-foot">${svg('lock')}${esc(t.foot)}</small></div>
      </div>`;
    const pw = gate.querySelector('#h1t-login-form input[name=password]');
    if (pw && keep) pw.value = keep;
    if (!busy && !p.signed_in && !gate.contains(document.activeElement)) gate.querySelector(lastEmail ? 'input[name=password]' : 'input[name=email]')?.focus();
  }

  // ---------- top-right account button + menu ----------
  const wrap = document.createElement('div');
  wrap.className = 'h1t-acc';
  wrap.innerHTML = '<button type="button" id="h1t-account-btn" class="h1t-acc-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="h1t-account-menu"></button><div id="h1t-account-menu" class="h1t-acc-menu" role="menu" hidden></div>';
  (document.querySelector('.h1t-topbar-meta') || document.querySelector('.titlebar') || document.body).append(wrap);
  const accBtn = wrap.querySelector('#h1t-account-btn'), menu = wrap.querySelector('#h1t-account-menu');

  function renderButton() {
    const t = tx(), p = profile || {};
    const signedIn = p.signed_in || p.status === 'development';
    accBtn.innerHTML = signedIn
      ? `${avatar(p, 'sm')}<span class="h1t-acc-name">${esc(displayName(p))}</span><i class="h1t-acc-dot ${statusTone(p)}" aria-hidden="true"></i>${svg('chev')}`
      : `<span class="h1t-avatar h1t-avatar-sm ghost">${svg('user')}</span><span class="h1t-acc-name">${esc(t.signIn)}</span>`;
    accBtn.setAttribute('aria-label', `${t.account}: ${displayName(p)} · ${t.st[statusKey(p)]}`);
    const item = (action, icon, label, ext) => `<button type="button" role="menuitem" data-acc="${action}" tabindex="-1">${svg(icon)}<span>${esc(label)}</span>${ext ? `<em>${svg('ext')}</em>` : ''}</button>`;
    menu.innerHTML = `
      <div class="h1t-acc-head">${avatar(p, 'lg')}<div><b>${esc(displayName(p))}</b><small>${esc(p.user?.email || (p.status === 'development' ? 'localhost' : ''))}</small>${statusPill(p)}</div></div>
      <div class="h1t-acc-items">
        ${item('my-account', 'user', t.myAccount)}
        ${item('customer_area', 'globe', t.customerArea, true)}
        ${item('licenses', 'key', t.licenses)}
        ${item('support', 'help', t.support, true)}
      </div>
      <div class="h1t-acc-items sep">${item('logout', 'out', t.signOut)}</div>`;
  }
  function openMenu(focusFirst) {
    if (!(profile?.signed_in || profile?.status === 'development')) return;
    menu.hidden = false;
    accBtn.setAttribute('aria-expanded', 'true');
    wrap.classList.add('open');
    if (focusFirst) menu.querySelector('[role=menuitem]')?.focus();
  }
  function closeMenu(refocus) {
    if (menu.hidden) return;
    menu.hidden = true;
    accBtn.setAttribute('aria-expanded', 'false');
    wrap.classList.remove('open');
    if (refocus) accBtn.focus();
  }
  accBtn.addEventListener('click', () => (menu.hidden ? openMenu(false) : closeMenu()));
  accBtn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); openMenu(true); } });
  menu.addEventListener('keydown', (e) => {
    const items = [...menu.querySelectorAll('[role=menuitem]')], i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus(); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); items[e.key === 'Home' ? 0 : items.length - 1]?.focus(); }
    else if (e.key === 'Tab') closeMenu();
  });
  document.addEventListener('pointerdown', (e) => { if (!wrap.contains(e.target)) closeMenu(); });
  window.addEventListener('blur', () => closeMenu());

  // ---------- account page ----------
  function row(label, value, cls = '') { return `<div class="acc-row${cls ? ' ' + cls : ''}"><span>${esc(label)}</span><b>${value}</b></div>`; }
  function licenseCard(l, p, t) {
    const st = (l.status || 'active').toLowerCase();
    const mine = p.device?.license_id === l.id;
    const devices = l.max_devices != null ? `${l.devices_used ?? '–'} / ${l.max_devices}` : (l.devices_used != null ? String(l.devices_used) : '–');
    return `<div class="acc-lic${mine ? ' mine' : ''}">
      <div class="acc-lic-top"><b>${esc(l.plan || 'H1T.CC')}</b>${mine ? `<span class="acc-tag">${svg('pc')}${esc(t.thisDevice)}</span>` : ''}<span class="h1t-status ${st === 'active' ? 'ok' : 'warn'}"><i></i>${esc(t.lst[st] || l.status || t.lst.active)}</span></div>
      <div class="acc-lic-meta">
        <span><small>${esc(t.expires)}</small>${esc(l.expires_at ? fmtDate(l.expires_at) : t.lifetime)}</span>
        <span><small>${esc(t.devices)}</small>${esc(devices)}</span>
        <span><small>${esc(t.key)}</small>${l.key_hint ? '•••• ' + esc(l.key_hint) : '–'}</span>
      </div></div>`;
  }
  function page() {
    const t = tx(), p = profile || {}, u = p.user || {};
    const dev = p.status === 'development';
    const lics = (p.licenses || []).map((l) => licenseCard(l, p, t)).join('') || `<p class="acc-empty">${esc(dev ? t.devMode : t.noLicenses)}</p>`;
    const verified = p.authorized && !!p.device;
    const shortId = u.id ? (u.id.length > 14 ? u.id.slice(0, 8) + '…' + u.id.slice(-4) : u.id) : '';
    return `<div class="acc-page">
      <section class="acc-hero">
        <div class="acc-hero-id">${avatar(p, 'xl')}<div>
          <span class="h1t-kicker">H1T.CC ACCOUNT</span>
          <h1>${esc(displayName(p))}</h1>
          <p>${esc(u.username ? '@' + u.username : '')}${u.username && u.email ? ' · ' : ''}${esc(u.email || (dev ? t.devMode : ''))}</p>
          ${statusPill(p)}
        </div></div>
        <div class="acc-hero-actions">
          <button type="button" class="h1t-btn primary" data-acc="customer_area">${svg('ext')}<span>${esc(t.customerArea)}</span></button>
          <button type="button" class="h1t-btn ghost" data-acc="check" ${busy ? 'disabled' : ''}>${busy ? '<i class="h1t-spin"></i>' : svg('refresh')}<span>${esc(t.check)}</span></button>
        </div>
      </section>
      <div class="acc-grid">
        <section class="acc-card"><h2>${svg('user')}${esc(t.profile)}</h2>
          ${row(t.displayName, esc(u.display_name || '–'))}${row(t.username, esc(u.username || '–'))}${row(t.email, esc(u.email || '–'))}
          ${row(t.accountId, shortId ? `<code title="${esc(u.id)}">${esc(shortId)}</code>` : '–')}${row(t.memberSince, esc(u.created_at ? fmtDate(u.created_at) : '–'))}
          <p class="acc-note">${esc(t.avatarHint)}</p>
        </section>
        <section class="acc-card"><h2>${svg('shield')}${esc(t.session)}</h2>
          ${row(t.sessionStore, esc(t.sessionEnc))}${row(t.lastCheck, esc(fmtTime(p.checked_at)))}${row(t.autoCheck, esc(t.every2))}
          <div class="acc-actions"><button type="button" class="h1t-btn quiet" data-acc="logout">${svg('out')}<span>${esc(t.signOut)}</span></button></div>
        </section>
        <section class="acc-card wide" id="acc-licenses"><h2>${svg('key')}${esc(t.licenses)}<button type="button" class="h1t-link" data-acc="licenses_ext">${esc(t.manage)} ${svg('ext')}</button></h2>
          <div class="acc-lics">${lics}</div>
        </section>
        <section class="acc-card" id="acc-device"><h2>${svg('pc')}${esc(t.device)}</h2>
          ${row(t.deviceState, `<span class="h1t-status ${verified || dev ? 'ok' : 'warn'}"><i></i>${esc(verified ? t.verified : dev ? t.st.development : t.notLinked)}</span>`)}
          ${row(t.deviceLabel, esc(p.device?.label || 'Windows PC'))}${row(t.linkedSince, esc(fmtDate(p.device?.bound_at)))}
          ${row(t.lastSeen, esc(fmtDate(p.device?.last_seen_at)))}${row(t.appVersion, esc(appVersion()))}
          <p class="acc-note">${esc(t.deviceNote)}</p>
        </section>
        <section class="acc-card"><h2>${svg('help')}${esc(t.help)}</h2>
          <p class="acc-text">${esc(t.helpText)}</p>
          <div class="acc-actions"><button type="button" class="h1t-btn ghost" data-acc="support">${svg('help')}<span>${esc(t.support)}</span>${svg('ext')}</button>
            <button type="button" class="h1t-btn ghost" data-acc="customer_area">${svg('globe')}<span>${esc(t.customerArea)}</span>${svg('ext')}</button></div>
        </section>
      </div></div>`;
  }
  const onAccountPage = () => typeof state !== 'undefined' && state.route?.page === 'account';
  // Called by app.js after every render: refresh the button for the current language and finish a pending scroll.
  function sync() {
    renderButton();
    if (shownLang !== lang()) { shownLang = lang(); renderGate(); }
    if (pendingScroll && onAccountPage()) {
      const target = document.getElementById(pendingScroll);
      pendingScroll = '';
      requestAnimationFrame(() => { target?.scrollIntoView({ block: 'start', behavior: 'smooth' }); target?.classList.add('acc-flash'); });
    }
  }
  window.H1tAccountUI = { page, sync, title: () => tx().myAccount };

  // ---------- state ----------
  function renderAll() {
    if (profile?.authorized && !previouslyAuthorized) window.dispatchEvent(new Event('h1t:authorized'));
    previouslyAuthorized = !!profile?.authorized;
    renderGate();
    renderButton();
    if (onAccountPage() && typeof render === 'function') render();
  }
  async function run(fn) {
    if (busy) return;
    busy = true; error = ''; renderAll();
    try {
      const result = await fn();
      if (result?.ok === false) error = String(result.error || 'error').slice(0, 80);
      else if (result) profile = result;
    } catch { error = 'connection_unavailable'; }
    finally { busy = false; renderAll(); }
  }
  const refresh = () => run(() => bridge.h1tAccountStatus());

  gate.addEventListener('submit', (e) => {
    const form = e.target;
    e.preventDefault();
    if (form.id === 'h1t-login-form') {
      const email = form.elements.email.value.trim(), password = form.elements.password.value;
      if (!email || !password || !form.elements.email.checkValidity()) { error = 'invalid_credentials'; renderGate(); return; }
      lastEmail = email; form.elements.password.value = '';
      void run(() => bridge.h1tAccountLogin(email, password));
    } else if (form.id === 'h1t-device-form') {
      if (!form.elements.consent.checked) return;
      void run(() => bridge.h1tAccountBind(form.elements.license_id.value, true));
    }
  });
  gate.addEventListener('change', (e) => {
    if (e.target.name === 'consent') e.target.form.querySelector('button[type=submit]').disabled = !e.target.checked || busy;
  });
  async function act(action, el) {
    if (action === 'check') return refresh();
    if (action === 'logout') { closeMenu(); lastEmail = profile?.user?.email || lastEmail; return run(() => bridge.h1tAccountLogout()); }
    if (action === 'my-account') return goAccount('');
    if (action === 'licenses') return goAccount('acc-licenses');
    if (action === 'customer_area' || action === 'support') { closeMenu(); return openLink(action); }
    if (action === 'licenses_ext') return openLink('licenses');
    if (action === 'reveal') {
      const input = el.parentElement.querySelector('input'), show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      el.setAttribute('aria-pressed', String(show));
      el.setAttribute('aria-label', show ? tx().hide : tx().show);
      return input.focus();
    }
    if (action === 'win-min' || action === 'win-close') document.getElementById(action)?.click();
  }
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-acc]');
    if (el && !el.disabled && (gate.contains(el) || wrap.contains(el) || el.closest('.acc-page'))) { e.preventDefault(); void act(el.dataset.acc, el); return; }
    const l = e.target.closest('[data-acc-lang]');
    if (l) {
      const select = document.getElementById('h1t-language');
      if (select) { select.value = l.dataset.accLang; select.dispatchEvent(new Event('change', { bubbles: true })); }
      else { document.documentElement.lang = l.dataset.accLang; sync(); }
    }
  });

  renderAll();
  void refresh();
  // Do not erase typed credentials when a periodic check refreshes the dialog.
  const canRefresh = () => !busy && !gate.contains(document.activeElement);
  setInterval(() => { if (canRefresh()) void refresh(); }, 120000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && canRefresh()) void refresh(); });

  // ---------- browser-preview demo (only without the Electron bridge) ----------
  function demoBridge() {
    const mode = () => (location.hash.match(/acc=([a-z_]+)/) || [])[1] || 'signed_out';
    let signedIn = mode() !== 'signed_out';
    const lic = [{ id: 'demo-1', plan: 'Lifetime', expires_at: null, status: 'active', key_hint: '7F2K', max_devices: 2, devices_used: 1 },
      { id: 'demo-2', plan: 'Monthly', expires_at: '2026-11-21T00:00:00Z', status: 'active', key_hint: 'Q9XA', max_devices: 1, devices_used: 0 }];
    const user = { display_name: 'H1T Demo', username: 'demo', email: 'demo@h1tutility.cc', id: '6f1c2a9e-41b7-4e03-9d0a-2c7e5b1fd3a8', created_at: '2026-03-14T10:00:00Z', avatar: /avatar/.test(location.hash) ? demoAvatar() : null };
    const snap = () => {
      const m = mode();
      if (!signedIn) return { ok: true, authorized: false, signed_in: false, status: 'signed_out' };
      const base = { ok: true, signed_in: true, checked_at: Date.now(), user, licenses: lic };
      if (m === 'license') return { ...base, authorized: false, status: 'license_required', licenses: [] };
      if (m === 'device') return { ...base, authorized: false, status: 'device_consent_required' };
      if (m === 'error') return { ...base, authorized: false, status: 'connection_timeout' };
      return { ...base, authorized: true, status: 'active', device: { license_id: 'demo-1', label: 'Windows PC', bound_at: '2026-10-20T18:00:00Z', last_seen_at: new Date().toISOString() } };
    };
    function demoAvatar() {
      const c = document.createElement('canvas'); c.width = c.height = 96;
      const g = c.getContext('2d'), grad = g.createLinearGradient(0, 0, 96, 96);
      grad.addColorStop(0, '#f4f4f5'); grad.addColorStop(1, '#3f3f46');
      g.fillStyle = grad; g.fillRect(0, 0, 96, 96);
      g.fillStyle = '#0a0a0b'; g.beginPath(); g.arc(48, 38, 17, 0, 7); g.fill(); g.beginPath(); g.arc(48, 100, 36, 0, 7); g.fill();
      return c.toDataURL('image/png');
    }
    const wait = (v) => new Promise((r) => setTimeout(() => r(v), 450));
    return {
      h1tAccountStatus: () => wait(snap()),
      h1tAccountLogin: (email, pw) => wait(pw === 'wrong' ? { ok: false, error: 'invalid_credentials' } : ((signedIn = true), snap())),
      h1tAccountBind: () => wait((location.hash = 'acc=active', snap())),
      h1tAccountLogout: () => wait(((signedIn = false), snap())),
      h1tOpenAccountLink: (kind) => { console.info('[demo] open', kind); return Promise.resolve({ ok: true }); },
    };
  }
})();
