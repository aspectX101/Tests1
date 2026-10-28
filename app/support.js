'use strict';
// Support log and report. Every failed backend request (and every failed item of a batch, e.g. a restore) is
// appended to logs\backend.log with its stable code, the technical detail and where it happened. "Export support
// report" writes one JSON file with system info, license/update state, the active backups and the recent logs,
// so a customer can send a single file instead of screenshots. User names in paths are replaced with %USERNAME%.
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const LOG_MAX = 512 * 1024;
const LOG_KEEP = 400;

function createRedactor({ home = os.homedir(), user = os.userInfo?.().username } = {}) {
  const rules = [];
  const add = (value, label) => rules.push([new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), label]);
  if (home) add(home.replace(/[\\/]+$/, ''), '%USERPROFILE%');
  if (user && user.length > 2) add(user, '%USERNAME%');
  return (text) => rules.reduce((out, [re, label]) => out.replace(re, label), String(text ?? ''));
}

function createSupport({ logDir, version = '0.0.0', now = () => new Date(), redact = createRedactor() } = {}) {
  const file = path.join(logDir, 'backend.log');

  function write(entry) {
    try {
      fs.mkdirSync(logDir, { recursive: true });
      if (fs.existsSync(file) && fs.statSync(file).size > LOG_MAX) fs.renameSync(file, file + '.old');
      fs.appendFileSync(file, JSON.stringify({ t: now().toISOString(), v: version, ...entry }, (k, v) => (typeof v === 'string' ? redact(v) : v)) + '\n');
    } catch { /* the log only helps support, it never breaks a request */ }
  }

  // Called with every backend request and its answer (or the thrown error).
  function record(req, res, err) {
    const base = { action: String(req?.action || ''), ...(req?.id ? { id: String(req.id) } : {}) };
    if (err) return write({ ...base, error: String(err.message || err) });
    if (!res || typeof res !== 'object') return undefined;
    if (res.ok === false) write({ ...base, error: String(res.error || 'unknown'), ...(res.detail ? { detail: String(res.detail) } : {}), ...(res.at ? { at: String(res.at) } : {}) });
    for (const r of Array.isArray(res.results) ? res.results : []) {
      if (r?.status === 'failed') write({ ...base, item: String(r.id || r.tweakId || r.backupId || ''), error: String(r.reason || r.error || 'failed') });
    }
    return undefined;
  }

  // backend.log is redacted when written; the updater logs are plain text and redacted here.
  const tail = (name, lines, plain = true) => {
    try {
      const all = fs.readFileSync(path.join(logDir, name), 'utf8').split(/\r?\n/).filter(Boolean).slice(-lines);
      return plain ? all.map(redact) : all;
    } catch { return []; }
  };
  const entries = () => tail('backend.log', LOG_KEEP, false).map((l) => { try { return JSON.parse(l); } catch { return { raw: l }; } });

  // extra: { mode, license, update, backups } from the main process.
  function report(extra = {}) {
    const cpus = os.cpus() || [];
    return {
      kind: 'h1t-support-report', version: 1, created: now().toISOString(),
      app: { version, mode: extra.mode || null },
      system: { platform: process.platform, release: os.release(), arch: os.arch(), cpu: cpus[0]?.model?.trim() || null, cores: cpus.length,
        ramGB: Math.round(os.totalmem() / 1073741824), locale: Intl.DateTimeFormat().resolvedOptions().locale },
      license: extra.license || null,
      update: extra.update || null,
      backups: extra.backups || null,
      backendLog: entries(),
      updaterLog: tail('updater.log', 150),
      swapLog: tail('updater-swap.log', 80),
    };
  }

  return { record, report, entries, file };
}

module.exports = { createSupport, createRedactor };
