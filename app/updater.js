// Eigener Updater für die portable Exe (ab 0.6.0, ohne Installer).
// 1. fragt die GitHub-API nach dem neuesten Release (aspectX101/Tests1)
// 2. lädt H1T.CC-Tweaker-<version>.exe (ältere Releases: UNDCC-Tweaker-<version>.exe) neben die laufende Exe (…exe.new)
//    und prüft Größe + SHA-256
// 3. ersetzt beim Neustart (oder Beenden) die alte Exe per PowerShell-Skript (über WMI gestartet) und startet sie neu;
//    eine alte UNDCC-Tweaker*.exe wird dabei zu H1T.CC-Tweaker.exe, Verknüpfungen zeigen danach auf die neue Datei
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
// Neuer Name zuerst; der alte bleibt im Release, damit Versionen bis 0.9.29 weiter Updates finden.
const ASSET_RE = /^(H1T\.CC|UNDCC)-Tweaker-(\d+\.\d+\.\d+)\.exe$/;
const NEW_NAME = 'H1T.CC-Tweaker.exe';
const CHECK_EVERY = 2 * 60 * 60 * 1000;
const LOG_MAX = 512 * 1024;

let state = { status: 'unsupported', current: app.getVersion() };
let notify = () => {};
let logFile = null;
let exePath = null;   // die portable Exe, die der Nutzer gestartet hat
let pending = null;   // { file, version } – fertig geladenes Update
let busy = false;
let applying = false;
let health = null;     // app/update-health.js: Vorgänger-Exe merken, zurückgerollte Versionen überspringen

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
  const found = (release?.assets || []).map((a) => ({ a, m: ASSET_RE.exec(a.name) })).filter((x) => x.m);
  const hit = found.find((x) => x.m[1] === 'H1T.CC') || found[0];
  if (!hit) return null;
  const { a, m } = hit;
  return { url: a.browser_download_url, name: a.name, size: a.size, version: m[2], sha256: /^sha256:([0-9a-f]{64})$/.exec(a.digest || '')?.[1] || null };
}

// Ziel des Austauschs: eine alte UNDCC-Tweaker*.exe heißt danach H1T.CC-Tweaker.exe (gleicher Ordner).
// Liegt dort schon eine andere Datei mit dem Namen, bleibt der alte Name - nichts wird überschrieben.
function swapTarget(file) {
  if (!/^UNDCC-Tweaker.*\.exe$/i.test(path.basename(file))) return file;
  const renamed = path.join(path.dirname(file), NEW_NAME);
  return fs.existsSync(renamed) ? file : renamed;
}

function start(onChange, opts = {}) {
  notify = onChange;
  health = opts.health || null;
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

// Sucht auch dann weiter, wenn schon ein Update fertig geladen ist: erscheint inzwischen eine neuere Version,
// ersetzt sie das geladene Update (sonst blieb die App bis zum Neustart auf dem ersten gefundenen Update stehen).
async function check() {
  if (!exePath || busy || applying) return;
  busy = true;
  const waiting = pending;
  set({ status: 'checking', error: null });
  try {
    log('info', `GET ${API_LATEST}`);
    const res = await net.fetch(API_LATEST, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'H1T.CC-Tweaker' }, cache: 'no-store' });
    if (!res.ok) throw new Error(rateLimitText(res) || `GitHub antwortet mit ${res.status}`);
    const release = await res.json();
    const asset = pickAsset(release);
    const base = waiting?.version || app.getVersion();
    log('info', `latest tag=${release.tag_name} asset=${asset?.name || '-'} current=${app.getVersion()} pending=${waiting?.version || '-'}`);
    // Eine Version, die zweimal nicht sauber gestartet ist und zurückgerollt wurde, wird nicht erneut angeboten.
    if (asset && health?.isBad(asset.version)) {
      log('warn', `release ${asset.version} skipped: rolled back on this PC`);
      if (waiting) set({ status: 'ready', version: waiting.version, latest: asset.version, checkedAt: new Date().toISOString() });
      else set({ status: 'latest', latest: asset.version, skipped: asset.version, checkedAt: new Date().toISOString() });
      return;
    }
    if (!asset || !newer(asset.version, base)) {
      if (waiting) set({ status: 'ready', version: waiting.version, latest: asset?.version, checkedAt: new Date().toISOString() });
      else set({ status: 'latest', latest: asset?.version, checkedAt: new Date().toISOString() });
      return;
    }
    if (waiting) {
      log('info', `newer release ${asset.version} replaces downloaded ${waiting.version}`);
      pending = null;
      try { fs.rmSync(waiting.file, { force: true }); } catch { /* wird beim Download überschrieben */ }
    }
    set({ status: 'downloading', version: asset.version, percent: 0, checkedAt: new Date().toISOString() });
    const file = await download(asset, exePath);
    pending = { file, version: asset.version };
    log('info', `downloaded ${asset.version} -> ${file}`);
    set({ status: 'ready', version: asset.version });
  } catch (err) {
    log('error', err?.stack || err);
    // Ein fertig geladenes Update bleibt installierbar, auch wenn die erneute Suche scheitert.
    if (pending) set({ status: 'ready', version: pending.version, error: String(err?.message || err), checkedAt: new Date().toISOString() });
    else set({ status: 'error', error: String(err?.message || err), checkedAt: new Date().toISOString() });
  } finally {
    busy = false;
  }
}

// GitHub erlaubt ohne Anmeldung 60 API-Abfragen pro Stunde und IP-Adresse; dann verständlich melden, wann es weitergeht.
function rateLimitText(res) {
  if (![403, 429].includes(res.status) || res.headers.get('x-ratelimit-remaining') !== '0') return null;
  const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000;
  const at = Number.isFinite(reset) && reset > 0 ? new Date(reset).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : null;
  return at ? `GitHub-Abfragelimit erreicht – neue Suche ab ${at} Uhr möglich` : 'GitHub-Abfragelimit erreicht – bitte später erneut suchen';
}

// GET mit Weiterleitungen über Nodes https: Electrons net.fetch bekommt vom GitHub-Download-Server
// (release-assets.githubusercontent.com) reproduzierbar HTTP 500, curl und Node dagegen 200.
function httpsGet(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'H1T.CC-Tweaker', Accept: 'application/octet-stream' } }, (res) => {
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
const SWAP_SCRIPT = `param([string]$Src, [string]$Dst, [string]$Log, [int]$Relaunch, [int]$WaitPid, [string]$Old = '', [string]$Prev = '')
function L($m) { try { Add-Content -LiteralPath $Log -Value ('{0} {1}' -f (Get-Date -Format o), $m) } catch {} }
if (-not $Old) { $Old = $Dst }
L "swap start pid=$PID src=$Src dst=$Dst old=$Old relaunch=$Relaunch waitPid=$WaitPid prev=$Prev"
try { Wait-Process -Id $WaitPid -Timeout 60 -ErrorAction Stop; L 'app exited' } catch { L "wait: $($_.Exception.Message)" }
if ($Prev) {
  # Keep the running version as the way back (update-health.js rolls back to it). Never blocks the update.
  try {
    New-Item -ItemType Directory -Path (Split-Path -Parent $Prev) -Force | Out-Null
    Copy-Item -LiteralPath $Old -Destination $Prev -Force -ErrorAction Stop; L "previous kept: $Prev"
  } catch { L "previous not kept: $($_.Exception.Message)" }
}
$ok = $false
for ($i = 1; $i -le 180; $i++) {
  try { Move-Item -LiteralPath $Src -Destination $Dst -Force -ErrorAction Stop; $ok = $true; L "replaced after $($i) tries"; break }
  catch { if ($i -eq 1 -or $i % 20 -eq 0) { L "try $($i): $($_.Exception.Message)" }; Start-Sleep -Milliseconds 500 }
}
if (-not $ok) { L 'FAILED: exe not replaced, starting old version' }
if ($ok -and $Old -ne $Dst) {
  # Renamed (UNDCC-Tweaker -> H1T.CC-Tweaker): repoint shortcuts, then remove the old exe once it is free.
  $shell = New-Object -ComObject WScript.Shell
  $dirs = @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('CommonDesktopDirectory'),
    [Environment]::GetFolderPath('StartMenu'), [Environment]::GetFolderPath('CommonStartMenu'),
    (Join-Path $env:APPDATA 'Microsoft\\Internet Explorer\\Quick Launch\\User Pinned\\TaskBar')) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
  foreach ($lnk in @(Get-ChildItem -LiteralPath $dirs -Filter *.lnk -Recurse -ErrorAction SilentlyContinue)) {
    try {
      $s = $shell.CreateShortcut($lnk.FullName)
      if ($s.TargetPath -ieq $Old) {
        $s.TargetPath = $Dst
        if ($s.IconLocation -like ($Old + '*')) { $s.IconLocation = $Dst + ',0' }
        $s.Save(); L "shortcut updated: $($lnk.FullName)"
      }
    } catch { L "shortcut $($lnk.FullName): $($_.Exception.Message)" }
  }
  for ($i = 1; $i -le 180; $i++) {
    try { Remove-Item -LiteralPath $Old -Force -ErrorAction Stop; L "old exe removed after $($i) tries"; break }
    catch { if ($i -eq 180) { L "old exe kept: $($_.Exception.Message)" }; Start-Sleep -Milliseconds 500 }
  }
}
$run = if ($ok) { $Dst } else { $Old }
if ($Relaunch -eq 1 -or -not $ok) {
  try { Start-Process -FilePath $run; L "relaunched $run" } catch { L "relaunch failed: $($_.Exception.Message)" }
}
L 'swap done'
`;

// Startet das Tausch-Skript über WMI (Win32_Process.Create). Dadurch ist es kein Kindprozess der App und hängt
// an keinem ihrer Jobs – es überlebt das Beenden sicher. Fallback: normal abgekoppelt starten.
function apply(relaunch) {
  if (!pending || applying) return;
  applying = true;
  // Long path form: shortcuts store C:\Users\Name\..., the environment may hand over C:\Users\NAME~1\...
  let old = exePath;
  try { old = fs.realpathSync.native(exePath); } catch { /* keep as is */ }
  let prev = '';
  if (health) {
    prev = health.previousFile();
    health.rememberPrevious({ version: app.getVersion(), file: prev, forVersion: pending.version });
  }
  log('info', `apply ${pending.version} relaunch=${relaunch} prev=${prev || '-'}`);
  if (!launchSwap({ src: pending.file, dst: swapTarget(old), old, relaunch, prev })) applying = false;
}

// Zurück zur Vorgängerversion (update-health.js): dieselbe Tausch-Mechanik, die gesicherte Exe ersetzt die aktuelle.
function rollback(previous) {
  exePath = exePath || process.env.PORTABLE_EXECUTABLE_FILE || null;
  if (!exePath || !previous?.file) return false;
  if (!logFile) { logFile = path.join(app.getPath('logs'), 'updater.log'); try { fs.mkdirSync(path.dirname(logFile), { recursive: true }); } catch { /* egal */ } }
  let cur = exePath;
  try { cur = fs.realpathSync.native(exePath); } catch { /* keep as is */ }
  log('warn', `rollback v${app.getVersion()} -> v${previous.version} from ${previous.file}`);
  applying = true;
  return launchSwap({ src: previous.file, dst: cur, old: cur, relaunch: true, prev: '' });
}

function launchSwap({ src, dst, old, relaunch, prev }) {
  const ps = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const script = path.join(app.getPath('temp'), 'undcc-tweaker-swap.ps1');
  const swapLog = path.join(path.dirname(logFile), 'updater-swap.log');
  try {
    fs.writeFileSync(script, '\ufeff' + SWAP_SCRIPT, 'utf8');
  } catch (err) {
    log('error', `swap script not written: ${err.message}`);
    return false;
  }
  const cmd = `"${ps}" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "${script}"` +
    ` -Src "${src}" -Dst "${dst}" -Log "${swapLog}" -Relaunch ${relaunch ? 1 : 0} -WaitPid ${process.pid} -Old "${old}"` + (prev ? ` -Prev "${prev}"` : '');
  log('info', `swap cmd=${cmd}`);
  const launcher = "$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $env:UNDCC_CMD }; [Console]::Out.Write(\"$($r.ReturnValue) $($r.ProcessId)\")";
  const res = spawnSync(ps, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(launcher, 'utf16le').toString('base64')],
    { env: { ...process.env, UNDCC_CMD: cmd }, windowsHide: true, encoding: 'utf8', timeout: 30000 });
  const [code, pid] = String(res.stdout || '').trim().split(' ');
  log('info', `wmi create -> code=${code} pid=${pid} err=${String(res.stderr || res.error || '').trim().slice(0, 300)}`);
  if (code !== '0') {
    log('warn', 'wmi failed, falling back to detached spawn');
    spawn(ps, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', script,
      '-Src', src, '-Dst', dst, '-Log', swapLog, '-Relaunch', relaunch ? '1' : '0', '-WaitPid', String(process.pid), '-Old', old, ...(prev ? ['-Prev', prev] : [])],
    { detached: true, stdio: 'ignore', windowsHide: true, cwd: path.dirname(dst) }).unref();
  }
  return true;
}

function install() {
  if (state.status !== 'ready') return;
  apply(true);
  app.quit();
}

const openReleases = () => shell.openExternal(RELEASES_URL);

module.exports = { start, check, install, rollback, openReleases, getState: () => state,
  _test: { newer, pickAsset, swapTarget, download, rateLimitText, SWAP_SCRIPT, useExe(file) { exePath = file; }, pending: () => pending } };
