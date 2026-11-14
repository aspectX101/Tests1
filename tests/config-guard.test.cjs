'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { guard, TEXT, reasonText, RULES } = require('../app/renderer/config-guard.js');

const tw = (id) => ({ id, name: id });
const ALL = ['gaming.gpu.hags', 'gaming.gpu.iommu', 'gaming.gpu.latency', 'windows.gpu.tdr', 'windows.power.profile', 'windows.power.high',
  'windows.cpu.unpark', 'windows.power.extras', 'hitreg.input.power', 'gaming.hvci.off', 'network.dns.fast', 'windows.menu.instant'].map(tw);
const out = (facts) => guard(facts, ALL).skipped.map((s) => s.tweak.id).sort();
const healthy = { laptop: false, cpu: { name: 'Intel Core i7-9700K' }, gpuResets: 0, unexpectedShutdowns: 0, hardwareErrors: 0, gpuDriverAgeDays: 60, antiCheatHvci: false };

test('a healthy desktop keeps every tweak; without a system check nothing is removed', () => {
  assert.deepEqual(out(healthy), []);
  assert.equal(guard(null, ALL).allowed.length, ALL.length);
  // Unknown facts (log unreadable) never remove a tweak.
  assert.deepEqual(out({ gpuResets: null, unexpectedShutdowns: null, hardwareErrors: null, laptop: null }), []);
});

test('graphics driver resets (DXGI_ERROR_DEVICE_HUNG) leave out the GPU tweaks', () => {
  assert.deepEqual(out({ ...healthy, gpuResets: 2 }), ['gaming.gpu.hags', 'gaming.gpu.iommu', 'gaming.gpu.latency', 'windows.gpu.tdr']);
  const s = guard({ ...healthy, gpuResets: 2 }, [tw('gaming.gpu.hags')]).skipped[0];
  assert.match(reasonText('de', s.reasons[0]), /2× abgestürzt.*DXGI_ERROR_DEVICE_HUNG/);
});

test('power-offs without clean shutdown (PSU at its limit) leave out the power-hungry tweaks', () => {
  assert.deepEqual(out({ ...healthy, unexpectedShutdowns: 3 }),
    ['gaming.gpu.latency', 'hitreg.input.power', 'windows.cpu.unpark', 'windows.power.extras', 'windows.power.high', 'windows.power.profile']);
  assert.match(reasonText('de', { key: 'power_loss', n: 3 }), /Netzteil an der Grenze/);
});

test('hardware errors, laptop, X3D, hybrid Intel, old driver and anti-cheat each leave out their tweaks', () => {
  assert.ok(out({ ...healthy, hardwareErrors: 1 }).includes('windows.cpu.unpark'));
  assert.ok(out({ ...healthy, hardwareErrors: 1 }).includes('gaming.gpu.hags'));
  assert.deepEqual(out({ ...healthy, laptop: true }), ['hitreg.input.power', 'windows.cpu.unpark', 'windows.power.extras', 'windows.power.profile']);
  assert.deepEqual(out({ ...healthy, cpu: { name: 'AMD Ryzen 7 7800X3D 8-Core Processor' } }), ['windows.cpu.unpark']);
  assert.deepEqual(out({ ...healthy, cpu: { name: '13th Gen Intel(R) Core(TM) i7-13700K' } }), ['windows.cpu.unpark']);
  assert.deepEqual(out({ ...healthy, cpu: { name: 'Intel(R) Core(TM) Ultra 7 155H' } }), ['windows.cpu.unpark']);
  assert.deepEqual(out({ ...healthy, gpuDriverAgeDays: 700 }), ['gaming.gpu.hags']);
  assert.deepEqual(out({ ...healthy, antiCheatHvci: true }), ['gaming.hvci.off']);
});

test('several reasons for one tweak are all listed; every reason has text in all three languages', () => {
  const s = guard({ ...healthy, gpuResets: 1, unexpectedShutdowns: 1 }, [tw('gaming.gpu.latency')]).skipped[0];
  assert.deepEqual(s.reasons.map((r) => r.key), ['gpu_resets', 'power_loss']);
  for (const lang of ['de', 'en', 'it']) {
    for (const [key] of RULES) assert.ok(TEXT[lang].reasons[key], `${key} ${lang}`);
    for (const k of ['title', 'confirmTitle', 'confirmGo', 'checkFailed']) assert.ok(TEXT[lang][k]);
  }
});

test('configs, Recommended, tab bulk starts and single switches all go through the guard', () => {
  const read = (f) => fs.readFileSync(path.join(__dirname, '..', 'app/renderer', f), 'utf8');
  const app = read('app.js');
  assert.match(app, /const profileCandidates = \(tier\) => \{\s*return guarded\(profileBase\(tier\)\)\.allowed;/);
  assert.match(app, /async function runProfile\(tier\) \{[\s\S]{0,200}await ensureFacts\(\)/);
  assert.match(app, /if \(apply && !\(await guardConfirm\(tw\)\)\)/);
  assert.match(read('optimization.js'), /guarded\(optSelection\(cat\)\)/);
  assert.match(read('gaming.js'), /guardConfirm\(tw\)/);
  assert.match(read('recommend.js'), /const candidates = \(\) => \{[\s\S]{0,200}guardOut\(\)/);
  const html = read('index.html');
  assert.ok(html.indexOf('config-guard.js') < html.indexOf('recommend.js') && html.indexOf('recommend.js') < html.indexOf('app.js'));
});

test('Windows PowerShell: the system check reads the stability facts from the event logs', { skip: process.platform !== 'win32', timeout: 120000 }, () => {
  const { execFileSync } = require('node:child_process');
  const out = execFileSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, '..', 'tweaker.ps1'), '-Action', 'system-check', '-Lang', 'de'],
    { encoding: 'utf8', windowsHide: true, timeout: 110000 });
  const r = JSON.parse(out);
  assert.equal(r.ok, true);
  for (const k of ['gpuResets', 'unexpectedShutdowns', 'hardwareErrors']) assert.ok(r.facts[k] === null || Number.isInteger(r.facts[k]), `${k}=${r.facts[k]}`);
  assert.ok(r.facts.gpuDriverAgeDays === null || Number.isInteger(r.facts.gpuDriverAgeDays));
  assert.ok(r.facts.antiCheatHvci === null || typeof r.facts.antiCheatHvci === 'boolean');
});
