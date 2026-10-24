'use strict';
// License expiry: once this PC ran with an active H1T.CC license, every change the tweaker made is restored
// to its original value when the server confirms there is no active license any more, or - when the server
// cannot confirm (offline, signed out) - once the last known expiry date has passed.
// Restoring uses the same recovery records as "Revert All" (exact original values), never guessed defaults.
const path = require('node:path');
const fs = require('node:fs/promises');

const RESTORE_KINDS = new Set(['tweak', 'startup']);
// Statuses that come from a successful server answer showing an active license on the account.
const LICENSED = new Set(['active', 'diagnostics_required', 'device_unbound', 'device_consent_required']);
// Statuses that carry no verdict about the license (local states, in progress).
const NEUTRAL = new Set(['checking', 'development']);
const RETRY_AFTER = 60 * 60000;

const toMs = (v) => {
  if (Number.isFinite(v) && v > 0) return v < 1e12 ? v * 1000 : v;
  const t = typeof v === 'string' ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : null;
};
// Latest expiry over all active licenses; null = at least one has no end (lifetime).
function licenseEnd(licenses) {
  if (!licenses.length) return { lifetime: false, expires_at: null };
  if (licenses.some((l) => l.expires_at === null || l.expires_at === undefined || l.expires_at === '')) return { lifetime: true, expires_at: null };
  const ends = licenses.map((l) => toMs(l.expires_at)).filter((t) => t !== null);
  return ends.length ? { lifetime: false, expires_at: Math.max(...ends) } : { lifetime: false, expires_at: null };
}

function createLicenseExpiry(app, { backend, resetColor = async () => null, task = null, onChange = () => {}, now = () => Date.now() } = {}) {
  const file = path.join(app.getPath('userData'), 'h1t-license-state.json');
  const EMPTY = { v: 1, licensed: false, lifetime: false, expires_at: null, retry_at: null, reverted_at: null, result: null };
  let st = { ...EMPTY }, running = null, busy = false;

  async function load() {
    try {
      const o = JSON.parse(await fs.readFile(file, 'utf8'));
      if (o.v !== 1) return;
      st = { ...EMPTY, licensed: o.licensed === true, lifetime: o.lifetime === true, expires_at: toMs(o.expires_at),
        retry_at: toMs(o.retry_at), reverted_at: toMs(o.reverted_at), result: o.result && typeof o.result === 'object' ? o.result : null };
    } catch {}
  }
  async function save() {
    try { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(st), { mode: 0o600 }); } catch {}
  }
  const publicState = () => ({ running: busy, reverted_at: st.reverted_at, result: st.result });
  const due = () => !st.retry_at || now() >= st.retry_at;

  // Restore everything the tweaker changed. One run at a time; failures are retried an hour later.
  function revert(reason) {
    if (running) return running;
    busy = true;
    running = (async () => {
      onChange(publicState());
      const items = [];
      let restart = false;
      try {
        const list = await backend({ action: 'backup-list' });
        if (!list?.ok) items.push({ kind: 'list', ok: false, error: list?.error || 'backup_list_failed' });
        for (const b of (list?.ok ? list.backups : []).filter((x) => RESTORE_KINDS.has(x.kind) && x.canRestore)) {
          const r = await backend({ action: 'backup-restore', backupId: b.backupId });
          const fail = r?.results?.find((x) => x.status === 'failed');
          const ok = r?.ok === true && !fail;
          items.push({ kind: b.kind, id: String(b.tweakId || ''), ok, ...(ok ? {} : { error: String(fail?.reason || r?.error || 'restore_failed') }) });
          if (r?.restartRequired) restart = true;
        }
      } catch (e) { items.push({ kind: 'list', ok: false, error: e.message || 'backup_list_failed' }); }
      try {
        const res = await backend({ action: 'res-get' });
        if (res?.ok && res.hasBackup) {
          const r = await backend({ action: 'res-reset' });
          items.push({ kind: 'resolution', ok: r?.ok === true, ...(r?.ok ? {} : { error: String(r?.error || 'resolution_reset_failed') }) });
        }
      } catch {}
      try {
        const c = await resetColor();
        if (c !== null) items.push({ kind: 'color', ok: c === true, ...(c ? {} : { error: 'color_reset_failed' }) });
      } catch { items.push({ kind: 'color', ok: false, error: 'color_reset_failed' }); }
      const failed = items.filter((x) => !x.ok).length;
      st = { ...st, licensed: failed > 0, retry_at: failed ? now() + RETRY_AFTER : null, reverted_at: now(),
        result: { reason, restored: items.length - failed, failed, restart_required: restart, items: items.slice(0, 200) } };
      await save();
      if (!failed) await task?.remove().catch(() => {});
      return { running: false, reverted_at: st.reverted_at, result: st.result };
    })().finally(() => { running = null; busy = false; onChange(publicState()); });
    return running;
  }

  // Offline / signed out: the server cannot confirm, so the stored end date decides.
  async function checkLocal() {
    if (st.licensed && !st.lifetime && st.expires_at && now() > st.expires_at && due()) return revert('license_expired');
    return null;
  }

  // Called with every account snapshot from the main process.
  async function observe(s) {
    if (!s || s.demo || NEUTRAL.has(s.status)) return null;
    const licenses = Array.isArray(s.licenses) ? s.licenses : [];
    if (LICENSED.has(s.status) && licenses.length) {
      const end = licenseEnd(licenses);
      const next = { ...st, lifetime: end.lifetime, expires_at: end.expires_at };
      // Only a PC that actually ran with the license is armed; a renewed license clears an old revert.
      if (s.status === 'active') Object.assign(next, { licensed: true, retry_at: null, reverted_at: null, result: null });
      const changed = JSON.stringify(next) !== JSON.stringify(st);
      st = next;
      if (changed) { await save(); onChange(publicState()); }
      if (st.licensed) await task?.sync(st).catch(() => {});
      return null;
    }
    // The server answered: this account has no active license (expired, revoked or removed).
    if (s.status === 'license_required') return st.licensed && due() ? revert('license_expired') : null;
    // Signed out, network or server error: no verdict from the server, fall back to the known end date.
    return checkLocal();
  }

  return { load, observe, checkLocal, revert, publicState, state: () => ({ ...st }) };
}

module.exports = { createLicenseExpiry, licenseEnd };
