'use strict';
// Support tool for customers with DXGI_ERROR_DEVICE_HUNG: the double-click .bat carries exactly the tested script.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const dir = path.join(__dirname, '..', 'tools', 'support');
const ps = fs.readFileSync(path.join(dir, 'H1T-GPU-Hilfe.ps1'), 'utf8');
const bat = fs.readFileSync(path.join(dir, 'H1T-GPU-Hilfe.bat'), 'utf8');

test('the .bat embeds the same script and elevates itself', () => {
  const body = bat.slice(bat.lastIndexOf('#PSSTART') + '#PSSTART'.length).replace(/\r\n/g, '\n').trim();
  assert.equal(body, ps.replace(/\r\n/g, '\n').replace("param([switch]$ReportOnly, [string]$OutFile)", "$ReportOnly = $false; $OutFile = ''").trim());
  assert.match(bat, /net session >nul 2>&1 \|\| \(powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"/);
  assert.doesNotMatch(bat, /[^\x00-\x7f]/, 'plain ASCII so every console shows it correctly');
});

test('only values equal to the tweaker targets are removed; nothing else is touched', () => {
  assert.match(ps, /\[int64\]\$v -eq \$t\.Value/);
  for (const n of ['DpiMapIommuContiguous', 'TdrDelay', 'ExitLatency', 'RtlCapabilityCheckLatency']) assert.match(ps, new RegExp(n));
  assert.doesNotMatch(ps, /Remove-Item\s+-(Path|LiteralPath)\s+\$(gd|pw)\b/, 'never deletes whole keys');
});

test('Windows PowerShell: report-only run parses, changes nothing and writes the report', { skip: process.platform !== 'win32', timeout: 120000 }, () => {
  const { execFileSync } = require('node:child_process');
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'h1t-gpu-')), 'report.txt');
  const before = execFileSync('reg.exe', ['query', 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers'], { encoding: 'utf8' });
  execFileSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(dir, 'H1T-GPU-Hilfe.ps1'), '-ReportOnly', '-OutFile', out],
    { encoding: 'utf8', windowsHide: true, timeout: 110000 });
  const report = fs.readFileSync(out, 'utf8');
  assert.match(report, /nur Bericht/);
  assert.match(report, /Grafiktreiber-Resets: \d+/);
  assert.match(report, /Auslagerungsdatei: /);
  assert.equal(execFileSync('reg.exe', ['query', 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers'], { encoding: 'utf8' }), before);
  // The embedded copy in the .bat is valid PowerShell too.
  const body = bat.slice(bat.lastIndexOf('#PSSTART'));
  const parse = execFileSync('powershell.exe', ['-NoProfile', '-Command', '$e=$null;[void][System.Management.Automation.Language.Parser]::ParseInput([Console]::In.ReadToEnd(),[ref]$null,[ref]$e);$e.Count'],
    { input: body, encoding: 'utf8', windowsHide: true }).trim();
  assert.equal(parse, '0');
});
