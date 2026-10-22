'use strict';
// H1T.CC Cloudflare desktop authentication. Token never reaches renderer.
const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { safeStorage } = require('electron');
const diagnostics = require('./h1t-diagnostics');
const API = 'https://dev.h1tutility.cc/api/desktop';
const SITE = 'https://dev.h1tutility.cc';
const DIAG_API = 'https://dev.h1tutility.cc/api/diagnostics';
const MAX_AGE = 120000;
const PREVIEW_MAX_AGE = 10 * 60000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = (v) => typeof v === 'string' && UUID.test(v) ? v.toLowerCase() : null;
const AVATAR_MAX = 512 * 1024;
// Fallbacks until the desktop API delivers `links.*` (see docs/h1t-account.md).
const DEFAULT_LINKS = { customer_area: SITE + '/account', licenses: SITE + '/account#licenses', support: SITE + '/account#support' };
const str = (v, n) => (typeof v === 'string' || typeof v === 'number') ? String(v).slice(0, n) : '';
const num = (v) => Number.isFinite(v) && v >= 0 && v < 1e6 ? Math.floor(v) : null;
const date = (v) => (typeof v === 'string' && v.length < 40 && !Number.isNaN(Date.parse(v))) || (Number.isFinite(v) && v > 0) ? v : null;
// Only our own HTTPS hosts may be opened or fetched from the main process.
function ownUrl(v) {
  if (typeof v !== 'string' || v.length > 500) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    return u.hostname === 'h1tutility.cc' || u.hostname.endsWith('.h1tutility.cc') ? u.href : null;
  } catch { return null; }
}
// Image type from the first bytes, not from the server's header.
function sniffImage(buf) {
  if (buf.length > 8 && buf[0] === 0x89 && buf.toString('latin1', 1, 4) === 'PNG') return 'image/png';
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.length > 6 && /^GIF8[79]a$/.test(buf.toString('latin1', 0, 6))) return 'image/gif';
  return null;
}
function cleanProfile(d) {
  const u = d.user && typeof d.user === 'object' ? d.user : null;
  const links = {};
  for (const k of Object.keys(DEFAULT_LINKS)) links[k] = ownUrl(d.links?.[k]) || DEFAULT_LINKS[k];
  return {
    user: u ? {
      display_name: str(u.display_name, 50), email: str(u.email, 200), username: str(u.username, 50),
      id: str(u.id, 64), created_at: date(u.created_at), avatar_url: ownUrl(u.avatar_url),
    } : null,
    licenses: Array.isArray(d.licenses) ? d.licenses.filter((l) => l && typeof l.id === 'string').slice(0, 50).map((l) => ({
      id: l.id.slice(0, 64), plan: str(l.plan, 60), expires_at: l.expires_at ?? null,
      status: str(l.status, 30), key_hint: str(l.key_hint, 12),
      max_devices: num(l.max_devices), devices_used: num(l.devices_used),
    })) : [],
    links,
  };
}

function createH1tAccount(app,{bypass=false,collect=diagnostics.collectSystem}={}) {
  const file=path.join(app.getPath('userData'),'h1t-session.json');
  let token=null,consent=false,cache=null,checkedAt=0,rev=0,avatar={url:null,data:null};
  // Voluntary diagnostics: separate opt-in (default off), the verified device_id from bind/verify,
  // and the last previewed report, which is the only thing that may be sent.
  let deviceId=null,pending=null;
  const DIAG_OFF={consent:false,last_sent_at:null,retention_days:null};
  let diag={...DIAG_OFF};
  async function req(method,body,url=API) {
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
    try {
      const response=await fetch(url,{
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
    await fs.writeFile(file,JSON.stringify({v:1,secret:safeStorage.encryptString(token).toString('base64'),consent,diagnostics:diag}),{mode:0o600});
  }
  async function load() {
    if(!safeStorage.isEncryptionAvailable())return;
    try {
      const obj=JSON.parse(await fs.readFile(file,'utf8'));
      const value=safeStorage.decryptString(Buffer.from(obj.secret,'base64'));
      if(obj.v===1&&/^[0-9a-f]{64}$/.test(value)){
        token=value;consent=obj.consent===true;
        const d=obj.diagnostics||{};
        diag={consent:d.consent===true,last_sent_at:Number.isFinite(d.last_sent_at)?d.last_sent_at:null,
          retention_days:Number.isInteger(d.retention_days)?d.retention_days:null};
      }
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
  // Avatars are fetched here and handed to the renderer as a data URI (CSP: img-src 'self' data:).
  async function loadAvatar(url){
    if(!url){avatar={url:null,data:null};return;}
    if(avatar.url===url)return;
    avatar={url,data:null};
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),8000);
    try{
      const sameHost=new URL(url).host===new URL(API).host;
      const r=await fetch(url,{headers:{Accept:'image/png,image/jpeg,image/webp,image/gif',...(sameHost&&token?{Authorization:'Bearer '+token}:{})},
        signal:abort.signal,redirect:'error',cache:'no-store'});
      if(r.status!==200||Number(r.headers.get('content-length')||0)>AVATAR_MAX)return;
      const buf=Buffer.from(await r.arrayBuffer());
      const type=buf.length<=AVATAR_MAX&&sniffImage(buf);
      if(type&&avatar.url===url)avatar.data='data:'+type+';base64,'+buf.toString('base64');
    }catch{}finally{clearTimeout(timer)}
  }
  function snapshot(){
    if(bypass)return {ok:true,authorized:true,signed_in:true,status:'development',demo:true,links:{...DEFAULT_LINKS},
      diagnostics:{...DIAG_OFF,ready:false,pending:false}};
    const profile=cache?.profile||{};
    const user=profile.user?{...profile.user,avatar:avatar.url&&avatar.url===profile.user.avatar_url?avatar.data:null}:profile.user;
    return {ok:true,authorized:cache?.authorized===true,signed_in:!!token,consent,
      status:cache?.status||(token?'checking':'signed_out'),checked_at:checkedAt||null,
      ...profile,...(profile.user!==undefined?{user}:{}),links:profile.links||{...DEFAULT_LINKS},
      diagnostics:{...diag,ready:cache?.authorized===true&&!!deviceId,pending:!!pending}};
  }
  async function refresh(force=false){
    if(bypass)return snapshot();
    if(!token)return snapshot();
    if(!force&&cache&&Date.now()-checkedAt<MAX_AGE)return snapshot();
    const generation=rev;
    try{
      const r=await req('GET');
      if(generation!==rev)return snapshot();
      if(r.code===401){forget();await save();return snapshot();}
      if(r.code!==200)throw Error('server_rejected');
      const profile=cleanProfile(r.data||{});
      await loadAvatar(profile.user?.avatar_url);
      if(generation!==rev)return snapshot();
      if(!r.data.entitled||!profile.licenses.length)cache={authorized:false,status:'license_required',profile};
      else if(!consent)cache={authorized:false,status:'device_consent_required',profile};
      else {
        const deviceProof=proof();let verified=false;
        for(const license of profile.licenses){
          const v=await req('POST',{action:'verify-device',license_id:license.id,device_proof:deviceProof});
          if(generation!==rev)return snapshot();
          if(v.code===200&&v.data.verified===true){
            verified=true;deviceId=uuid(v.data.device_id);
            const dev=v.data.device&&typeof v.data.device==='object'?v.data.device:{};
            profile.device={license_id:license.id,label:str(dev.label,60),bound_at:date(dev.bound_at),last_seen_at:date(dev.last_seen_at)};
            break;
          }
        }
        if(!verified)deviceId=null;
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
      forget();token=r.data.token;await save();
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
      deviceId=uuid(r.data.device_id)||deviceId;
      consent=true;cache=null;checkedAt=0;await save();return refresh(true);
    }catch(e){return {ok:false,error:e.message}}
  }
  async function logout(){
    if(!bypass&&token)await req('POST',{action:'logout'}).catch(()=>{});
    forget();await save();return snapshot();
  }
  // Signed out / new session: nothing from the previous account survives, diagnostics opt-in included.
  function forget(){token=null;consent=false;cache=null;checkedAt=0;rev++;avatar={url:null,data:null};deviceId=null;pending=null;diag={...DIAG_OFF};}

  // ---------- voluntary diagnostics (POST /api/diagnostics) ----------
  const DIAG_ERRORS={400:'diagnostics_rejected',401:'session_expired',403:'diagnostics_forbidden',404:'diagnostics_unavailable',
    405:'diagnostics_unavailable',409:'device_unbound',413:'report_too_large',422:'diagnostics_rejected',429:'rate_limited'};
  const diagError=(r)=>({ok:false,error:DIAG_ERRORS[r.code]||'server_rejected',
    detail:typeof r.data?.code==='string'&&/^[A-Z0-9_]{2,40}$/.test(r.data.code)?r.data.code:undefined});
  // The upload needs a live, verified binding; re-check it instead of trusting an old snapshot.
  async function verifiedDevice(){
    const s=await refresh(true);
    if(!s.signed_in)return {ok:false,error:'signed_out'};
    if(!s.authorized||!deviceId)return {ok:false,error:s.status==='active'?'device_id_missing':'device_unbound'};
    return null;
  }
  async function setDiagnosticsConsent(on){
    if(bypass)return {ok:false,error:'development_build'};
    if(!token)return {ok:false,error:'signed_out'};
    diag.consent=on===true;
    if(!diag.consent)pending=null; // withdrawing stops any further sending at once
    await save();return snapshot();
  }
  async function previewDiagnostics(version){
    if(bypass)return {ok:false,error:'development_build'};
    if(!token)return {ok:false,error:'signed_out'};
    if(!diag.consent)return {ok:false,error:'diagnostics_consent_required'};
    const bad=await verifiedDevice();if(bad)return bad;
    let system;
    try{system=await collect(String(version||''))}catch(e){return {ok:false,error:e.message==='windows_device_required'?e.message:'diagnostics_collect_failed'}}
    pending={system,at:Date.now()};
    return {ok:true,system};
  }
  async function sendDiagnostics(){
    if(bypass)return {ok:false,error:'development_build'};
    if(!token)return {ok:false,error:'signed_out'};
    if(!diag.consent){pending=null;return {ok:false,error:'diagnostics_consent_required'};}
    if(!pending||Date.now()-pending.at>PREVIEW_MAX_AGE){pending=null;return {ok:false,error:'preview_required'};}
    const bad=await verifiedDevice();if(bad)return bad;
    let body;
    try{body={action:'report',consent:true,device_id:deviceId,device_proof:proof(),system:pending.system};}
    catch(e){return {ok:false,error:e.message}}
    if(Buffer.byteLength(JSON.stringify(body))>diagnostics.MAX_REPORT_BYTES)return {ok:false,error:'report_too_large'};
    try{
      const r=await req('POST',body,DIAG_API);
      if(r.code===401)checkedAt=0;
      if(r.code!==200||r.data?.ok!==true)return diagError(r);
      pending=null;
      diag.last_sent_at=Date.now();
      diag.retention_days=Number.isInteger(r.data.retention_days)&&r.data.retention_days>0?r.data.retention_days:null;
      await save();return snapshot();
    }catch(e){return {ok:false,error:e.message}}
  }
  function discardDiagnosticsPreview(){pending=null;return snapshot();}
  async function deleteDiagnostics(){
    if(bypass)return {ok:false,error:'development_build'};
    if(!token)return {ok:false,error:'signed_out'};
    if(!deviceId){const s=await refresh(true);if(!deviceId)return {ok:false,error:s.authorized?'device_id_missing':'device_unbound'};}
    try{
      const r=await req('POST',{action:'delete',device_id:deviceId},DIAG_API);
      if(r.code===401)checkedAt=0;
      if(r.code!==200||r.data?.ok===false)return diagError(r);
      // Deleting also withdraws the opt-in, so nothing is sent again without a new decision.
      pending=null;diag={...DIAG_OFF};
      await save();return snapshot();
    }catch(e){return {ok:false,error:e.message}}
  }
  function link(kind){
    if(!Object.hasOwn(DEFAULT_LINKS,kind))return null;
    return cache?.profile?.links?.[kind]||DEFAULT_LINKS[kind];
  }
  function hasAccess(){return bypass||(cache?.authorized===true&&Date.now()-checkedAt<MAX_AGE)}
  async function checkAccess(){return bypass||(await refresh()).authorized===true}
  return {load,login,bind,refresh,logout,link,hasAccess,checkAccess,
    setDiagnosticsConsent,previewDiagnostics,sendDiagnostics,discardDiagnosticsPreview,deleteDiagnostics};
}
module.exports={createH1tAccount,ownUrl,sniffImage,cleanProfile};
