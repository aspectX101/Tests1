'use strict';
// Dashboard GPU usage must match Task Manager: raw counters, per engine, busiest engine shown.
const test = require('node:test');
const assert = require('node:assert/strict');
const { gpuScript } = require('../app/usage.js');

test('GPU usage is read like Task Manager: raw counters, per engine (all engine types), busiest engine', () => {
  const s = gpuScript();
  assert.match(s, /Win32_PerfRawData_GPUPerformanceCounters_GPUEngine/);
  assert.doesNotMatch(s, /PerfFormattedData|engtype_3D/, 'not only the 3D engine, not the stale formatted class');
  assert.match(s, /\(\$now\[\$k\]\[0\] - \$prev\[\$k\]\[0\]\) \/ \$dt \* 100/, 'busy time over elapsed time');
  assert.match(s, /luid_\(0x\[0-9A-Fa-f\]\+_0x\[0-9A-Fa-f\]\+\)_phys_\(\\d\+\)_eng_\(\\d\+\)/, 'grouped per GPU engine, processes summed');
  assert.match(s, /Measure-Object -Maximum/, 'the busiest engine is shown');
});

test('Windows: the GPU script runs and reports a percentage (or -1 without GPU counters)', { skip: process.platform !== 'win32', timeout: 30000 }, () => {
  const { execFileSync } = require('node:child_process');
  const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', gpuScript(3)], { encoding: 'utf8', timeout: 25000, windowsHide: true });
  const lines = out.trim().split(/\r?\n/).filter(Boolean);
  console.log(lines.join(' | '));
  for (const l of lines) { const v = Number(l); assert.ok(Number.isFinite(v) && v >= -1 && v <= 100, l); }
});
