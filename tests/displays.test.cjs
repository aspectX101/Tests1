'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {createBackendClient}=require('../electron/backend.cjs');
test('main process forwards display fields through its authenticated IPC boundary',async()=>{
 let handler,received;
 const source=fs.readFileSync('app/main.js','utf8');
 const start=source.indexOf("ipcMain.handle('tweaker:call'");
 const end=source.indexOf('\n});',start)+4;
 const context=vm.createContext({ipcMain:{handle(name,fn){handler=fn;}},trusted:()=>true,h1tAccount:{checkAccess:async()=>true},LANGS:new Set(['de']),currentLang:'de',backend:async request=>{received=request;return {ok:true};}});
 vm.runInContext(source.slice(start,end),context);
 const layout=[{id:'\\\\.\\DISPLAY1',x:0,y:0}];
 assert.equal((await handler({}, {action:'display-layout',lang:'de',layout,extra:'hags-on'})).ok,true);
 assert.equal(received.layout,layout);assert.equal(received.extra,'hags-on');
 context.h1tAccount.checkAccess=async()=>false;
 received=null;assert.equal((await handler({}, {action:'display-max'})).error,'license_required');assert.equal(received,null);
});
test('display bridge passes only validated display positions as literal JSON',async()=>{
 let calls=0;
 const client=createBackendClient({isPackaged:false},{windowsRoot:'C:\\Windows',execFile(exe,args,options,done){
  calls++;assert.equal(options.shell,false);
  const layout=JSON.parse(Buffer.from(args[args.indexOf('-LayoutBase64')+1],'base64').toString('utf8'));
  assert.deepEqual(layout,[{id:'\\\\.\\DISPLAY1',x:-1920,y:0}]);done(null,'{"ok":true}','');
 }});
 await client({action:'display-layout',layout:[{id:'\\\\.\\DISPLAY1',x:-1920,y:0,ignored:'drop'}]});
 for(const layout of [[],[{id:'other',x:0,y:0}],[{id:'\\\\.\\DISPLAY1',x:0.2,y:0}],[{id:'\\\\.\\DISPLAY1',x:40000,y:0}],[{id:'\\\\.\\DISPLAY1',x:0,y:0},{id:'\\\\.\\DISPLAY1',x:1,y:0}]])await assert.rejects(client({action:'display-layout',layout}),/display_layout_invalid/);
 await assert.rejects(client({action:'display-extra',extra:'execute-anything'}),/display_extra_unsupported/);
 assert.equal(calls,1);
});
test('monitor drag snapping retains touching edges, portrait sizes and negative coordinates',()=>{
 const context=vm.createContext({document:{addEventListener(){}}});
 vm.runInContext(fs.readFileSync('app/renderer/displays.js','utf8'),context);
 const a={x:0,y:0,width:1920,height:1080},b={x:-1092,y:6,width:1080,height:1920};
 context.displaySnap(b,[a,b],25);assert.equal(b.x,-1080);assert.equal(b.y,0);
 const c={x:1934,y:0,width:2560,height:1440};context.displaySnap(c,[a,c],25);assert.equal(c.x,1920);
});
test('portable app ships the native display adapter and its PowerShell dispatcher',()=>{
 const files=require('../packaging/electron-builder.cjs').extraResources[0].filter;
 assert.ok(files.includes('native/Displays.cs'));assert.ok(files.includes('Displays.ps1'));
});
test('real Windows adapter reads monitors and refuses overlapping layouts without applying them',{skip:process.platform!=='win32'||process.env.RUN_DISPLAY_INTEGRATION!=='1'},async t=>{
 const client=createBackendClient({isPackaged:false});
 const before=await client({action:'display-list'});
 assert.equal(before.ok,true);assert.ok(before.displays.length);
 for(const monitor of before.displays){assert.ok(monitor.width>0);assert.ok(monitor.maxHz>=monitor.hz);}
 if(before.displays.length<2){t.diagnostic('Single display: overlap check skipped');return;}
 const rejected=await client({action:'display-layout',layout:before.displays.map(x=>({id:x.id,x:0,y:0}))});
 assert.equal(rejected.ok,false);assert.equal(rejected.error,'display_layout_overlap');
 const after=await client({action:'display-list'});assert.deepEqual(after.displays,before.displays);
});
test('display page renders truthful preferences and hardware limitations in every language',()=>{
 const context=vm.createContext({document:{addEventListener(){}},state:{lang:'de',mode:'powershell'},esc:x=>String(x),t:()=>({working:'loading'})});
 vm.runInContext(fs.readFileSync('app/renderer/displays.js','utf8'),context);
 vm.runInContext('displayState.data={displays:[],mpoOff:true,mpoCanRestore:false,hagsPreference:"default",hagsConfigurable:true,hagsCanRestore:true}',context);
 for(const lang of ['de','en','it']){
  context.state.lang=lang;const html=context.renderDisplays();assert.match(html,/data-display="hags"/);assert.match(html,/data-display="hags-restore"/);assert.match(html,/data-display="mpo" disabled/);assert.match(html,/Auto HDR/);
 }
 context.state.mode='mock';assert.doesNotMatch(context.renderDisplays(),/data-display="max"/);
});

test('display page never uses Get-ItemPropertyValue (throws on a missing value in Windows PowerShell 5.1)',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'..','Displays.ps1'),'utf8');
 assert.doesNotMatch(src,/^[^#\r\n]*Get-ItemPropertyValue/m); // comments may mention it
 assert.match(src,/\$mpo=Get-DisplayRegistryValue 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\Dwm' 'OverlayTestMode'/);
});

test('Windows PowerShell: missing display registry values read as not set instead of failing',{skip:process.platform!=='win32'},()=>{
 const {execFileSync}=require('node:child_process'),path=require('node:path');
 const script=`. '${path.join(__dirname,'..','Displays.ps1').replace(/'/g,"''")}'; $ErrorActionPreference='Stop'
$missing=Get-DisplayRegistryValue 'HKEY_CURRENT_USER\\Software\\H1T-Test-Missing-Key' 'OverlayTestMode'
$noValue=Get-DisplayRegistryValue 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion' 'H1T-No-Such-Value'
$present=Get-DisplayRegistryValue 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion' 'CurrentBuild'
"missing=$($null -eq $missing) novalue=$($null -eq $noValue) present=$([bool]$present)"`;
 const out=execFileSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',script],{encoding:'utf8',windowsHide:true,timeout:60000}).trim();
 assert.equal(out,'missing=True novalue=True present=True');
});
