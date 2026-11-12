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
test('Windows PowerShell adapter parses and returns one status object', {skip:process.platform!=='win32',timeout:90000}, () => {
  const {execFileSync}=require('node:child_process');const path=require('node:path');
  const output=execFileSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'Spotify.Tests.ps1')],{encoding:'utf8',timeout:85000,windowsHide:true});
  console.log(output);
  assert.match(output,/valid PowerShell/);
  assert.match(output,/Spotify mixer: compiled, volume=-?\d+\./);
  assert.match(output,/Spotify worker: status line/);
});
test('volume: only whole numbers 0-100 and true/false reach the worker, as one fixed stdin line', () => {
  let child; const lines = [];
  const service = createSpotify({ isPackaged: false }, { platform: 'win32', spawn(exe, args, options) {
    assert.deepEqual(options.stdio, ['pipe', 'pipe', 'ignore']);
    child = new EventEmitter(); child.stdout = new PassThrough(); child.stdin = { write: (l) => lines.push(l), on() {} }; child.kill = () => child.emit('exit'); return child; } });
  assert.equal(service.volume(50).ok, false, 'not before the dashboard is open');
  service.setActive(true);
  child.stdout.write('{"status":"ready","title":"t","playing":true,"volume":40,"muted":false,"controls":{}}\n');
  assert.equal(service.getState().volume, 40);
  for (const bad of [-1, 101, 50.5, '50', '50\nnext', null, NaN]) assert.equal(service.volume(bad).ok, false, String(bad));
  for (const bad of ['1', 1, null]) assert.equal(service.mute(bad).ok, false, String(bad));
  assert.equal(service.volume(0).ok, true); assert.equal(service.volume(100).ok, true); assert.equal(service.mute(true).ok, true);
  assert.deepEqual(lines, ['volume 0\n', 'volume 100\n', 'mute 1\n']);
  // Spotify without an audio session: no volume, no commands
  child.stdout.write('{"status":"ready","title":"t","controls":{}}\n');
  assert.equal(service.getState().volume, null); assert.equal(service.volume(30).ok, false);
  service.stop();
});
test('volume boundary: invalid values from the worker become null', () => {
  for (const v of [-5, 101, 3.5, '40', null]) assert.equal(clean({ status: 'ready', volume: v }).volume, null, String(v));
  assert.equal(clean({ status: 'ready', volume: 0 }).volume, 0);
  assert.equal(clean({ status: 'ready', volume: 70, muted: 'yes' }).muted, false);
  assert.equal(clean({ status: 'ready', volume: 70, muted: true }).muted, true);
});
test('script: only "volume N" (0-100) and "mute 0|1" are accepted on stdin; the mixer only touches Spotify sessions', () => {
  const ps = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'app', 'spotify-session.ps1'), 'utf8');
  assert.match(ps, /\$line -match '\^volume \(\\d\{1,3\}\)\$' -and \[int\]\$Matches\[1\] -le 100/);
  assert.match(ps, /\$line -match '\^mute \(\[01\]\)\$'/);
  assert.match(ps, /string\.Equals\(name, "Spotify", StringComparison\.OrdinalIgnoreCase\)/);
  assert.doesNotMatch(ps, /IAudioEndpointVolume|SetMasterVolumeLevel/, 'never the PC master volume');
});
test('a dashboard re-render waits while the volume slider is dragged', () => {
  const fs = require('node:fs'), path = require('node:path');
  const app = fs.readFileSync(path.join(__dirname, '..', 'app', 'renderer', 'app.js'), 'utf8');
  const media = fs.readFileSync(path.join(__dirname, '..', 'app', 'renderer', 'dashboard-media.js'), 'utf8');
  assert.match(app, /function render\(\) \{\n[^\n]*\n  if \(state\.route\.page === 'home' && window\.DashboardMedia\?\.holdRender\?\.\(\)\) return;/);
  assert.match(media, /addEventListener\('pointerup',release\)/);
  assert.match(media, /window\.DashboardMedia=\{html,bind,mount,holdRender\}/);
});
