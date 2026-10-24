'use strict';
// Windows scheduled task "H1T.CC License Check": starts the tweaker invisibly (--h1t-expiry-check) when a
// time-limited license ends, so changes are restored even if the app is not open at that moment.
// StartWhenAvailable runs it at the next opportunity if the PC was off. Removed again for lifetime
// licenses and after a completed restore. Values reach PowerShell only through environment variables.
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
  [pscustomobject]@{ execute = $t.Actions[0].Execute; arguments = $t.Actions[0].Arguments
    at = ([datetime]$t.Triggers[0].StartBoundary).ToUniversalTime().ToString('o') } | ConvertTo-Json -Compress
  exit 0
}
$at = [DateTimeOffset]::Parse($env:H1T_TASK_AT, [Globalization.CultureInfo]::InvariantCulture).LocalDateTime
$action = New-ScheduledTaskAction -Execute $env:H1T_TASK_EXE -Argument '--h1t-expiry-check'
$trigger = New-ScheduledTaskTrigger -Once -At $at
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
function createLicenseTask({ exe, name = TASK_NAME, run = runScript } = {}) {
  let registered = null;
  return {
    name,
    async sync({ licensed, lifetime, expires_at } = {}) {
      const target = exe();
      if (!licensed || lifetime || !Number.isFinite(expires_at) || !target) return this.remove();
      // A minute after the end, so the server already reports the license as expired.
      const at = new Date(expires_at + 60000).toISOString();
      const key = `${target}|${at}`;
      if (registered === key) return 'unchanged';
      const out = await run({ name, H1T_TASK_MODE: 'register', H1T_TASK_EXE: target, H1T_TASK_AT: at });
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
