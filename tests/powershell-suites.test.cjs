'use strict';
// Runs the PowerShell backend suites with Windows PowerShell 5.1, the same runtime the app uses
// (electron/backend.cjs). Every suite works on simulated Windows values and throws on a failed check.
const test = require('node:test');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const SUITES = ['Backup', 'CacheCleaner', 'Checkpoint', 'Contract', 'Debloat', 'Keyboard', 'ModManager',
  'Optimization', 'OptimizationAdapters', 'Performance', 'SafeMode'];

for (const name of SUITES) {
  test(`Windows PowerShell: ${name}.Tests.ps1`, { skip: process.platform !== 'win32', timeout: 300000 }, () => {
    try {
      const out = execFileSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, `${name}.Tests.ps1`)],
        { encoding: 'utf8', timeout: 290000, windowsHide: true, cwd: path.join(__dirname, '..') });
      console.log(out.trim().split('\n').slice(-3).join('\n'));
    } catch (err) {
      console.log(String(err.stdout || ''), String(err.stderr || ''));
      throw err;
    }
  });
}
