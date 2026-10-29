'use strict';
// The license binding survives tools that change the MachineGuid on every boot (temporary HWID spoofers),
// keeps the digest of existing bindings, and does not move with a copied file.
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');

let guid = '4C3B2A19-0000-4000-8000-1234567890AB';
let pcKey = 'pc-a'; // DPAPI stand-in: only the same PC/user can decrypt
const originalLoad = Module._load;
Module._load = function (id, parent, isMain) {
  if (id === 'node:child_process') {
    const real = originalLoad.call(this, id, parent, isMain);
    return { ...real, execFileSync: () => `    MachineGuid    REG_SZ    ${guid}\r\n` };
  }
  if (id === 'electron') return { safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (v) => Buffer.from(JSON.stringify({ k: pcKey, v })),
    decryptString: (b) => { const o = JSON.parse(b.toString()); if (o.k !== pcKey) throw new Error('DPAPI: wrong machine'); return o.v; },
  } };
  return originalLoad.call(this, id, parent, isMain);
};
const { createH1tAccount } = require('../app/h1t-account');
Module._load = originalLoad;

const json = (body, status = 200) => ({ status, headers: new Map([['content-type', 'application/json']]), text: async () => JSON.stringify(body) });
const digest = (g) => crypto.createHash('sha256').update('H1T.CC device binding v1\n' + g.toLowerCase()).digest('hex');

async function proofSeen(dir) {
  const proofs = [];
  const old = global.fetch;
  global.fetch = async (_url, opt) => {
    if (opt.body) { const b = JSON.parse(opt.body); proofs.push(b.device_proof); return json({ verified: true, device_id: '0f8b6a2e-3c1d-4e5f-9a7b-1c2d3e4f5a6b' }); }
    return json({ user: { display_name: 'Neo' }, entitled: true, licenses: [{ id: 'l1', plan: '7 Days', expires_at: null }] });
  };
  const platform = Object.getOwnPropertyDescriptor(process, 'platform');
  if (process.platform !== 'win32') Object.defineProperty(process, 'platform', { value: 'win32' });
  try {
    const acc = createH1tAccount({ getPath: () => dir });
    await acc.load();
    await acc.refresh(true);
    return proofs[0];
  } finally { Object.defineProperty(process, 'platform', platform); global.fetch = old; }
}
function session(dir) {
  fs.writeFileSync(path.join(dir, 'h1t-session.json'), JSON.stringify({ v: 1, secret: Buffer.from(JSON.stringify({ k: pcKey, v: 'e'.repeat(64) })).toString('base64'), consent: true, diagnostics: { consent: true } }));
}

test('first check keeps the old digest, later MachineGuid changes do not move it', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'h1t-seed-'));
  try {
    guid = '4C3B2A19-0000-4000-8000-1234567890AB'; pcKey = 'pc-a'; session(dir);
    const first = await proofSeen(dir);
    assert.equal(first, digest(guid)); // identical to the digest before 1.0.25: no reset for existing customers
    guid = 'DEADBEEF-1111-4222-8333-444455556666'; // spoofer after a reboot
    assert.equal(await proofSeen(dir), first);
    guid = '01234567-89AB-4CDE-8F01-23456789ABCD';
    assert.equal(await proofSeen(dir), first);
    assert.ok(fs.existsSync(path.join(dir, 'h1t-device.bin')));
    assert.doesNotMatch(fs.readFileSync(path.join(dir, 'h1t-device.bin'), 'utf8'), /^4c3b2a19/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a seed file copied to another PC cannot be decrypted there, so the license does not move', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'h1t-seed-'));
  try {
    guid = '4C3B2A19-0000-4000-8000-1234567890AB'; pcKey = 'pc-a'; session(dir);
    const onA = await proofSeen(dir);
    pcKey = 'pc-b'; guid = 'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE'; session(dir);
    const onB = await proofSeen(dir);
    assert.notEqual(onB, onA);
    assert.equal(onB, digest(guid));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
