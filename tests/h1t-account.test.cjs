'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function(id,parent,isMain) {
  if(id==='electron')return {safeStorage:{
    isEncryptionAvailable:()=>true,
    encryptString:v=>Buffer.from(v,'utf8'),
    decryptString:v=>v.toString('utf8'),
  }};
  return originalLoad.call(this,id,parent,isMain);
};
const {createH1tAccount}=require('../app/h1t-account');
Module._load = originalLoad;
function tempApp(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'h1t-license-test-'));
  return {app:{getPath:()=>dir},dir};
}
const json=(body,status=200)=>({
  status,headers:new Map([['content-type','application/json']]),
  text:async()=>JSON.stringify(body)
});
test('invalid credentials never authorize the app',async()=>{
  const {app,dir}=tempApp(),client=createH1tAccount(app);
  const old=global.fetch;global.fetch=async()=>json({error:'Incorrect credentials'},401);
  try{
    const result=await client.login('guest@example.com','wrong-password');
    assert.equal(result.ok,false);
    assert.equal(await client.checkAccess(),false);
  }finally{global.fetch=old;fs.rmSync(dir,{recursive:true,force:true})}
});
test('a valid login without an active license stays blocked and does not expose a token',async()=>{
  const {app,dir}=tempApp(),client=createH1tAccount(app);
  const token='a'.repeat(64);const old=global.fetch;
  global.fetch=async(_url,options)=>{
    if(options.method==='POST')return json({token,display_name:'Tester',expires_at:Date.now()+600000});
    return json({user:{id:'123',display_name:'Tester',email:'tester@example.com'},
      entitled:false,licenses:[],device_verification_required:true});
  };
  try{
    const result=await client.login('tester@example.com','validpassword');
    assert.equal(result.authorized,false);
    assert.equal(result.status,'license_required');
    assert.equal(JSON.stringify(result).includes(token),false);
    assert.equal(await client.checkAccess(),false);
  }finally{global.fetch=old;fs.rmSync(dir,{recursive:true,force:true})}
});
test('valid license still requires consent before device enrollment',async()=>{
  const {app,dir}=tempApp(),client=createH1tAccount(app);const old=global.fetch;
  global.fetch=async(_url,options)=>{
    if(options.method==='POST')return json({token:'b'.repeat(64),display_name:'Tester'});
    return json({user:{id:'123',display_name:'Tester'},entitled:true,
      licenses:[{id:'cc63ae8c-dfd6-483d-bbd0-ad6bccf15f62',plan:'Lifetime',expires_at:null}]});
  };
  try{
    const result=await client.login('tester@example.com','validpassword');
    assert.equal(result.status,'device_consent_required');
    assert.equal(result.authorized,false);
    assert.equal((await client.bind('cc63ae8c-dfd6-483d-bbd0-ad6bccf15f62',false,'1.0')).ok,false);
  }finally{global.fetch=old;fs.rmSync(dir,{recursive:true,force:true})}
});
test('developer mock stays available without contacting Cloudflare',async()=>{
  const {app,dir}=tempApp(),client=createH1tAccount(app,{bypass:true});
  try{assert.equal(await client.checkAccess(),true);assert.equal((await client.refresh()).demo,true)}
  finally{fs.rmSync(dir,{recursive:true,force:true})}
});
