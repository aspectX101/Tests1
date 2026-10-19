# Tweaker performance, keyboard and FiveM cache backend

UI-independent Windows backend for the shared Tweaker project. First implementation; Windows 10/11, Windows PowerShell 5.1 or PowerShell 7. UI belongs to Claude and can consume the JSON CLI. No external packages.

## Implemented

- `windows.power.high`: selects the existing High performance plan, saves the original GUID and verifies the result. Administrator rights and a newly verified Windows restore point are required. If Windows blocks creation (disabled protection, frequency limit, unsupported environment), the operation stops before changing the plan. Unsupported power plans are reported, never created implicitly.
- `fivem.priority.high`: changes only running `FiveM_GTAProcess` / `FiveM_b<build>_GTAProcess` processes from Idle/BelowNormal/Normal/AboveNormal to High. Backs up each original priority with PID and start time. Restore ignores exited processes and reused PIDs. Run again after a new game launch. No persistent watcher yet.
- `keyboard.repeat.fast`: shortest documented Windows key-repeat delay (level 0, approximately 250 ms), highest repeat speed (31, approximately 30/s). Affects held keys and typing throughout Windows. Does not change first-keypress latency, keyboard polling or raw-input game movement.
- `keyboard.filterkeys.off`: disables Filter Keys and its right-Shift activation hotkey. Keeps the availability flag, other preferences and all Filter Keys timing parameters. Only useful if this accessibility feature or its hotkey interferes with input; users who need it should keep it enabled.
- `keyboard.stickykeys.off`: disables Sticky Keys and its five-Shift activation hotkey. Preserves the other persistent preferences. Does not attempt to save/restore transient held/latched modifier state.
- Catalog includes German, English and Italian names/descriptions. IDs and status codes are language-neutral. UI translates errors and displays warnings before applying.
- SafeMode audits 22 named services and repairs the enabled/running policy for 15 core/essential services. Its Electron watchdog runs while the app is open. See [SafeMode contract](safemode.md) for scope, reports and UI integration.
- A shared backup manager automatically archives originals across these modules, lists recovery history and provides preview, export, individual and global restore. See [backup contract](backup.md). SafeMode service evidence is listed without re-disabling critical services.
- FiveM Cache Cleaner is a separate utility with preview, reversible quarantine, restore and explicit permanent purge. See below. Windows EXE packaging and main-process integration for Claude's Electron UI are provided in [packaging/README.md](../packaging/README.md) and [electron/backend.cjs](../electron/backend.cjs).

## UI integration

Use a fixed trusted script path and an argument array, not a shell command built from user input:

```powershell
powershell.exe -NoProfile -NonInteractive -File tweaker.ps1 -Action list
powershell.exe -NoProfile -NonInteractive -File tweaker.ps1 -Action status -Id windows.power.high
powershell.exe -NoProfile -NonInteractive -File tweaker.ps1 -Action apply -Id windows.power.high
powershell.exe -NoProfile -NonInteractive -File tweaker.ps1 -Action revert -Id windows.power.high
powershell.exe -NoProfile -NonInteractive -File tweaker.ps1 -Action apply -Id fivem.priority.high
powershell.exe -NoProfile -NonInteractive -File tweaker.ps1 -Action revert -Id fivem.priority.high
powershell.exe -NoProfile -NonInteractive -File tweaker.ps1 -Action apply -Id keyboard.repeat.fast -Lang de
powershell.exe -NoProfile -NonInteractive -File tweaker.ps1 -Action revert -Id keyboard.repeat.fast -Lang de
powershell.exe -NoProfile -NonInteractive -File tweaker.ps1 -Action status -Id keyboard.filterkeys.off
```

Exit 0: `{"ok":true,...}`. Exit 1: `{"ok":false,"error":"error_code_or_diagnostic"}`. Treat stderr separately. Parameter-binding errors from PowerShell itself may occur before JSON handling. The `list` response contains `tweaks` with localized names/descriptions, category, risk, requiresRestart, reversible, requiresAdmin and live applied state. `status -Id` returns id/applied. `apply` and `revert` return id/applied/restartRequired/message/status. `info` returns os/cpu/gpu/ramGB/isAdmin. Optional `-Lang de|en|it`, default de. Status reads Windows, not the journal. Do not auto-apply on app startup. Elevate power operations as the same Windows user; never accept arbitrary scripts, state paths, PIDs or priorities from untrusted UI content.

## Recovery and boundaries

Per-user originals are stored in `%LOCALAPPDATA%\Tweaker\Performance`. Atomic journal writes precede mutations. An exclusive file lock prevents simultaneous operations in this backend. Failed or interrupted operations retain a `pending` journal: call restore before retrying. Applied backups are never overwritten. Restore refuses conflicting external changes. A partial restore can be retried; already restored entries are skipped. Keep this local state until recovery is complete; it is trusted local app data, not an import/export format. Windows restore points supplement the exact per-tweak backup for the persistent energy-plan change; transient process priority has an exact session backup and also resets when the process exits.

Keyboard changes also require administrator validation and a verified restore point before apply. A verified Tweaker point less than 24 hours old can be reused; otherwise a new point is required. Windows normally limits creation to one per 24 hours; this limit is never bypassed. Restore uses exact saved values without a new checkpoint. Already-active settings return `unchanged` without inventing an original backup: `applied=true` means the live configuration matches, not that Tweaker owns a backup. In that case revert returns `backup_not_found`. Never automatically enable all keyboard tweaks; show the accessibility impact and let users choose each setting.

The keyboard implementation loads `Keyboard.ps1` and compiles the included `native/Keyboard.cs` with built-in Add-Type. Ship these alongside Tweaker.psm1 and tweaker.ps1. It calls the documented SystemParametersInfo API with persistent user settings and a change broadcast. Affected applications may need to be reopened. All settings apply to the current Windows user and all keys, not just W/A/S/D; the app must elevate as that same user. No reboot is required. If apply fails after the first field, the `pending` journal is preserved; call revert before retrying. Conflict checks run before restore writes, and unchanged fields are not restored over later user changes.

No FPS improvement is promised. High performance can increase heat and power use; priority changes can reduce responsiveness elsewhere. The optimization tab now includes the screenshot-derived catalog with explicit risks, availability checks and exact shared recovery. Optional service shutdowns are blocked by SafeMode. See [optimization](optimization.md) for all 45 catalog entries, two disabled informational cards, native adapter limitations and verification. FiveM naming variants outside the explicit allowlist are unsupported.

## Validation

```powershell
pwsh -NoProfile -File tests/Performance.Tests.ps1
pwsh -NoProfile -File tests/Keyboard.Tests.ps1
pwsh -NoProfile -File tests/Contract.Tests.ps1
pwsh -NoProfile -File tests/CacheCleaner.Tests.ps1
pwsh -NoProfile -File tests/SafeMode.Tests.ps1
pwsh -NoProfile -File tests/Backup.Tests.ps1
node --test tests/electron-backend.test.cjs
node --test tests/safemode-monitor.test.cjs
```

Tests replace all Windows mutation adapters with in-memory fakes. They verify journaling and recovery without changing this PC. These tests pass on Windows PowerShell 5.1 and PowerShell 7. The JSON CLI list/status/info/error responses are also checked with Windows PowerShell 5.1. The Electron invocation may use the agreed process-local `-ExecutionPolicy Bypass`; do not change the machine execution policy. Real power-plan changes, restore points and FiveM process behavior still require manual checks on a disposable Windows gaming test system, including denied-access cases. This is an initial backend implementation, not a validated FPS optimization release.

References: [Microsoft powercfg](https://learn.microsoft.com/en-us/windows-hardware/design/device-experiences/powercfg-command-line-options), [process priority](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/setpriority-method-in-class-win32-process), [Checkpoint-Computer](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/checkpoint-computer?view=powershell-5.1).

Test-environment limitation: CIM access is denied in the current sandbox. `info` correctly returns a JSON error and exit 1 here; successful hardware discovery still needs a check outside this sandbox. The CLI uses UTF-8 and emits exactly one JSON object for handled requests. Missing/unknown PowerShell parameter names and host execution-policy failures occur before script handling and remain host-level errors.

Keyboard validation: journal/restore, privilege and checkpoint failures, disk failure, partial apply/restore recovery, external-change detection, backup validation and operation locking are tested with simulated setters. Read-only CLI tests exercise the real native getters and JSON contract. Native keyboard setters and actual persistence after sign-out still need manual verification on a disposable test account; no real keyboard settings were changed during development. Queue-size registry edits, key remapping, macros and latency/FPS promises are intentionally excluded.

Keyboard references: [SystemParametersInfo](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-systemparametersinfow), [Filter Keys](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-filterkeys), [Sticky Keys](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-stickykeys).

## FiveM Cache Cleaner

The utility accepts the normal installation `%LOCALAPPDATA%\FiveM\FiveM.app`, or an explicit local absolute `-FiveMPath` pointing to application data. It requires `CitizenFX.ini` and `data` as installation markers. Unsupported/absent installations return an error and are not guessed from broad disk searches.

```powershell
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File tweaker.ps1 -Action cache-info -Lang de
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File tweaker.ps1 -Action cache-clean -Lang de
# Use the backupId returned by clean/info (32 hexadecimal characters):
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File tweaker.ps1 -Action cache-restore -BackupId <backupId>
# Alternative to restore: irreversible removal, after a separate UI confirmation:
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File tweaker.ps1 -Action cache-purge -BackupId <backupId> -ConfirmPurge
```

- `cache-info` returns `{ok, root, candidates:[{relative, bytes, fileCount}], totalBytes, backups:[{backupId,status,createdUtc}], requiresClosedGame, message}` without writing anything. Preview can run while the game is open; mutation cannot. `cache-clean` rescans so the displayed estimate may change if FiveM has written new files since preview.
- `cache-clean` moves only children of `data/cache` (except `game`), `data/server-cache` and `data/server-cache-priv` into `.tweaker-cache-backups/<backupId>/payload` in the same install. It returns `status`, `backupId`, `removedFromActiveCacheBytes`, `freedBytes:0` and a localized message. Cached server downloads must be fetched again when needed. This repairs active cache state without claiming to free disk space while a backup still exists.
- `cache-restore` restores the selected backup, never overwriting regenerated cache paths. A conflict requires the user to decide which cache data to keep. Interrupted moves are recorded before the first mutation and can be recovered using `cache-info` and `cache-restore`.
- `cache-purge` requires `-ConfirmPurge` and permanently removes only the selected backup's whitelisted payload paths. Afterwards restore is unavailable. `freedBytes` counts the logical file lengths removed in that call, not measured physical disk-space change; sparse/compressed/hard-linked files may differ. Retrying a partially completed purge counts only files remaining at retry. A `purging` journal cannot be restored because it may already be incomplete.

FiveM/related GTA client processes must be closed. Reparse points/junctions in selected trees or ancestors are rejected; operations are serialized. Settings, keybind/config files, local citizen mods, `data/game-storage`, `data/nui-storage`, legacy `data/cache/game`, logs outside the selected cache, and crash dumps are not selected. There is no automatic startup cleaning. The GUI should show the selection/estimate, explain backup disk usage, and offer restore or a separately confirmed permanent purge. Cache actions are not included in `list` as reversible tweak toggles.

Cache tests use disposable fake installations, including real file moves, restore and purge. They check running-game rejection, preserved files, byte counts, partial clean recovery, conflicts and invalid manifests. The sandbox denies physical junction creation, so reparse-point rejection is tested with simulated metadata; physical junction handling still requires a Windows test account. Actual FiveM installation behavior, concurrent external filesystem replacement, long-path edge cases on Windows PowerShell 5.1, and EXE launch remain release checks. Errors leave recoverable backups where possible; do not manually alter manifests/payloads. The cleaner is not designed to defend against a malicious process racing filesystem changes in an elevated session.

FiveM source context: [client cache layout](https://github.com/citizenfx/fivem/blob/master/code/client/launcher/Main.cpp), [client storage paths](https://github.com/citizenfx/fivem/blob/master/code/client/shared/Utils.Win32.cpp).

## Tweak categories and risk

`list` uses explicit per-tweak metadata, including the new `keyboard` category. `windows.power.high`: performance/low; `keyboard.repeat.fast`: keyboard/low; `fivem.priority.high`: gaming/medium; Filter Keys and Sticky Keys: keyboard/medium. There are no high-risk tweaks in the current catalog. Risk is relative impact, not a guarantee of safety or performance benefit.

The additional boolean `bulkSafe` is true only for the energy plan and keyboard repeat preset. Use `available !== false && risk === 'low' && bulkSafe === true` for user-requested bulk actions. Handle failures per item. Never automatically batch-disable accessibility, recording or audio preferences. Persistent changes require a verified recent Tweaker checkpoint or a newly verified one, plus an exact per-operation backup. Windows' checkpoint frequency limit is unchanged. Optimization risks are assigned per entry; scheduling, TDR, service shutdowns and svchost grouping are high risk. `list` includes `available`/`stateError`; failed reads use `applied=null` instead of falsely reporting disabled.

