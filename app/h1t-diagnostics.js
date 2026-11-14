'use strict';
// H1T.CC voluntary device diagnostics (main process only). Collects the allowlisted system model fields
// from docs/h1t-account.md / the diagnostics contract — never serials, MAC/IP addresses, user names or files.
const { execFile } = require('node:child_process');

// Exact allowlist accepted by POST /api/diagnostics (`system` object). The server rejects anything else.
const SYSTEM_FIELDS = ['app_version', 'windows_version', 'windows_build', 'cpu_model', 'gpu_model', 'ram_gb',
  'motherboard_model', 'tpm_available', 'secure_boot_enabled'];
const MAX_REPORT_BYTES = 6000;

// Fixed script, no user input. -Property limits each WMI query to model/config columns, so serial numbers
// (Win32_BaseBoard.SerialNumber etc.) are never even read. Unknown values stay $null.
const SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
function Try-Get([scriptblock]$b) { try { & $b } catch { $null } }
$os = Try-Get { Get-CimInstance -ClassName Win32_OperatingSystem -Property Caption,BuildNumber }
$cpu = Try-Get { @(Get-CimInstance -ClassName Win32_Processor -Property Name)[0].Name }
$gpu = Try-Get { @(Get-CimInstance -ClassName Win32_VideoController -Property Name | ForEach-Object { $_.Name }) }
$mem = Try-Get { (Get-CimInstance -ClassName Win32_PhysicalMemory -Property Capacity | Measure-Object -Property Capacity -Sum).Sum }
$total = Try-Get { (Get-CimInstance -ClassName Win32_ComputerSystem -Property TotalPhysicalMemory).TotalPhysicalMemory }
$board = Try-Get { Get-CimInstance -ClassName Win32_BaseBoard -Property Manufacturer,Product }
$tpm = try {
  $t = @(Get-CimInstance -Namespace 'root/cimv2/Security/MicrosoftTpm' -ClassName Win32_Tpm -Property IsEnabled_InitialValue)
  if ($t.Count -eq 0) { $false } else { [bool]($t[0].IsEnabled_InitialValue -ne $false) }
} catch { $null }
$sb = Try-Get { [int](Get-ItemPropertyValue -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\SecureBoot\State' -Name UEFISecureBootEnabled) }
[pscustomobject]@{
  windows_caption = if ($os) { [string]$os.Caption } else { $null }
  windows_build = if ($os) { [string]$os.BuildNumber } else { $null }
  cpu = $cpu
  gpus = $gpu
  ram_bytes = if ($mem) { [double]$mem } else { $null }
  ram_visible_bytes = if ($total) { [double]$total } else { $null }
  board_manufacturer = if ($board) { [string]$board.Manufacturer } else { $null }
  board_product = if ($board) { [string]$board.Product } else { $null }
  tpm = $tpm
  secure_boot = $sb
} | ConvertTo-Json -Compress -Depth 3
`;

// Strip control characters, collapse whitespace, cap the length; empty -> null.
function clean(v, max = 120) {
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim();
  return s || null;
}
const GPU_SKIP = /^microsoft (basic display|basic render|remote display)/i;

// Raw collector output -> exact `system` object. Unknown values are omitted, never guessed.
function toSystem(raw, appVersion) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  const put = (k, v) => { if (v !== null && v !== undefined) out[k] = v; };
  put('app_version', clean(appVersion, 30));
  put('windows_version', clean(typeof r.windows_caption === 'string' ? r.windows_caption.replace(/^\s*Microsoft\s+/i, '') : null, 80));
  put('windows_build', /^\d{4,6}$/.test(String(r.windows_build ?? '').trim()) ? String(r.windows_build).trim() : null);
  put('cpu_model', clean(r.cpu));
  const gpus = [...new Set((Array.isArray(r.gpus) ? r.gpus : [r.gpus]).map((g) => clean(g)).filter((g) => g && !GPU_SKIP.test(g)))];
  put('gpu_model', clean(gpus.join(' + '), 160));
  const bytes = Number.isFinite(r.ram_bytes) && r.ram_bytes > 0 ? r.ram_bytes : Number.isFinite(r.ram_visible_bytes) && r.ram_visible_bytes > 0 ? r.ram_visible_bytes : null;
  put('ram_gb', bytes ? Math.max(1, Math.round(bytes / 1024 ** 3)) : null);
  const maker = clean(r.board_manufacturer, 60), product = clean(r.board_product, 80);
  // Many boards report placeholder strings instead of a model.
  const real = (s) => s && !/^(to be filled.*|default string|system (product|manufacturer) name|not applicable|none|n\/a|base board|o\.?e\.?m\.?|0+)$/i.test(s);
  put('motherboard_model', clean([real(maker) ? maker : '', real(product) ? product : ''].join(' '), 120));
  if (typeof r.tpm === 'boolean') out.tpm_available = r.tpm;
  if (r.secure_boot === 0 || r.secure_boot === 1) out.secure_boot_enabled = r.secure_boot === 1;
  return out;
}

function runCollector() {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') return reject(Error('windows_device_required'));
    const encoded = Buffer.from(SCRIPT, 'utf16le').toString('base64');
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      { timeout: 25000, windowsHide: true, maxBuffer: 64 * 1024, encoding: 'utf8' }, (err, stdout) => {
        if (err) return reject(Error('diagnostics_collect_failed'));
        try { resolve(JSON.parse(String(stdout).trim())); } catch { reject(Error('diagnostics_collect_failed')); }
      });
  });
}

async function collectSystem(appVersion, collector = runCollector) {
  return toSystem(await collector(), appVersion);
}

module.exports = { SYSTEM_FIELDS, MAX_REPORT_BYTES, SCRIPT, toSystem, collectSystem, clean };
