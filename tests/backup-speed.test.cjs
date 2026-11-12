'use strict';
// "Restore all" was slow: every backup re-read all current values 3-4 times, rebuilt the catalog and asked Windows
// for network adapters again and again. These checks keep the per-process caches and the single re-check in place.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');

test('static data and slow Windows queries are read once per backend process', () => {
  assert.match(read('Tweaker.psm1'), /if \(\$null -eq \$script:TweakerCatalogCache\) \{ \$script:TweakerCatalogCache = @\(Build-TweakerCatalog\) \}/);
  assert.match(read('Optimization.ps1'), /if \(\$null -eq \$script:OptimizationCatalogCache\) \{ \$script:OptimizationCatalogCache = @\(Build-OptimizationCatalog\) \}/);
  assert.match(read('SafeMode.ps1'), /if \(\$null -ne \$script:SafeModePlatformCache\) \{ return \$script:SafeModePlatformCache \}/);
  assert.match(read('OptimizationNetwork.ps1'), /if \(\$null -ne \$script:NetworkAdapterCache\) \{ return \$script:NetworkAdapterCache \}/);
  const psm = read('Tweaker.psm1');
  assert.match(psm, /^\$script:RestorePointReady = \$false$/m, 'initialised for StrictMode');
  assert.match(psm, /if \(\$script:RestorePointReady\) \{ return \}/);
});

test('restore all: no repeated readiness checks, not-restorable backups are skipped with their reason', () => {
  const b = read('Backup.ps1');
  assert.match(b, /function Restore-RecoveryRecord\(\$Record, \[switch\]\$Checked\)/);
  assert.match(b, /\$checked = \$Action -eq 'backup-restore-all' -and \$item\.kind -eq 'tweak' -and \$item\.tweakId -in \$optimizationIds/);
  assert.match(b, /if \(\$Action -eq 'backup-restore-all' -and \$item\.reason\) \{\n\s+\$results \+= \[pscustomobject\]@\{backupId=\$item\.backupId;status='skipped';reason=\$item\.reason\}\n\s+if \(\$item\.reason -notin \$terminalReasons\) \{ \$conflicts\+\+ \}/);
  assert.match(b, /\$failed=@\(\$results \| Where-Object status -eq 'failed'\)\.Count \+ \$conflicts/, 'a conflict still makes the run partial');
  const o = read('Optimization.ps1');
  assert.match(o, /Restore-OptimizationEntries \$state \$path -Checked/);
  assert.match(o, /if \(-not \$Checked\) \{ Assert-OptimizationRestore \$State \}/);
});

test('the backups page says what is happening during restore all, in three languages', () => {
  const i18n = read('app/renderer/i18n.js');
  assert.equal((i18n.match(/bkWorking: '/g) || []).length, 3);
  assert.match(read('app/renderer/app.js'), /busy === 'all' \? `<p class="cache-note bk-working" role="status">\$\{esc\(t\(\)\.bkWorking\)\}<\/p>` : ''/);
});
