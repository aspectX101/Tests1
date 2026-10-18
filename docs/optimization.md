# Selected optimization settings

The screenshot request was narrowed to useful options, not the entire tweak list.
The Optimierung / Optimization / Ottimizzazione tab now contains four real entries:

| ID | Setting | Benefit and cost |
|---|---|---|
| `windows.power.high` | Existing High performance plan | May help power-limited workloads; increases power/heat. Existing implementation, not a new or branded power plan. |
| `windows.capture.off` | Disable Game DVR capture | Avoids capture work when previously active; disables manual Game Bar recording too. Does not delete videos. Medium risk because recording functionality is lost. |
| `windows.gamemode.on` | Enable Game Mode | Windows' game scheduling preference; often already enabled. Low risk; no guaranteed FPS increase. |
| `windows.audio.ducking.off` | No communications audio attenuation | Keeps other sounds from being automatically lowered by Windows during calls. Audio convenience, no performance claim. Low risk. |

No CPU unparking, GPU TDR extensions, real-time I/O, legacy FPS keys, custom MMCSS profiles, svchost grouping, or blanket service shutdowns were added. Menu/tooltip delays, telemetry, advertisements and privacy preferences are not sold as FPS optimizations. SafeMode's service policy is unchanged.

## Implementation and contract

`Optimization.ps1` is shipped as an external backend resource. Existing `list`, `status`, `apply`, `revert`, and shared backup endpoints accept the three new fixed IDs. There are eight actual tweaks across all tabs. Mock mode uses `app/tweak-catalog.js` generated from `Get-TweakerCatalog`; the previous six fictional design-only entries have been removed.

Settings apply to the current Windows user on Windows 10 client build 19041+ / Windows 11. Elevate as the same user. The fixed fields are:

| ID | HKCU path | DWORD values |
|---|---|---|
| capture | `Software\Microsoft\Windows\CurrentVersion\GameDVR` | `AppCaptureEnabled=0`, `HistoricalCaptureEnabled=0` |
| capture | `System\GameConfigStore` | `GameDVR_Enabled=0` |
| game mode | `Software\Microsoft\GameBar` | `AutoGameModeEnabled=1` |
| audio | `Software\Microsoft\Multimedia\Audio` | `UserDuckingPreference=3` |

`applied` reads these actual settings each time, never the saved applied flag. It reports configured state, not measured FPS, active capture sessions or immediate effectiveness. The three new settings conservatively report `requiresRestart=true`, and successful mutations report `restartRequired=true`. Already-at-target values return `unchanged` without a new backup. All three require individual selection (`bulkSafe=false`) because recording/audio are personal preferences and Game Mode may already be in use.

If reading an individual entry fails, `list` returns `available=false`, `applied=null`, and `stateError`. The UI disables that switch and displays the error. Missing registry values are valid original states; unexpected types/ranges fail closed. No arbitrary path, command or registry name is accepted from the UI or backup.

Every operation uses the existing exclusive operation lock. Before writing, it records value existence, original DWORD type/value and the fixed target in a pending journal and immutable common backup. It rechecks originals after checkpoint creation and immediately before each write. Restore validates the complete allowlist and all conflicts before changes; absent originals are restored by removing only that value. Unchanged fields are not owned. Failed/partial apply or restore remains recoverable from the shared backup view. Empty parent registry keys may remain; unrelated values are never removed.

Persistent changes require a verified Windows checkpoint. A Tweaker checkpoint less than 24 hours old can now be reused, allowing several tweaks in succession without modifying Windows' restore-point frequency limit. Its description and creation timestamp are re-read from Windows on each call; foreign, future, malformed or expired checkpoints are not reused. Without one, a newly created checkpoint must be verified or apply fails. Exact per-operation backups are still created for every changed setting.

## Evidence and limits

- [Microsoft Windows settings reference](https://learn.microsoft.com/en-us/windows/apps/develop/settings/settings-windows-11) maps `AutoGameModeEnabled` to the Game Mode setting.
- [Xbox engineering on Game DVR overhead](https://news.xbox.com/en-us/2016/10/14/tips-on-windows-10-and-game-dvr-optimization/) explains why active background capture can cost performance. The underlying HKCU capture preferences are implementation details, not a guaranteed public cross-version API. They require manual verification in Windows Captures settings on each supported release.
- [Microsoft engineer's audio workaround](https://techcommunity.microsoft.com/discussions/microsoftteams/audio-volume-turned-very-low-when-sharing-content-via-hdmi-in-mtr/2406913) uses `UserDuckingPreference=3`; per-app audio attenuation remains independent.
- [Microsoft TDR documentation](https://learn.microsoft.com/en-us/windows-hardware/drivers/display/tdr-registry-keys) reserves those controls for driver testing/debugging, not end-user optimization.
- [Microsoft MMCSS documentation](https://learn.microsoft.com/en-us/windows/win32/procthread/multimedia-class-scheduler-service) requires application participation; writing an invented game task alone does not opt a game into it.

Automated tests use simulated Windows writes and real disposable journals. They cover exact restore (including missing values), partial failures/retries, shared restore-all, external conflicts, allowlist tampering, admin/platform/archive failures, checkpoint reuse/expiry, IPC and packaging. CLI contract tests read actual Windows settings but do not apply them. Real setters, post-restart behavior and FPS impact still require a disposable Windows test account; no performance improvement has been benchmarked and the developer's PC settings were not changed.
