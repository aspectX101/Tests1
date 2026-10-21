'use strict';
const opt = { selected: new Set(), busy: false, result: null };
const OPT_TEXT = {
  de: { hint:'Start Optimisations wendet nach Bestätigung alle verfügbaren, noch nicht aktiven Tweaks dieses Tabs an – auch riskante. Aktive Einstellungen sind markiert.', select:'Sichere auswählen', confirm:'Alle folgenden verfügbaren Einstellungen werden angewendet. Beachte die Risiken und Beschreibungen:', restore:'Nur gesicherte Einstellungen aus dem Optimierungs-Tab werden wiederhergestellt. Andere Bereiche bleiben unverändert.', empty:'Keine Optimierungs-Sicherungen zum Wiederherstellen vorhanden.', done:'Abgeschlossen', partial:'Nicht vollständig abgeschlossen', applied:'Angewendet', restored:'Wiederhergestellt', active:'Aktiv', failed:'Aktion fehlgeschlagen', refresh:'Status konnte nicht aktualisiert werden.' },
  en: { hint:'Start Optimisations applies all available, inactive tweaks in this tab after confirmation, including high-risk tweaks. Active settings are marked.', select:'Select safe tweaks', confirm:'All the following available settings will be applied. Review their risks and descriptions:', restore:'Only backed-up settings from the Optimisation tab will be restored. Other sections remain unchanged.', empty:'No optimisation backups available to restore.', done:'Completed', partial:'Not fully completed', applied:'Applied', restored:'Restored', active:'Active', failed:'Action failed', refresh:'Could not refresh the current status.' },
  it: { hint:'Start Optimisations applica tutte le modifiche disponibili e inattive della scheda dopo conferma, incluse quelle rischiose. Le impostazioni attive sono indicate.', select:'Seleziona modifiche sicure', confirm:'Verranno applicate tutte le seguenti impostazioni disponibili. Controlla rischi e descrizioni:', restore:'Verranno ripristinate solo le impostazioni salvate della scheda Ottimizzazione. Le altre sezioni restano invariate.', empty:'Nessun backup di ottimizzazione da ripristinare.', done:'Completato', partial:'Non completato interamente', applied:'Applicato', restored:'Ripristinato', active:'Attivo', failed:'Operazione non riuscita', refresh:'Impossibile aggiornare lo stato attuale.' }
};
// Same Start/Revert All batch for the Leistung and Netzwerk tabs; only label, ids and texts differ.
const OPT_TABS = { performance: { start:'Start Optimisations', prefix:'opt' }, network: { start:'Start Network', prefix:'net' } };
const NET_TEXT = {
  de: { hint:'Start Network wendet nach Bestätigung alle verfügbaren, noch nicht aktiven Netzwerk-Tweaks an – auch riskante. Jede Änderung wird gesichert und lässt sich mit Revert All exakt zurücksetzen.', restore:'Nur gesicherte Einstellungen aus dem Netzwerk-Tab werden wiederhergestellt. Andere Bereiche bleiben unverändert.', empty:'Keine Netzwerk-Sicherungen zum Wiederherstellen vorhanden.' },
  en: { hint:'Start Network applies all available, inactive network tweaks after confirmation, including high-risk ones. Every change is backed up and Revert All restores it exactly.', restore:'Only backed-up settings from the Network tab will be restored. Other sections remain unchanged.', empty:'No network backups available to restore.' },
  it: { hint:'Start Network applica dopo conferma tutte le modifiche di rete disponibili e inattive, anche quelle rischiose. Ogni modifica viene salvata e Revert All la ripristina esattamente.', restore:'Verranno ripristinate solo le impostazioni salvate della scheda Rete. Le altre sezioni restano invariate.', empty:'Nessun backup di rete da ripristinare.' }
};
const optText = (cat='performance') => ({ ...(OPT_TEXT[state.lang] || OPT_TEXT.en), ...(cat === 'network' ? NET_TEXT[state.lang] || NET_TEXT.en : {}) });
const optTweaks = (cat='performance') => tweaksIn(cat);
const optSelection = (cat='performance') => optTweaks(cat).filter(x => x.available !== false && !x.applied);
function renderOptimization(cat='performance') {
  const tr=optText(cat), all=optTweaks(cat), tab=OPT_TABS[cat];
  const list=all.filter(x=>state.filter==='on'?x.applied:state.filter==='off'?!x.applied:true);
  const chip=k=>`<button data-filter="${k}" class="${state.filter===k?'active':''}" ${opt.busy?'disabled':''}>${t()[k]}</button>`;
  return `<div class="db-actions"><button class="pill dark" id="${tab.prefix}-start" ${opt.busy||!optSelection(cat).length?'disabled':''}>${tab.start}</button><button class="pill dark" id="${tab.prefix}-revert" ${opt.busy?'disabled':''}>Revert All</button></div>
    <p class="hint">${esc(opt.busy?t().working:tr.hint)}</p>
    <div class="toolbar"><div class="seg">${chip('all')}${chip('on')}${chip('off')}</div></div>
    <div class="rows" aria-busy="${opt.busy}">${list.map(x=>`<label class="card row"><span class="row-body"><span class="row-title">${esc(x.name)} <span class="tag${x.risk==='high'?' high':''}">${esc(t().risk[x.risk]||x.risk)}</span>${x.requiresRestart?` <span class="tag">${esc(t().restart)}</span>`:''}${x.applied?` <span class="tag">${esc(tr.active)}</span>`:''}</span><span class="row-desc opt-description">${esc(x.description)}${x.available===false?`<br>${esc(errorText(x.stateError))}`:''}</span></span><input type="checkbox" aria-label="${esc(x.name)}" ${x.applied?'checked':''} disabled></label>`).join('')||`<div class="card empty">${esc(t().empty)}</div>`}</div>
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
  if(b.id==='opt-start')optimizationRun();
  if(b.id==='opt-revert')optimizationRun(true);
  if(b.id==='net-start')optimizationRun(false,'network');
  if(b.id==='net-revert')optimizationRun(true,'network');
});
