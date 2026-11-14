const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function setup(){
 const handlers={};const state={lang:'de',route:{page:'hitreg'},tweaks:[{id:'hitreg.nic.latency',name:'NIC',available:true,applied:false},{id:'network.throttle.off',name:'Throttle',available:true,applied:true},{id:'keyboard.repeat.fast',name:'Repeat',available:true}]};
 const ctx={state,document:{getElementById:()=>null,addEventListener:(name,fn)=>(handlers[name]??=[]).push(fn)},window:{addEventListener:(name,fn)=>(handlers[name]??=[]).push(fn)},render(){},renderOptimization:(c)=>`<div data-batch="${c}"></div>`,icon:()=>'',esc:s=>String(s??'').replaceAll('<','&lt;'),errorText:String,store:{set(){},get(){}},bridge:{},call:async()=>({ok:false})};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/renderer/hitreg.js'),'utf8')+'\nthis.hr=hitreg;this.texts=HITREG_TEXT;this.ids=HITREG_IDS;this.hitregTweaks=hitregTweaks;',ctx);return {ctx,handlers};
}
const res=(o)=>({method:'udp',server:{name:'S'},samples:[],stats:{loss:0,median:25,jitter:2,p95:30,...o}});
test('rating: clean connection is excellent; loss, ping, jitter and spikes lower it with matching tips',()=>{const {ctx}=setup();
 assert.equal(JSON.stringify(ctx.rateHitreg(res({}),null,0)),JSON.stringify({score:'excellent',notes:['all_good']}));
 assert.equal(ctx.rateHitreg(res({loss:5}),null,0).score,'poor');
 assert.equal(ctx.rateHitreg(res({median:90}),null,0).score,'fair');
 assert.equal(ctx.rateHitreg(res({jitter:20}),null,0).score,'poor');
 assert.equal(JSON.stringify(ctx.rateHitreg(res({p95:90}),null,0).notes),JSON.stringify(['spikes']));
 assert.equal(JSON.stringify(ctx.rateHitreg(res({}),{wifi:true,ethernetUp:false},3).notes),JSON.stringify(['wifi','boost']));
 assert.equal(JSON.stringify(ctx.rateHitreg({...res({loss:50}),method:'http'},null,0).notes),JSON.stringify(['all_good']),'loss over HTTP is not meaningful');});
test('Hitreg Boost lists only curated tweaks that exist; page has live test, boost and input test',()=>{const {ctx}=setup();
 assert.equal(ctx.hitregTweaks().map(t=>t.id).join(),'hitreg.nic.latency,network.throttle.off');
 for(const lang of ['de','en','it']){ctx.state.lang=lang;const html=ctx.renderHitreg();assert.match(html,/id="hr-form"/);assert.match(html,/data-batch="hitreg"/);assert.match(html,/id="hitreg-pad"/);assert.doesNotMatch(html,/undefined/);}
 assert.equal(Object.keys(ctx.texts.de).sort().join(),Object.keys(ctx.texts.it).sort().join());});
test('key test ignores repeats, counts releases and simultaneous keys once; only on the Hitreg page',()=>{const {ctx,handlers}=setup();
 ctx.hitregKey('keydown','KeyW');ctx.hitregKey('keydown','KeyW',true);ctx.hitregKey('keydown','KeyA');ctx.hitregKey('keyup','KeyW');ctx.hitregKey('keyup','KeyW');
 assert.equal(ctx.hr.counts.KeyW.down,1);assert.equal(ctx.hr.counts.KeyW.up,1);assert.equal(ctx.hr.peak,2);assert.equal(ctx.hitregKey('keydown','KeyP'),false);ctx.hitregRelease();
 let prevented=0;const e={target:{id:'hitreg-pad'},code:'KeyD',preventDefault(){prevented++;}};handlers.keydown[0](e);assert.equal(prevented,1);
 ctx.state.route={cat:'keyboard'};handlers.keydown[0]({...e,code:'KeyS'});assert.equal(prevented,1);});
