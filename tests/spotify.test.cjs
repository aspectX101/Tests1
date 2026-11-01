'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {PassThrough} = require('node:stream');
const {createSpotify, clean} = require('../app/spotify');
test('media boundary drops external artwork, bounds timeline and validates capability flags', () => {
  const s=clean({status:'ready',title:'x'.repeat(900),artist:'artist',duration:30,position:90,playing:'true',art:'https://example.com/art.jpg',controls:{playpause:true,next:'true'}});
  assert.equal(s.title.length,512);assert.equal(s.position,30);assert.equal(s.playing,false);assert.equal(s.art,null);assert.equal(s.controls.next,false);assert.equal(s.controls.playpause,true);
  assert.equal(clean({...s,art:'data:image/svg+xml;base64,PHN2Zz4='}).art,null);
  assert.equal(clean({...s,art:'data:image/png;base64,YQ=='}).art,'data:image/png;base64,YQ==');
});
test('only fixed Spotify actions execute; worker handles split JSON and stops off-dashboard', async () => {
  let child, kills=0;const launches=[],commands=[],received=[];
  const service=createSpotify({isPackaged:false},{platform:'win32',spawn(exe,args,options){launches.push({exe,args,options});child=new EventEmitter();child.stdout=new PassThrough();child.kill=()=>{kills++;child.emit('exit')};return child;},execFile(exe,args,options,done){commands.push({exe,args,options});done(null,'{"ok":true}');}});
  service.onChange(s=>received.push(s));service.setActive(true);service.setActive(true);assert.equal(launches.length,1);assert.equal(launches[0].options.shell,false);
  child.stdout.write('{"status":"rea');child.stdout.write('dy","title":"track","playing":true,"controls":{"next":true}}\n');
  assert.equal(service.getState().title,'track');
  for(const action of ['next;whoami','previous','status','constructor',{},null])assert.equal((await service.command(action)).ok,false);
  assert.equal(commands.length,0);assert.equal((await service.command('next')).ok,true);assert.equal(commands.length,1);
  assert.equal(commands[0].args.at(-1),'next');assert.equal(commands[0].options.shell,false);assert.equal(commands[0].options.timeout,12000);
  service.setActive(false);assert.equal(kills,1);child.stdout.write('{"status":"ready","title":"stale"}\n');assert.equal(service.getState().title,'track');
  assert.equal((await service.command('next')).ok,false);service.stop();
});
test('unsupported OS and invalid worker output produce a truthful unavailable state', () => {
  let called=0;const unsupported=createSpotify({isPackaged:false},{platform:'linux',spawn(){called++;}});unsupported.setActive(true);assert.equal(called,0);assert.equal(unsupported.getState().status,'unavailable');unsupported.stop();
  const child=new EventEmitter();child.stdout=new PassThrough();child.kill=()=>{};
  const service=createSpotify({isPackaged:false},{platform:'win32',spawn(){return child;}});service.setActive(true);child.stdout.write('not json\n');assert.equal(service.getState().status,'unavailable');service.stop();
});
test('Windows PowerShell adapter parses and returns one status object', {skip:process.platform!=='win32',timeout:25000}, () => {
  const {execFileSync}=require('node:child_process');const path=require('node:path');
  const output=execFileSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'Spotify.Tests.ps1')],{encoding:'utf8',timeout:22000,windowsHide:true});
  assert.match(output,/valid PowerShell/);
});
