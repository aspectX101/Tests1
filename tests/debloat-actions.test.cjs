const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function setup(confirm=true){
 const calls=[];const state={db:{busy:false,selected:new Set(),data:{apps:[{id:'weather',name:'Weather',removable:true}]},startup:{entries:[]}},tweaks:[{id:'debloat.widgets.hide',name:'Widgets',description:'Hide',applied:false}],route:{cat:'debloat'}};
 const ctx={state,document:{addEventListener(){}},window:{},render(){},toast(){},errorText:x=>x,esc:x=>x,t:()=>({debloat:{confirmBody:'Data loss',start:'Start Debloat',revertConfirm:'Restore',startup:'Startup',revertScope:'Scope'}}),confirmDialog:async()=>confirm,call:async(action,id,extra)=>{calls.push({action,id,extra});if(action==='debloat-preview')return {ok:true,apps:[{name:'Weather'}],previewToken:'a'.repeat(64)};if(action==='debloat-list')return {ok:true,apps:state.db.data.apps};if(action==='startup-list')return {ok:true,entries:state.db.startup.entries};if(action==='list')return {ok:true,tweaks:state.tweaks};if(action==='backup-list')return {ok:true,backups:[{backupId:'1',kind:'tweak',tweakId:'debloat.widgets.hide',canRestore:true},{backupId:'2',kind:'tweak',tweakId:'windows.power.high',canRestore:true},{backupId:'3',kind:'startup',canRestore:true},{backupId:'4',kind:'debloat',canRestore:false},{backupId:'5',kind:'cache',canRestore:true}]};return {ok:true,results:[]};}};
 vm.createContext(ctx);for(const file of ['i18n.js','debloat-i18n.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/renderer',file),'utf8'),ctx);ctx.t=()=>ctx.window.I18N.de;vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/renderer/debloat.js'),'utf8'),ctx);return {ctx,calls,state};
}
test('Start Debloat previews all removable apps and applies settings without selection after consent',async()=>{const {ctx,calls}=setup();await ctx.debloatStart();assert.deepEqual(calls.filter(x=>['debloat-remove','apply'].includes(x.action)).map(x=>x.action),['debloat-remove','apply']);assert.equal(calls.find(x=>x.action==='debloat-remove').extra.confirmDataLoss,true);});
test('canceling Start Debloat performs no mutations',async()=>{const {ctx,calls}=setup(false);await ctx.debloatStart();assert.equal(calls.some(x=>['debloat-remove','apply'].includes(x.action)),false);});
test('Revert All restores only Debloat settings and startup, never other tweaks, apps or cache',async()=>{const {ctx,calls,state}=setup();await ctx.debloatRevertAll();assert.deepEqual(calls.filter(x=>x.action==='backup-restore').map(x=>x.extra.backupId),['1','3']);assert.equal(state.db.result.ok,false);assert.equal(calls.some(x=>x.action==='backup-restore-all'),false);});
test('compact cards have no installation links or immediate tweak switches',()=>{const {ctx}=setup();const html=ctx.renderDebloat();assert.ok(html.includes('id="db-start"')&&html.includes('id="db-revert"'));assert.equal(html.includes('Installationsseite'),false);assert.equal(html.includes('data-debloat-preview'),false);});

test('Start Debloat includes eligible startup entries, excludes protected apps and active settings',async()=>{
 const {ctx,calls,state}=setup();
 state.db.data.apps.push({id:'protected',removable:false});
 state.db.startup.entries=[{id:'run',name:'Run',available:true,disabled:false,managed:false,token:'token'},{id:'off',available:true,disabled:true},{id:'bad',available:false}];
 state.tweaks.push({id:'debloat.recall.off',name:'Recall',description:'Deletes snapshots',available:true,applied:false},{id:'debloat.onedrive.block',applied:true},{id:'debloat.suggestions.off',available:false});
 await ctx.debloatStart();
 assert.equal(calls.find(x=>x.action==='debloat-preview').extra.appIds.join(','),'weather');
 assert.equal(calls.filter(x=>x.action==='startup-disable').map(x=>x.id).join(','),'run');
 assert.equal(calls.find(x=>x.id==='debloat.recall.off'&&x.action==='apply').extra.confirmDataLoss,true);
 assert.equal(calls.filter(x=>x.action==='apply').length,2);
});
test('inventory failure prevents all Debloat mutations',async()=>{
 const {ctx,calls}=setup();const original=ctx.call;
 ctx.call=async(...args)=>args[0]==='startup-list'?{ok:false,error:'offline'}:original(...args);
 await ctx.debloatStart();assert.equal(calls.some(x=>['apply','debloat-remove','startup-disable'].includes(x.action)),false);
 assert.equal(ctx.state.db.busy,false);
});
