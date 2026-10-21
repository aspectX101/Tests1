'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync}=require('node:child_process');const path=require('node:path');
function ps(file,timeout){
  try { return execFileSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,file)],{encoding:'utf8',timeout,windowsHide:true,cwd:path.join(__dirname,'..')}); }
  catch (err) { console.log(String(err.stdout||''),String(err.stderr||'')); throw err; }
}
test('Windows PowerShell: full catalog incl. network tab applies and restores exactly (simulated values)', {skip:process.platform!=='win32',timeout:300000}, () => {
  const output=ps('ExpandedOptimization.Tests.ps1',290000);console.log(output);assert.match(output,/PASS: expanded catalog/);
});
test('Windows PowerShell: network adapters read real cards and round-trip a per-card value', {skip:process.platform!=='win32',timeout:120000}, () => {
  const output=ps('NetworkLive.Tests.ps1',110000);console.log(output);assert.match(output,/PASS restore nagleNoDelay/);
});
test('Windows PowerShell: keyboard tab reads real settings and round-trips the live ones', {skip:process.platform!=='win32',timeout:120000}, () => {
  const output=ps('KeyboardLive.Tests.ps1',110000);console.log(output);assert.match(output,/PASS round trip mouseSpeed/);
});
