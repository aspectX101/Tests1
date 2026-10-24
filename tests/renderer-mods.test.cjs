'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/renderer/app.js'),'utf8');
const between=(a,b)=>{const s=source.indexOf(a),e=source.indexOf(b,s+a.length);assert.ok(s>=0&&e>s);return source.slice(s,e);};
function view() {
  const state={lang:'de',mods:{ok:true,fivemFound:true,root:'C:\\FiveM',gtaRoot:'C:\\GTA',mods:[
    {id:'abcd1234abcd',name:'Graphics <script>alert(1)</script>',category:'graphics',enabled:true,sizeBytes:123456,fileCount:3,targets:['mods\\visuals.rpf','mods\\detail.rpf'],importedUtc:'2026-10-21T10:00:00Z'},
    {id:'abcd1234abce',name:'Sounds',category:'sound',enabled:false,sizeBytes:200,fileCount:1,targets:['gta:x64\\audio\\sfx\\RESIDENT.rpf'],importedUtc:'2026-10-20T10:00:00Z'}
  ]},modsBusy:null,modsError:null,modsTab:'all',modsQuery:'',modsSort:'recent',modsExpanded:new Set()};
  const i18n={modsPage:'FiveM Mods',modsDesc:'Manage library',modsImportFile:'Add file',modsImportFolder:'Add folder',
    modsOpenFolder:'Open folder',modsNoGta:'Not found',modsNoFivem:'Not found',modsLoading:'Loading',modsEmpty:'No mods',
    modsRemove:'Remove',modsSoundHint:'Sound mods',modsFiles:n=>n+' files',modsSkippedHint:'Skipped',
    modsSkipped:n=>n+' skipped',modCats:{graphics:'Graphics',sound:'Sound',weapons:'Weapons',minimap:'Minimap',other:'Other'},
    all:'All',reload:'Reload'};
  const ctx={state,MOD_CATS:['graphics','sound','weapons','minimap','other'],t:()=>i18n,icon:s=>'[icon:'+s+']',renderResolution:()=>'<section>res</section>',
    esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    fmtBytes:n=>String(n)+'B',fmtDate:s=>s,showTarget:s=>String(s).replace(/^gta:/,'GTA V\\\\'),
    errorText:s=>String(s)};
  vm.createContext(ctx);
  vm.runInContext(between('const MOD_UI_TEXT = ','const RES_PRESETS = ')+between('function renderMods() {','function renderResolution() {')+'this.renderMods=renderMods;',ctx);
  return {state,ctx};
}
test('mod library renders stats, categories, safe names, status and correct targets',()=>{
 const {ctx}=view(),html=ctx.renderMods();
 assert.match(html,/data-mod-tab="graphics"/);
 assert.match(html,/data-mod-toggle="abcd1234abcd"/);
 assert.match(html,/data-mod-details="abcd1234abce"/);
 assert.match(html,/2\/2/);
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/);
 assert.match(html,/GTA V/);
});
test('search, categories and sorting respect state without losing cards',()=>{
 const {ctx,state}=view();
 state.modsQuery='sounds';
 assert.match(ctx.renderMods(),/1\/2/);
 assert.doesNotMatch(ctx.renderMods(),/data-mod-toggle="abcd1234abcd"/);
 state.modsQuery='';
 state.modsTab='graphics';
 assert.match(ctx.renderMods(),/data-mod-toggle="abcd1234abcd"/);
 assert.doesNotMatch(ctx.renderMods(),/data-mod-toggle="abcd1234abce"/);
 state.modsExpanded.add('abcd1234abcd');
 assert.match(ctx.renderMods(),/mod-details/);
 assert.match(ctx.renderMods(),/detail.rpf/);
});
test('mod listing refresh preserves last known good mods after API error',async()=>{
 const state={mods:{mods:[{id:'abcd1234abcd'}]},modsBusy:null,modsError:null,route:{page:'mods'}};
 let renders=0;
 const ctx={state,render:()=>{renders++},call:async action=>action==='mods-list'?{ok:false,error:'temporary_issue'}:{ok:true},
   setRes:()=>{}};
 vm.createContext(ctx);
 vm.runInContext(between('async function modsLoad() {','function setRes(res) {')+'this.modsLoad=modsLoad;',ctx);
 await ctx.modsLoad();
 assert.equal(state.mods.mods.length,1);
 assert.equal(state.modsError,'temporary_issue');
 assert.equal(state.modsBusy,null);
 assert.ok(renders>=2);
});
