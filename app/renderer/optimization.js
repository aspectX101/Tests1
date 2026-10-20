'use strict';
const opt = { selected: new Set(), busy: false, result: null };
const OPT_TEXT = {
  de: { hint:'Tweaks auswählen und anschließend Start Optimisations drücken. Aktive Einstellungen sind markiert.', select:'Sichere auswählen', confirm:'Diese ausgewählten Einstellungen werden angewendet. Beachte die Risiken und Beschreibungen:', restore:'Nur gesicherte Einstellungen aus dem Optimierungs-Tab werden wiederhergestellt. Andere Bereiche bleiben unverändert.', empty:'Keine Optimierungs-Sicherungen zum Wiederherstellen vorhanden.', done:'Abgeschlossen', partial:'Nicht vollständig abgeschlossen', applied:'Angewendet', restored:'Wiederhergestellt', active:'Aktiv', failed:'Aktion fehlgeschlagen', refresh:'Status konnte nicht aktualisiert werden.' },
  en: { hint:'Select tweaks, then press Start Optimisations. Active settings are marked.', select:'Select safe tweaks', confirm:'These selected settings will be applied. Review their risks and descriptions:', restore:'Only backed-up settings from the Optimisation tab will be restored. Other sections remain unchanged.', empty:'No optimisation backups available to restore.', done:'Completed', partial:'Not fully completed', applied:'Applied', restored:'Restored', active:'Active', failed:'Action failed', refresh:'Could not refresh the current status.' },
  it: { hint:'Seleziona le modifiche, poi premi Start Optimisations. Le impostazioni attive sono indicate.', select:'Seleziona modifiche sicure', confirm:'Verranno applicate queste impostazioni. Controlla rischi e descrizioni:', restore:'Verranno ripristinate solo le impostazioni salvate della scheda Ottimizzazione. Le altre sezioni restano invariate.', empty:'Nessun backup di ottimizzazione da ripristinare.', done:'Completato', partial:'Non completato interamente', applied:'Applicato', restored:'Ripristinato', active:'Attivo', failed:'Operazione non riuscita', refresh:'Impossibile aggiornare lo stato attuale.' }
};
const optText = () => OPT_TEXT[state.lang] || OPT_TEXT.en;
const optTweaks = () => tweaksIn('performance');
const optSelection = () => optTweaks().filter(x => opt.selected.has(x.id) && x.available !== false && !x.applied);
function renderOptimization() {
  const tr=optText(), all=optTweaks();
  const list=all.filter(x=>state.filter==='on'?x.applied:state.filter==='off'?!x.applied:true);
  const chip=k=>`<button data-filter="${k}" class="${state.filter===k?'active':''}" ${opt.busy?'disabled':''}>${t()[k]}</button>`;
  return `<div class="db-actions"><button class="pill dark" id="opt-start" ${opt.busy||!optSelection().length?'disabled':''}>Start Optimisations</button><button class="pill dark" id="opt-revert" ${opt.busy?'disabled':''}>Revert All</button></div>
    <p class="hint">${esc(opt.busy?t().working:tr.hint)}</p>
    <div class="toolbar"><div class="seg">${chip('all')}${chip('on')}${chip('off')}</div><button class="pill dark" id="opt-safe" ${opt.busy?'disabled':''}>${esc(tr.select)}</button></div>
    <div class="rows" aria-busy="${opt.busy}">${list.map(x=>`<label class="card row"><span class="row-body"><span class="row-title">${esc(x.name)} <span class="tag${x.risk==='high'?' high':''}">${esc(t().risk[x.risk]||x.risk)}</span>${x.requiresRestart?` <span class="tag">${esc(t().restart)}</span>`:''}${x.applied?` <span class="tag">${esc(tr.active)}</span>`:''}</span><span class="row-desc opt-description">${esc(x.description)}${x.available===false?`<br>${esc(errorText(x.stateError))}`:''}</span></span><input type="checkbox" data-opt-select="${esc(x.id)}" aria-label="${esc(x.name)}" ${x.applied||opt.selected.has(x.id)?'checked':''} ${opt.busy||x.applied||x.available===false?'disabled':''}></label>`).join('')||`<div class="card empty">${esc(t().empty)}</div>`}</div>
    ${opt.result?`<div class="card db-result" role="status"><strong>${esc(opt.result.ok?tr.done:tr.partial)}</strong>${opt.result.note?`<p>${esc(opt.result.note)}</p>`:''}${opt.result.results.map(x=>`<p>${esc(x.name)}: ${esc(x.error?errorText(x.error):tr[x.status])}</p>`).join('')}</div>`:''}`;
}
async function optRefresh() {
  const res=await call('list');
  if(!res?.ok)throw Error(res?.error||optText().refresh);
  state.tweaks=res.tweaks;
  opt.selected=new Set(optSelection().map(x=>x.id));
}
async function optimizationRun(restore=false) {
  if(opt.busy||state.busy.size||state.db.busy||state.bkBusy||state.safeBusy)return;
  opt.busy=true;opt.result=null;render();
  const results=[];
  try {
    await optRefresh();
    let records, selected;
    if(restore) {
      const list=await call('backup-list');if(!list?.ok)throw Error(list?.error||optText().failed);
      const ids=new Set(optTweaks().map(x=>x.id));
      records=list.backups.filter(b=>b.kind==='tweak'&&ids.has(b.tweakId)&&!['restored','superseded'].includes(b.status)&&!['already_restored','backup_superseded'].includes(b.reason));
      if(!records.length){opt.result={ok:true,results,note:optText().empty};return;}
      selected=records.map(b=>optTweaks().find(x=>x.id===b.tweakId));
    } else {selected=optSelection();if(!selected.length)return;}
    const label=restore?'Revert All':'Start Optimisations';
    const details=selected.map(x=>restore?x.name:`${x.name} [${t().risk[x.risk]||x.risk}]\n${x.description}`).join('\n\n');
    if(!await confirmDialog(label,`${restore?optText().restore:optText().confirm}\n\n${details}`,label))return;
    for(let i=0;i<selected.length;i++) {
      const tw=selected[i], b=records?.[i];
      if(b&&!b.canRestore){results.push({name:tw.name,error:b.reason||optText().failed});continue;}
      const res=restore?await call('backup-restore',undefined,{backupId:b.backupId}):await call('apply',tw.id);
      const failure=res?.results?.find(x=>x.status==='failed'||x.status==='skipped');
      const error=!res?.ok||failure ? failure?.reason||res?.error||optText().failed : null;
      results.push({name:tw.name,status:restore?'restored':'applied',error});
      if(res?.restartRequired)state.restartPending=true;
      if(!restore&&!error)opt.selected.delete(tw.id);
      if(error&&!restore)break;
    }
    opt.result={ok:!results.some(x=>x.error),results};
  } catch(err) {opt.result={ok:false,results,note:errorText(err.message)};}
  finally {
    try {await optRefresh();} catch(err){opt.result={ok:false,results,note:errorText(err.message)};}
    opt.busy=false;render();
  }
}
// Keep navigation and other mutations from overlapping this batch or its confirmation.
document.addEventListener('click',e=>{
  if(opt.busy&&!e.target.closest('#modal, #win-min, #win-close')){e.preventDefault();e.stopImmediatePropagation();}
},true);
document.addEventListener('change',e=>{
  const id=e.target.dataset?.optSelect;if(!id||opt.busy)return;
  if(e.target.checked)opt.selected.add(id);else opt.selected.delete(id);render();
});
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||opt.busy)return;
  if(b.id==='opt-start')optimizationRun();
  if(b.id==='opt-revert')optimizationRun(true);
  if(b.id==='opt-safe'){opt.selected=new Set(optTweaks().filter(x=>bulkOk(x)&&!x.applied).map(x=>x.id));render();}
});
