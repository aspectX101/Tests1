'use strict';
const dbText = () => t().debloat;
const DB_GROUPS = ['consumer','xbox','mail-camera','onedrive','ai','widgets','tools','reinstalls'];
const DB_SETTINGS = {onedrive:'debloat.onedrive.block',ai:'debloat.recall.off',widgets:'debloat.widgets.hide',reinstalls:'debloat.suggestions.off'};
function dbSelection() {
  return {apps:(state.db.data?.apps||[]).filter(a=>a.removable&&state.db.selected.has(a.id)),
    settings:state.tweaks.filter(x=>Object.values(DB_SETTINGS).includes(x.id)&&x.available!==false&&!x.applied&&state.db.selected.has(x.id))};
}
function renderDebloat() {
  const d=state.db,tr=dbText(),apps=d.data?.apps||[],selection=dbSelection();
  const cards=DB_GROUPS.map(group=>{
    const members=apps.filter(a=>a.group===group),tw=state.tweaks.find(x=>x.id===DB_SETTINGS[group]);
    const count=members.filter(a=>a.removable&&d.selected.has(a.id)).length+(tw&&d.selected.has(tw.id)?1:0);
    return `<details class="card db-card" data-db-group="${group}" ${d.openGroups?.has(group)?'open':''}>
      <summary><span><strong>${esc(tr.groups[group][0])}</strong><small>${esc(tr.groups[group][1])}</small></span><span class="db-count">${count||'+'}</span></summary>
      <div class="db-options">${members.map(a=>`<label class="db-app"><input type="checkbox" data-debloat-select="${esc(a.id)}" ${d.selected.has(a.id)?'checked':''} ${d.busy||!a.removable?'disabled':''}><span>${esc(a.name)}<small>${a.installed?(a.removable?tr.installed:esc(errorText(a.reason))):tr.absent}</small></span></label>`).join('')}
      ${tw?`<label class="db-app"><input type="checkbox" data-debloat-select="${tw.id}" ${d.selected.has(tw.id)?'checked':''} ${d.busy||tw.available===false||tw.applied?'disabled':''}><span>${esc(tw.name)}<small>${esc(tw.description)}</small><small>${tw.applied?tr.alreadyApplied:tw.available===false?esc(errorText(tw.stateError)):esc(tw.risk)}</small></span></label>`:''}
      ${!d.data?`<p>${tr.unknown}</p>`:''}</div></details>`;
  }).join('');
  return `<div class="db-actions"><button class="pill dark" id="db-start" ${d.busy||!selection.apps.length&&!selection.settings.length?'disabled':''}>${tr.start}</button><button class="pill dark" id="db-revert" ${d.busy?'disabled':''}>Revert All</button></div>
    <div class="db-toolbar"><span>${esc(tr.selectHint)}</span><button class="pill dark" id="db-reload" ${d.busy?'disabled':''}>${tr.refresh}</button></div>
    ${d.error?`<p role="alert">${esc(errorText(d.error))}</p>`:''}
    <details class="card db-startup" ${d.startupOpen?'open':''}><summary>${tr.startup}</summary><p class="row-desc">${esc(tr.startupScope)}</p><button class="pill dark" data-debloat-open="startup-settings">${tr.windowsStartup}</button>
    ${d.startupError?`<p role="alert">${esc(errorText(d.startupError))}</p>`:''}
    ${(d.startup?.entries||[]).map(a=>`<div class="db-app"><span>${esc(a.name)}<small>${a.disabled?tr.disabled:tr.registered}</small></span><button class="pill dark" data-startup-id="${esc(a.id)}" ${d.busy||!a.available?'disabled':''}>${a.managed?tr.restore:tr.disable}</button></div>`).join('')||`<p>${tr.noStartup}</p>`}</details>
    <div class="db-grid" aria-busy="${!!d.busy}">${cards}</div>
    <p class="hint">${esc(tr.notice)}</p>
    ${d.result?`<div class="card db-result" role="status"><strong>${d.result.ok?tr.completed:tr.partial}</strong>${d.result.note?`<p>${esc(d.result.note)}</p>`:''}${(d.result.results||[]).map(x=>`<p>${esc(x.name||apps.find(a=>a.id===x.id)?.name||x.id||'')}: ${x.error?esc(errorText(x.error)):esc(tr[x.status]||x.status)}</p>`).join('')}</div>`:''}`;
}
async function debloatLoad() {
  if(state.db.busy)return;state.db.busy=true;render();
  const [apps,startup,list]=await Promise.all([call('debloat-list'),call('startup-list'),call('list')]);
  state.db.busy=false;state.db.data=apps?.ok?apps:null;state.db.error=apps?.ok?(list?.ok?null:list?.error):apps?.error;
  state.db.startup=startup?.ok?startup:null;state.db.startupError=startup?.ok?null:startup?.error;
  if(list?.ok)state.tweaks=list.tweaks;
  const valid=dbSelection();state.db.selected=new Set([...valid.apps,...valid.settings].map(x=>x.id));
  if(state.route.cat==='debloat')render();
}
async function debloatStart() {
  if(state.db.busy)return;const selected=dbSelection();if(!selected.apps.length&&!selected.settings.length)return;
  state.db.busy=true;render();
  try {
    const ids=selected.apps.map(a=>a.id);
    const preview=ids.length?await call('debloat-preview',undefined,{appIds:ids}):null;
    if(ids.length&&!preview?.ok){toast(errorText(preview?.error),'error');return;}
    const lines=[...(preview?.apps||[]).map(a=>a.name),...selected.settings.map(x=>`${x.name}: ${x.description}`)].join('\n');
    const warning=ids.length?dbText().confirmBody:dbText().settingsConfirm;
    if(!await confirmDialog(dbText().start,`${warning}\n\n${lines}`,dbText().start))return;
    const results=[];let ok=true;
    if(ids.length){const res=await call('debloat-remove',undefined,{appIds:ids,previewToken:preview.previewToken,confirmDataLoss:true});ok=!!res?.ok;results.push(...(res?.results||[{name:dbText().remove,error:res?.error}]));}
    if(ok)for(const tw of selected.settings){const res=await call('apply',tw.id,{confirmDataLoss:tw.id==='debloat.recall.off'});results.push({id:tw.id,name:tw.name,status:'applied',error:res?.ok?null:res?.error});if(res?.restartRequired)state.restartPending=true;if(!res?.ok){ok=false;break;}}
    state.db.result={ok,results,note:ids.length?dbText().reinstallNotice:''};
  } finally {state.db.busy=false;await debloatLoad();}
}
async function debloatRevertAll() {
  if(state.db.busy)return;state.db.busy=true;render();
  try {
    const list=await call('backup-list');if(!list?.ok){toast(errorText(list?.error),'error');return;}
    const relevant=list.backups.filter(b=>b.kind==='startup'||b.kind==='tweak'&&Object.values(DB_SETTINGS).includes(b.tweakId));
    const records=relevant.filter(b=>!['restored','superseded'].includes(b.status)&&!['already_restored','backup_superseded'].includes(b.reason));
    const evidence=list.backups.some(b=>b.kind==='debloat');
    if(!records.length){state.db.result={ok:!evidence,results:[],note:evidence?dbText().revertLimit:dbText().nothingToRestore};return;}
    const names=records.map(b=>state.tweaks.find(x=>x.id===b.tweakId)?.name||dbText().startup);
    if(!await confirmDialog('Revert All',`${dbText().revertConfirm}\n\n${names.join('\n')}`,'Revert All'))return;
    const results=[];
    for(let i=0;i<records.length;i++){
      const b=records[i];
      if(!b.canRestore){results.push({name:names[i],error:b.reason});continue;}
      const res=await call('backup-restore',undefined,{backupId:b.backupId});
      if(res?.restartRequired)state.restartPending=true;
      results.push({name:names[i],status:'restored',error:res?.ok?null:res?.results?.find(x=>x.status==='failed')?.reason||res?.error});
    }
    state.db.result={ok:!results.some(x=>x.error)&&!evidence,results,note:evidence?dbText().revertLimit:dbText().revertScope};
  } finally {state.db.busy=false;await debloatLoad();}
}
async function startupChange(id) {
  if(state.db.busy)return;
  const entry=state.db.startup?.entries?.find(x=>x.id===id);
  if(!entry?.available)return;
  if(!await confirmDialog(entry.name,entry.managed?dbText().restorePrompt:dbText().disablePrompt,entry.managed?dbText().restore:dbText().disable))return;
  state.db.busy=true;render();
  const result=await call(entry.managed?'startup-restore':'startup-disable',id,{previewToken:entry.token});
  if(!result?.ok)toast(errorText(result?.error),'error');
  state.db.busy=false;await debloatLoad();
}

document.addEventListener('change',e=>{const id=e.target.dataset?.debloatSelect;if(!id||state.db.busy)return;if(e.target.checked)state.db.selected.add(id);else state.db.selected.delete(id);render();});
document.addEventListener('toggle',e=>{if(!e.target.isConnected)return;if(e.target.classList?.contains('db-startup'))state.db.startupOpen=e.target.open;const group=e.target.dataset?.dbGroup;if(group){state.db.openGroups??=new Set();if(e.target.open)state.db.openGroups.add(group);else state.db.openGroups.delete(group);}},true);
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='db-reload')debloatLoad();if(b.id==='db-start')debloatStart();if(b.id==='db-revert')debloatRevertAll();if(b.dataset.startupId)startupChange(b.dataset.startupId);if(b.dataset.debloatOpen)bridge.openDebloatTarget(b.dataset.debloatOpen).then(r=>{if(!r?.ok)toast(errorText(r?.error),'error');});});
