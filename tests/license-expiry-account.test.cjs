'use strict';
// End to end in the main process: account check -> license expiry guard -> restore through the backend.
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function(id,parent,isMain) {
  if(id==='node:child_process'&&process.platform!=='win32'){
    const real=originalLoad.call(this,id,parent,isMain);
    return {...real,execFileSync:()=>'    MachineGuid    REG_SZ    4c3b2a19-0000-4000-8000-1234567890ab\r\n'};
  }
  if(id==='electron')return {safeStorage:{isEncryptionAvailable:()=>true,encryptString:v=>Buffer.from(v,'utf8'),decryptString:v=>v.toString('utf8')}};
  return originalLoad.call(this,id,parent,isMain);
};
const {createH1tAccount}=require('../app/h1t-account');
const {createLicenseExpiry}=require('../app/license-expiry');
Module._load = originalLoad;
const json=(body,status=200)=>({status,headers:new Map([['content-type','application/json']]),text:async()=>JSON.stringify(body)});

test('when the server stops reporting the license, the tweaker restores its changes',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'h1t-expiry-e2e-'));
  fs.writeFileSync(path.join(dir,'h1t-session.json'),JSON.stringify({v:1,secret:Buffer.from('e'.repeat(64)).toString('base64'),consent:true,diagnostics:{consent:true}}));
  let entitled=true;
  const old=global.fetch;
  global.fetch=async(_url,options)=>{
    if(options.body)return json({verified:true,device_id:'0f8b6a2e-3c1d-4e5f-9a7b-1c2d3e4f5a6b'});
    return entitled?json({user:{display_name:'Neo'},entitled:true,licenses:[{id:'l1',plan:'7 Days',expires_at:new Date(Date.now()+60000).toISOString()}]})
      :json({user:{display_name:'Neo'},entitled:false,licenses:[]});
  };
  const restored=[];
  const backend=async(req)=>{
    if(req.action==='backup-list')return {ok:true,backups:[{backupId:'a'.repeat(32),kind:'tweak',tweakId:'gaming.gpu.hags',canRestore:true}]};
    if(req.action==='backup-restore'){restored.push(req.backupId);return {ok:true,results:[{status:'restored'}]};}
    return {ok:true,hasBackup:false};
  };
  const platform=Object.getOwnPropertyDescriptor(process,'platform');
  if(process.platform!=='win32')Object.defineProperty(process,'platform',{value:'win32'});
  try{
    const account=createH1tAccount({getPath:()=>dir});
    const expiry=createLicenseExpiry({getPath:()=>dir},{backend});
    const seen=[];
    account.onSnapshot((s)=>seen.push(expiry.observe(s)));
    await account.load();await expiry.load();
    assert.equal((await account.refresh(true)).status,'active');
    await Promise.all(seen);
    assert.equal(expiry.state().licensed,true);
    entitled=false;
    assert.equal((await account.refresh(true)).status,'license_required');
    await Promise.all(seen);
    assert.equal(JSON.stringify(restored),JSON.stringify(['a'.repeat(32)]));
    assert.equal(expiry.publicState().result.restored,1);
    assert.equal(await account.checkAccess(),false);
  }finally{Object.defineProperty(process,'platform',platform);global.fetch=old;fs.rmSync(dir,{recursive:true,force:true})}
});
