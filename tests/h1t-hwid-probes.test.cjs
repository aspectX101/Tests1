'use strict';
// An unlinked PC must not use up the server's HWID probe limit (9 unknown-hash checks per 15 minutes) on its own:
// background checks skip verify-device, only app start, "Check again" and linking ask the server.
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const originalLoad = Module._load;
Module._load = function (id, parent, isMain) {
  if (id === 'node:child_process') {
    const real = originalLoad.call(this, id, parent, isMain);
    return { ...real, execFileSync: () => '    MachineGuid    REG_SZ    4c3b2a19-0000-4000-8000-1234567890ab\r\n' };
  }
  if (id === 'electron') return { safeStorage: { isEncryptionAvailable: () => true, encryptString: (v) => Buffer.from(v), decryptString: (b) => b.toString() } };
  return originalLoad.call(this, id, parent, isMain);
};
const { createH1tAccount } = require('../app/h1t-account');
Module._load = originalLoad;
const json = (body, status = 200) => ({ status, headers: new Map([['content-type', 'application/json']]), text: async () => JSON.stringify(body) });

test('unlinked PC: background checks do not call verify-device; start, "Check again" and linking do', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'h1t-probe-'));
  fs.writeFileSync(path.join(dir, 'h1t-session.json'), JSON.stringify({ v: 1, secret: Buffer.from('e'.repeat(64)).toString('base64'), consent: true, diagnostics: { consent: true } }));
  const calls = [];
  let bound = false;
  const oldFetch = global.fetch, oldNow = Date.now, platform = Object.getOwnPropertyDescriptor(process, 'platform');
  let now = oldNow();
  Date.now = () => now;
  if (process.platform !== 'win32') Object.defineProperty(process, 'platform', { value: 'win32' });
  global.fetch = async (_url, opt) => {
    if (!opt.body) { calls.push('GET'); return json({ user: { display_name: 'Neo' }, entitled: true, licenses: [{ id: '0f8b6a2e-3c1d-4e5f-9a7b-1c2d3e4f5a6b', plan: '7 Days', expires_at: null }] }); }
    const b = JSON.parse(opt.body); calls.push(b.action);
    if (b.action === 'bind-device') { bound = true; return json({ verified: true, device_id: '1f8b6a2e-3c1d-4e5f-9a7b-1c2d3e4f5a6b' }); }
    return bound ? json({ verified: true, device_id: '1f8b6a2e-3c1d-4e5f-9a7b-1c2d3e4f5a6b' }) : json({ verified: false, reason: 'Device not bound' }, 403);
  };
  try {
    const acc = createH1tAccount({ getPath: () => dir });
    await acc.load();
    assert.equal((await acc.refresh(true)).status, 'device_unbound'); // app start
    for (let i = 0; i < 10; i++) { now += 121000; await acc.refresh(false); } // 20 minutes of background checks
    assert.equal(calls.filter((c) => c === 'verify-device').length, 1);
    await acc.refresh(true); // "Check again"
    assert.equal(calls.filter((c) => c === 'verify-device').length, 2);
    const before = calls.length;
    now += 1000;
    const res = await acc.bind('0f8b6a2e-3c1d-4e5f-9a7b-1c2d3e4f5a6b', true, '1.0.26');
    assert.equal(res.status, 'active');
    // Linking: one bind-device; the verify afterwards is for the now known device and does not count as a probe.
    assert.deepEqual(calls.slice(before).filter((c) => c !== 'GET'), ['bind-device', 'verify-device']);
    // Linked PCs keep their normal background verification.
    now += 121000; await acc.refresh(false);
    assert.equal(calls.at(-1), 'verify-device');
  } finally {
    global.fetch = oldFetch; Date.now = oldNow; Object.defineProperty(process, 'platform', platform);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
