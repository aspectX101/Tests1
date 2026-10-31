'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {recommendTweaks, RULES, TEXT} = require('../app/renderer/recommend.js');
const catalog = require('../app/tweak-catalog.js').map((t) => ({...t, applied: false}));
const ids = (r) => r.picks.map((p) => p.id);
const desktop = {laptop:false, systemDisk:'SSD', wifi:true, ethernetUp:true, customDns:false, xboxApp:false, cpu:{name:'Intel Core i7-12700K'}};
test('every rule names a real catalog tweak and every reason is translated in all three languages', () => {
  for (const [id] of RULES) assert.ok(catalog.some((t) => t.id === id), id);
  const facts = [desktop, {laptop:true, systemDisk:'HDD', wifi:false, customDns:true, xboxApp:true, cpu:{name:'AMD Ryzen 7 7800X3D'}}, {}];
  for (const f of facts) { const r = recommendTweaks(f, catalog); for (const x of [...r.picks, ...r.skips]) for (const lang of ['de','en','it']) assert.ok(TEXT[lang].reasons[x.reason], `${lang}:${x.reason}`); }
});
test('desktop with SSD, Wi-Fi, normal DNS and no Xbox app gets the full desktop selection', () => {
  const r = ids(recommendTweaks(desktop, catalog));
  for (const id of ['windows.power.high','network.nic.powersave.off','network.wifisense.off','network.teredo.off','network.dns.fast','windows.hibernate.off','network.winsock.udp']) assert.ok(r.includes(id), id);
  for (const id of ['windows.prefetch.off','windows.cpu.unpark','windows.gpu.tdr','network.nagle.off','keyboard.mouse.speed.native']) assert.ok(!r.includes(id), id);
});
test('laptop, Xbox app, custom DNS and HDD are respected', () => {
  const r = recommendTweaks({laptop:true, systemDisk:'HDD', wifi:true, customDns:true, xboxApp:true, cpu:{name:'AMD Ryzen 7 7800X3D'}}, catalog);
  const picks = ids(r);
  for (const id of ['windows.power.high','network.nic.powersave.off','windows.hibernate.off','network.teredo.off','network.dns.fast']) assert.ok(!picks.includes(id), id);
  const why = Object.fromEntries(r.skips.map((s) => [s.id, s.reason]));
  assert.equal(why['windows.power.high'], 'laptop_battery'); assert.equal(why['network.teredo.off'], 'xbox_app_needs_teredo');
  assert.equal(why['network.dns.fast'], 'custom_dns'); assert.equal(why['windows.prefetch.off'], 'hdd_keeps_prefetch'); assert.equal(why['windows.cpu.unpark'], 'x3d_cpu');
});
test('unknown facts never lead to a hardware-dependent pick; unavailable tweaks are never picked', () => {
  const picks = ids(recommendTweaks({}, catalog));
  for (const id of ['windows.power.high','network.nic.powersave.off','network.wifisense.off','network.teredo.off','network.dns.fast','windows.hibernate.off']) assert.ok(!picks.includes(id), id);
  const off = catalog.map((t) => t.id === 'network.throttle.off' ? {...t, available:false} : t);
  const r = recommendTweaks(desktop, off);
  assert.ok(!ids(r).includes('network.throttle.off')); assert.equal(r.skips.find((s) => s.id === 'network.throttle.off').reason, 'unavailable');
});
test('no recommendation is an accessibility, capture or debloat change', () => {
  const r = ids(recommendTweaks(desktop, catalog));
  assert.ok(!r.some((id) => /filterkeys|stickykeys|togglekeys|mousekeys|capture|ducking|fivem\.priority|^debloat\./.test(id)));
});
test('Windows PowerShell: read-only system check returns facts', {skip:process.platform!=='win32',timeout:90000}, () => {
  const {execFileSync}=require('node:child_process');
  const out=execFileSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'..','tweaker.ps1'),'-Action','system-check'],{encoding:'utf8',timeout:85000,windowsHide:true});
  console.log(out);const r=JSON.parse(out);assert.equal(r.ok,true);assert.ok(r.facts&&'laptop' in r.facts&&'systemDisk' in r.facts&&'customDns' in r.facts);
  assert.ok(r.facts.cpu&&r.facts.cpu.name);
});
