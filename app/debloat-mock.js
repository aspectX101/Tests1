(function(root){
  const defs=typeof module!=='undefined'&&module.exports?require('./debloat-catalog'):root.DebloatApps;
  const apps=defs.map(a=>({...a,installed:!a.id.includes('legacy')&&a.id!=='paint3d',removable:!a.id.includes('legacy')&&a.id!=='paint3d',reason:'',packages:[],installerHash:null}));
  const entries=[{id:'1'.repeat(32),name:'Discord',disabled:false,managed:false,available:true,token:'a'.repeat(64)},{id:'2'.repeat(32),name:'Steam',disabled:false,managed:false,available:true,token:'a'.repeat(64)}];
  let revision=1;const previews=new Map();
  function call(req,register){
    const {action,id,appIds,previewToken,confirmDataLoss}=req;
    if(action==='debloat-list')return {ok:true,apps:apps.map(a=>({...a})),scope:'current_user',dataBackup:false};
    if(action==='startup-list')return {ok:true,entries:entries.map(e=>({...e})),scope:'current_user_run_entries'};
    if(action==='startup-disable'||action==='startup-restore'){
      const e=entries.find(e=>e.id===id);if(!e)return {ok:false,error:'invalid_startup_entry'};
      if(action==='startup-disable'){
        if(e.managed||previewToken!==e.token)return {ok:false,error:'debloat_preview_changed'};
        register('startup',id,{id});e.managed=true;e.disabled=true;
      }else {e.managed=false;e.disabled=false;}
      return {ok:true,id,status:e.disabled?'applied':'restored'};
    }
    if(!Array.isArray(appIds)||!appIds.length||new Set(appIds).size!==appIds.length||appIds.some(id=>!apps.some(a=>a.id===id&&a.removable)))return {ok:false,error:'invalid_debloat_selection'};
    const selected=apps.filter(a=>appIds.includes(a.id));
    if(action==='debloat-preview'){
      const token=(revision++).toString(16).padStart(64,'0');previews.set(token,JSON.stringify(appIds));
      return {ok:true,apps:selected.map(a=>({...a})),previewToken:token,dataBackup:false,recovery:'reinstall_only'};
    }
    if(action==='debloat-remove'){
      if(confirmDataLoss!==true)return {ok:false,error:'explicit_debloat_confirmation_required'};
      if(previews.get(previewToken)!==JSON.stringify(appIds))return {ok:false,error:'debloat_preview_changed'};
      previews.delete(previewToken);const record=register('debloat','apps',{apps:selected.map(a=>({...a}))});
      for(const a of selected){a.installed=false;a.removable=false;}
      return {ok:true,status:'removed',backupId:record.backupId,dataBackup:false,recovery:'reinstall_only',results:selected.map(a=>({id:a.id,status:'removed',error:null}))};
    }
    return {ok:false,error:'invalid_action'};
  }
  const api={call,restoreStartup(id){const e=entries.find(e=>e.id===id);if(e){e.disabled=false;e.managed=false;}}};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DebloatMock=api;
})(this);
