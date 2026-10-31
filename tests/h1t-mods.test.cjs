'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createH1tMods, cleanIndex, BASE } = require('../app/h1t-mods');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const zip = Buffer.from('PK fake nve archive');
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const entry = (o = {}) => ({ id: 'h1t-nve-midnight', name: 'H1T Midnight NVE', category: 'nve', version: '1.0', author: 'H1T.CC',
  description: { de: 'Dunkle Nächte', en: 'Dark nights', it: 'Notti scure' }, file: 'h1t-nve-midnight.zip', size: zip.length, sha256: sha(zip),
  preview: 'h1t-nve-midnight.jpg', previewSha256: sha(jpg), ...o });

test('index entries are validated strictly; unsafe or malformed ones are dropped', () => {
  const mods = cleanIndex({ version: 1, mods: [entry(), entry({ id: 'h1t-map-clean', category: 'minimap', file: 'h1t-map-clean.zip', preview: null }),
    entry({ id: '../evil', file: '../evil.zip' }), entry({ id: 'h1t-exe', file: 'tool.exe' }), entry({ id: 'h1t-cat', category: 'script' }),
    entry({ id: 'h1t-sha', sha256: 'abc' }), entry()] });
  assert.deepEqual(mods.map((m) => m.id), ['h1t-nve-midnight', 'h1t-map-clean']);
  assert.equal(mods[1].preview, null);
  assert.throws(() => cleanIndex({ version: 2, mods: [] }), /h1t_mods_index_invalid/);
});

function setup({ modBytes = zip } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'h1t-'));
  const calls = [];
  const files = { 'index.json': Buffer.from(JSON.stringify({ version: 1, mods: [entry()] })), 'h1t-nve-midnight.zip': modBytes, 'h1t-nve-midnight.jpg': jpg };
  const get = async (url, max, onProgress) => { const f = url.slice(BASE.length); if (!files[f]) throw new Error('h1t_mods_not_published'); onProgress?.(100); return files[f]; };
  const backend = async (req) => { calls.push(req);
    if (req.action === 'mods-list') return { ok: true, mods: calls.some((c) => c.action === 'mods-import') ? [{ id: 'aaaaaaaaaaaa' }] : [] };
    if (req.action === 'mods-import') return { ok: true, mod: { id: 'aaaaaaaaaaaa', name: req.name } };
    return { ok: true }; };
  const svc = createH1tMods({ getPath: () => dir }, backend, { get });
  return { svc, calls, dir };
}

test('list shows previews and install state; install verifies, imports as the right category and enables', async () => {
  const { svc, calls, dir } = setup();
  let r = await svc.list();
  assert.equal(r.ok, true); assert.equal(r.mods[0].installed, false); assert.match(r.mods[0].preview, /^data:image\/jpeg;base64,/);
  const progress = []; svc.onProgress((p) => progress.push(p.percent));
  const done = await svc.install('h1t-nve-midnight');
  assert.equal(done.ok, true); assert.equal(done.enabled, true);
  const imp = calls.find((c) => c.action === 'mods-import');
  assert.equal(imp.category, 'graphics'); assert.equal(imp.name, 'H1T Midnight NVE'); assert.ok(path.isAbsolute(imp.modPath));
  assert.ok(calls.some((c) => c.action === 'mods-enable' && c.modId === 'aaaaaaaaaaaa'));
  assert.ok(progress.includes(100));
  r = await svc.list();
  assert.equal(r.mods[0].installed, true); assert.equal(r.mods[0].update, false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a damaged download is never imported', async () => {
  const { svc, calls, dir } = setup({ modBytes: Buffer.from('PK tampered archive!') });
  await svc.list();
  const r = await svc.install('h1t-nve-midnight');
  assert.equal(r.ok, false); assert.equal(r.error, 'h1t_mods_checksum');
  assert.equal(calls.some((c) => c.action === 'mods-import'), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('not published yet is a clear, translated state', async () => {
  const { dir } = setup();
  const svc = createH1tMods({ getPath: () => dir }, async () => ({ ok: true, mods: [] }), { get: async () => { throw new Error('h1t_mods_not_published'); } });
  const r = await svc.list();
  assert.equal(r.ok, false); assert.equal(r.error, 'h1t_mods_not_published');
  fs.rmSync(dir, { recursive: true, force: true });
});
