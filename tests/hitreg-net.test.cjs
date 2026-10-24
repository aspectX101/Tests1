'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const dgram = require('node:dgram');
const { runTest, parseTarget, resolveTarget, stats } = require('../app/hitreg-net');

test('server input: IP:port, hostname, IPv6 and cfx.re codes; junk is rejected', () => {
  assert.deepEqual(parseTarget('1.2.3.4:30120'), { host: '1.2.3.4', port: 30120 });
  assert.deepEqual(parseTarget('play.example.com'), { host: 'play.example.com', port: 30120 });
  assert.deepEqual(parseTarget('[2001:db8::1]:30125'), { host: '2001:db8::1', port: 30125 });
  assert.deepEqual(parseTarget('https://cfx.re/join/ab12cd'), { code: 'ab12cd' });
  assert.deepEqual(parseTarget('AB12CD'), { code: 'ab12cd' });
  for (const bad of ['', 'a b', '1.2.3.4:99999', 'http://evil/../x', 'x'.repeat(300), ';rm -rf']) assert.equal(parseTarget(bad), null, bad);
});
test('statistics: median, p95, jitter and loss', () => {
  const s = stats([20, 22, null, 21, 60, 20]);
  assert.equal(s.sent, 6); assert.equal(s.received, 5); assert.equal(s.loss, 16.7);
  assert.equal(s.median, 21); assert.equal(s.p95, 60); assert.equal(s.jitter, 20.5);
});
test('cfx.re join codes resolve through the FiveM server list', async () => {
  const ep = await resolveTarget({ code: 'ab12cd' }, async (url) => { assert.match(url, /servers\/single\/ab12cd$/); return { Data: { hostname: '^1My ^7Server', connectEndPoints: ['5.6.7.8:30120'] } }; });
  assert.deepEqual(ep, { host: '5.6.7.8', port: 30120, name: 'My Server' });
  await assert.rejects(resolveTarget({ code: 'zzzzzz' }, async () => ({ Data: { connectEndPoints: [] } })), /hitreg_server_not_found/);
});
test('real UDP round trip against a local FiveM-style server (getinfo/infoResponse)', async () => {
  const server = dgram.createSocket('udp4');
  let seen = 0;
  server.on('message', (msg, rinfo) => {
    const text = msg.subarray(4).toString('latin1'); const ch = /^getinfo (\S+)/.exec(text)?.[1];
    seen++; if (seen % 10 === 5) return; // drop every 10th request -> 3 lost of 30
    server.send(Buffer.concat([Buffer.from([255, 255, 255, 255]), Buffer.from(`infoResponse\n\\sv_maxclients\\64\\clients\\12\\hostname\\^2Test RP\\challenge\\${ch}`, 'latin1')]), rinfo.port, rinfo.address);
  });
  await new Promise((r) => server.bind(0, '127.0.0.1', r));
  const progress = [];
  const r = await runTest(`127.0.0.1:${server.address().port}`, (p) => progress.push(p));
  server.close();
  assert.equal(r.ok, true); assert.equal(r.method, 'udp');
  assert.equal(r.stats.sent, 30); assert.equal(r.stats.received, 27); assert.equal(r.stats.loss, 10);
  assert.equal(r.server.name, 'Test RP'); assert.equal(r.server.players, 12); assert.equal(r.server.max, 64);
  assert.ok(r.stats.median >= 0 && r.stats.median < 50);
  assert.ok(progress.filter((p) => p.phase === 'sample').length >= 27);
});
test('invalid input and unreachable servers give clear errors', async () => {
  assert.equal((await runTest('not a server')).error, 'hitreg_invalid_target');
  const r = await runTest('127.0.0.1:30120', () => {}, { udp: async () => ({ samples: new Array(30).fill(null), info: null }), http: async () => null });
  assert.equal(r.ok, false); assert.equal(r.error, 'hitreg_server_unreachable');
  const h = await runTest('127.0.0.1:30120', () => {}, { udp: async () => ({ samples: new Array(30).fill(null), info: null }), http: async () => 42 });
  assert.equal(h.ok, true); assert.equal(h.method, 'http'); assert.equal(h.stats.median, 42);
});
