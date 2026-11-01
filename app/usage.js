// Live-Auslastung fürs Dashboard: CPU und RAM über Node, GPU (nur Windows) über einen dauerhaften PowerShell-Prozess.
// Liest nur, ändert nichts am System.
const os = require('os');
const { spawn } = require('child_process');

// CIM-Klasse statt Get-Counter, weil Counter-Namen auf deutschem/italienischem Windows übersetzt sind.
const GPU_LOOP = `
$ProgressPreference = 'SilentlyContinue'
while ($true) {
  try {
    $s = Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction Stop |
      Where-Object Name -like '*engtype_3D' | Measure-Object UtilizationPercentage -Sum
    [Console]::Out.WriteLine([math]::Min(100, [double]$s.Sum))
  } catch { [Console]::Out.WriteLine('-1') }
  Start-Sleep -Milliseconds 1000
}`;

let timer = null;
let gpuProc = null;
let gpu = null;

function cpuTimes() {
  return os.cpus().reduce((a, c) => {
    const total = Object.values(c.times).reduce((x, y) => x + y, 0);
    return { idle: a.idle + c.times.idle, total: a.total + total };
  }, { idle: 0, total: 0 });
}

function startGpu() {
  if (process.platform !== 'win32') return;
  gpuProc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', GPU_LOOP], { windowsHide: true });
  gpuProc.stdout.setEncoding('utf8');
  gpuProc.stdout.on('data', (d) => {
    const v = parseFloat(String(d).trim().split(/\r?\n/).pop());
    gpu = Number.isFinite(v) && v >= 0 ? v : null;
  });
  gpuProc.on('error', () => { gpuProc = null; });
}

function start(send) {
  let prev = cpuTimes();
  startGpu();
  timer = setInterval(() => {
    const now = cpuTimes();
    const dt = now.total - prev.total;
    const cpu = dt > 0 ? 100 * (1 - (now.idle - prev.idle) / dt) : 0;
    prev = now;
    const ram = 100 * (1 - os.freemem() / os.totalmem());
    send({ cpu, gpu, ram });
  }, 1000);
}

function stop() {
  clearInterval(timer);
  gpuProc?.kill();
}

module.exports = { start, stop };
