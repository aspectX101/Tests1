const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const catalog=require('../app/tweak-catalog.js');
function setup(confirm=true){
 const handlers={},applied=[],dialogs=[];
 const state={lang:'de',busy:new Set(),tweaks:catalog.map(t=>({...t,applied:t.id==='windows.gamemode.on'}))};
 const ctx={state,document:{addEventListener:(n,fn)=>(handlers[n]??=[]).push(fn)},esc:s=>String(s??'').replaceAll('<','&lt;').replaceAll('"','&quot;'),errorText:String,
  confirmDialog:async(...a)=>{dialogs.push(a);return confirm;},setTweak:async(id,on)=>{applied.push([id,on]);return true;}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/renderer/gaming.js'),'utf8')+'\nthis.cards=GAMING_CARDS;',ctx);return {ctx,handlers,applied,dialogs};
}
const click=(h,id)=>h.click[0]({target:{closest:()=>({dataset:{gt:id},disabled:false})}});
test('every reference card maps to a real tweak, in the reference order, with texts in all languages',()=>{const {ctx}=setup();
 const opt=fs.readFileSync(path.join(__dirname,'../app/renderer/optimization.js'),'utf8');
 assert.equal(ctx.cards.length,14);
 for(const [id,,texts] of ctx.cards){assert.ok(catalog.some(t=>t.id===id),id);assert.ok(opt.includes(`'${id}'`),'in GAMING_IDS: '+id);for(const l of ['de','en','it'])assert.equal(texts[l].length,2,id+l);}
});
test('cards show icon, title, one-line text and On/Off; full description stays as tooltip',()=>{const {ctx}=setup();
 const html=ctx.renderGamingTweaks();
 assert.equal((html.match(/class="gt-card/g)||[]).length,14);assert.equal((html.match(/<svg/g)||[]).length,14);
 assert.match(html,/data-gt="windows.gamemode.on"[^>]*>On</);assert.match(html,/data-gt="gaming.gpu.hags"[^>]*>Off</);assert.doesNotMatch(html,/undefined/);
});
test('On/Off switches through setTweak; memory integrity asks first',async()=>{
 let s=setup();await click(s.handlers,'gaming.gpu.hags');await click(s.handlers,'windows.gamemode.on');
 assert.equal(JSON.stringify(s.applied),JSON.stringify([['gaming.gpu.hags',true],['windows.gamemode.on',false]]));
 s=setup(false);await click(s.handlers,'gaming.hvci.off');assert.equal(s.dialogs.length,1);assert.equal(s.applied.length,0);
 s=setup(true);await click(s.handlers,'gaming.hvci.off');assert.equal(JSON.stringify(s.applied),JSON.stringify([['gaming.hvci.off',true]]));
});
