'use strict';
// H1T.CC Cloudflare desktop authentication. Token never reaches renderer.
const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { safeStorage } = require('electron');
const API = 'https://dev.h1tutility.cc/api/desktop';
const MAX_AGE = 120000;

function createH1tAccount(app,{bypass=false}={}) {
  const file=path.join(app.getPath('userData'),'h1t-session.json');
  let token=null,consent=false,cache=null,checkedAt=0,rev=0;
  async function req(method,body) {
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
    try {
      const response=await fetch(API,{
        method,headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{}),
          ...(token?{Authorization:'Bearer '+token}:{})},
        ...(body?{body:JSON.stringify(body)}:{}),
        signal:abort.signal,redirect:'error',cache:'no-store'
      });
      if(!(response.headers.get('content-type')||'').includes('application/json'))throw Error('invalid_server_response');
      const text=await response.text();if(text.length>65536)throw Error('invalid_server_response');
      const data=JSON.parse(text);return {code:response.status,data};
    } catch(e) {throw Error(e.name==='AbortError'?'connection_timeout':'connection_unavailable')}
    finally {clearTimeout(timer)}
  }
  async function save() {
    if(!token) {await fs.rm(file,{force:true}).catch(()=>{});return;}
    if(!safeStorage.isEncryptionAvailable())return;
    await fs.mkdir(path.dirname(file),{recursive:true});
    await fs.writeFile(file,JSON.stringify({v:1,secret:safeStorage.encryptString(token).toString('base64'),consent}),{mode:0o600});
  }
  async function load() {
    if(!safeStorage.isEncryptionAvailable())return;
    try {
      const obj=JSON.parse(await fs.readFile(file,'utf8'));
      const value=safeStorage.decryptString(Buffer.from(obj.secret,'base64'));
      if(obj.v===1&&/^[0-9a-f]{64}$/.test(value)){token=value;consent=obj.consent===true;}
    }catch{}
  }
  function proof() {
    if(process.platform!=='win32')throw Error('windows_device_required');
    let result;try{
      result=execFileSync('reg.exe',['query','HKLM\\SOFTWARE\\Microsoft\\Cryptography','/v','MachineGuid'],
        {encoding:'utf8',timeout:3000,windowsHide:true,maxBuffer:4096});
    }catch{throw Error('device_id_unavailable')}
    const raw=result.match(/MachineGuid\s+REG_SZ\s+(\S+)/i)?.[1];
    if(!raw||raw.length>128)throw Error('device_id_unavailable');
    // Only a one-way digest crosses the network, after explicit consent.
    return crypto.createHash('sha256').update('H1T.CC device binding v1\n'+raw.toLowerCase()).digest('hex');
  }
  function snapshot(){
    if(bypass)return {ok:true,authorized:true,signed_in:true,status:'development',demo:true};
    return {ok:true,authorized:cache?.authorized===true,signed_in:!!token,consent,
      status:cache?.status||(token?'checking':'signed_out'),...(cache?.profile||{})};
  }
  async function refresh(force=false){
    if(bypass)return snapshot();
    if(!token)return snapshot();
    if(!force&&cache&&Date.now()-checkedAt<MAX_AGE)return snapshot();
    const generation=rev;
    try{
      const r=await req('GET');
      if(generation!==rev)return snapshot();
      if(r.code===401){token=null;consent=false;cache=null;checkedAt=0;rev++;await save();return snapshot();}
      if(r.code!==200)throw Error('server_rejected');
      const profile={
        user:r.data.user?{display_name:String(r.data.user.display_name||'').slice(0,50),email:String(r.data.user.email||'').slice(0,200)}:null,
        licenses:Array.isArray(r.data.licenses)?r.data.licenses.filter(l=>typeof l.id==='string').map(l=>({
          id:l.id,plan:String(l.plan||'').slice(0,60),expires_at:l.expires_at??null
        })):[]
      };
      if(!r.data.entitled||!profile.licenses.length)cache={authorized:false,status:'license_required',profile};
      else if(!consent)cache={authorized:false,status:'device_consent_required',profile};
      else {
        const deviceProof=proof();let verified=false;
        for(const license of profile.licenses){
          const v=await req('POST',{action:'verify-device',license_id:license.id,device_proof:deviceProof});
          if(generation!==rev)return snapshot();
          if(v.code===200&&v.data.verified===true){verified=true;break;}
        }
        cache={authorized:verified,status:verified?'active':'device_unbound',profile};
      }
      checkedAt=Date.now();
    }catch(e){cache={authorized:false,status:e.message||'connection_unavailable',profile:cache?.profile};checkedAt=0;}
    return snapshot();
  }
  async function login(email,password){
    if(bypass)return snapshot();
    if(typeof email!=='string'||typeof password!=='string'||email.length>190||password.length>128||!email||!password)
      return {ok:false,error:'invalid_credentials'};
    try{
      const r=await req('POST',{action:'login',email,password});
      if(r.code!==200||!/^[0-9a-f]{64}$/.test(r.data?.token||''))
        return {ok:false,error:r.code===429?'rate_limited':'invalid_credentials'};
      token=r.data.token;consent=false;cache=null;checkedAt=0;rev++;await save();
      return refresh(true);
    }catch(e){return {ok:false,error:e.message}}
  }
  async function bind(license_id,approved,version){
    if(bypass)return snapshot();
    if(!token||approved!==true)return {ok:false,error:'consent_required'};
    const status=await refresh(true);
    if(!status.licenses?.some(l=>l.id===license_id))return {ok:false,error:'license_required'};
    try{
      const r=await req('POST',{action:'bind-device',license_id,device_proof:proof(),
        consent:true,label:'Windows PC',app_version:String(version||'').slice(0,30)});
      if(r.code!==200||r.data.verified!==true)return {ok:false,error:r.data.error||'device_bind_denied'};
      consent=true;cache=null;checkedAt=0;await save();return refresh(true);
    }catch(e){return {ok:false,error:e.message}}
  }
  async function logout(){
    if(!bypass&&token)await req('POST',{action:'logout'}).catch(()=>{});
    token=null;consent=false;cache=null;checkedAt=0;rev++;await save();return snapshot();
  }
  function hasAccess(){return bypass||(cache?.authorized===true&&Date.now()-checkedAt<MAX_AGE)}
  async function checkAccess(){return bypass||(await refresh()).authorized===true}
  return {load,login,bind,refresh,logout,hasAccess,checkAccess};
}
module.exports={createH1tAccount};
