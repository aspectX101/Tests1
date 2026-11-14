'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {createBackendClient}=require('../electron/backend.cjs');
test('debloat bridge validates consent, selection and preview before starting a process',async()=>{
  const invocations=[];
  const call=createBackendClient({isPackaged:false},{windowsRoot:'C:\\Windows',execFile(exe,args,options,done){invocations.push(args);assert.equal(options.shell,false);done(null,'{"ok":true}','');}});
  const token='a'.repeat(64);
  for(const appIds of [[],['weather','weather'],['Microsoft.WindowsStore'],['weather;whoami'],[{}]]) await assert.rejects(call({action:'debloat-preview',appIds}),/invalid_debloat_selection/);
  await assert.rejects(call({action:'debloat-remove',appIds:['weather'],previewToken:token}),/explicit_debloat_confirmation_required/);
  await assert.rejects(call({action:'debloat-remove',appIds:['weather'],previewToken:'-Command',confirmDataLoss:true}),/debloat_preview_changed/);
  await assert.rejects(call({action:'startup-disable',id:'..\\Run',previewToken:token}),/invalid_startup_entry/);
  await assert.rejects(call({action:'apply',id:'debloat.recall.off'}),/explicit_debloat_confirmation_required/);
  assert.equal(invocations.length,0);
  await call({action:'debloat-remove',appIds:['weather','news'],previewToken:token,confirmDataLoss:true});
  assert.ok(invocations[0].includes('-ConfirmDataLoss'));
  assert.equal(invocations[0][invocations[0].indexOf('-AppIds')+1],'weather,news');
  for(const action of ['debloat-list','startup-list']) await call({action});
  await call({action:'startup-disable',id:'1'.repeat(32),previewToken:token});
  await call({action:'startup-restore',id:'1'.repeat(32)});
});
test('only fixed installation and Windows settings destinations are allowed',()=>{
  const {getInstallUrl}=require('../app/debloat-links');
  for(const bad of ['https://example.com','file:///C:/Windows/System32/cmd.exe','constructor','__proto__','weather&x=y',''])assert.equal(getInstallUrl(bad),null);
  for(const app of require('../DebloatApps.json'))assert.match(getInstallUrl(app.id),/^(ms-windows-store:\/\/search\/\?query=|https:\/\/(www|support)\.microsoft\.com\/)/);
  assert.equal(getInstallUrl('startup-settings'),'ms-settings:startupapps');
  const config=require('../packaging/electron-builder.cjs');
  for(const file of ['Debloat.ps1','DebloatApps.json'])assert.ok(config.extraResources[0].filter.includes(file));
});
test('mock removal requires confirmation, preserves unrelated apps and is not falsely restorable',async()=>{
  const mock=require('../app/mock');
  const p=await mock.call({action:'debloat-preview',appIds:['weather']});
  assert.equal((await mock.call({action:'debloat-remove',appIds:['weather'],previewToken:p.previewToken})).ok,false);
  const removed=await mock.call({action:'debloat-remove',appIds:['weather'],previewToken:p.previewToken,confirmDataLoss:true});
  assert.equal(removed.ok,true);assert.equal(removed.dataBackup,false);
  const inventory=await mock.call({action:'debloat-list'});
  assert.equal(inventory.apps.find(a=>a.id==='weather').installed,false);
  assert.equal(inventory.apps.find(a=>a.id==='news').installed,true);
  const evidence=await mock.call({action:'backup-preview',backupId:removed.backupId});
  assert.equal(evidence.backup.reason,'app_reinstall_required');
  const entry=(await mock.call({action:'startup-list'})).entries[0];
  await mock.call({action:'startup-disable',id:entry.id,previewToken:entry.token});
  assert.equal((await mock.call({action:'startup-list'})).entries[0].managed,true);
  const restore=await mock.call({action:'backup-restore-all'});
  assert.equal(restore.ok,true);assert.ok(restore.results.some(r=>r.reason==='app_reinstall_required'));
  assert.equal((await mock.call({action:'startup-list'})).entries[0].disabled,false);
});
test('all three languages have complete Debloat text and renderer scripts parse',()=>{
  const context={window:{}};vm.createContext(context);
  for(const file of ['i18n.js','debloat-i18n.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/renderer',file),'utf8'),context);
  const keys=Object.keys(context.window.I18N.de.debloat).sort();
  for(const lang of ['de','en','it']){
    assert.deepEqual(Object.keys(context.window.I18N[lang].debloat).sort(),keys);
    assert.equal(Object.keys(context.window.I18N[lang].debloat.groups).length,8);
    assert.ok(context.window.I18N[lang].errors.explicit_debloat_confirmation_required);
  }
  for(const file of ['app.js','debloat.js'])new vm.Script(fs.readFileSync(path.join(__dirname,'../app/renderer',file),'utf8'));
});
