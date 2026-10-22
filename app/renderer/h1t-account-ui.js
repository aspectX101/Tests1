'use strict';
// Graphite/forest-green license gate. The privileged main process owns tokens.
(() => {
  if (!window.tweaker?.h1tAccountStatus) return;
  const T = {
    de:{title:'H1T.CC ACCOUNT',intro:'Mit deinem H1T.CC-Konto anmelden.',email:'E-Mail-Adresse',password:'Passwort',login:'Anmelden',logout:'Abmelden',check:'Erneut prüfen',wait:'Lizenzprüfung läuft…',empty:'Keine aktive Lizenz. Aktiviere zuerst einen Key im Kundenportal.',device:'Gerät verknüpfen',consent:'Ich stimme zu, dass eine pseudonyme Kennung dieser Windows-Installation zur Lizenzbindung übertragen wird. Es werden keine Hardware-Seriennummern übertragen.',bind:'Gerät aktivieren',license:'Lizenz auswählen',active:'Lizenz aktiv und Gerät verifiziert',unbound:'Das Gerät ist noch nicht verknüpft.',portal:'Kundenportal öffnen',close:'Schließen',error:'Keine Verbindung oder Lizenzprüfung fehlgeschlagen.',account:'Konto'},
    en:{title:'H1T.CC ACCOUNT',intro:'Sign in with your H1T.CC account.',email:'Email',password:'Password',login:'Sign in',logout:'Sign out',check:'Check again',wait:'Checking license…',empty:'No active license. Activate a key in your customer portal.',device:'Connect device',consent:'I consent to transmitting a pseudonymous identifier for this Windows installation to bind the license. No raw hardware serial numbers are transmitted.',bind:'Activate device',license:'Select license',active:'License active and device verified',unbound:'Your device is not linked yet.',portal:'Open customer portal',close:'Close',error:'Network unavailable or license verification failed.',account:'Account'},
    it:{title:'ACCOUNT H1T.CC',intro:'Accedi con il tuo account H1T.CC.',email:'Email',password:'Password',login:'Accedi',logout:'Esci',check:'Riprova',wait:'Verifica licenza…',empty:'Nessuna licenza attiva. Attiva una chiave nel portale.',device:'Collega il dispositivo',consent:'Acconsento alla trasmissione di un identificatore pseudonimo di questa installazione Windows per la licenza. Nessun numero di serie hardware viene trasmesso.',bind:'Attiva dispositivo',license:'Seleziona licenza',active:'Licenza attiva e dispositivo verificato',unbound:'Dispositivo non collegato.',portal:'Portale clienti',close:'Chiudi',error:'Connessione non disponibile o verifica licenza fallita.',account:'Account'}
  };
  const tx = () => T[document.documentElement.lang] || T.de;
  const esc = x => String(x??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const gate=document.createElement('section');
  gate.id='h1t-license-gate';gate.setAttribute('role','dialog');gate.setAttribute('aria-modal','true');
  document.body.append(gate);
  const trigger=document.createElement('button');trigger.id='h1t-license-profile';trigger.type='button';trigger.textContent='H1T.CC';
  document.querySelector('.h1t-topbar-meta')?.prepend(trigger);
  let profile=null,busy=false,manual=false,error='',previouslyAuthorized=false;
  function render(){
    const t=tx(),p=profile||{};
    if(p.authorized&&!previouslyAuthorized)window.dispatchEvent(new Event('h1t:authorized'));
    previouslyAuthorized=!!p.authorized;
    gate.style.display=p.authorized&&!manual?'none':'flex';
    const err=error?'<p class="h1t-auth-error" role="alert">'+esc(error)+'</p>':'';
    let content='';
    if(!p.signed_in) content='<p>'+esc(t.intro)+'</p><form id="h1t-login-form" class="h1t-auth-form"><label>'+esc(t.email)+'<input name="email" required type="email" maxlength="190" autocomplete="username"></label><label>'+esc(t.password)+'<input name="password" required type="password" maxlength="128" autocomplete="current-password"></label><button type="submit">'+esc(t.login)+'</button></form>';
    else if(p.authorized) content='<p class="h1t-auth-ok">✓ '+esc(t.active)+'</p><p>'+esc(p.user?.display_name)+' · '+esc(p.user?.email)+'</p><div class="h1t-auth-actions"><button data-action="logout">'+esc(t.logout)+'</button><button data-action="close">'+esc(t.close)+'</button></div>';
    else if(p.status==='license_required')content='<p>'+esc(t.empty)+'</p><div class="h1t-auth-actions"><button data-action="portal">'+esc(t.portal)+'</button><button data-action="check">'+esc(t.check)+'</button><button data-action="logout">'+esc(t.logout)+'</button></div>';
    else if(p.status==='device_consent_required'||p.status==='device_unbound'){
      const opts=(p.licenses||[]).map(l=>'<option value="'+esc(l.id)+'">'+esc(l.plan)+' · '+(l.expires_at?esc(new Date(l.expires_at).toLocaleDateString()):'Lifetime')+'</option>').join('');
      content='<p>'+esc(t.unbound)+'</p><form id="h1t-device-form" class="h1t-auth-form"><label>'+esc(t.license)+'<select name="license_id" required>'+opts+'</select></label><label class="h1t-auth-consent"><input type="checkbox" name="consent" required><span>'+esc(t.consent)+'</span></label><button type="submit">'+esc(t.bind)+'</button></form><div class="h1t-auth-actions"><button data-action="check">'+esc(t.check)+'</button><button data-action="logout">'+esc(t.logout)+'</button></div>';
    }else content='<p>'+esc(t.error)+'</p><div class="h1t-auth-actions"><button data-action="check">'+esc(t.check)+'</button><button data-action="logout">'+esc(t.logout)+'</button></div>';
    gate.innerHTML='<div class="h1t-auth-card"><div class="h1t-auth-logo">H1T<span>.CC</span><small>CLIENT PLATFORM</small></div><div class="h1t-auth-kicker">SECURE ACCESS / '+esc(p.status||'ACCOUNT')+'</div><h2>'+esc(t.title)+'</h2>'+(busy?'<p>'+esc(t.wait)+'</p>':'')+content+err+'<small class="h1t-auth-foot">HTTPS · Server-verified licenses · Privacy-first enrollment</small></div>';
  }
  async function run(fn){
    if(busy)return;busy=true;error='';render();
    try{const result=await fn();if(result?.ok===false)error=String(result.error||tx().error).slice(0,180);else profile=result;}
    catch(e){error=tx().error;}
    finally{busy=false;render();}
  }
  gate.addEventListener('submit',e=>{
    const form=e.target;
    if(form.id==='h1t-login-form'){
      e.preventDefault();const email=form.elements.email.value,password=form.elements.password.value;form.elements.password.value='';
      void run(()=>window.tweaker.h1tAccountLogin(email,password));
    } else if(form.id==='h1t-device-form'){
      e.preventDefault();if(!form.elements.consent.checked)return;
      void run(()=>window.tweaker.h1tAccountBind(form.elements.license_id.value,true));
    }
  });
  gate.addEventListener('click',e=>{
    const action=e.target.closest('[data-action]')?.dataset.action;
    if(action==='close'){manual=false;render();}
    if(action==='check')void run(()=>window.tweaker.h1tAccountStatus());
    if(action==='logout')void run(()=>window.tweaker.h1tAccountLogout());
    if(action==='portal')window.tweaker.h1tOpenAccountPortal();
  });
  trigger.addEventListener('click',()=>{manual=!manual;render();});
  render();void run(()=>window.tweaker.h1tAccountStatus());
  // Do not erase typed credentials when a periodic check refreshes the dialog.
  const canRefresh=()=>!busy&&!gate.contains(document.activeElement);
  setInterval(()=>{if(canRefresh())void run(()=>window.tweaker.h1tAccountStatus())},120000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&canRefresh())void run(()=>window.tweaker.h1tAccountStatus())});
})();
