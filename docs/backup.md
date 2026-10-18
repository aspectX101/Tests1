# Shared backup and restore system

All current modules use the same atomic journal writer and automatic recovery registration. Before a journal is changed, immutable original-value metadata is archived under `%LOCALAPPDATA%\Tweaker\Backups\records`. If registration or journal storage fails, the pending apply operation stops before modifying Windows or moving cache data. Restore also verifies registration before modifying the affected data. Original archives are retained after successful restore and after later operations.

This is a shared manager for Tweaker operations, not a full Windows/disk-image backup. Windows restore points supplement per-operation backups for persistent settings. A verified Tweaker checkpoint less than 24 hours old can be reused; Windows frequency limits are unchanged. Selected optimization settings also use this catalog, including exact restoration of originally absent registry values; see [optimization](optimization.md).

## Scope and storage

| Module | Original values/data | Shared restore behavior |
| --- | --- | --- |
| Windows performance | Original energy-plan GUID, or original FiveM priorities with process identity | Restore exact original values; ignore exited/reused process identities; refuse newer external changes. |
| Keyboard | Original repeat settings and accessibility flags | Validate all affected fields before restore; do not overwrite a conflicting later user setting. |
| FiveM cache | Quarantined files in the selected installation, plus archived manifest metadata | Restore only a matching intact backup; require FiveM/GTA closed; never overwrite regenerated cache paths. Purged backups cannot be restored. |
| SafeMode | First original service states/configuration, recorded as evidence | Show/export records, but do not replay disabled/stopped critical service configurations or turn off the protection policy. Use the existing SafeMode controls to manage monitoring. |

The catalog is per Windows user; SafeMode evidence refers to the existing machine-wide protected journal. Cache files remain in their same-volume quarantine, avoiding a second large copy. **The central metadata directory alone is not a complete portable cache backup.** Restoration requires the source journal and, for cache, its payload. Missing/corrupt source journals are reported as unavailable and are not silently reconstructed from potentially stale history.

Older module journals are discovered read-only without being moved or overwritten. The usual FiveM location is inspected automatically. For custom installations created before shared registration, supply `-FiveMPath` to discover their cache backups. New custom-location backups are registered automatically and remain discoverable through the shared catalog.

## JSON actions for Electron

```powershell
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File tweaker.ps1 -Action backup-list -Lang de
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File tweaker.ps1 -Action backup-preview -BackupId <sharedBackupId>
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File tweaker.ps1 -Action backup-restore -BackupId <sharedBackupId>
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File tweaker.ps1 -Action backup-restore-all
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File tweaker.ps1 -Action backup-export -BackupId <sharedBackupId>
```

`backup-list` returns `{ok:true,backups:[{backupId,kind,tweakId,createdUtc,status,canRestore,reason}],warnings:[]}`. Kinds are `tweak`, `cache`, `services`. Match tweak IDs against `list` for localized names; label cache/service entries separately. `createdUtc` uses UTC. Read-only list/preview/export do not create backup directories. A shared recovery ID differs from the native cache backup ID; use the ID returned by this catalog for shared actions.

`backup-preview` returns a single `backup`, its original-value `snapshot`, and warnings. Preview checks current values, process identity and cache path conflicts without changing data. `canRestore` is a best-effort preflight, not a guarantee: permissions, running processes and values may change afterwards. The actual restore repeats validation and checks the expected recovery identity inside the domain lock.

`backup-restore` and `backup-restore-all` return `{ok,status,results:[{backupId,status,reason}],warnings,restartRequired:false}`. Partial results have `ok:false`, `status:"partial"`, `error:"restore_incomplete"` and exit code 1. Display every item result; do not collapse a partial result into a success notification or a generic error. The existing Electron adapter preserves these JSON results on exit 1.

Restore-all walks backups newest first, skipping restored, purged, superseded and service-evidence entries. It continues after individual conflicts/failures. This is **not an all-or-nothing transaction**. Repeating restore-all skips items already restored and retries remaining compatible items. Different cache backups for the same paths may conflict; choose the desired backup explicitly instead of silently replacing an earlier cache. If any catalog corruption warning exists, aggregate recovery does not claim complete success.

`backup-export` returns `{ok:true,format:"tweaker-recovery-export-v1",record,importSupported:false}`. The UI can save this recovery evidence to a user-selected JSON file. It includes original-value metadata and source references, not the full cache payload, Windows restore-point contents or a trusted import. No arbitrary external JSON import or script execution is provided.

## History and safety rules

- Snapshot identity includes the normalized source location and a SHA-256 fingerprint of original values. Status updates do not rewrite the archive. Fingerprints detect accidental modification; they are not signatures or encryption and do not establish trust in externally supplied files.
- If a later operation replaces a tweak's active journal, the earlier archive remains visible as `backup_superseded` and cannot be replayed over the newer operation. Restore the current compatible operation first; older history is evidence, not an arbitrary settings timeline.
- Common restores serialize through a shared lock and then use the existing per-module locks and native restore implementations. They do not bypass the SafeMode guard, restore-point checks or cache path allowlist.
- A failed/interrupted operation keeps original values and domain progress available. Retry through the shared manager or existing revert/cache-restore actions. Unexpected source modification, missing files and invalid archives remain visible rather than being guessed around.
- There is no automatic deletion of archives or cache payloads. Permanent cache deletion still requires the dedicated confirmed purge action.

## UI usage

```js
const inventory = await backend({ action: 'backup-list', lang: currentLanguage });
const preview = await backend({ action: 'backup-preview', backupId, lang: currentLanguage });
// Show the affected module, original values and any conflict before user confirmation.
const restored = await backend({ action: 'backup-restore', backupId, lang: currentLanguage });
// Or a user-requested global recovery; display completed/skipped/failed items separately.
const all = await backend({ action: 'backup-restore-all', lang: currentLanguage });
```

Package `Backup.ps1` alongside the existing scripts; the supplied EXE configuration already includes it. Existing apply/revert/cache/SafeMode endpoints remain compatible and automatically register their own originals. A new module must define a supported payload and source-location validation before it can participate in shared recovery.

## Validation

`tests/Backup.Tests.ps1` uses real archive/journal/cache fixture files with simulated Windows adapters. It verifies automatic registration, immutable originals, registration failure before apply/restore, conflict previews, individual/global recovery, partial retry, unchanged SafeMode protection, source identity under lock, historical suppression, read-only legacy discovery and corrupt archive isolation. It passes on Windows PowerShell 5.1 and PowerShell 7.

CLI contract tests exercise shared listing/preview/export and restoration using a disposable cache fixture and an isolated LOCALAPPDATA. Node tests verify shared action validation and preservation of partial outcomes. Real Windows mutations, machine-wide ACLs, long-path edge cases and a full packaged Electron app remain release checks; development did not modify real Windows or FiveM settings.

