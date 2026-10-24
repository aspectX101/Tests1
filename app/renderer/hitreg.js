'use strict';
// FiveM > Hitreg: live connection test to the player's server, "Hitreg Boost" (real, reversible tweaks) and the
// WASD input test. The live test runs in the main process (app/hitreg-net.js); nothing here changes Windows directly.

// Tweaks shown under Hitreg Boost (own hitreg.* entries plus the matching ones from other tabs; one shared switch state).
const HITREG_IDS = ['hitreg.nic.latency', 'hitreg.qos.fivem', 'hitreg.timer.global', 'hitreg.input.power', 'hitreg.fivem.priority',
  'network.throttle.off', 'network.winsock.udp', 'network.nic.powersave.off', 'network.delivery.off', 'windows.mmcss.latency',
  'windows.foreground', 'windows.legacy.fps', 'windows.capture.off', 'keyboard.mouse.accel.off', 'windows.power.high'];
const HITREG_KEYS = {KeyW:'W',KeyA:'A',KeyS:'S',KeyD:'D',Space:'Space',ShiftLeft:'L Shift',ShiftRight:'R Shift',KeyE:'E',KeyR:'R'};
const hitreg = {open:new Set(['test']),held:new Set(),counts:{},peak:0,target:'',running:false,live:[],result:null,error:null,facts:null};

const HITREG_TEXT = {
  de:{title:'Hitreg',desc:'Teste die Verbindung zu deinem FiveM-Server live und optimiere PC und Netzwerk gezielt für saubere Treffer.',
    testTitle:'Live-Verbindungstest',testDesc:'Misst Ping, Jitter und Paketverlust direkt zu deinem Server – über denselben Weg wie das Spiel.',placeholder:'Server-IP:Port oder cfx.re/join/…',start:'Test starten',running:'Messung läuft …',
    ping:'Ping',jitter:'Jitter',loss:'Paketverlust',spikes:'Spitzen (95 %)',ms:'ms',players:(p,m)=>`${p}/${m} Spieler`,viaHttp:'Server beantwortet keine UDP-Abfragen – Ping über HTTP gemessen, Paketverlust nicht messbar.',
    rating:{excellent:'Exzellent',good:'Gut',fair:'Geht so',poor:'Schlecht'},ratingTitle:'Hitreg-Bewertung',tipsTitle:'Empfehlungen',
    tips:{all_good:'Deine Verbindung ist stabil. Hitreg Boost holt das Letzte aus PC und Netzwerkkarte heraus.',loss:'Paketverlust erkannt: Pakete gehen unterwegs verloren – Treffer kommen dann gar nicht oder zu spät an. LAN-Kabel nutzen, Router neu starten, Downloads/Streams pausieren.',
      ping_high:'Hoher Ping: Die Strecke zum Server ist lang. Wähle wenn möglich einen Server näher an dir; Hitreg Boost senkt nur die Verzögerung auf deinem PC.',jitter:'Hoher Jitter: Die Antwortzeiten schwanken stark – Gegner „springen“ und Treffer wirken zufällig. Hitreg Boost (Netzwerkkarte, QoS) und ein LAN-Kabel helfen am meisten.',
      spikes:'Kurze Lag-Spitzen erkannt: Meist Hintergrund-Downloads, Updates oder WLAN-Störungen. Übermittlungsoptimierung aus und QoS-Priorität im Hitreg Boost aktivieren.',wifi:'Du bist per WLAN verbunden: WLAN verursacht die meisten Hitreg-Probleme. Ein LAN-Kabel bringt mehr als jeder Tweak.',
      boost:(n)=>`${n} Hitreg-Boost-Optimierungen sind noch nicht aktiv – mit einem Klick unten anwenden.`},
    boostTitle:'Hitreg Boost',boostDesc:'Echte, einzeln schaltbare Optimierungen für Netzwerkkarte, Paket-Priorität, Timer, Eingabe-Latenz und FiveM-Priorität. Jede Änderung wird gesichert und lässt sich exakt zurücksetzen.',
    inputTitle:'Eingabetest (WASD)',instructions:'Feld anklicken und W, A, S, D, Shift, Leertaste, E und R drücken – auch gleichzeitig. Zählt nur hier empfangene Tasten.',pad:'Tastentest – hier klicken',reset:'Zurücksetzen',down:'Drücken',up:'Loslassen',peak:'Maximal gleichzeitig erkannt',
    limit:'Misst nicht die Hardware-Latenz. Gehaltene Tasten werden beim Verlassen des Feldes freigegeben.'},
  en:{title:'Hitreg',desc:'Test the connection to your FiveM server live and tune PC and network specifically for clean hits.',
    testTitle:'Live connection test',testDesc:'Measures ping, jitter and packet loss straight to your server – over the same path as the game.',placeholder:'Server IP:port or cfx.re/join/…',start:'Start test',running:'Measuring …',
    ping:'Ping',jitter:'Jitter',loss:'Packet loss',spikes:'Spikes (95%)',ms:'ms',players:(p,m)=>`${p}/${m} players`,viaHttp:'Server ignores UDP queries – ping measured over HTTP, packet loss not measurable.',
    rating:{excellent:'Excellent',good:'Good',fair:'Fair',poor:'Poor'},ratingTitle:'Hitreg rating',tipsTitle:'Recommendations',
    tips:{all_good:'Your connection is stable. Hitreg Boost gets the last bit out of your PC and network card.',loss:'Packet loss detected: packets get lost on the way – hits then arrive late or not at all. Use a LAN cable, restart the router, pause downloads/streams.',
      ping_high:'High ping: the route to the server is long. Pick a server closer to you if possible; Hitreg Boost only cuts the delay on your PC.',jitter:'High jitter: response times vary a lot – enemies "jump" and hits feel random. Hitreg Boost (network card, QoS) and a LAN cable help most.',
      spikes:'Short lag spikes detected: usually background downloads, updates or Wi-Fi interference. Turn off Delivery Optimization and enable QoS priority in Hitreg Boost.',wifi:'You are on Wi-Fi: Wi-Fi causes most hitreg problems. A LAN cable does more than any tweak.',
      boost:(n)=>`${n} Hitreg Boost optimizations are not active yet – apply them with one click below.`},
    boostTitle:'Hitreg Boost',boostDesc:'Real, individually switchable optimizations for network card, packet priority, timer, input latency and FiveM priority. Every change is backed up and can be restored exactly.',
    inputTitle:'Input test (WASD)',instructions:'Click the field and press W, A, S, D, Shift, Space, E and R – also together. Only keys received here are counted.',pad:'Key test – click here',reset:'Reset',down:'Press',up:'Release',peak:'Maximum detected together',
    limit:'Does not measure hardware latency. Held keys are released when the field loses focus.'},
  it:{title:'Hitreg',desc:'Testa dal vivo la connessione al tuo server FiveM e ottimizza PC e rete per colpi puliti.',
    testTitle:'Test di connessione dal vivo',testDesc:'Misura ping, jitter e perdita di pacchetti verso il tuo server, sullo stesso percorso del gioco.',placeholder:'IP:porta del server o cfx.re/join/…',start:'Avvia test',running:'Misurazione …',
    ping:'Ping',jitter:'Jitter',loss:'Pacchetti persi',spikes:'Picchi (95%)',ms:'ms',players:(p,m)=>`${p}/${m} giocatori`,viaHttp:'Il server ignora le richieste UDP: ping misurato via HTTP, perdita di pacchetti non misurabile.',
    rating:{excellent:'Eccellente',good:'Buona',fair:'Discreta',poor:'Scarsa'},ratingTitle:'Valutazione hitreg',tipsTitle:'Consigli',
    tips:{all_good:'La connessione è stabile. Hitreg Boost tira fuori il massimo da PC e scheda di rete.',loss:'Perdita di pacchetti rilevata: i colpi arrivano in ritardo o non arrivano. Usa il cavo LAN, riavvia il router, metti in pausa download/streaming.',
      ping_high:'Ping alto: il percorso verso il server è lungo. Se possibile scegli un server più vicino; Hitreg Boost riduce solo il ritardo sul tuo PC.',jitter:'Jitter alto: i tempi di risposta variano molto, i nemici "saltano" e i colpi sembrano casuali. Hitreg Boost (scheda di rete, QoS) e un cavo LAN aiutano di più.',
      spikes:'Brevi picchi di lag: di solito download, aggiornamenti o disturbi Wi-Fi. Disattiva Ottimizzazione recapito e attiva la priorità QoS in Hitreg Boost.',wifi:'Sei connesso in Wi-Fi: il Wi-Fi causa la maggior parte dei problemi di hitreg. Un cavo LAN fa più di qualsiasi tweak.',
      boost:(n)=>`${n} ottimizzazioni di Hitreg Boost non sono ancora attive: applicale con un clic qui sotto.`},
    boostTitle:'Hitreg Boost',boostDesc:'Ottimizzazioni reali e attivabili singolarmente per scheda di rete, priorità dei pacchetti, timer, latenza di input e priorità di FiveM. Ogni modifica viene salvata e ripristinabile esattamente.',
    inputTitle:'Test input (WASD)',instructions:'Fai clic sul campo e premi W, A, S, D, Shift, Spazio, E e R, anche insieme. Contano solo i tasti ricevuti qui.',pad:'Test tasti – clicca qui',reset:'Reimposta',down:'Pressioni',up:'Rilasci',peak:'Massimo rilevato insieme',
    limit:'Non misura la latenza hardware. I tasti premuti vengono liberati quando il campo perde il focus.'}
};
const hitregText=()=>HITREG_TEXT[state.lang]||HITREG_TEXT.en;
const hitregTweaks=()=>HITREG_IDS.map((id)=>state.tweaks.find((tw)=>tw.id===id)).filter((tw)=>tw);

// Rating of a measured connection plus concrete tips (pure function, unit-tested).
function rateHitreg(result, facts, inactiveBoost=0) {
  const s=result?.stats||{}, notes=[];const rank={excellent:0,good:1,fair:2,poor:3};let score='excellent';
  const worse=(v)=>{if(rank[v]>rank[score])score=v;};
  if(result?.method==='udp'&&s.loss>0){notes.push('loss');worse(s.loss>2?'poor':'fair');}
  if(s.median!=null){if(s.median>120){notes.push('ping_high');worse('poor');}else if(s.median>70){notes.push('ping_high');worse('fair');}else if(s.median>35)worse('good');}
  if(s.jitter!=null){if(s.jitter>15){notes.push('jitter');worse('poor');}else if(s.jitter>6){notes.push('jitter');worse('fair');}}
  if(s.p95!=null&&s.median!=null&&s.p95-s.median>40){notes.push('spikes');worse('fair');}
  if(facts&&facts.wifi===true&&facts.ethernetUp===false)notes.push('wifi');
  if(!notes.length)notes.push('all_good');
  if(inactiveBoost>0)notes.push('boost');
  return {score,notes};
}

async function hitregRun() {
  const input=document.getElementById('hr-target');const target=(input?.value||hitreg.target).trim();
  if(!target||hitreg.running||!bridge.hitregTest)return;
  hitreg.target=target;store.set('hitregTarget',target);hitreg.running=true;hitreg.live=[];hitreg.result=null;hitreg.error=null;render();
  if(!hitreg.facts)call('system-check').then((r)=>{if(r?.ok)hitreg.facts=r.facts;}).catch(()=>{});
  try{const r=await bridge.hitregTest(target);if(r?.ok)hitreg.result=r;else hitreg.error=r?.error||'hitreg_server_unreachable';}
  catch(err){hitreg.error=err.message;}
  finally{hitreg.running=false;if(state.route.page==='hitreg')render();}
}
function hitregChart(samples, total=30) {
  const w=600,h=120,max=Math.max(60,...samples.filter((v)=>typeof v==='number'))*1.15;
  const step=w/Math.max(1,total-1);
  const pts=samples.map((v,i)=>typeof v==='number'?`${(i*step).toFixed(1)},${(h-(v/max)*h).toFixed(1)}`:null);
  const line=pts.filter(Boolean).join(' ');
  const lost=samples.map((v,i)=>v===null?`<line class="hr-lost" x1="${(i*step).toFixed(1)}" x2="${(i*step).toFixed(1)}" y1="0" y2="${h}"/>`:'').join('');
  return `<svg class="hr-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${[0.25,0.5,0.75].map((g)=>`<line class="grid" x1="0" x2="${w}" y1="${h*g}" y2="${h*g}"/>`).join('')}${lost}<polyline points="${line}"/></svg>`;
}
function hitregPaintLive(){const box=document.getElementById('hr-live');if(box)box.innerHTML=hitregChart(hitreg.live)+`<span>${hitregText().running} ${hitreg.live.filter((v)=>v!==undefined).length}/30</span>`;}

function renderHitregTest(){
  const tr=hitregText(),r=hitreg.result;
  let body='';
  if(hitreg.running)body=`<div class="hr-live" id="hr-live">${hitregChart(hitreg.live)}<span>${tr.running}</span></div>`;
  else if(hitreg.error)body=`<p class="hr-error" role="alert">${esc(errorText(hitreg.error))}</p>`;
  else if(r){
    const inactive=hitregTweaks().filter((tw)=>tw.available!==false&&!tw.applied).length;
    const rating=rateHitreg(r,hitreg.facts,inactive),s=r.stats;
    const tile=(label,val,unit='')=>`<div class="hr-stat"><span>${label}</span><b>${val==null?'—':val}<small>${val==null?'':unit}</small></b></div>`;
    body=`<div class="hr-result">
      <div class="hr-score hr-${rating.score}"><span>${tr.ratingTitle}</span><b>${tr.rating[rating.score]}</b><small>${esc(r.server.name)}${r.server.max?` · ${tr.players(r.server.players,r.server.max)}`:''}</small></div>
      <div class="hr-stats">${tile(tr.ping,s.median,` ${tr.ms}`)}${tile(tr.jitter,s.jitter,` ${tr.ms}`)}${tile(tr.loss,r.method==='udp'?s.loss:null,' %')}${tile(tr.spikes,s.p95,` ${tr.ms}`)}</div>
      ${hitregChart(r.samples,r.samples.length)}
      ${r.method==='http'?`<p class="hint">${tr.viaHttp}</p>`:''}
      <div class="hr-tips"><h3>${tr.tipsTitle}</h3>${rating.notes.map((k)=>`<p class="hr-tip hr-tip-${k}">${esc(k==='boost'?tr.tips.boost(inactive):tr.tips[k])}</p>`).join('')}</div></div>`;
  }
  return `<section class="card hr-card"><div class="hr-card-head"><div><h2>${tr.testTitle}</h2><p>${tr.testDesc}</p></div></div>
    <form class="hr-form" id="hr-form"><input id="hr-target" autocomplete="off" spellcheck="false" placeholder="${esc(tr.placeholder)}" value="${esc(hitreg.target)}" ${hitreg.running?'disabled':''}>
      <button class="pill light" type="submit" ${hitreg.running?'disabled':''}>${icon('bolt')}<span>${hitreg.running?tr.running:tr.start}</span></button></form>${body}</section>`;
}
function hitregKey(type,code,repeat=false) {
  if(!Object.hasOwn(HITREG_KEYS,code))return false;
  const count=hitreg.counts[code]??={down:0,up:0};
  if(type==='keydown'&&!repeat&&!hitreg.held.has(code)){hitreg.held.add(code);count.down++;hitreg.peak=Math.max(hitreg.peak,hitreg.held.size);}
  if(type==='keyup'&&hitreg.held.delete(code))count.up++;
  return true;
}
function hitregKeyMarkup(){const tr=hitregText();return Object.entries(HITREG_KEYS).map(([code,label])=>`<span class="hr-key ${hitreg.held.has(code)?'pressed':''}"><b>${label}</b><small>${tr.down}: ${hitreg.counts[code]?.down||0} · ${tr.up}: ${hitreg.counts[code]?.up||0}</small></span>`).join('')+`<p>${tr.peak}: ${hitreg.peak}</p>`;}
function renderHitreg(){
  const tr=hitregText();hitreg.held.clear();
  return `<div class="card detail-head cat-hero"><div class="tile-icon">${icon('hitreg')}</div><div class="cat-hero-body"><h1>${tr.title}</h1><p>${tr.desc}</p></div></div>
    ${renderHitregTest()}
    <section class="hr-boost"><div class="hr-section-head"><h2>${tr.boostTitle}</h2><p>${tr.boostDesc}</p></div><div class="opt-v2">${renderOptimization('hitreg')}</div></section>
    <details class="card hr-input" data-hr-section="test" ${hitreg.open.has('test')?'open':''}><summary>${tr.inputTitle}</summary><p>${tr.instructions}</p>
      <div id="hitreg-pad" tabindex="0" role="group" aria-label="${tr.pad}">${hitregKeyMarkup()}</div><button class="pill dark" id="hr-reset">${tr.reset}</button><p class="hint">${tr.limit}</p></details>`;
}
function hitregPaint(){const pad=document.getElementById('hitreg-pad');if(pad)pad.innerHTML=hitregKeyMarkup();}
function hitregRelease(){hitreg.held.clear();hitregPaint();}
for(const type of ['keydown','keyup'])document.addEventListener(type,e=>{
  if(e.target.id!=='hitreg-pad'||state.route.page!=='hitreg'||e.isComposing)return;
  if(hitregKey(type,e.code,e.repeat)){e.preventDefault();hitregPaint();}
});
document.addEventListener('focusout',e=>{if(e.target.id==='hitreg-pad')hitregRelease();});
window.addEventListener('blur',hitregRelease);
document.addEventListener('visibilitychange',()=>{if(document.hidden)hitregRelease();});
document.addEventListener('submit',e=>{if(e.target.id==='hr-form'){e.preventDefault();hitregRun();}});
document.addEventListener('click',e=>{const button=e.target.closest('button');if(button?.id==='hr-reset'){hitreg.held.clear();hitreg.counts={};hitreg.peak=0;hitregPaint();}});
document.addEventListener('toggle',e=>{const section=e.target.dataset?.hrSection;if(!section||!e.target.isConnected)return;if(e.target.open)hitreg.open.add(section);else hitreg.open.delete(section);},true);
function hitregBind(api){api.onHitregProgress?.((p)=>{if(!hitreg.running||p?.phase!=='sample')return;hitreg.live[p.i]=p.rtt;hitregPaintLive();});}
