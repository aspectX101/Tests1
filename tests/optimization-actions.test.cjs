const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function setup({consent=true,fail=false,conflict=false,refreshFail=false}={}) {
 const calls=[],dialogs=[];
 const tweaks=[{id:'power',category:'performance',name:'Power',description:'Power description',risk:'low',available:true,bulkSafe:true},{id:'high',category:'performance',name:'High',description:'High warning',risk:'high',available:true},{id:'absent',category:'performance',available:false},{id:'active',category:'performance',applied:true},{id:'debloat',category:'debloat'},{id:'gaming',category:'gaming'}];
 for(const x of tweaks){x.name??=x.id;x.description??='Description';x.risk??='low';x.stateError??='unsupported';}
 const state={lang:'de',tweaks,busy:new Set(),db:{},filter:'all'};
 const ctx={state,document:{addEventListener(){}},window:{},render(){},esc:x=>String(x??''),errorText:String,tweaksIn:c=>state.tweaks.filter(x=>x.category===c),bulkOk:x=>x.available!==false&&x.risk==='low'&&x.bulkSafe===true,tweakRow:(tw,locked)=>`<div class="tile2"><input type="checkbox" data-toggle="${tw.id}" ${tw.applied?"checked":""} ${tw.available===false||locked?"disabled":""}></div>`,confirmDialog:async(...args)=>{dialogs.push(args);return consent;},call:async(action,id,extra)=>{
  calls.push({action,id,extra});
  if(action==='list')return refreshFail?{ok:false,error:'offline'}:{ok:true,tweaks};
  if(action==='backup-list')return {ok:true,backups:[{kind:'tweak',tweakId:'power',backupId:'p',canRestore:!conflict,reason:conflict?'conflict':null},{kind:'tweak',tweakId:'high',backupId:'h',canRestore:true},{kind:'tweak',tweakId:'debloat',backupId:'d',canRestore:true},{kind:'tweak',tweakId:'gaming',backupId:'g',canRestore:true},{kind:'cache',tweakId:'power',backupId:'c',canRestore:true},{kind:'startup',backupId:'s',canRestore:true},{kind:'tweak',tweakId:'power',backupId:'old',canRestore:true,status:'superseded'}]};
  return fail?{ok:false,error:'blocked'}:{ok:true,restartRequired:true};
 }};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/renderer/i18n.js'),'utf8'),ctx);ctx.t=()=>ctx.window.I18N[state.lang];
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/renderer/optimization.js'),'utf8')+'\nthis.optState=opt;',ctx);
 // No selection is required for Start Optimisations.
 return {ctx,state,calls,dialogs};
}
test('Start applies all eligible optimisation tweaks without selection with risk descriptions and restart flag',async()=>{const {ctx,calls,dialogs,state}=setup();await ctx.optimizationRun();assert.deepEqual(calls.filter(x=>x.action==='apply').map(x=>x.id),['power','high']);assert.match(dialogs[0][1],/High warning/);assert.equal(state.restartPending,true);assert.equal(ctx.optState.busy,false);});
test('cancel performs no writes',async()=>{const {ctx,calls}=setup({consent:false});await ctx.optimizationRun();await ctx.optimizationRun(true);assert.equal(calls.some(x=>['apply','backup-restore'].includes(x.action)),false);});
test('Revert All only restores current optimisation backups, including changes not selected',async()=>{const {ctx,calls}=setup();ctx.optState.selected.clear();await ctx.optimizationRun(true);assert.deepEqual(calls.filter(x=>x.action==='backup-restore').map(x=>x.extra.backupId),['p','h']);assert.equal(calls.some(x=>x.action==='backup-restore-all'),false);});
test('apply reports failures and continues independent entries',async()=>{const {ctx,calls}=setup({fail:true});await ctx.optimizationRun();assert.equal(calls.filter(x=>x.action==='apply').length,2);assert.equal(ctx.optState.result.ok,false);});
test('restore reports conflict and continues with independent restorable records',async()=>{const {ctx,calls}=setup({conflict:true});await ctx.optimizationRun(true);assert.deepEqual(calls.filter(x=>x.action==='backup-restore').map(x=>x.extra.backupId),['h']);assert.equal(ctx.optState.result.ok,false);});
test('status failure blocks changes and releases busy state',async()=>{const {ctx,calls}=setup({refreshFail:true});await ctx.optimizationRun();assert.equal(calls.some(x=>x.action==='apply'),false);assert.equal(ctx.optState.result.ok,false);assert.equal(ctx.optState.busy,false);});
test('repeated start while busy cannot duplicate requests',async()=>{const {ctx,calls}=setup();ctx.optState.busy=true;await ctx.optimizationRun();assert.equal(calls.length,0);});
test('selection controls and both actions are available in all three languages',()=>{const {ctx,state}=setup();for(const lang of ['de','en','it']){state.lang=lang;const html=ctx.renderOptimization();assert.match(html,/Start Optimisations/);assert.match(html,/Revert All/);assert.doesNotMatch(html,/data-opt-select/);assert.match(html,/data-toggle="power"/);assert.match(html,/data-toggle="active"/);assert.match(html,/class="tgrid opt-tweaks"/);assert.doesNotMatch(html,/undefined/);}});

test('Start Network applies only network tweaks; Revert All restores only network backups',async()=>{
 const {ctx,calls,state,dialogs}=setup();
 state.tweaks.push({id:'net.a',category:'network',name:'Net A',description:'A',risk:'medium',available:true},{id:'net.b',category:'network',name:'Net B',description:'B',risk:'low',available:true,applied:true});
 const html=ctx.renderOptimization('network');assert.match(html,/id="net-start"/);assert.match(html,/Start Network/);assert.match(html,/id="net-revert"/);assert.doesNotMatch(html,/opt-start/);
 await ctx.optimizationRun(false,'network');
 assert.deepEqual(calls.filter(x=>x.action==='apply').map(x=>x.id),['net.a']);assert.equal(dialogs[0][0],'Start Network');
 assert.equal(ctx.optState.result.cat,'network');assert.doesNotMatch(ctx.renderOptimization(),/db-result/);
 calls.length=0;await ctx.optimizationRun(true,'network');
 assert.equal(calls.some(x=>x.action==='backup-restore'),false);assert.match(ctx.optState.result.note,/Netzwerk/);
});

test('Services, Privacy and Interface tabs: Enable All applies only their own tweaks; Revert All stays in the tab',async()=>{
 for(const [cat,prefix] of [['services','svc'],['privacy','prv'],['visuals','vis']]){
  const {ctx,calls,state,dialogs}=setup();
  state.tweaks.push({id:cat+'.a',category:cat,name:'A',description:'A',risk:'high',available:true},{id:cat+'.b',category:cat,name:'B',description:'B',risk:'low',available:true,applied:true});
  for(const lang of ['de','en','it']){state.lang=lang;const html=ctx.renderOptimization(cat);assert.match(html,new RegExp(`id="${prefix}-start"[^>]*>Enable All<`));assert.match(html,new RegExp(`id="${prefix}-revert"`));assert.match(html,/type="checkbox"/);assert.doesNotMatch(html,/undefined/);}
  state.lang='de';
  await ctx.optimizationRun(false,cat);
  assert.deepEqual(calls.filter(x=>x.action==='apply').map(x=>x.id),[cat+'.a']);assert.equal(dialogs[0][0],'Enable All');
  calls.length=0;await ctx.optimizationRun(true,cat);
  assert.equal(calls.some(x=>x.action==='backup-restore'),false);assert.match(ctx.optState.result.note,/diesem Tab/);
 }
});

test('network and other batch tabs expose live per-tweak toggles',()=>{const {ctx,state}=setup();state.tweaks.push({id:'net.on',category:'network',name:'Net',description:'Network',available:true,risk:'low'},{id:'net.off',category:'network',name:'Unavailable',description:'Not supported',available:false,risk:'low'});for(const cat of ['network','services','privacy','visuals']){if(cat!=='network')state.tweaks.push({id:cat+'.test',category:cat,name:cat,description:'Setting',available:true,risk:'low'});const html=ctx.renderOptimization(cat);assert.match(html,/data-toggle=/);assert.doesNotMatch(html,/<label class="card row">/);}const html=ctx.renderOptimization('network');assert.match(html,/data-toggle="net.off"[^>]*disabled/);ctx.optState.busy=true;assert.match(ctx.renderOptimization('network'),/data-toggle="net.on"[^>]*disabled/);});
