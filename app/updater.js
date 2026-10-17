// Eigener Updater für die portable Exe (ab 0.6.0, ohne Installer).
// 1. fragt die GitHub-API nach dem neuesten Release (aspectX101/Tests1)
// 2. lädt UNDCC-Tweaker-<version>.exe neben die laufende Exe (…exe.new) und prüft Größe + SHA-256
// 3. ersetzt beim Neustart (oder Beenden) die alte Exe per kleinem PowerShell-Skript und startet sie neu
// Sucht beim Start, beim Öffnen der Einstellungen und alle 2 Stunden. Protokoll: %APPDATA%\<App>\logs\updater.log
const { app, shell, net } = require('electron');
const { spawn } = require('child_process');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

const REPO = 'aspectX101/Tests1';
const API_LATEST = `https://api.github.com/repos/${REPO}/releases/latest`;
const RELEASES_URL = `https://github.com/${REPO}/releases/latest`;
const ASSET_RE = /^UNDCC-Tweaker-(\d+\.\d+\.\d+)\.exe$/;
const CHECK_EVERY = 2 * 60 * 60 * 1000;
const LOG_MAX = 512 * 1024;

let state = { status: 'unsupported', current: app.getVersion() };
let notify = () => {};
let logFile = null;
let exePath = null;   // die portable Exe, die der Nutzer gestartet hat
let pending = null;   // { file, version } – fertig geladenes Update
let busy = false;
let applying = false;

function log(level, msg) {
  if (!logFile) return;
  try {
    if (fs.existsSync(logFile) && fs.statSync(logFile).size > LOG_MAX) fs.renameSync(logFile, logFile + '.old');
    fs.appendFileSync(logFile, `${new Date().toISOString()} [${level}] ${String(msg).split('\n').slice(0, 6).join(' | ')}\n`);
  } catch { /* Protokoll ist nur Hilfe, nie ein Grund für einen Absturz */ }
}

function set(patch) {
  state = { ...state, ...patch };
  notify(state);
}

// 1.2.10 > 1.2.9 – nur x.y.z, mehr erzeugt electron-builder nicht.
function newer(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
}

// Passende Exe im Release finden; Version kommt aus dem Dateinamen, nicht aus dem Tag.
function pickAsset(release) {
  for (const a of release?.assets || []) {
    const m = ASSET_RE.exec(a.name);
    if (m) return { url: a.browser_download_url, name: a.name, size: a.size, version: m[1], sha256: /^sha256:([0-9a-f]{64})$/.exec(a.digest || '')?.[1] || null };
  }
  return null;
}

function start(onChange) {
  notify = onChange;
  // Nur in der portablen Windows-Exe (electron-builder setzt PORTABLE_EXECUTABLE_FILE).
  exePath = process.env.PORTABLE_EXECUTABLE_FILE || null;
  if (!app.isPackaged || process.platform !== 'win32' || !exePath) return;
  logFile = path.join(app.getPath('logs'), 'updater.log');
  try { fs.mkdirSync(path.dirname(logFile), { recursive: true }); } catch { /* egal */ }
  log('info', `start v${app.getVersion()} exe=${exePath}`);
  // Reste eines abgebrochenen Downloads entfernen.
  try { fs.rmSync(exePath + '.new', { force: true }); fs.rmSync(exePath + '.part', { force: true }); } catch { /* egal */ }
  set({ status: 'idle' });
  check();
  setInterval(check, CHECK_EVERY).unref();
  app.on('will-quit', () => { if (pending && !applying) apply(false); });
}

async function check() {
  if (!exePath || busy || pending) return;
  busy = true;
  set({ status: 'checking', error: null });
  try {
    log('info', `GET ${API_LATEST}`);
    const res = await net.fetch(API_LATEST, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'UNDCC-Tweaker' }, cache: 'no-store' });
    if (!res.ok) throw new Error(`GitHub antwortet mit ${res.status}`);
    const release = await res.json();
    const asset = pickAsset(release);
    log('info', `latest tag=${release.tag_name} asset=${asset?.name || '-'} current=${app.getVersion()}`);
    if (!asset || !newer(asset.version, app.getVersion())) {
      set({ status: 'latest', latest: asset?.version, checkedAt: new Date().toISOString() });
      return;
    }
    set({ status: 'downloading', version: asset.version, percent: 0, checkedAt: new Date().toISOString() });
    const file = await download(asset, exePath);
    pending = { file, version: asset.version };
    log('info', `downloaded ${asset.version} -> ${file}`);
    set({ status: 'ready', version: asset.version });
  } catch (err) {
    log('error', err?.stack || err);
    set({ status: 'error', error: String(err?.message || err), checkedAt: new Date().toISOString() });
  } finally {
    busy = false;
  }
}

// GET mit Weiterleitungen über Nodes https: Electrons net.fetch bekommt vom GitHub-Download-Server
// (release-assets.githubusercontent.com) reproduzierbar HTTP 500, curl und Node dagegen 200.
function httpsGet(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'UNDCC-Tweaker', Accept: 'application/octet-stream' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume();
        resolve(httpsGet(new URL(res.headers.location, url).toString(), redirects - 1));
      } else if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`Download fehlgeschlagen (${res.statusCode})`));
      } else resolve(res);
    }).on('error', reject).setTimeout(60000, function () { this.destroy(new Error('Download-Zeitüberschreitung')); });
  });
}

async function download(asset, target) {
  const part = target + '.part';
  const done = target + '.new';
  const body = await httpsGet(asset.url);
  const out = fs.createWriteStream(part);
  const hash = crypto.createHash('sha256');
  let got = 0;
  let lastPct = -1;
  try {
    for await (const chunk of body) {
      const buf = Buffer.from(chunk);
      hash.update(buf);
      got += buf.length;
      if (!out.write(buf)) await new Promise((r) => out.once('drain', r));
      const pct = asset.size ? Math.floor((got / asset.size) * 100) : 0;
      if (pct !== lastPct) { lastPct = pct; set({ percent: pct }); }
    }
  } finally {
    await new Promise((r) => out.end(r));
  }
  const sha = hash.digest('hex');
  const fail = (msg) => { fs.rmSync(part, { force: true }); throw new Error(msg); };
  if (asset.size && got !== asset.size) fail(`Download unvollständig (${got} von ${asset.size} Bytes)`);
  if (asset.sha256 && sha !== asset.sha256) fail('Prüfsumme stimmt nicht – Download verworfen');
  fs.renameSync(part, done);
  return done;
}

// Ersetzt die Exe, sobald sie frei ist (der portable Starter beendet sich mit der App), und startet sie neu.
const APPLY_SCRIPT = `
$src = $env:UNDCC_NEW; $dst = $env:UNDCC_EXE
for ($i = 0; $i -lt 120; $i++) {
  try { Move-Item -LiteralPath $src -Destination $dst -Force -ErrorAction Stop; $ok = $true; break } catch { Start-Sleep -Milliseconds 500 }
}
if ($ok -and $env:UNDCC_RELAUNCH -eq '1') { Start-Process -FilePath $dst }`;

function apply(relaunch) {
  if (!pending || applying) return;
  applying = true;
  const ps = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  log('info', `apply ${pending.version} relaunch=${relaunch}`);
  spawn(ps, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden',
    '-EncodedCommand', Buffer.from(APPLY_SCRIPT, 'utf16le').toString('base64')], {
    detached: true, stdio: 'ignore', windowsHide: true,
    env: { ...process.env, UNDCC_NEW: pending.file, UNDCC_EXE: exePath, UNDCC_RELAUNCH: relaunch ? '1' : '0' },
  }).unref();
}

function install() {
  if (state.status !== 'ready') return;
  apply(true);
  app.quit();
}

const openLog = () => logFile && shell.openPath(logFile);
const openReleases = () => shell.openExternal(RELEASES_URL);

module.exports = { start, check, install, openLog, openReleases, getState: () => state, _test: { newer, pickAsset, download, APPLY_SCRIPT } };
