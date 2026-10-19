'use strict';
const dbText = () => t().debloat;
const DB_GROUPS = ['consumer','xbox','mail-camera','onedrive','ai','widgets','tools','reinstalls'];
const DB_SETTINGS = {onedrive:'debloat.onedrive.block',ai:'debloat.recall.off',widgets:'debloat.widgets.hide',reinstalls:'debloat.suggestions.off'};
function renderDebloat() {
  const d=state.db, tr=dbText(), apps=d.data?.apps || (window.DebloatApps || []).map(x=>({...x,installed:null,removable:false}));
  const cards=DB_GROUPS.map(group=>{
    const members=apps.filter(a=>a.group===group);
    const tw=state.tweaks.find(x=>x.id===DB_SETTINGS[group]);
    const selected=members.filter(a=>d.selected.has(a.id)&&a.removable);
    return `<section class="card db-card"><h2>${esc(tr.groups[group][0])}</h2><p class="row-desc">${esc(tr.groups[group][1])}</p>
      ${members.map(a=>`<div class="db-app"><label><input type="checkbox" data-debloat-select="${esc(a.id)}" ${d.selected.has(a.id)?'checked':''} ${d.busy||!a.removable?'disabled':''}> <span>${esc(a.name)}<small>${a.installed===null?tr.unknown:a.installed?(a.removable?tr.installed:esc(errorText(a.reason))):tr.absent}</small></span></label><button class="pill dark" data-debloat-open="${esc(a.id)}">${tr.install}</button></div>`).join('')}
      ${members.length?`<button class="pill dark" data-debloat-preview="${group}" ${d.busy||!selected.length?'disabled':''}>${tr.preview} (${selected.length})</button>`:''}
      ${group==='onedrive'?`<button class="pill dark" data-debloat-open="installed-apps">${tr.windowsApps}</button>`:''}
      ${tw?tweakRow(tw):''}
    </section>`;
  }).join('');
  const startup=d.startup?.entries || [];
  return `<div class="card detail-head"><div class="tile-icon">${icon('debloat')}</div><div><h1>Debloat</h1><p>${esc(tr.subtitle)}</p></div><button class="pill dark" id="db-reload" ${d.busy?'disabled':''}>${tr.refresh}</button></div>
    <p class="hint">${esc(tr.notice)}</p>
    ${d.error?`<p role="alert">${esc(errorText(d.error))}</p>`:''}
    <details class="card db-startup" ${d.startupOpen?'open':''}><summary id="db-startup-title">${tr.startup}</summary><p class="row-desc">${esc(tr.startupScope)}</p>
      <button class="pill dark" data-debloat-open="startup-settings">${tr.windowsStartup}</button>
      ${d.startupError?`<p role="alert">${esc(errorText(d.startupError))}</p>`:''}
      ${startup.map(a=>`<div class="db-app"><span>${esc(a.name)}<small>${a.disabled?tr.disabled:tr.registered}</small></span><button class="pill dark" data-startup-id="${esc(a.id)}" ${d.busy||!a.available?'disabled':''}>${a.managed?tr.restore:tr.disable}</button></div>`).join('') || `<p class="row-desc">${tr.noStartup}</p>`}
    </details>
    ${d.result?`<div class="card db-result" role="status"><b>${d.result.ok?tr.removed:tr.partial}</b><p>${tr.reinstallNotice}</p>${(d.result.results||[]).map(x=>`<p>${esc(apps.find(a=>a.id===x.id)?.name||x.id)}: ${x.status==='removed'?tr.removed:esc(errorText(x.error))}</p>`).join('')}</div>`:''}
    <div class="db-grid" aria-busy="${!!d.busy}">${cards}</div>`;
}
async function debloatLoad() {
  if (state.db.busy) return;
  state.db.busy=true; render();
  const [apps,startup]=await Promise.all([call('debloat-list'),call('startup-list')]);
  state.db.busy=false;state.db.data=apps?.ok?apps:null;state.db.error=apps?.ok?null:apps?.error;
  state.db.startup=startup?.ok?startup:null;state.db.startupError=startup?.ok?null:startup?.error;
  state.db.selected=new Set([...state.db.selected].filter(id=>apps?.apps?.some(a=>a.id===id&&a.removable)));
  if(state.route.cat==='debloat') render();
}
async function debloatRemove(group) {
  if(state.db.busy) return;
  const ids=(state.db.data?.apps||[]).filter(a=>a.group===group&&a.removable&&state.db.selected.has(a.id)).map(a=>a.id);
  if(!ids.length) return;
  state.db.busy=true;render();
  try {
    const preview=await call('debloat-preview',undefined,{appIds:ids});
    if(!preview?.ok) {toast(errorText(preview?.error),'error');return;}
    const lines=preview.apps.map(a=>`${a.name}${a.packages?.length?' — '+a.packages.map(p=>p.version).join(', '):''}`).join('\n');
    if(!await confirmDialog(dbText().confirmTitle,`${dbText().confirmBody}\n\n${lines}`,dbText().remove)) return;
    const result=await call('debloat-remove',undefined,{appIds:ids,previewToken:preview.previewToken,confirmDataLoss:true});
    state.db.result=result;
    if(!result?.ok) toast(errorText(result?.error),'error');
    for(const id of ids) state.db.selected.delete(id);
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
document.addEventListener('change',e=>{
  const id=e.target.dataset?.debloatSelect;if(!id)return;
  if(e.target.checked)state.db.selected.add(id);else state.db.selected.delete(id);
  render();
});
document.addEventListener('toggle',e=>{if(e.target.classList?.contains('db-startup'))state.db.startupOpen=e.target.open;},true);
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.id==='db-reload')debloatLoad();
  if(b.dataset.debloatPreview)debloatRemove(b.dataset.debloatPreview);
  if(b.dataset.startupId)startupChange(b.dataset.startupId);
  if(b.dataset.debloatOpen)bridge.openDebloatTarget(b.dataset.debloatOpen).then(r=>{if(!r?.ok)toast(errorText(r?.error),'error');});
});
