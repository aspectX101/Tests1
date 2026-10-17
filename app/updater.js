// Eigener Updater für die portable Exe (ab 0.6.0, ohne Installer).
// 1. fragt die GitHub-API nach dem neuesten Release (aspectX101/Tests1)
// 2. lädt UNDCC-Tweaker-<version>.exe neben die laufende Exe (…exe.new) und prüft Größe + SHA-256
// 3. ersetzt beim Neustart (oder Beenden) die alte Exe per PowerShell-Skript (über WMI gestartet) und startet sie neu
// Sucht beim Start, beim Öffnen der Einstellungen und alle 2 Stunden. Protokoll: %APPDATA%\<App>\logs\updater.log
const { app, shell, net } = require('electron');
const { spawn, spawnSync } = require('child_process');
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
// Tausch-Skript: wartet auf das Ende der App, ersetzt die Exe (sobald der portable Starter sie freigibt) und startet
// neu. Klappt der Tausch nicht, wird wenigstens die alte Exe wieder gestartet. Jeder Schritt: logs\updater-swap.log
const SWAP_SCRIPT = `param([string]$Src, [string]$Dst, [string]$Log, [int]$Relaunch, [int]$WaitPid)
function L($m) { try { Add-Content -LiteralPath $Log -Value ('{0} {1}' -f (Get-Date -Format o), $m) } catch {} }
L "swap start pid=$PID src=$Src dst=$Dst relaunch=$Relaunch waitPid=$WaitPid"
try { Wait-Process -Id $WaitPid -Timeout 60 -ErrorAction Stop; L 'app exited' } catch { L "wait: $($_.Exception.Message)" }
$ok = $false
for ($i = 1; $i -le 180; $i++) {
  try { Move-Item -LiteralPath $Src -Destination $Dst -Force -ErrorAction Stop; $ok = $true; L "replaced after $($i) tries"; break }
  catch { if ($i -eq 1 -or $i % 20 -eq 0) { L "try $($i): $($_.Exception.Message)" }; Start-Sleep -Milliseconds 500 }
}
if (-not $ok) { L 'FAILED: exe not replaced, starting old version' }
if ($Relaunch -eq 1 -or -not $ok) {
  try { Start-Process -FilePath $Dst; L 'relaunched' } catch { L "relaunch failed: $($_.Exception.Message)" }
}
L 'swap done'
`;

// Startet das Tausch-Skript über WMI (Win32_Process.Create). Dadurch ist es kein Kindprozess der App und hängt
// an keinem ihrer Jobs – es überlebt das Beenden sicher. Fallback: normal abgekoppelt starten.
function apply(relaunch) {
  if (!pending || applying) return;
  applying = true;
  const ps = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const script = path.join(app.getPath('temp'), 'undcc-tweaker-swap.ps1');
  const swapLog = path.join(path.dirname(logFile), 'updater-swap.log');
  try {
    fs.writeFileSync(script, '\ufeff' + SWAP_SCRIPT, 'utf8');
  } catch (err) {
    log('error', `swap script not written: ${err.message}`);
    applying = false;
    return;
  }
  const cmd = `"${ps}" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "${script}"` +
    ` -Src "${pending.file}" -Dst "${exePath}" -Log "${swapLog}" -Relaunch ${relaunch ? 1 : 0} -WaitPid ${process.pid}`;
  log('info', `apply ${pending.version} relaunch=${relaunch} cmd=${cmd}`);
  const launcher = "$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $env:UNDCC_CMD }; [Console]::Out.Write(\"$($r.ReturnValue) $($r.ProcessId)\")";
  const res = spawnSync(ps, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(launcher, 'utf16le').toString('base64')],
    { env: { ...process.env, UNDCC_CMD: cmd }, windowsHide: true, encoding: 'utf8', timeout: 30000 });
  const [code, pid] = String(res.stdout || '').trim().split(' ');
  log('info', `wmi create -> code=${code} pid=${pid} err=${String(res.stderr || res.error || '').trim().slice(0, 300)}`);
  if (code !== '0') {
    log('warn', 'wmi failed, falling back to detached spawn');
    spawn(ps, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', script,
      '-Src', pending.file, '-Dst', exePath, '-Log', swapLog, '-Relaunch', relaunch ? '1' : '0', '-WaitPid', String(process.pid)],
    { detached: true, stdio: 'ignore', windowsHide: true, cwd: path.dirname(exePath) }).unref();
  }
}

function install() {
  if (state.status !== 'ready') return;
  apply(true);
  app.quit();
}

// Öffnet den Protokoll-Ordner: updater.log (Suche/Download) und updater-swap.log (Austausch der Exe).
const openLog = () => logFile && shell.openPath(path.dirname(logFile));
const openReleases = () => shell.openExternal(RELEASES_URL);

module.exports = { start, check, install, openLog, openReleases, getState: () => state, _test: { newer, pickAsset, download, SWAP_SCRIPT } };
