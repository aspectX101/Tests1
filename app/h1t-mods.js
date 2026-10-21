'use strict';
// FiveM > H1T Mods: our own NVEs and minimaps, published as files in the GitHub release "h1t-mods"
// (index.json + <id>.zip + preview image). Install = download, verify SHA-256, then the normal
// Mod Manager import (no executables, originals backed up) and enable. See docs/h1t-mods.md.
const https = require('node:https');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const BASE = 'https://github.com/aspectX101/Tests1/releases/download/h1t-mods/';
const INDEX_MAX = 256 * 1024;
const PREVIEW_MAX = 2 * 1024 * 1024;
const MOD_MAX = 400 * 1024 * 1024;
const CATEGORY = { nve: 'graphics', minimap: 'minimap' };
const ID_RE = /^[a-z0-9][a-z0-9-]{2,47}$/;
const SHA_RE = /^[a-f0-9]{64}$/;

// Strict check of one index entry; anything unexpected is dropped.
function cleanEntry(e) {
  if (!e || typeof e !== 'object' || !ID_RE.test(e.id) || !CATEGORY[e.category]) return null;
  const text = (v, max) => (typeof v === 'string' && v.trim() && v.length <= max && !/[\x00-\x1f]/.test(v) ? v.trim() : null);
  const name = text(e.name, 60), version = text(e.version, 20) || '1.0', author = text(e.author, 40) || 'H1T.CC';
  if (!name || e.file !== `${e.id}.zip` || !SHA_RE.test(e.sha256 || '') || !Number.isInteger(e.size) || e.size <= 0 || e.size > MOD_MAX) return null;
  const description = {};
  for (const lang of ['de', 'en', 'it']) description[lang] = text(e.description?.[lang], 400) || '';
  const preview = typeof e.preview === 'string' && new RegExp(`^${e.id}\\.(jpg|jpeg|png|webp)$`).test(e.preview) && SHA_RE.test(e.previewSha256 || '') ? e.preview : null;
  return { id: e.id, name, category: e.category, version, author, description, file: e.file, size: e.size, sha256: e.sha256, preview, previewSha256: preview ? e.previewSha256 : null };
}
function cleanIndex(json) {
  if (!json || json.version !== 1 || !Array.isArray(json.mods)) throw new Error('h1t_mods_index_invalid');
  const seen = new Set();
  return json.mods.slice(0, 200).map(cleanEntry).filter((m) => m && !seen.has(m.id) && seen.add(m.id));
}

// GET with redirects (GitHub release assets redirect to a CDN); size-capped.
function get(url, max, onProgress, redirects = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'H1T-Tweak-Utility', Accept: 'application/octet-stream' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume(); resolve(get(new URL(res.headers.location, url).toString(), max, onProgress, redirects - 1)); return;
      }
      if (res.statusCode === 404) { res.resume(); reject(new Error('h1t_mods_not_published')); return; }
      if (res.statusCode !== 200) { res.resume(); reject(new Error('h1t_mods_download_failed')); return; }
      const total = Number(res.headers['content-length']) || 0;
      if (total > max) { res.resume(); reject(new Error('h1t_mods_too_large')); return; }
      const chunks = []; let got = 0;
      res.on('data', (c) => { got += c.length; if (got > max) { req.destroy(new Error('h1t_mods_too_large')); return; } chunks.push(c); if (onProgress && total) onProgress(Math.floor((got / total) * 100)); });
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', (err) => reject(new Error(err.message?.startsWith('h1t_mods_') ? err.message : 'h1t_mods_offline')));
    req.setTimeout(60000, () => req.destroy(new Error('h1t_mods_offline')));
  });
}
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const mime = (file) => (/\.png$/i.test(file) ? 'image/png' : /\.webp$/i.test(file) ? 'image/webp' : 'image/jpeg');

function createH1tMods(app, backend, options = {}) {
  const fetchBuf = options.get || get;
  const dir = () => path.join(app.getPath('userData'), 'h1t-mods');
  const installedFile = () => path.join(dir(), 'installed.json');
  const previews = new Map();
  let index = null, busy = null, listener = () => {};
  const readInstalled = () => { try { return JSON.parse(fs.readFileSync(installedFile(), 'utf8')) || {}; } catch { return {}; } };
  const writeInstalled = (v) => { fs.mkdirSync(dir(), { recursive: true }); fs.writeFileSync(installedFile(), JSON.stringify(v, null, 2)); };

  async function preview(m) {
    if (!m.preview) return null;
    if (previews.has(m.id)) return previews.get(m.id);
    try {
      const buf = await fetchBuf(BASE + m.preview, PREVIEW_MAX);
      const url = sha256(buf) === m.previewSha256 ? `data:${mime(m.preview)};base64,${buf.toString('base64')}` : null;
      previews.set(m.id, url); return url;
    } catch { return null; }
  }

  async function list() {
    try {
      index = cleanIndex(JSON.parse((await fetchBuf(BASE + 'index.json', INDEX_MAX)).toString('utf8')));
    } catch (err) {
      return { ok: false, error: err instanceof SyntaxError ? 'h1t_mods_index_invalid' : err.message };
    }
    const installed = readInstalled();
    let present = null;
    try { const r = await backend({ action: 'mods-list', lang: 'en' }); if (r?.ok) present = new Set((r.mods || []).map((x) => x.id)); } catch { /* list without install state */ }
    const mods = await Promise.all(index.map(async (m) => {
      const own = installed[m.id];
      const isInstalled = !!own && (!present || present.has(own.modId));
      return { ...m, preview: await preview(m), installed: isInstalled, installedVersion: isInstalled ? own.version : null, update: isInstalled && own.version !== m.version };
    }));
    return { ok: true, mods };
  }

  async function install(id) {
    if (busy) return { ok: false, error: 'h1t_mods_busy' };
    const m = index?.find((x) => x.id === id);
    if (!m) return { ok: false, error: 'h1t_mods_unknown' };
    busy = id;
    try {
      listener({ id, percent: 0 });
      const buf = await fetchBuf(BASE + m.file, MOD_MAX, (percent) => listener({ id, percent }));
      if (buf.length !== m.size || sha256(buf) !== m.sha256) throw new Error('h1t_mods_checksum');
      const file = path.join(dir(), 'downloads', `${m.id}.zip`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, buf);
      const installed = readInstalled();
      // An older version of the same H1T mod is removed first, so updates never stack.
      if (installed[m.id]?.modId) { try { await backend({ action: 'mods-remove', modId: installed[m.id].modId, lang: 'en' }); } catch { /* already gone */ } }
      const imported = await backend({ action: 'mods-import', modPath: file, category: CATEGORY[m.category], name: m.name, lang: 'en' });
      if (!imported?.ok || !imported.mod?.id) throw new Error(imported?.error || 'h1t_mods_import_failed');
      installed[m.id] = { modId: imported.mod.id, version: m.version, installedUtc: new Date().toISOString() };
      writeInstalled(installed);
      const enabled = await backend({ action: 'mods-enable', modId: imported.mod.id, lang: 'en' });
      try { fs.rmSync(file, { force: true }); } catch { /* temp file */ }
      listener({ id, percent: 100 });
      return { ok: true, enabled: !!enabled?.ok, error: enabled?.ok ? null : enabled?.error || null, mod: imported.mod };
    } catch (err) {
      return { ok: false, error: String(err?.message || err).startsWith('h1t_mods_') ? err.message : String(err?.message || 'h1t_mods_import_failed') };
    } finally { busy = null; }
  }

  return { list, install, onProgress(cb) { listener = cb; } };
}

module.exports = { createH1tMods, cleanIndex, cleanEntry, BASE };
