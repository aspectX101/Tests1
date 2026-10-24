'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
test('Windows PowerShell reads WinRT cover streams into data URIs', {skip:process.platform!=='win32',timeout:60000}, () => {
  const {execFileSync}=require('node:child_process');const path=require('node:path');
  let output;
  try { output=execFileSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'SpotifyCover.Tests.ps1')],{encoding:'utf8',timeout:55000,windowsHide:true}); }
  catch (err) { console.log(String(err.stdout||''),String(err.stderr||'')); throw err; }
  console.log(output);
  assert.match(output,/PASS memory png/);assert.match(output,/PASS memory jpeg/);assert.doesNotMatch(output,/FAIL/);
});
