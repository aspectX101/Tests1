'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function(id,parent,isMain) {
  // Off Windows the MachineGuid lookup is simulated so the device path can still be tested.
  if(id==='node:child_process'&&process.platform!=='win32'){
    const real=originalLoad.call(this,id,parent,isMain);
    return {...real,execFileSync:()=>'    MachineGuid    REG_SZ    4c3b2a19-0000-4000-8000-1234567890ab\r\n'};
  }
  if(id==='electron')return {safeStorage:{
    isEncryptionAvailable:()=>true,
    encryptString:v=>Buffer.from(v,'utf8'),
    decryptString:v=>v.toString('utf8'),
  }};
  return originalLoad.call(this,id,parent,isMain);
};
const {createH1tAccount}=require('../app/h1t-account');
const diagnostics=require('../app/h1t-diagnostics');
Module._load = originalLoad;

const TOKEN='d'.repeat(64), DEVICE='0f8b6a2e-3c1d-4e5f-9a7b-1c2d3e4f5a6b';
const json=(body,status=200)=>({status,headers:new Map([['content-type','application/json']]),text:async()=>JSON.stringify(body)});
function asWindows(fn){
  const desc=Object.getOwnPropertyDescriptor(process,'platform');
  if(process.platform!=='win32')Object.defineProperty(process,'platform',{value:'win32'});
  return Promise.resolve().then(fn).finally(()=>Object.defineProperty(process,'platform',desc));
}
// Signed-in, licensed, consented and verified account against a fake API that records every request.
async function verifiedClient({diagStatus=200,diagBody={ok:true,retention_days:30},collect}={}){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'h1t-diag-test-'));
  fs.writeFileSync(path.join(dir,'h1t-session.json'),JSON.stringify({v:1,secret:Buffer.from(TOKEN).toString('base64'),consent:true}));
  const calls=[];
  const old=global.fetch;
  global.fetch=async(url,options)=>{
    const body=options.body?JSON.parse(options.body):null;
    calls.push({url:String(url),auth:options.headers.Authorization,body});
    if(String(url).endsWith('/api/diagnostics'))return json(diagBody,diagStatus);
    if(body?.action==='verify-device')return json({verified:true,device_id:DEVICE,device:{label:'Windows PC'}});
    return json({user:{display_name:'Neo',email:'neo@example.com'},entitled:true,licenses:[{id:'l1',plan:'Lifetime',expires_at:null}]});
  };
  const client=createH1tAccount({getPath:()=>dir},{collect:collect||(async(v)=>diagnostics.toSystem({
    windows_caption:'Microsoft Windows 11 Pro',windows_build:'26100',cpu:'AMD Ryzen 7 7800X3D 8-Core Processor',
    gpus:['NVIDIA GeForce RTX 4070 SUPER','Microsoft Basic Display Adapter'],ram_bytes:34359738368,
    board_manufacturer:'ASUSTeK COMPUTER INC.',board_product:'TUF GAMING B650-PLUS',tpm:true,secure_boot:null},v))});
  await client.load();
  const done=()=>{global.fetch=old;fs.rmSync(dir,{recursive:true,force:true})};
  return {client,calls,dir,done};
}

test('system object contains only allowlisted fields and never guesses unknown values',()=>{
  const s=diagnostics.toSystem({windows_caption:'Microsoft Windows 10 Home\u0007',windows_build:'19045',cpu:'  Intel(R)  Core(TM) i5-12400F\n',
    gpus:['Microsoft Basic Display Adapter','NVIDIA GeForce GTX 1660','NVIDIA GeForce GTX 1660'],ram_bytes:null,ram_visible_bytes:17044578304,
    board_manufacturer:'To be filled by O.E.M.',board_product:'B660M DS3H',tpm:null,secure_boot:0,serial:'ABC123',user:'dennis',mac:'00:11:22:33:44:55'},'0.9.26');
  assert.deepEqual(Object.keys(s).filter(k=>!diagnostics.SYSTEM_FIELDS.includes(k)),[]);
  assert.equal(s.windows_version,'Windows 10 Home');
  assert.equal(s.cpu_model,'Intel(R) Core(TM) i5-12400F');
  assert.equal(s.gpu_model,'NVIDIA GeForce GTX 1660');
  assert.equal(s.ram_gb,16);
  assert.equal(s.motherboard_model,'B660M DS3H');
  assert.equal('tpm_available' in s,false);
  assert.equal(s.secure_boot_enabled,false);
  assert.equal(JSON.stringify(s).includes('ABC123')||JSON.stringify(s).includes('dennis')||JSON.stringify(s).includes('00:11'),false);
  const empty=diagnostics.toSystem({},'1.0.0');
  assert.equal(JSON.stringify(empty),JSON.stringify({app_version:'1.0.0'}));
  assert.equal(diagnostics.toSystem({windows_build:'26100; rm -rf'},'1').windows_build,undefined);
});

test('the collector script reads model fields only - no serials, MACs, IPs or user names',()=>{
  const script=diagnostics.SCRIPT;
  for(const bad of [/SerialNumber/i,/MACAddress/i,/IPAddress/i,/UserName/i,/\$env:USER/i,/MachineGuid/i,/UUID/i,/IdentifyingNumber/i,/Get-Process/i,/Win32_Product/i])
    assert.equal(bad.test(script),false,String(bad));
  // Each WMI query is limited to explicit columns.
  for(const line of script.split('\n').filter(l=>/Get-CimInstance/.test(l)))assert.match(line,/-Property /);
});

test('the tweaker stays locked until the data-transfer notice is accepted; nothing is sent before',async()=>{
  const {client,calls,done}=await verifiedClient();
  try{
    await asWindows(async()=>{
      const s=await client.refresh(true);
      assert.equal(s.status,'diagnostics_required');
      assert.equal(s.authorized,false);
      assert.equal(s.diagnostics.required,true);
      assert.equal(s.diagnostics.ready,true);
      assert.equal(await client.checkAccess(),false);
      assert.equal((await client.sendDiagnostics()).error,'diagnostics_consent_required');
      assert.equal((await client.acceptDiagnostics()).error,'preview_required');
      // The preview is local only.
      assert.equal((await client.previewDiagnostics('0.9.27')).ok,true);
      assert.equal(await client.autoReport('0.9.27'),null);
    });
    assert.equal(calls.some(c=>c.url.endsWith('/api/diagnostics')),false);
  }finally{done()}
});

test('accepting sends exactly the shown preview with the verified device_id and device proof, then unlocks',async()=>{
  const {client,calls,done}=await verifiedClient();
  try{
    await asWindows(async()=>{
      await client.refresh(true);
      const preview=await client.previewDiagnostics('0.9.27');
      assert.equal(JSON.stringify(preview).includes(TOKEN),false);
      assert.equal(JSON.stringify(preview).includes(DEVICE),false);
      const s=await client.acceptDiagnostics();
      assert.equal(s.ok,true);
      assert.equal(s.send_error,undefined);
      assert.equal(s.status,'active');
      assert.equal(s.authorized,true);
      assert.equal(s.diagnostics.consent,true);
      assert.ok(s.diagnostics.accepted_at>0);
      assert.equal(s.diagnostics.retention_days,30);
      assert.equal(JSON.stringify(s).includes(TOKEN),false);
      assert.equal(await client.checkAccess(),true);
      const verifyProof=calls.find(c=>c.body?.action==='verify-device').body.device_proof;
      const report=calls.filter(c=>c.url==='https://dev.h1tutility.cc/api/diagnostics').pop();
      assert.equal(report.auth,'Bearer '+TOKEN);
      assert.equal(JSON.stringify(Object.keys(report.body)),JSON.stringify(['action','consent','device_id','device_proof','system']));
      assert.equal(report.body.action,'report');
      assert.equal(report.body.consent,true);
      assert.equal(report.body.device_id,DEVICE);
      assert.equal(report.body.device_proof,verifyProof);
      assert.match(report.body.device_proof,/^[0-9a-f]{64}$/);
      assert.equal(JSON.stringify(report.body.system),JSON.stringify(preview.system));
      assert.equal('secure_boot_enabled' in report.body.system,false);
      assert.ok(Buffer.byteLength(JSON.stringify(report.body))<=6000);
      // A preview is used once; a manual report needs a new one.
      assert.equal((await client.sendDiagnostics()).error,'preview_required');
      await client.previewDiagnostics('0.9.27');
      assert.equal((await client.sendDiagnostics()).ok,true);
    });
  }finally{done()}
});

test('withdrawing stops sending and locks the tweaker again',async()=>{
  const {client,calls,done}=await verifiedClient();
  try{
    await asWindows(async()=>{
      await client.previewDiagnostics('1');await client.acceptDiagnostics();
      const before=calls.filter(c=>c.url.endsWith('/api/diagnostics')).length;
      await client.previewDiagnostics('1');
      const s=await client.withdrawDiagnostics();
      assert.equal(s.status,'diagnostics_required');
      assert.equal(s.diagnostics.consent,false);
      assert.equal(await client.checkAccess(),false);
      assert.equal((await client.sendDiagnostics()).error,'diagnostics_consent_required');
      assert.equal(await client.autoReport('2'),null);
      assert.equal(calls.filter(c=>c.url.endsWith('/api/diagnostics')).length,before);
    });
  }finally{done()}
});

test('deleting shared diagnostics posts the own device_id and requires the notice again',async()=>{
  const {client,calls,dir,done}=await verifiedClient();
  try{
    await asWindows(async()=>{
      await client.previewDiagnostics('1');await client.acceptDiagnostics();
      const s=await client.deleteDiagnostics();
      assert.equal(s.ok,true);
      assert.equal(s.status,'diagnostics_required');
      assert.equal(s.diagnostics.consent,false);
      const del=calls.filter(c=>c.url.endsWith('/api/diagnostics')).pop();
      assert.equal(JSON.stringify(del.body),JSON.stringify({action:'delete',device_id:DEVICE}));
      assert.equal(del.auth,'Bearer '+TOKEN);
      assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'h1t-session.json'),'utf8')).diagnostics.consent,false);
    });
  }finally{done()}
});

test('a missing server endpoint is reported as a server problem without locking out an accepted user',async()=>{
  const {client,done}=await verifiedClient({diagStatus:404,diagBody:{error:'API endpoint not found',code:'API_NOT_FOUND'}});
  try{
    await asWindows(async()=>{
      await client.previewDiagnostics('1');
      const s=await client.acceptDiagnostics();
      assert.equal(s.send_error,'diagnostics_unavailable');
      assert.equal(s.send_detail,'API_NOT_FOUND');
      assert.equal(s.authorized,true);
      assert.equal(s.diagnostics.last_sent_at,null);
      assert.equal((await client.deleteDiagnostics()).error,'diagnostics_unavailable');
      assert.equal(await client.checkAccess(),true);
    });
  }finally{done()}
});

test('on start an accepted device re-reports at most weekly or after an app update',async()=>{
  const {client,calls,done}=await verifiedClient();
  const uploads=()=>calls.filter(c=>c.body?.action==='report').length;
  try{
    await asWindows(async()=>{
      await client.previewDiagnostics('0.9.27');await client.acceptDiagnostics();
      assert.equal(uploads(),1);
      assert.equal(await client.autoReport('0.9.27'),null);
      assert.equal(uploads(),1);
      assert.equal(await client.autoReport('0.9.28'),null);
      assert.equal(uploads(),2);
      assert.equal(calls.filter(c=>c.body?.action==='report').pop().body.system.app_version,'0.9.28');
    });
  }finally{done()}
});

test('acceptance survives a restart and is cleared on sign-out',async()=>{
  const {client,dir,done}=await verifiedClient();
  try{
    await asWindows(async()=>{
      await client.previewDiagnostics('1');await client.acceptDiagnostics();
      const again=createH1tAccount({getPath:()=>dir});
      await again.load();
      const s=await again.refresh(true);
      assert.equal(s.status,'active');
      assert.equal(s.diagnostics.consent,true);
      assert.equal((await again.logout()).diagnostics.consent,false);
    });
  }finally{done()}
});

test('Windows collector returns real model data without personal identifiers',{skip:process.platform!=='win32'},async()=>{
  const s=await diagnostics.collectSystem('0.0.0-test');
  assert.deepEqual(Object.keys(s).filter(k=>!diagnostics.SYSTEM_FIELDS.includes(k)),[]);
  assert.equal(typeof s.cpu_model,'string');
  assert.match(s.windows_build,/^\d{4,6}$/);
  assert.ok(Number.isInteger(s.ram_gb)&&s.ram_gb>0);
  const text=JSON.stringify(s).toLowerCase();
  const user=os.userInfo().username.toLowerCase();
  if(user.length>3)assert.equal(text.includes(user),false);
  for(const list of Object.values(os.networkInterfaces()))for(const n of list||[]){
    if(n.mac&&n.mac!=='00:00:00:00:00:00')assert.equal(text.includes(n.mac.toLowerCase()),false);
    if(!n.internal)assert.equal(text.includes(n.address.toLowerCase()),false);
  }
  assert.ok(Buffer.byteLength(JSON.stringify(s))<1000);
  console.log('collected on Windows:',JSON.stringify(s));
});
