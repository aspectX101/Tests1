'use strict';
// FiveM > Hitreg: live connection test to the player's FiveM server.
// Uses the FiveM out-of-band query ("getinfo", the same UDP request the server browser uses for its ping) on the
// game port, so the result reflects the real game path: round-trip time, jitter and packet loss.
// Falls back to timing HTTP /info.json when a server ignores UDP queries. Nothing is sent anywhere else.
const dgram = require('node:dgram');
const dns = require('node:dns').promises;
const https = require('node:https');
const http = require('node:http');
const net = require('node:net');

const PROBES = 30, INTERVAL = 100, TIMEOUT = 1500, DEFAULT_PORT = 30120;
const HEADER = Buffer.from([0xff, 0xff, 0xff, 0xff]);

// "1.2.3.4:30120", "play.example.com", "[2001:db8::1]:30120", "cfx.re/join/abc123", "abc123"
function parseTarget(input) {
  const raw = String(input || '').trim().replace(/^(https?:\/\/)?(www\.)?/i, '').replace(/\/+$/, '');
  if (!raw || raw.length > 255 || /[\s\x00-\x1f]/.test(raw)) return null;
  const join = /^(?:cfx\.re\/join\/)?([a-z0-9]{6})$/i.exec(raw);
  if (join && (raw.toLowerCase().startsWith('cfx.re/join/') || !/\./.test(raw))) return { code: join[1].toLowerCase() };
  let host = raw, port = DEFAULT_PORT;
  const v6 = /^\[([0-9a-f:.]+)\](?::(\d{1,5}))?$/i.exec(raw);
  if (v6) { host = v6[1]; if (v6[2]) port = Number(v6[2]); }
  else if (/^[^:]+:\d{1,5}$/.test(raw)) { [host, port] = [raw.slice(0, raw.lastIndexOf(':')), Number(raw.slice(raw.lastIndexOf(':') + 1))]; }
  if (!(port > 0 && port < 65536)) return null;
  if (!net.isIP(host) && !/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(host)) return null;
  return { host, port };
}

function fetchJson(url, timeout = 6000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'H1T-Tweak-Utility', Accept: 'application/json' } }, (res) => {
      if (res.statusCode !== 200) { res.resume(); reject(new Error(res.statusCode === 404 ? 'hitreg_server_not_found' : 'hitreg_lookup_failed')); return; }
      let body = ''; res.setEncoding('utf8');
      res.on('data', (c) => { body += c; if (body.length > 2_000_000) req.destroy(new Error('hitreg_lookup_failed')); });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('hitreg_lookup_failed')); } });
    });
    req.on('error', () => reject(new Error('hitreg_lookup_failed')));
    req.setTimeout(timeout, () => req.destroy(new Error('hitreg_lookup_failed')));
  });
}
const plainName = (s) => String(s || '').replace(/\^\d/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);

// cfx.re join code -> endpoint via the official FiveM server list.
async function resolveTarget(target, lookup = fetchJson) {
  if (target.code) {
    const data = (await lookup(`https://servers-frontend.fivem.net/api/servers/single/${target.code}`))?.Data;
    const ep = (data?.connectEndPoints || []).map(parseTarget).find((x) => x && !x.code);
    if (!ep) throw new Error('hitreg_server_not_found');
    return { ...ep, name: plainName(data.hostname || data.vars?.sv_projectName) };
  }
  const address = net.isIP(target.host) ? target.host : (await dns.lookup(target.host).catch(() => { throw new Error('hitreg_dns_failed'); })).address;
  return { host: address, port: target.port, name: target.host };
}

// Robust statistics for a list of RTTs (ms); null entries are lost probes.
function stats(samples) {
  const ok = samples.filter((v) => typeof v === 'number');
  const sorted = [...ok].sort((a, b) => a - b);
  const pick = (q) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1) + 0.5))] : null;
  let jitter = 0;
  for (let i = 1; i < ok.length; i++) jitter += Math.abs(ok[i] - ok[i - 1]);
  const r = (v) => (v == null ? null : Math.round(v * 10) / 10);
  return {
    sent: samples.length, received: ok.length,
    loss: samples.length ? r(((samples.length - ok.length) / samples.length) * 100) : null,
    min: r(sorted[0] ?? null), median: r(pick(0.5)), p95: r(pick(0.95)), max: r(sorted[sorted.length - 1] ?? null),
    jitter: ok.length > 1 ? r(jitter / (ok.length - 1)) : null,
  };
}

function udpProbes(host, port, onSample, socketFactory = dgram.createSocket) {
  return new Promise((resolve) => {
    const sock = socketFactory(net.isIPv6(host) ? 'udp6' : 'udp4');
    const sentAt = new Map(), samples = new Array(PROBES).fill(null);
    let finished = false, timer = null, i = 0, info = null;
    const finish = () => { if (finished) return; finished = true; clearInterval(timer); try { sock.close(); } catch { /* closed */ } resolve({ samples, info }); };
    sock.on('message', (msg) => {
      if (msg.length < 16 || !msg.subarray(0, 4).equals(HEADER)) return;
      const text = msg.subarray(4).toString('latin1');
      if (!text.startsWith('infoResponse')) return;
      // Match by echoed challenge; servers that do not echo it are matched to the oldest open probe.
      const m = /\\challenge\\h1t(\d+)/.exec(text);
      let n = m ? Number(m[1]) : -1;
      if (n < 0) { for (const k of sentAt.keys()) { if (samples[k] === null) { n = k; break; } } }
      if (!sentAt.has(n) || samples[n] !== null) return;
      samples[n] = Number(process.hrtime.bigint() - sentAt.get(n)) / 1e6;
      if (!info) info = { name: plainName((/\\hostname\\([^\\]*)/.exec(text) || [])[1]), players: Number((/\\clients\\(\d+)/.exec(text) || [])[1]) || 0, max: Number((/\\sv_maxclients\\(\d+)/.exec(text) || [])[1]) || 0 };
      onSample?.(n, samples[n]);
    });
    sock.on('error', finish);
    const send = () => {
      if (i >= PROBES) { clearInterval(timer); setTimeout(finish, TIMEOUT); return; }
      const n = i++; sentAt.set(n, process.hrtime.bigint());
      sock.send(Buffer.concat([HEADER, Buffer.from(`getinfo h1t${n}`, 'latin1')]), port, host, () => {});
      setTimeout(() => { if (samples[n] === null && !finished) onSample?.(n, null); }, TIMEOUT);
    };
    timer = setInterval(send, INTERVAL); send();
  });
}

function httpProbe(host, port) {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    const req = http.get({ host, port, path: '/info.json', headers: { 'User-Agent': 'H1T-Tweak-Utility' }, timeout: TIMEOUT }, (res) => {
      res.resume(); res.on('end', () => resolve(res.statusCode < 500 ? Number(process.hrtime.bigint() - start) / 1e6 : null));
    });
    req.on('timeout', () => req.destroy()); req.on('error', () => resolve(null));
  });
}

async function runTest(input, onProgress = () => {}, deps = {}) {
  const target = parseTarget(input);
  if (!target) return { ok: false, error: 'hitreg_invalid_target' };
  let ep;
  try { ep = await resolveTarget(target, deps.lookup); } catch (err) { return { ok: false, error: err.message }; }
  onProgress({ phase: 'udp', host: ep.host, port: ep.port });
  const { samples, info } = await (deps.udp || udpProbes)(ep.host, ep.port, (i, rtt) => onProgress({ phase: 'sample', i, rtt, total: PROBES }));
  let method = 'udp', list = samples;
  if (!samples.some((v) => typeof v === 'number')) {
    // Server ignores UDP queries: time HTTP requests instead (latency only, loss is not meaningful over TCP).
    method = 'http'; list = [];
    for (let k = 0; k < 10; k++) { const v = await (deps.http || httpProbe)(ep.host, ep.port); list.push(v); onProgress({ phase: 'sample', i: k, rtt: v, total: 10 }); }
    if (!list.some((v) => typeof v === 'number')) return { ok: false, error: 'hitreg_server_unreachable' };
  }
  return { ok: true, method, server: { name: info?.name || ep.name || ep.host, host: ep.host, port: ep.port, players: info?.players ?? null, max: info?.max ?? null },
    samples: list.map((v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : null)), stats: stats(list) };
}

module.exports = { runTest, parseTarget, resolveTarget, stats, PROBES };
