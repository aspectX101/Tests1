'use strict';
const displayState = {data:null,busy:false,loading:false,error:null,message:'',positions:null};
const displayWords = {
 de: {max:'Hertz to max',maxDesc:'Je Display die höchste unterstützte Bildwiederholrate bei aktueller Auflösung setzen.',set:'Maximum setzen',move:'Move monitors',drag:'Monitore ziehen, bis ihre Kanten aneinanderliegen. Alternativ mit Tab auswählen und Pfeiltasten bewegen.',apply:'Übernehmen',extras:'Display extras',mpo:'MPO deaktivieren',restore:'Originalwert wiederherstellen',restart:'Neustart erforderlich. Gespeicherte Einstellung, kein gemessener Laufzeitstatus.',limits:'Auto HDR und adaptive Helligkeit hängen von Windows, Treiber und Hardware ab. Diese Optionen bitte in Windows einstellen. Exklusives Vollbild wird pro Spiel konfiguriert.',settings:'Windows-Anzeigeeinstellungen',reload:'Neu einlesen',primary:'Primär',confirm:'Die Anzeige kann kurz schwarz werden. Im anschließenden Windows-Dialog innerhalb von 15 Sekunden bestätigen; andernfalls werden die vorherigen Einstellungen wiederhergestellt.',kept:'Anzeigeeinstellungen bestätigt.',reverted:'Vorherige Anzeigeeinstellungen wiederhergestellt.',saved:'MPO-Einstellung gespeichert. Neustart erforderlich.',failed:'Vorgang fehlgeschlagen',mock:'Die Anzeigeverwaltung ist nur im echten Windows-Modus verfügbar.',error:'Monitorinformationen konnten nicht geladen werden.',reset:'Anordnung zurücksetzen'},
 en: {max:'Hertz to max',maxDesc:'Set each display to its highest supported refresh rate at its current resolution.',set:'Set max',move:'Move monitors',drag:'Drag monitors until their edges touch. Alternatively select with Tab and move with arrow keys.',apply:'Apply',extras:'Display extras',mpo:'Disable MPO',restore:'Restore original value',restart:'Restart required. Saved setting, not measured runtime state.',limits:'Auto HDR and adaptive brightness depend on Windows, drivers and hardware. Configure these options in Windows. Exclusive fullscreen is configured per game.',settings:'Windows display settings',reload:'Refresh',primary:'Primary',confirm:'The display may briefly go black. Confirm in the following Windows dialog within 15 seconds; otherwise the previous settings will be restored.',kept:'Display settings confirmed.',reverted:'Previous display settings restored.',saved:'MPO setting saved. Restart required.',failed:'Operation failed',mock:'Display management is available only in real Windows mode.',error:'Could not load display information.',reset:'Reset layout'},
 it: {max:'Hertz to max',maxDesc:'Imposta ogni schermo alla frequenza massima supportata alla risoluzione attuale.',set:'Imposta massimo',move:'Move monitors',drag:'Trascina gli schermi finché i bordi si toccano. Oppure seleziona con Tab e sposta con le frecce.',apply:'Applica',extras:'Display extras',mpo:'Disattiva MPO',restore:'Ripristina valore originale',restart:'Riavvio necessario. Valore salvato, non stato effettivo misurato.',limits:'Auto HDR e luminosità adattiva dipendono da Windows, driver e hardware. Configurali in Windows. Lo schermo intero esclusivo si configura per gioco.',settings:'Impostazioni schermo di Windows',reload:'Aggiorna',primary:'Principale',confirm:'Lo schermo potrebbe diventare nero. Conferma nella finestra Windows entro 15 secondi, altrimenti verranno ripristinate le impostazioni precedenti.',kept:'Impostazioni confermate.',reverted:'Impostazioni precedenti ripristinate.',saved:'Impostazione MPO salvata. Riavvio necessario.',failed:'Operazione non riuscita',mock:'Gestione schermi disponibile solo in modalità Windows reale.',error:'Impossibile leggere gli schermi.',reset:'Ripristina disposizione'}
};
const displayHagsWords = {
 de:{title:'HAGS bevorzugen',detail:'GPU-Planung per Hardware: gespeicherte Windows-Vorgabe. Wirkung nur bei unterstütztem Grafiktreiber und GPU; Neustart erforderlich.',default:'Windows-Standard',on:'Ein angefordert',off:'Aus angefordert'},
 en:{title:'Prefer HAGS',detail:'Hardware GPU scheduling: saved Windows preference. Requires compatible GPU and driver; restart required.',default:'Windows default',on:'On requested',off:'Off requested'},
 it:{title:'Preferisci HAGS',detail:'Pianificazione GPU hardware: preferenza Windows salvata. Richiede GPU e driver compatibili; riavvio necessario.',default:'Predefinito Windows',on:'Attivazione richiesta',off:'Disattivazione richiesta'}
};
function dw() {return displayWords[state.lang] || displayWords.en;}
function displayPage() {return state.route.cat==='display' && !state.loading;}
function renderDisplays() {
 const d=displayState,w=dw(),data=d.data,h=displayHagsWords[state.lang]||displayHagsWords.en;
 const button=(action,label,disabled=false)=>`<button class="pill dark" data-display="${action}" ${d.busy||disabled?'disabled':''}>${esc(label)}</button>`;
 if(state.mode && state.mode!=='powershell') return `<div class="card row">${esc(w.mock)}</div>`;
 if(!data) return `<section class="card row"><p role="status">${esc(d.error?w.error+' '+d.error:t().working)}</p>${button('reload',w.reload,d.loading)}</section>`;
 return `<div class="display-panel" aria-busy="${d.busy}">
 <section class="card row"><div class="row-body"><h2>${w.max}</h2><p>${esc(w.maxDesc)}</p></div>${button('max',w.set)}</section>
 <section class="card display-layout"><div class="row"><div class="row-body"><h2>${w.move}</h2><p>${esc(w.drag)}</p></div>${button('apply',w.apply)}${button('reset',w.reset)}</div><div id="display-stage" class="display-stage" aria-label="${esc(w.move)}"></div><p class="hint">${esc(w.confirm)}</p></section>
 <section class="card display-extras"><h2>${w.extras}</h2><div class="row"><div class="row-body"><b>${esc(h.title)} · ${esc(h[data.hagsPreference]||h.default)}</b><p>${esc(h.detail)}</p></div><button class="toggle ${data.hagsPreference==='on'?'on':''} " role="switch" aria-checked="${data.hagsPreference==='on'}" aria-label="${esc(h.title)}" data-display="hags" ${d.busy||!data.hagsConfigurable||data.hagsPreference==='on'&&!data.hagsCanRestore?'disabled':''}></button>${data.hagsCanRestore?button('hags-restore',w.restore):''}</div><div class="row"><div class="row-body"><b>${esc(w.mpo)}</b><p>${esc(w.restart)}</p></div><button class="toggle ${data.mpoOff?'on':''}" role="switch" aria-checked="${data.mpoOff}" aria-label="${esc(w.mpo)}" data-display="mpo" ${d.busy||data.mpoOff&&!data.mpoCanRestore?'disabled':''}></button>${data.mpoCanRestore?button('restore',w.restore):''}</div><p>${esc(w.limits)}</p>${button('settings',w.settings)}</section>
 <div class="toolbar">${button('reload',w.reload)}<p role="status">${esc(d.error?w.failed+': '+d.error:d.message)}</p></div></div>`;
}
async function displayRead() {
 const d=displayState;if(d.loading)return;d.loading=true;
 try {const r=await call('display-list');if(!r?.ok)throw new Error(r?.error||'display_read_failed');d.data=r;d.positions=r.displays.map(x=>({...x}));d.error=null;}
 catch(e){d.error=e.message;}finally{d.loading=false;if(displayPage())render();}
}
function mountDisplays() {
 if(!displayPage() || state.mode!=='powershell')return;
 const d=displayState;
 if(!d.data){if(!d.loading&&!d.error)void displayRead();return;}
 const stage=document.getElementById('display-stage');if(!stage)return;
 const monitors=d.positions;
 const minX=Math.min(...monitors.map(x=>x.x)),minY=Math.min(...monitors.map(x=>x.y));
 const width=Math.max(...monitors.map(x=>x.x+x.width))-minX,height=Math.max(...monitors.map(x=>x.y+x.height))-minY;
 const scale=Math.min((stage.clientWidth-80)/Math.max(width,1),220/Math.max(height,1),0.12);
 function paint(el,m){el.style.left=`${40+(m.x-minX)*scale}px`;el.style.top=`${40+(m.y-minY)*scale}px`;}
 for(const m of monitors) {
  const el=document.createElement('button');el.className='display-monitor';el.disabled=d.busy;el.style.width=`${m.width*scale}px`;el.style.height=`${m.height*scale}px`;
  el.innerHTML=`<strong>${esc(m.name)}</strong>${m.primary?`<b>${esc(dw().primary)}</b>`:''}<span>${m.width} × ${m.height}</span><span>${m.hz} Hz → ${m.maxHz} Hz</span>`;
  el.setAttribute('aria-label',`${m.name}, ${m.width} × ${m.height}, ${m.hz} Hz`);paint(el,m);stage.append(el);
  let drag=null;
  el.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,mx:m.x,my:m.y};el.setPointerCapture(e.pointerId);});
  el.addEventListener('pointermove',e=>{if(!drag)return;m.x=Math.round(drag.mx+(e.clientX-drag.x)/scale);m.y=Math.round(drag.my+(e.clientY-drag.y)/scale);paint(el,m);});
  el.addEventListener('pointerup',()=>{if(!drag)return;drag=null;displaySnap(m,monitors,16/scale);paint(el,m);});
  el.addEventListener('pointercancel',()=>{if(drag){m.x=drag.mx;m.y=drag.my;drag=null;paint(el,m);}});
  el.addEventListener('keydown',e=>{const delta={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]}[e.key];if(!delta)return;e.preventDefault();m.x+=delta[0];m.y+=delta[1];paint(el,m);});
 }
}
function displaySnap(m,monitors,tolerance) {
 for(const axis of ['x','y']) {
  const size=axis==='x'?'width':'height';let nearest=tolerance,target=m[axis];
  for(const other of monitors){if(other===m)continue;for(const value of [other[axis],other[axis]+other[size],other[axis]-m[size],other[axis]+other[size]-m[size]]){const distance=Math.abs(value-m[axis]);if(distance<nearest){nearest=distance;target=value;}}}
  m[axis]=Math.round(target);
 }
}
document.addEventListener('click',async e=>{
 const el=e.target.closest('[data-display]');if(!el||el.disabled)return;
 const action=el.dataset.display,d=displayState,w=dw();if(d.busy)return;
 if(action==='settings'){try{const r=await bridge.openDisplaySettings();if(!r.ok)throw new Error(r.error);}catch(err){d.error=err.message;render();}return;}
 if(action==='reload'){await displayRead();return;}
 if(action==='reset'){d.positions=d.data.displays.map(x=>({...x}));render();return;}
 d.busy=true;d.error=null;d.message='';render();
 try {
  let request,extra={};
  if(action==='max'||action==='apply') {
   if(!await confirmDialog(action==='max'?w.max:w.move,w.confirm,w.apply))return;
   request=action==='max'?'display-max':'display-layout';
   if(action==='apply') {
    const positions=d.positions.map(x=>({...x}));for(const m of positions)displaySnap(m,positions,25);
    const primary=positions.find(x=>x.primary);if(!primary)throw new Error('display_layout_invalid');
    extra.layout=positions.map(m=>({id:m.id,x:m.x-primary.x,y:m.y-primary.y}));
   }
  } else {request='display-extra';extra.extra=action==='hags-restore'?'hags-restore':action==='hags'?(d.data.hagsPreference==='on'?'hags-off':'hags-on'):action==='restore'||d.data.mpoOff?'mpo-restore':'mpo-off';}
  const r=await call(request,undefined,extra);if(!r?.ok)throw new Error(r?.error||'display_apply_failed');
  d.message=request==='display-extra'?w.restart:r.reverted?w.reverted:w.kept;
  if(r.restartRequired)state.restartPending=true;
  await displayRead();
 } catch(err){d.error=err.message;}finally{d.busy=false;if(displayPage())render();}
});
