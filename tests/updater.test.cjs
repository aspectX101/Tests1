'use strict';
// Updater without Electron or network: electron and https are replaced by fakes.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {Readable} = require('node:stream');

function load({release, status = 200, headers = {}, bytes}) {
  const fetched = [], downloads = [];
  const electron = {
    app: { getVersion: () => '0.9.16', isPackaged: true, getPath: () => os.tmpdir(), on() {} },
    shell: {}, net: { fetch: async (url) => { fetched.push(url); return { ok: status === 200, status, headers: { get: (k) => headers[k] ?? null }, json: async () => release() }; } },
  };
  const https = { get(url, opts, cb) { downloads.push(url); const res = Readable.from([bytes(url)]); res.statusCode = 200; res.headers = {}; process.nextTick(() => cb(res)); return { on() { return this; }, setTimeout() { return this; } }; } };
  const original = Module._load;
  Module._load = function (request, ...rest) { if (request === 'electron') return electron; if (request === 'https') return https; return original.call(this, request, ...rest); };
  try { delete require.cache[require.resolve('../app/updater')]; return { updater: require('../app/updater'), fetched, downloads }; }
  finally { Module._load = original; }
}
const asset = (v, data) => ({ name: `UNDCC-Tweaker-${v}.exe`, size: data.length, browser_download_url: `https://example.invalid/${v}`, digest: 'sha256:' + crypto.createHash('sha256').update(data).digest('hex') });

test('a newer release replaces an already downloaded update instead of being ignored', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'upd-'));
  const exe = path.join(dir, 'UNDCC-Tweaker.exe'); fs.writeFileSync(exe, 'old');
  const data = { '0.9.17': Buffer.from('build 0.9.17'), '0.9.18': Buffer.from('build 0.9.18 bigger') };
  let latest = '0.9.17';
  const { updater, downloads } = load({ release: () => ({ tag_name: 'v' + latest, assets: [asset(latest, data[latest])] }), bytes: (url) => data[url.split('/').pop()] });
  updater._test.useExe(exe);
  await updater.check();
  assert.equal(updater.getState().status, 'ready'); assert.equal(updater._test.pending().version, '0.9.17');
  // Same release again: stays ready, no second download.
  await updater.check();
  assert.equal(downloads.length, 1); assert.equal(updater.getState().status, 'ready'); assert.equal(updater.getState().version, '0.9.17');
  // 0.9.18 appears while 0.9.17 is waiting for the restart.
  latest = '0.9.18';
  await updater.check();
  assert.equal(downloads.length, 2); assert.equal(updater.getState().status, 'ready'); assert.equal(updater.getState().version, '0.9.18');
  assert.equal(fs.readFileSync(exe + '.new', 'utf8'), 'build 0.9.18 bigger');
  fs.rmSync(dir, { recursive: true, force: true });
});
test('a failed re-check keeps the downloaded update installable; rate limit is explained', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'upd-'));
  const exe = path.join(dir, 'UNDCC-Tweaker.exe'); fs.writeFileSync(exe, 'old');
  const bytes = Buffer.from('build 0.9.17');
  let limited = false;
  const ctx = load({ release: () => ({ tag_name: 'v0.9.17', assets: [asset('0.9.17', bytes)] }), bytes: () => bytes });
  ctx.updater._test.useExe(exe);
  await ctx.updater.check();
  assert.equal(ctx.updater.getState().status, 'ready');
  const res = { status: 403, headers: { get: (k) => ({ 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 600) })[k] ?? null } };
  assert.match(ctx.updater._test.rateLimitText(res), /Abfragelimit/);
  assert.equal(ctx.updater._test.rateLimitText({ status: 404, headers: { get: () => null } }), null);
  fs.rmSync(dir, { recursive: true, force: true });
});
