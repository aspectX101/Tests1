# Tweaker performance backend

UI-independent Windows backend for the shared Tweaker project. First implementation; Windows 10/11, Windows PowerShell 5.1 or PowerShell 7. UI belongs to Claude and can consume the JSON CLI. No external packages.

## Implemented

- `windows.power.high`: selects the existing High performance plan, saves the original GUID and verifies the result. Administrator rights and a newly verified Windows restore point are required. If Windows blocks creation (disabled protection, frequency limit, unsupported environment), the operation stops before changing the plan. Unsupported power plans are reported, never created implicitly.
- `fivem.priority.high`: changes only running `FiveM_GTAProcess` / `FiveM_b<build>_GTAProcess` processes from Idle/BelowNormal/Normal/AboveNormal to High. Backs up each original priority with PID and start time. Restore ignores exited processes and reused PIDs. Run again after a new game launch. No persistent watcher yet.
- Catalog includes German, English and Italian names/descriptions. IDs and status codes are language-neutral. UI translates errors and displays warnings before applying.

## UI integration

Use a fixed trusted script path and an argument array, not a shell command built from user input:

```powershell
powershell.exe -NoProfile -NonInteractive -File tweaker.ps1 -Action list
powershell.exe -NoProfile -NonInteractive -File tweaker.ps1 -Action status -Id windows.power.high
powershell.exe -NoProfile -NonInteractive -File tweaker.ps1 -Action apply -Id windows.power.high
powershell.exe -NoProfile -NonInteractive -File tweaker.ps1 -Action revert -Id windows.power.high
powershell.exe -NoProfile -NonInteractive -File tweaker.ps1 -Action apply -Id fivem.priority.high
powershell.exe -NoProfile -NonInteractive -File tweaker.ps1 -Action revert -Id fivem.priority.high
```

Exit 0: `{"ok":true,...}`. Exit 1: `{"ok":false,"error":"error_code_or_diagnostic"}`. Treat stderr separately. Parameter-binding errors from PowerShell itself may occur before JSON handling. The `list` response contains `tweaks` with localized names/descriptions, category, risk, requiresRestart, reversible, requiresAdmin and live applied state. `status -Id` returns id/applied. `apply` and `revert` return id/applied/restartRequired/message/status. `info` returns os/cpu/gpu/ramGB/isAdmin. Optional `-Lang de|en|it`, default de. Status reads Windows, not the journal. Do not auto-apply on app startup. Elevate power operations as the same Windows user; never accept arbitrary scripts, state paths, PIDs or priorities from untrusted UI content.

## Recovery and boundaries

Per-user originals are stored in `%LOCALAPPDATA%\Tweaker\Performance`. Atomic journal writes precede mutations. An exclusive file lock prevents simultaneous operations in this backend. Failed or interrupted operations retain a `pending` journal: call restore before retrying. Applied backups are never overwritten. Restore refuses conflicting external changes. A partial restore can be retried; already restored entries are skipped. Keep this local state until recovery is complete; it is trusted local app data, not an import/export format. Windows restore points supplement the exact per-tweak backup for the persistent energy-plan change; transient process priority has an exact session backup and also resets when the process exits.

No FPS improvement is promised. High performance may increase heat and power use; High process priority may reduce responsiveness elsewhere. No game-file edits, anti-cheat interactions, service shutdowns, RAM purges, security changes, timer tweaks or undocumented registry settings are included. Graphics presets, GPU options and other performance features remain future work. FiveM naming variants outside the explicit allowlist are unsupported.

## Validation

```powershell
pwsh -NoProfile -File tests/Performance.Tests.ps1
```

Tests replace all Windows mutation adapters with in-memory fakes. They verify journaling and recovery without changing this PC. These tests pass on Windows PowerShell 5.1 and PowerShell 7. The JSON CLI list/status/info/error responses are also checked with Windows PowerShell 5.1. The Electron invocation may use the agreed process-local `-ExecutionPolicy Bypass`; do not change the machine execution policy. Real power-plan changes, restore points and FiveM process behavior still require manual checks on a disposable Windows gaming test system, including denied-access cases. This is an initial backend implementation, not a validated FPS optimization release.

References: [Microsoft powercfg](https://learn.microsoft.com/en-us/windows-hardware/design/device-experiences/powercfg-command-line-options), [process priority](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/setpriority-method-in-class-win32-process), [Checkpoint-Computer](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/checkpoint-computer?view=powershell-5.1).

Test-environment limitation: CIM access is denied in the current sandbox. `info` correctly returns a JSON error and exit 1 here; successful hardware discovery still needs a check outside this sandbox. The CLI uses UTF-8 and emits exactly one JSON object for handled requests. Missing/unknown PowerShell parameter names and host execution-policy failures occur before script handling and remain host-level errors.
