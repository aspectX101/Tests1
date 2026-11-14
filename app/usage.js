// Live-Auslastung fürs Dashboard: CPU und RAM über Node, GPU (nur Windows) über einen dauerhaften PowerShell-Prozess.
// Liest nur, ändert nichts am System.
const os = require('os');
const { spawn } = require('child_process');

// GPU usage like Task Manager: per GPU engine (3D, Compute, Video, Copy …) the time it was busy in the last second,
// summed over all processes on that engine; the shown value is the busiest engine of any GPU.
// Read from the raw counters (Win32_PerfRawData_…): two samples a second apart, utilisation = Δbusy / Δtime.
// The formatted CIM class used before returned stale or far too low values, and counting only the 3D engine (summed
// over all GPUs) missed compute and video load. CIM class names are the same on every Windows language.
const gpuScript = (iterations = 0) => `
$ProgressPreference = 'SilentlyContinue'
$prev = @{}; $n = 0
while (${iterations} -eq 0 -or $n -lt ${iterations}) {
  $n++
  try {
    $now = @{}
    foreach ($e in Get-CimInstance Win32_PerfRawData_GPUPerformanceCounters_GPUEngine -ErrorAction Stop) {
      $now[$e.Name] = @([double]$e.UtilizationPercentage, [double]$e.Timestamp_Sys100NS)
    }
    $engines = @{}
    foreach ($k in $now.Keys) {
      if (-not $prev.ContainsKey($k) -or $k -notmatch 'luid_(0x[0-9A-Fa-f]+_0x[0-9A-Fa-f]+)_phys_(\\d+)_eng_(\\d+)') { continue }
      $dt = $now[$k][1] - $prev[$k][1]
      if ($dt -le 0) { continue }
      $u = [math]::Max(0, ($now[$k][0] - $prev[$k][0]) / $dt * 100)
      $g = $Matches[1] + '_' + $Matches[2] + '_' + $Matches[3]
      $engines[$g] = [double]$engines[$g] + $u
    }
    $prev = $now
    if ($engines.Count) { [Console]::Out.WriteLine([math]::Round([math]::Min(100, ($engines.Values | Measure-Object -Maximum).Maximum), 1)) }
    elseif ($n -gt 1) { [Console]::Out.WriteLine('0') }
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
  gpuProc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', gpuScript()], { windowsHide: true });
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

module.exports = { start, stop, gpuScript };
