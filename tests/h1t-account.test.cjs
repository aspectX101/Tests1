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
const {ownUrl,sniffImage,cleanProfile}=require('../app/h1t-account');
test('only own HTTPS hosts are accepted for links and avatars',()=>{
  assert.equal(ownUrl('https://dev.h1tutility.cc/account'),'https://dev.h1tutility.cc/account');
  assert.equal(ownUrl('https://h1tutility.cc/support'),'https://h1tutility.cc/support');
  for(const bad of ['http://dev.h1tutility.cc/a','https://h1tutility.cc.evil.com/','https://evilh1tutility.cc/','javascript:alert(1)',
    'https://user:pw@h1tutility.cc/','https://h1tutility.cc:8443/','file:///C:/x',42,null])assert.equal(ownUrl(bad),null);
});
test('avatar bytes are recognised by signature, never by name',()=>{
  assert.equal(sniffImage(Buffer.from('89504e470d0a1a0a0000','hex')),'image/png');
  assert.equal(sniffImage(Buffer.from('ffd8ffe000104a464946','hex')),'image/jpeg');
  assert.equal(sniffImage(Buffer.from('RIFF0000WEBPVP8 ','latin1')),'image/webp');
  assert.equal(sniffImage(Buffer.from('<svg onload=alert(1)>','latin1')),null);
});
test('profile fields are whitelisted, trimmed and links fall back to the customer area',()=>{
  const p=cleanProfile({user:{display_name:'x'.repeat(80),email:'a@b.c',username:'neo',id:'u1',created_at:'2026-01-02T00:00:00Z',
    avatar_url:'https://evil.example/a.png',password_hash:'secret'},
    licenses:[{id:'l1',plan:'Lifetime',status:'active',max_devices:2,devices_used:1,key_hint:'ABCD',key:'FULL-KEY'},{plan:'no id'}],
    links:{support:'https://dev.h1tutility.cc/support',customer_area:'https://phish.example/'}});
  assert.equal(p.user.display_name.length,50);
  assert.equal(p.user.avatar_url,null);
  assert.equal('password_hash' in p.user,false);
  assert.equal(p.licenses.length,1);
  assert.equal('key' in p.licenses[0],false);
  assert.equal(p.licenses[0].max_devices,2);
  assert.equal(p.links.support,'https://dev.h1tutility.cc/support');
  assert.equal(p.links.customer_area,'https://h1tutility.cc/account');
});
test('a verified device returns profile, avatar data URI and device details to the renderer',async()=>{
  const {app,dir}=tempApp(),client=createH1tAccount(app);const old=global.fetch;
  const png=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),Buffer.alloc(32)]);
  let avatarAuth=null;
  global.fetch=async(url,options)=>{
    if(String(url).endsWith('/avatar.png')){avatarAuth=options.headers.Authorization;
      return {status:200,headers:new Map([['content-type','image/png']]),arrayBuffer:async()=>png};}
    if(options.method==='POST'&&JSON.parse(options.body).action==='login')return json({token:'c'.repeat(64)});
    if(options.method==='POST')return json({verified:true,device:{label:'Gaming PC',bound_at:'2026-10-01T00:00:00Z'}});
    return json({user:{display_name:'Neo',email:'neo@example.com',avatar_url:'https://dev.h1tutility.cc/avatar.png'},entitled:true,
      licenses:[{id:'l1',plan:'Lifetime',expires_at:null}]});
  };
  try{
    // A previously consented session (device binding happened earlier).
    fs.writeFileSync(path.join(dir,'h1t-session.json'),JSON.stringify({v:1,secret:Buffer.from('c'.repeat(64)).toString('base64'),consent:true,diagnostics:{consent:true}}));
    await client.load();
    const platform=Object.getOwnPropertyDescriptor(process,'platform');
    if(process.platform!=='win32')Object.defineProperty(process,'platform',{value:'win32'});
    let s;try{s=await client.refresh(true)}finally{Object.defineProperty(process,'platform',platform)}
    assert.equal(s.status,'active');
    assert.equal(s.authorized,true);
    assert.match(s.user.avatar,/^data:image\/png;base64,/);
    assert.equal(avatarAuth,'Bearer '+'c'.repeat(64));
    assert.equal(s.device.label,'Gaming PC');
    assert.equal(client.link('support'),'https://h1tutility.cc/account#support');
    assert.equal(client.link('../../etc'),null);
    assert.equal(JSON.stringify(s).includes('c'.repeat(64)),false);
  }finally{global.fetch=old;fs.rmSync(dir,{recursive:true,force:true})}
});
