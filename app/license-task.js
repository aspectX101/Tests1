'use strict';
// Windows scheduled task "H1T.CC License Check": starts the tweaker invisibly (--h1t-expiry-check) once a day
// for every licensed PC (lifetime too, so a revoked key is noticed without opening the app) and additionally
// right after a time-limited license ends. Changes are restored even if the app is not open at that moment.
// StartWhenAvailable runs it at the next opportunity if the PC was off. Removed again after a completed
// restore. Values reach PowerShell only through environment variables.
const { execFile } = require('node:child_process');
const path = require('node:path');

const TASK_NAME = 'H1T.CC License Check';
const SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$name = $env:H1T_TASK_NAME
if ($env:H1T_TASK_MODE -eq 'remove') {
  Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
  'removed'; exit 0
}
if ($env:H1T_TASK_MODE -eq 'query') {
  $t = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
  if (-not $t) { 'none'; exit 0 }
  $once = @($t.Triggers | Where-Object { $_.CimClass.CimClassName -eq 'MSFT_TaskTimeTrigger' })
  $daily = @($t.Triggers | Where-Object { $_.CimClass.CimClassName -eq 'MSFT_TaskDailyTrigger' })
  [pscustomobject]@{ execute = $t.Actions[0].Execute; arguments = $t.Actions[0].Arguments
    at = $(if ($once.Count) { ([datetime]$once[0].StartBoundary).ToUniversalTime().ToString('o') } else { $null })
    daily = ($daily.Count -eq 1) } | ConvertTo-Json -Compress
  exit 0
}
$parse = { param($v) [DateTimeOffset]::Parse($v, [Globalization.CultureInfo]::InvariantCulture).LocalDateTime }
$action = New-ScheduledTaskAction -Execute $env:H1T_TASK_EXE -Argument '--h1t-expiry-check'
$trigger = @(New-ScheduledTaskTrigger -Daily -At (& $parse $env:H1T_TASK_DAILY))
if ($env:H1T_TASK_AT) { $trigger += New-ScheduledTaskTrigger -Once -At (& $parse $env:H1T_TASK_AT) }
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Highest
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
'registered'
`;

function runScript(env) {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') return reject(Error('windows_required'));
    const ps = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    execFile(ps, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(SCRIPT, 'utf16le').toString('base64')],
      { env: { ...process.env, H1T_TASK_NAME: env.name || TASK_NAME, ...env }, timeout: 30000, windowsHide: true, maxBuffer: 64 * 1024, encoding: 'utf8' },
      (err, stdout) => (err ? reject(Error('license_task_failed')) : resolve(String(stdout).trim())));
  });
}

// exe: () => path of the portable exe (null when not packaged). Re-registers only when exe or end date change.
function createLicenseTask({ exe, name = TASK_NAME, run = runScript, now = Date.now } = {}) {
  let registered = null;
  return {
    name,
    async sync({ licensed, lifetime, expires_at } = {}) {
      const target = exe();
      if (!licensed || !target) return this.remove();
      // A minute after the end, so the server already reports the license as expired.
      const at = !lifetime && Number.isFinite(expires_at) ? new Date(expires_at + 60000).toISOString() : '';
      const key = `${target}|${at}`;
      if (registered === key) return 'unchanged';
      // Up to 1.0.36 every app start registered the task anew with the daily check 15 minutes later, so it nearly
      // always started a second copy of the exe while the app was open. Now an existing task with the same exe and
      // end date is kept, and a new daily check starts 23 hours from now (not during the current session).
      if (registered === null) {
        try {
          const q = JSON.parse(await run({ name, H1T_TASK_MODE: 'query' }));
          const sameAt = at ? Math.abs(Date.parse(q.at) - Date.parse(at)) < 2000 : !q.at;
          if (q.daily && sameAt && q.arguments === '--h1t-expiry-check' && String(q.execute).toLowerCase() === target.toLowerCase()) { registered = key; return 'unchanged'; }
        } catch { /* no task yet or not readable: register */ }
      }
      const daily = new Date(now() + 23 * 3600000).toISOString();
      const out = await run({ name, H1T_TASK_MODE: 'register', H1T_TASK_EXE: target, H1T_TASK_DAILY: daily, H1T_TASK_AT: at });
      registered = key;
      return out;
    },
    async remove() {
      if (registered === 'removed') return 'unchanged';
      const out = await run({ name, H1T_TASK_MODE: 'remove' });
      registered = 'removed';
      return out;
    },
    query: () => run({ name, H1T_TASK_MODE: 'query' }),
  };
}

module.exports = { createLicenseTask, TASK_NAME, SCRIPT };
