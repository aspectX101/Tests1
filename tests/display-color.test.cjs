'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {PassThrough} = require('node:stream');
const path = require('node:path');
const {createDisplayColor, cleanLook} = require('../app/display-color');
function setup(platform='win32', stored=null){
  const files={}, launches=[], lines=[];let kills=0;
  if(stored)files[path.join('/u','color-look.json')]=stored;
  const fs={readFile:async f=>{if(!(f in files))throw Error('missing');return files[f];},writeFile:async(f,d)=>{files[f]=d;},rm:async f=>{delete files[f];}};
  const app={isPackaged:false,getPath:()=>'/u'};
  let child;
  const spawn=(exe,args,options)=>{launches.push({exe,args,options});child=new EventEmitter();child.stdout=new PassThrough();child.stdin={write:l=>lines.push(l),end(){}};child.kill=()=>{kills++;};return child;};
  const svc=createDisplayColor(app,{platform,spawn,fs});
  return {svc,files,launches,lines,child:()=>child,kills:()=>kills};
}
const f=k=>path.join('/u','color-look.json');
test('only four integers 0-100 are accepted', () => {
  assert.deepEqual(cleanLook({brightness:0,contrast:100,vibrance:53,hue:7}),{brightness:0,contrast:100,vibrance:53,hue:7});
  for(const bad of [null,{},{brightness:101,contrast:0,vibrance:0,hue:0},{brightness:-1,contrast:0,vibrance:0,hue:0},{brightness:1.5,contrast:0,vibrance:0,hue:0},{brightness:'5',contrast:0,vibrance:0,hue:0}])assert.equal(cleanLook(bad),null);
});
test('live changes start one helper and send plain numbers; neutral look ends the helper', () => {
  const {svc,launches,lines,kills}=setup();
  assert.equal(svc.set({brightness:0,contrast:0,vibrance:53,hue:0}).ok,true);
  svc.set({brightness:10,contrast:0,vibrance:53,hue:0});
  assert.equal(launches.length,1);assert.equal(launches[0].options.shell,false);assert.match(launches[0].args.at(-1),/display-color\.ps1$/);
  assert.deepEqual(lines,['0 0 53 0\n','10 0 53 0\n']);
  assert.equal(svc.set({brightness:'x'}).ok,false);
  svc.set({brightness:0,contrast:0,vibrance:0,hue:0});assert.equal(kills(),1);
});
test('save persists, restore re-applies on start, reset clears both', async () => {
  const s=setup();
  assert.equal((await s.svc.save({brightness:0,contrast:5,vibrance:53,hue:0})).ok,true);
  assert.deepEqual(JSON.parse(s.files[f()]),{brightness:0,contrast:5,vibrance:53,hue:0});
  const r=setup('win32',s.files[f()]);await r.svc.restore();
  assert.deepEqual(r.lines,['0 5 53 0\n']);assert.deepEqual(r.svc.getState().saved,{brightness:0,contrast:5,vibrance:53,hue:0});
  assert.equal((await r.svc.reset()).ok,true);assert.equal(f() in r.files,false);assert.equal(r.kills(),1);assert.deepEqual(r.svc.getState().look,{brightness:0,contrast:0,vibrance:0,hue:0});
});
test('helper refusal or crash is reported as unavailable; other systems are unsupported', () => {
  const s=setup();const states=[];s.svc.onChange(v=>states.push(v.status));
  s.svc.set({brightness:0,contrast:0,vibrance:50,hue:0});
  s.child().stdout.write('{"ok":false,"error":"color_unavailable"}\n');assert.equal(s.svc.getState().status,'unavailable');
  const m=setup('darwin');assert.equal(m.svc.set({brightness:0,contrast:0,vibrance:50,hue:0}).ok,false);assert.equal(m.launches.length,0);assert.equal(m.svc.getState().status,'unsupported');
});
test('Windows PowerShell: color helper compiles, keeps grey neutral and answers every line', {skip:process.platform!=='win32',timeout:60000}, () => {
  const {execFileSync}=require('node:child_process');
  const script=path.join(__dirname,'..','app','display-color.ps1');
  const check=execFileSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',
    `. '${script}' -SelfTest; $m=[Tweaker.Native.ScreenColor]::Matrix(0,0,0,0); $i=[Tweaker.Native.ScreenColor]::Matrix(40,30,100,60); 'identity=' + (($m[0] -eq 1) -and ($m[6] -eq 1) -and ($m[12] -eq 1) -and ($m[1] -eq 0) -and ($m[20] -eq 0)); 'grey=' + [math]::Round($i[0]+$i[5]+$i[10] - ($i[1]+$i[6]+$i[11]),4)`],{encoding:'utf8',timeout:40000,windowsHide:true});
  console.log(check);assert.match(check,/identity=True/);assert.match(check,/grey=0\b/);
  const run=require('node:child_process').spawnSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script],{input:'0 0 50 0\nbad\n0 0 0 0\n',encoding:'utf8',timeout:40000,windowsHide:true});
  const out=String(run.stdout||'').trim().split(/\r?\n/).filter(Boolean).map(l=>JSON.parse(l));
  console.log(JSON.stringify(out));
  // Either the session allows the color matrix (ready + one answer per line) or Windows refuses it cleanly.
  if(out[0].ok){assert.equal(out.length,4);assert.equal(out[2].error,'invalid_color_value');}
  else assert.equal(out[0].error,'color_unavailable');
});
