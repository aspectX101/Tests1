# Tweaker SafeMode

This feature checks service configuration and restores a conservative keep-enabled policy for important Windows services. It does not enter Windows Safe Boot, change boot settings, assert a factory-default configuration, or certify a server PC check. Supported repair platform: Windows client builds 19041 and newer; server/unsupported installations can be inspected but cannot be repaired by this feature.

## Backend contract

Use the existing UTF-8 JSON CLI with `-Lang de|en|it`:

```powershell
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File tweaker.ps1 -Action safemode-scan
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File tweaker.ps1 -Action safemode-enable
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File tweaker.ps1 -Action safemode-enforce
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File tweaker.ps1 -Action safemode-disable
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File tweaker.ps1 -Action safemode-report
```

Scan/report never write state or service settings. Report returns the scan as exportable JSON; the UI can save it to a user-selected file without exposing arbitrary backend output paths. State and first original service configuration records live under `%ProgramData%\Tweaker\SafeMode`. Enable/disable/enforce require admin. Storage rejects links and sets administrator/SYSTEM write access and normal-user read access. Normal scans and all current performance/keyboard tweaks do not change any service settings.

Responses include `ok`, `enabled`, `health` (green/yellow/red), UTC check time, platform/build, service rows, changedServices, affectedTweaks, message and `monitorScope: "while_app_running"`. Service rows include name/displayName/state/startMode/delayedAutoStart/health/reason/protected/autoRepair/mustRun. Here `protected` describes policy membership; top-level `enabled` determines whether the guard is on. `autoRepair` is repair eligibility. `safemode-enable` and `safemode-enforce` also return per-service `repairs` with success/error details. `ok:true` means the request completed, not that every service was repaired: **always display health and repair errors**. Missing/unreadable required services remain red. Do not show a green check merely because enabled is true.

## Repair policy

| Services | Behavior while enabled |
| --- | --- |
| RpcSs, RpcEptMapper, DcomLaunch, EventLog, Schedule, Winmgmt, BFE, MpsSvc, Dhcp, Dnscache, nsi, SamSs | Keep enabled and running. If disabled, select Automatic; start/resume if stopped/paused. Preserve existing non-disabled startup types and delayed-start preferences. |
| PlugPlay, wuauserv, BITS | Keep enabled. If disabled, select Manual. A stopped state is allowed: Windows controls demand/trigger starts. |
| SysMain, WSearch, DPS, DiagTrack, WinDefend, wscsvc, SecurityHealthService | Audit only because configuration depends on edition, OEM, policy and security provider. Disabled/missing services produce warnings; no guessed default or third-party antivirus override. |

The policy is fixed in source; the renderer cannot supply service names or startup modes. There are no stop-service, disable-service, delete-service, privilege-takeover or security-bypass operations. Access-denied/protected-service errors remain visible and are not worked around. Internal service writes pass an allowlist guard; while SafeMode is enabled, disabling/stopping/pausing any covered service is refused. Future service-changing tweaks must use that same guard. Current Tweaker performance/keyboard/cache features do not stop services and are not reset when SafeMode is enabled (`affectedTweaks: []`). Prefetch and other unimplemented registry settings are not modified.

Enable first requires a verified Windows restore point, then persists enabled state before any repair. Original service settings are journaled before the first attempted change and not replaced by subsequent watchdog repairs. Failed repairs can be retried with enforce; enable can remain true while health is red. Subsequent watchdog checks use the existing activation checkpoint and per-service journal, avoiding the Windows 24-hour checkpoint limit on every check. Re-enabling after disable requires a new checkpoint and can fail because of that Windows limit. Disabling SafeMode stops the protection policy and leaves repaired services enabled/running: it deliberately does not restore a previous disabled or stopped core-service state. The saved original values are diagnostics/recovery evidence, not an automatic unsafe rollback.

## Monitoring and UI integration

Instantiate `createBackendClient` once with the real Electron app. It attaches `electron/safemode-monitor.cjs` to app readiness and before-quit automatically. Startup resumes the persisted preference. The monitor scans first and only invokes enforce if enabled. It waits 30 seconds after each completed check, serializes its own calls, surfaces process errors, and cancels new checks at quit. An in-flight backend operation may complete during shutdown. Do not instantiate another watcher for each window or renderer.

```js
const backend = createBackendClient(app, {
  getLanguage: () => currentLanguage, // de/en/it
  onSafeModeReport: report => sendReportToTrustedUI(report),
  onSafeModeError: error => showProtectionUnavailable(error.message)
});
const report = await backend({ action: 'safemode-enable', lang: currentLanguage });
// Display report.enabled AND report.health. A red repair result needs attention.
```

There is no installed Windows service or scheduled task. Protection only runs while this app is open with sufficient privileges. Between checks another administrator/program can stop or disable a service; the next successful enforcement attempts to repair it. This is recovery monitoring, not a lock against other administrators. Closing/crashing the app suspends monitoring; the persisted flag alone does not mean an active watcher is running. Read/permission failures must be surfaced to the user. Windows trigger-start services may legitimately stop themselves; do not restart them continuously or label that normal state a failure.

## Validation and release checks

`tests/SafeMode.Tests.ps1` uses simulated services, privilege/ACL setup and restore points, with real journal files in disposable workspace fixtures. It tests read-only/dry-run behavior, admin and checkpoint failure, supported platforms, per-service repair, normal demand-service stops, optional audit-only configuration, guard rejection, repeated recovery, denied repairs, original-value preservation, disable semantics and corrupt-state rejection. It passes under Windows PowerShell 5.1 and PowerShell 7. Node tests cover automatic Electron lifecycle wiring, no overlapping checks, retry/error handling and shutdown. The CLI contract test reads actual service status; no real services are changed during development.

Administrator state-directory ACL creation, actual SCM startup/repair, protected/managed devices, restart/resume behavior after a real process exit and final EXE behavior still require a Windows test account. A report cannot guarantee that every Windows setting matches a clean installation.

References: [Windows service trigger events](https://learn.microsoft.com/en-us/windows/win32/services/service-trigger-events), [ServiceController](https://learn.microsoft.com/en-us/dotnet/api/system.serviceprocess.servicecontroller), [Microsoft service guidance](https://learn.microsoft.com/en-us/windows-server/security/windows-services/security-guidelines-for-disabling-system-services-in-windows-server). The latter is server-specific context, not a Windows 10/11 factory-default table.
