'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { createUpdateHealth } = require('../app/update-health');

function setup({ withPrevious = true, forVersion = '1.0.19' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'h1t-health-'));
  const prevExe = path.join(dir, 'previous', 'H1T.CC-Tweaker-previous.exe');
  const old = createUpdateHealth({ dir, version: '1.0.18' });
  old.rememberPrevious({ version: '1.0.18', file: prevExe, forVersion });
  if (withPrevious) { fs.mkdirSync(path.dirname(prevExe), { recursive: true }); fs.writeFileSync(prevExe, 'MZ old exe'); }
  // Each start is a new process: a new health object reading the same files; dead = the previous process is gone.
  let pid = 100;
  const start = (version = '1.0.19', alive = false) => createUpdateHealth({ dir, version, pid: ++pid, isAlive: () => alive });
  return { dir, prevExe, start, done: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test('two starts that end before the UI is ready roll back to the kept exe on the third', () => {
  const t = setup();
  try {
    assert.equal(t.start().begin(), null);          // start 1 crashes
    assert.equal(t.start().begin(), null);          // start 2 crashes
    const third = t.start();
    assert.deepEqual(third.begin(), { rollback: { version: '1.0.18', file: t.prevExe } });
    assert.equal(third.isBad('1.0.19'), true);
    // The old version starts again and keeps knowing that 1.0.19 is bad; a newer release is fine.
    const back = t.start('1.0.18');
    assert.equal(back.begin(), null);
    assert.equal(back.isBad('1.0.19'), true);
    assert.equal(back.isBad('1.0.20'), false);
  } finally { t.done(); }
});

test('a version that reached its UI once is never rolled back', () => {
  const t = setup();
  try {
    const a = t.start(); a.begin(); a.healthy();
    for (let i = 0; i < 4; i++) assert.equal(t.start().begin(), null);
    assert.equal(t.start().isBad('1.0.19'), false);
  } finally { t.done(); }
});

test('closing the app normally during the boot animation is not a failure', () => {
  const t = setup();
  try {
    for (let i = 0; i < 4; i++) { const h = t.start(); assert.equal(h.begin(), null); h.closed(); }
  } finally { t.done(); }
});

test('a second copy started while the first still runs is not a failure', () => {
  const t = setup();
  try {
    t.start().begin();
    assert.equal(t.start('1.0.19', true).begin(), null);
    assert.equal(t.start('1.0.19', true).begin(), null);
    assert.equal(t.start('1.0.19', true).state().failures, 0);
  } finally { t.done(); }
});

test('no rollback without a kept exe for exactly this update', () => {
  for (const opts of [{ withPrevious: false }, { forVersion: '1.0.17' }]) {
    const t = setup(opts);
    try {
      for (let i = 0; i < 4; i++) assert.equal(t.start().begin(), null);
      assert.equal(t.start().isBad('1.0.19'), false);
    } finally { t.done(); }
  }
});
