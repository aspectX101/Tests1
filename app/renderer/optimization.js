'use strict';
const opt = { selected: new Set(), busy: false, result: null };
const OPT_TEXT = {
  de: { hint:'Einzelne Tweaks lassen sich per Schalter aktivieren oder deaktivieren. Start Optimisations wendet nach Bestätigung alle verfügbaren, inaktiven Tweaks an – auch riskante.', select:'Sichere auswählen', confirm:'Alle folgenden verfügbaren Einstellungen werden angewendet. Beachte die Risiken und Beschreibungen:', restore:'Nur gesicherte Einstellungen aus dem Optimierungs-Tab werden wiederhergestellt. Andere Bereiche bleiben unverändert.', empty:'Keine Optimierungs-Sicherungen zum Wiederherstellen vorhanden.', done:'Abgeschlossen', partial:'Nicht vollständig abgeschlossen', applied:'Angewendet', restored:'Wiederhergestellt', active:'Aktiv', failed:'Aktion fehlgeschlagen', refresh:'Status konnte nicht aktualisiert werden.' },
  en: { hint:'Use the switches to activate or deactivate individual tweaks. Start Optimisations applies all available, inactive tweaks after confirmation, including high-risk ones.', select:'Select safe tweaks', confirm:'All the following available settings will be applied. Review their risks and descriptions:', restore:'Only backed-up settings from the Optimisation tab will be restored. Other sections remain unchanged.', empty:'No optimisation backups available to restore.', done:'Completed', partial:'Not fully completed', applied:'Applied', restored:'Restored', active:'Active', failed:'Action failed', refresh:'Could not refresh the current status.' },
  it: { hint:'Usa gli interruttori per attivare o disattivare singole modifiche. Start Optimisations applica tutte quelle disponibili e inattive dopo conferma, incluse quelle rischiose.', select:'Seleziona modifiche sicure', confirm:'Verranno applicate tutte le seguenti impostazioni disponibili. Controlla rischi e descrizioni:', restore:'Verranno ripristinate solo le impostazioni salvate della scheda Ottimizzazione. Le altre sezioni restano invariate.', empty:'Nessun backup di ottimizzazione da ripristinare.', done:'Completato', partial:'Non completato interamente', applied:'Applicato', restored:'Ripristinato', active:'Attivo', failed:'Operazione non riuscita', refresh:'Impossibile aggiornare lo stato attuale.' }
};
// Same Start/Revert All batch for Leistung, Netzwerk, Dienste, Privatsphäre und Oberfläche; only label, ids and texts differ.
const OPT_TABS = { performance: { start:'Start Optimisations', prefix:'opt' }, network: { start:'Start Network', prefix:'net' },
  keyboard: { start:'Tweak Keyboard', prefix:'kbd' }, hitreg: { start:'Hitreg Boost', prefix:'hrb' }, services: { start:'Enable All', prefix:'svc' }, privacy: { start:'Enable All', prefix:'prv' }, visuals: { start:'Enable All', prefix:'vis' } };
const NET_TEXT = {
  de: { hint:'Du kannst Netzwerk-Tweaks einzeln schalten. Start Network wendet nach Bestätigung alle verfügbaren, noch nicht aktiven Netzwerk-Tweaks an – auch riskante. Jede Änderung wird gesichert und lässt sich mit Revert All exakt zurücksetzen.', restore:'Nur gesicherte Einstellungen aus dem Netzwerk-Tab werden wiederhergestellt. Andere Bereiche bleiben unverändert.', empty:'Keine Netzwerk-Sicherungen zum Wiederherstellen vorhanden.' },
  en: { hint:'Use the switches for individual network tweaks. Start Network applies all available, inactive network tweaks after confirmation, including high-risk ones. Every change is backed up and Revert All restores it exactly.', restore:'Only backed-up settings from the Network tab will be restored. Other sections remain unchanged.', empty:'No network backups available to restore.' },
  it: { hint:'Usa gli interruttori per le singole modifiche di rete. Start Network applica dopo conferma tutte quelle disponibili e inattive, anche le rischiose. Ogni modifica viene salvata e Revert All la ripristina esattamente.', restore:'Verranno ripristinate solo le impostazioni salvate della scheda Rete. Le altre sezioni restano invariate.', empty:'Nessun backup di rete da ripristinare.' }
};
const KBD_TEXT = {
  de: { hint:'Du kannst Tastatur- und Maus-Tweaks einzeln schalten. Tweak Keyboard wendet nach Bestätigung alle verfügbaren, noch nicht aktiven an – auch Bedienungshilfen. Jede Änderung wird gesichert; Revert All setzt nur diesen Tab exakt zurück.', restore:'Nur gesicherte Einstellungen aus dem Tastatur-Tab werden wiederhergestellt. Andere Bereiche bleiben unverändert.', empty:'Keine Tastatur-Sicherungen zum Wiederherstellen vorhanden.' },
  en: { hint:'Use the switches for individual keyboard and mouse tweaks. Tweak Keyboard applies all available, inactive ones after confirmation, including accessibility settings. Every change is backed up; Revert All restores only this tab exactly.', restore:'Only backed-up settings from the Keyboard tab will be restored. Other sections remain unchanged.', empty:'No keyboard backups available to restore.' },
  it: { hint:'Usa gli interruttori per le singole modifiche di tastiera e mouse. Tweak Keyboard applica dopo conferma tutte quelle disponibili e inattive, incluse le impostazioni di accessibilità. Ogni modifica viene salvata; Revert All ripristina esattamente solo questa scheda.', restore:'Verranno ripristinate solo le impostazioni salvate della scheda Tastiera. Le altre sezioni restano invariate.', empty:'Nessun backup della tastiera da ripristinare.' }
};
const HRB_TEXT = {
  de: { hint:'Hitreg Boost wendet nach Bestätigung alle verfügbaren, noch nicht aktiven Hitreg-Optimierungen an. Einzeln schaltbar; Revert All setzt sie exakt zurück.', restore:'Nur gesicherte Hitreg-Optimierungen werden wiederhergestellt.', empty:'Keine Hitreg-Sicherungen zum Wiederherstellen vorhanden.' },
  en: { hint:'Hitreg Boost applies all available, inactive hitreg optimizations after confirmation. Each one is switchable; Revert All restores them exactly.', restore:'Only backed-up hitreg optimizations will be restored.', empty:'No hitreg backups available to restore.' },
  it: { hint:'Hitreg Boost applica dopo conferma tutte le ottimizzazioni hitreg disponibili e inattive. Ognuna è attivabile singolarmente; Revert All le ripristina esattamente.', restore:'Verranno ripristinate solo le ottimizzazioni hitreg salvate.', empty:'Nessun backup hitreg da ripristinare.' }
};
const TAB_TEXT = {
  de: { hint:'Enable All wendet nach Bestätigung alle verfügbaren, noch nicht aktiven Tweaks dieses Tabs an – auch riskante. Jede Änderung wird gesichert; Revert All setzt nur diesen Tab exakt zurück.', restore:'Nur gesicherte Einstellungen aus diesem Tab werden wiederhergestellt. Andere Bereiche bleiben unverändert.', empty:'Keine Sicherungen aus diesem Tab zum Wiederherstellen vorhanden.' },
  en: { hint:'Enable All applies all available, inactive tweaks in this tab after confirmation, including high-risk ones. Every change is backed up; Revert All restores only this tab exactly.', restore:'Only backed-up settings from this tab will be restored. Other sections remain unchanged.', empty:'No backups from this tab available to restore.' },
  it: { hint:'Enable All applica dopo conferma tutte le modifiche disponibili e inattive di questa scheda, anche quelle rischiose. Ogni modifica viene salvata; Revert All ripristina esattamente solo questa scheda.', restore:'Verranno ripristinate solo le impostazioni salvate di questa scheda. Le altre sezioni restano invariate.', empty:'Nessun backup di questa scheda da ripristinare.' }
};
const optText = (cat='performance') => ({ ...(OPT_TEXT[state.lang] || OPT_TEXT.en), ...(cat === 'network' ? NET_TEXT[state.lang] || NET_TEXT.en : cat === 'hitreg' ? HRB_TEXT[state.lang] || HRB_TEXT.en : cat === 'keyboard' ? KBD_TEXT[state.lang] || KBD_TEXT.en : cat !== 'performance' ? TAB_TEXT[state.lang] || TAB_TEXT.en : {}) });
// Hitreg Boost zeigt eine kuratierte Liste (eigene hitreg.*-Tweaks plus passende aus anderen Tabs).
const optTweaks = (cat='performance') => (cat === 'hitreg' && typeof hitregTweaks === 'function' ? hitregTweaks() : tweaksIn(cat));
const optSelection = (cat='performance') => optTweaks(cat).filter(x => x.available !== false && !x.applied);
function renderOptimization(cat='performance') {
  const tr=optText(cat), all=optTweaks(cat), tab=OPT_TABS[cat];
  const list=all.filter(x=>state.filter==='on'?x.applied:state.filter==='off'?!x.applied:true);
  const chip=k=>`<button data-filter="${k}" class="${state.filter===k?'active':''}" ${opt.busy?'disabled':''}>${t()[k]}</button>`;
  return `<div class="db-actions"><button class="pill dark opt-go" id="${tab.prefix}-start" ${opt.busy||!optSelection(cat).length?'disabled':''}>${tab.start}</button><button class="pill dark" id="${tab.prefix}-revert" ${opt.busy?'disabled':''}>Revert All</button></div>
    <p class="hint">${esc(opt.busy?t().working:tr.hint)}</p>
    <div class="toolbar"><div class="seg">${chip('all')}${chip('on')}${chip('off')}</div></div>
    <div class="tgrid opt-tweaks" aria-busy="${opt.busy}">${list.map(x=>tweakRow(x,opt.busy)).join('')||`<div class="card empty">${esc(t().empty)}</div>`}</div>
    ${opt.result&&(opt.result.cat||'performance')===cat?`<div class="card db-result" role="status"><strong>${esc(opt.result.ok?tr.done:tr.partial)}</strong>${opt.result.note?`<p>${esc(opt.result.note)}</p>`:''}${opt.result.results.map(x=>`<p>${esc(x.name)}: ${esc(x.error?errorText(x.error):tr[x.status])}</p>`).join('')}</div>`:''}`;
}
async function optRefresh(cat='performance') {
  const res=await call('list');
  if(!res?.ok)throw Error(res?.error||optText(cat).refresh);
  state.tweaks=res.tweaks;
  opt.selected=new Set(optSelection(cat).map(x=>x.id));
}
async function optimizationRun(restore=false,cat='performance') {
  if(opt.busy||state.busy.size||state.db.busy||state.bkBusy||state.safeBusy)return;
  opt.busy=true;opt.result=null;render();
  const results=[];
  try {
    await optRefresh(cat);
    let records, selected;
    if(restore) {
      const list=await call('backup-list');if(!list?.ok)throw Error(list?.error||optText(cat).failed);
      const ids=new Set(optTweaks(cat).map(x=>x.id));
      records=list.backups.filter(b=>b.kind==='tweak'&&ids.has(b.tweakId)&&!['restored','superseded'].includes(b.status)&&!['already_restored','backup_superseded'].includes(b.reason));
      if(!records.length){opt.result={cat,ok:true,results,note:optText(cat).empty};return;}
      selected=records.map(b=>optTweaks(cat).find(x=>x.id===b.tweakId));
    } else {selected=optSelection(cat);if(!selected.length)return;}
    const label=restore?'Revert All':OPT_TABS[cat].start;
    const details=selected.map(x=>restore?x.name:`${x.name} [${t().risk[x.risk]||x.risk}]\n${x.description}`).join('\n\n');
    if(!await confirmDialog(label,`${restore?optText(cat).restore:optText(cat).confirm}\n\n${details}`,label))return;
    for(let i=0;i<selected.length;i++) {
      const tw=selected[i], b=records?.[i];
      if(b&&!b.canRestore){results.push({name:tw.name,error:b.reason||optText(cat).failed});continue;}
      const res=restore?await call('backup-restore',undefined,{backupId:b.backupId}):await call('apply',tw.id);
      const failure=res?.results?.find(x=>x.status==='failed'||x.status==='skipped');
      const error=!res?.ok||failure ? failure?.reason||res?.error||optText(cat).failed : null;
      results.push({name:tw.name,status:restore?'restored':'applied',error});
      if(res?.restartRequired)state.restartPending=true;
      if(!restore&&!error)opt.selected.delete(tw.id);
      // Independent entries still run; every failure remains visible in the result.
    }
    opt.result={cat,ok:!results.some(x=>x.error),results};
  } catch(err) {opt.result={cat,ok:false,results,note:errorText(err.message)};}
  finally {
    try {await optRefresh(cat);} catch(err){opt.result={cat,ok:false,results,note:errorText(err.message)};}
    opt.busy=false;render();
  }
}
// Keep navigation and other mutations from overlapping this batch or its confirmation.
document.addEventListener('click',e=>{
  if(opt.busy&&!e.target.closest('#modal, #win-min, #win-close')){e.preventDefault();e.stopImmediatePropagation();}
},true);
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||opt.busy)return;
  for(const [cat,tab] of Object.entries(OPT_TABS)){
    if(b.id===`${tab.prefix}-start`)optimizationRun(false,cat);
    if(b.id===`${tab.prefix}-revert`)optimizationRun(true,cat);
  }
});
