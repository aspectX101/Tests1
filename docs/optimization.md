# Optimization catalog

The Optimierung / Optimization / Ottimizzazione tab contains 40 screenshot-derived entries plus the existing High performance plan. The full application catalog has 49 entries: 47 implemented settings/presets and two informational, disabled cards. Optional components may be unavailable on a particular PC. All names, descriptions and new error codes are provided in German, English and Italian.

All definitions are our own. Tweak texts never name other tools or products (enforced by tests/catalog-texts.test.cjs). The H1T.CC performance preset changes the active plan's AC minimum processor state to 100% and sleep timeout to Never; it does not install a separate power plan. Battery indices are preserved. The multimedia latency option uses documented SystemResponsiveness=10, not an unused custom task. The MMCSS option enables the real MMCSS service. Consumer suggestions are disabled without suppressing WUDF driver logs. Prefetch configuration and SysMain service control are separate.

`Legacy Games FPS keys` and `IO realtime worker priority` remain visible but cannot be applied: these labels do not identify supported universal Windows controls. No fake FPS settings, ignored SFIO/GPU-priority fields, or arbitrary real-time process priorities are created. Microsoft documents some MMCSS fields as unused. Settings such as TDR, svchost grouping, service shutdowns and scheduling experiments are high risk and require individual confirmation. TDR is a driver-debug setting, not a performance fix; Microsoft advises end users not to manipulate it.

## Implemented settings

The authoritative field definitions are in `OptimizationCatalog.json` and the original three definitions in `Optimization.ps1`. The table lists fixed targets; originals are read before each operation, never inferred from defaults.

| ID | Concrete behavior | Risk |
|---|---|---|
| `windows.power.profile` | Sets minimum CPU performance to 100% and sleep to Never in the current plan, on AC power only. More heat, power and fan noise; no FPS promise. | medium |
| `windows.cpu.unpark` | Sets minimum unparked cores to 100% in the current AC power plan. Can increase heat and power use and hurt hybrid/X3D scheduling. | high |
| `windows.sync.off` | Disables Windows settings synchronization by policy. Does not modify cloud files. Privacy option, not an FPS tweak. | medium |
| `windows.explorer.startup` | Sets the classic Explorer startup delay to 0 ms. More simultaneous load at sign-in; behavior depends on Windows version and startup application. | medium |
| `windows.menu.instant` | Classic submenus open without a delay. Convenience only, no game speed gain. Sign out and back in. | low |
| `windows.hibernate.off` | Disables hibernation through powercfg and Fast Startup. Windows removes the hiberfile; boot may take longer. No FPS gain. | medium |
| `windows.gpu.tdr` | Driver diagnostics only: waits 8 instead of the default 2 seconds before a GPU timeout. Can prolong freezes and mask faults. Microsoft advises end users against TDR changes; no performance gain. | high |
| `windows.mmcss.games` | Sets the existing MMCSS Games profile to High / priority 2. Only affects threads registered with this profile. May affect other multimedia work. | high |
| `windows.mmcss.latency` | Our low-latency variant: SystemResponsiveness 10 instead of 20. Only affects MMCSS applications and can slow background work. Does not create an unused custom game profile. | high |
| `windows.foreground` | Uses Win32PrioritySeparation 38 (0x26): short variable quanta with foreground boost. Often already the default; background services may slow down. | medium |
| `windows.prefetch.off` | Sets EnablePrefetcher to 0. Can slow application launches; no established gaming benefit on modern Windows. SysMain is a separate switch. | high |
| `windows.service.sysmain.off` | Stops and disables SysMain. For diagnosing high disk activity; app launches may slow down. SafeMode blocks service shutdowns. | high |
| `windows.service.diagtrack.off` | Stops the Connected User Experiences and Telemetry service. Does not disable all telemetry or promise more FPS. Blocked by SafeMode. | high |
| `windows.service.wappush.off` | Stops WAP Push routing when installed. Can affect device management; unsuitable for managed business PCs. Blocked by SafeMode. | high |
| `windows.service.wer.off` | Stops Windows Error Reporting. Reduces crash diagnostics; does not prevent crashes. Blocked by SafeMode. | high |
| `windows.service.diagnosticshub.off` | Stops the Standard Collector when installed. Diagnostic and developer tools may lose functionality. Blocked by SafeMode. | high |
| `windows.service.xbgm.off` | Stops the legacy xbgm service when present. May affect Xbox functionality; absent on many PCs. Blocked by SafeMode. | high |
| `windows.svchost.group` | Raises the split threshold to 4,194,303 MB. Fewer isolated processes but worse fault isolation. No general performance gain; restart required. | high |
| `windows.ceip.off` | Disables installed Consolidator, KernelCeipTask and UsbCeip tasks without deleting them. Privacy option, no guaranteed performance gain. | medium |
| `windows.power.extras` | Disables AC sleep and Windows Power Throttling. Higher power use; the global throttling option may reduce battery life. | high |
| `windows.office.telemetry.off` | Disables logging and upload for the classic Office 16 Telemetry Agent. Does not disable all Microsoft 365 diagnostics; requires Office 16 family. | medium |
| `windows.suggestions.off` | Disables suggested apps for this user. Keeps WUDF driver diagnostic logs: disabling those has no established benefit. | low |
| `windows.legacy.fps` | No universal Windows feature has this name. No ineffective FPS keys are created. Specific games need individual compatibility settings. | high |
| `windows.io.realtime` | No supported global Windows switch. Real-time priority can starve system work; this card therefore changes no settings. | high |
| `windows.close.faster` | Sets HungAppTimeout to 3000 ms and WaitToKillAppTimeout to 5000 ms. May interrupt saving at sign-out. Does not force automatic termination; menu delay is separate. | high |
| `windows.mmcss.on` | Sets the MMCSS service to Automatic and starts it. Does not alter undocumented scheduler keys. Usually already active. | medium |
| `windows.assistance.off` | Disables solicited Windows Remote Assistance. Remote Desktop and third-party remote tools are separate. Not an FPS tweak. | medium |
| `windows.autoplay.off` | Disables AutoPlay for all drive types for this user. Drives remain accessible. | low |
| `windows.tooltip.fast` | Sets MouseHoverTime to 100 ms for classic hover events. Apps with custom tooltips may ignore it. Does not reduce keyboard input latency. | low |
| `windows.activity.off` | Disables activity feed, collection and upload by policy. Does not delete existing history. Legacy Timeline features depend on Windows version. | medium |
| `windows.storage.off` | Disables automatic storage cleanup. Deletes no files; disk usage may grow. | medium |
| `windows.explorer.defaults` | Opens Explorer at This PC and hides recent files/folders. Convenience only; no FPS gain or file deletion. | low |
| `windows.spotlight.off` | Disables rotating lock-screen Spotlight content and tips for this user. No performance guarantee. | low |
| `windows.gamebar.quiet` | Disables classic Game Bar startup tips. Version-dependent convenience setting; recording is separate. | low |
| `windows.clipboard.off` | Disables clipboard history. Normal copy/paste remains available. Does not actively delete saved entries. | medium |
| `windows.copilot.off` | Only for the old integrated Copilot sidebar. Does not uninstall or block the newer standalone Copilot app; unavailable on newer Windows builds. | medium |
| `windows.ink.off` | Disables classic Ink Workspace by policy. Can affect pen workflows; no FPS gain. | medium |
| `windows.capture.off` | AppCaptureEnabled=0, HistoricalCaptureEnabled=0, GameDVR_Enabled=0; includes manual recording. | medium |
| `windows.gamemode.on` | AutoGameModeEnabled=1. | low |
| `windows.audio.ducking.off` | UserDuckingPreference=3. Convenience, no FPS claim. | low |
| `windows.power.high` | Selects the existing Windows High performance plan. | low |

## Runtime and recovery

- `list`, `status`, `apply`, `revert` retain the single UTF-8 JSON-object contract and fixed Electron allowlist. `applied` reads configured/live values, not a journal flag or a benchmark. Restart metadata is conservative. An unavailable or failed read returns `available=false`, `applied=null`, and a localized `stateError`; the switch is disabled. The two informational cards also have `reversible=false`.
- `OptimizationNative.ps1` and `OptimizationCatalog.json` ship next to the CLI in the portable EXE's backend resources. Mock mode uses the generated real catalog, including the disabled informational cards. A failed mutation refreshes the UI's live list because rollback may have changed the result.
- Each changed operation requires an administrator and a verified recent Tweaker checkpoint (less than 24 hours old) or a newly verified checkpoint. Before writes, the pending journal and immutable shared recovery record preserve registry value existence/type/value, service start mode/delayed-start value and runtime state, enabled task state, AC power index and its plan GUID, or hibernation file presence/type/size metadata. Registry keys created for values may remain empty after recovery.
- Exact restore does not invent Windows defaults. Writes are verified, fields already at target are not owned, and changes outside our recorded states cause conflicts. A switched active power plan must be selected again before its backup can restore. Missing optional tasks are not created or deleted. Running scheduled tasks are not forcibly terminated; disabling affects future scheduling.
- Apply failures attempt automatic rollback under the operation lock. If rollback fails, the durable journal remains available to shared recovery. For a failed multi-step hibernation API call, a validated observed intermediate state is recorded. Unknown states, unreadable hardware, or a process/power loss inside a native call may require manual diagnosis; there is no promise of machine-wide atomicity. Hibernation recreates its file/settings, not previous hibernation-session memory.
- Optional service changes hold the same machine SafeMode lock as protection changes. SafeMode blocks all optional service shutdowns, both on apply and restore. Critical Windows/security services are not in the disabling allowlist. Dependent services are never force-stopped. MMCSS can be enabled while SafeMode is active; restoring an originally disabled/stopped state is blocked until protection is off. Existing SafeMode repair snapshots remain evidence-only; these separately journaled optional-service tweaks are reversible.
- All 40 screenshot-derived entries have `bulkSafe=false`. “Apply all safe” still only considers explicitly eligible low-risk presets. Privacy, comfort, compatibility and diagnostic options are not described as established FPS improvements. Legacy Copilot policy is disabled on build 26100+ and does not manage the standalone Copilot app. Legacy UI preferences and policies may be ignored by newer components or managed Windows editions.

## Verification

Automated tests cover the complete catalog, three languages, fixed IPC IDs, exact original-value recovery through the shared manager, absent values/tasks, automatic rollback, interrupted hibernation-state recovery, external plan conflicts, SafeMode guards, delayed-start and paused services, dependent-service refusal, packaging resources, and JSON/UTF-8 output. Windows mutation providers are simulated; read-only CLI checks use the actual Windows environment. No performance gain was measured and no real service/power/registry tweak was applied to the development PC. Native mutation behavior still needs validation on a disposable Windows test machine before a public release.

## Sources

- [Microsoft: MMCSS, task priorities and unused fields](https://learn.microsoft.com/en-us/windows/win32/procthread/multimedia-class-scheduler-service)
- [Microsoft: CPMinCores](https://learn.microsoft.com/en-us/windows-hardware/customize/power-settings/options-for-core-parking-cpmincores)
- [Microsoft: powercfg and hibernation](https://learn.microsoft.com/en-us/windows-hardware/design/device-experiences/powercfg-command-line-options)
- [Microsoft: TDR keys are for driver development](https://learn.microsoft.com/en-us/windows-hardware/drivers/display/tdr-registry-keys)
- [Microsoft: SYSTEM_POWER_CAPABILITIES](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-system_power_capabilities)
- [Microsoft: Office Telemetry Agent](https://learn.microsoft.com/en-us/deployoffice/compat/deploy-telemetry-dashboard)
- Local Windows policy definitions checked for SettingSync, StorageSense, OSPolicy, WindowsCopilot and WindowsInkWorkspace. These describe configured policy values, not a guarantee of enforcement on every edition.

## Selected optimisation actions

The Optimisation tab uses selection checkboxes. Start Optimisations refreshes the real catalogue, confirms the chosen names, descriptions and risk levels, then applies only available, inactive selected performance tweaks sequentially. Select safe tweaks only selects entries explicitly marked low risk and bulkSafe by the backend. Apply stops on the first failure and reports completed entries. No change is applied by selection alone.

Revert All reads the shared backup inventory and restores only current tweak backups whose IDs belong to the performance category. It excludes superseded/restored records and all Debloat, startup, cache and other-category backups. Conflicts are reported without overwriting; other eligible records can continue. Original values come from the existing backup-restore backend, not assumed Windows defaults. Both actions retain backend SafeMode enforcement, refresh actual state and surface restart requirements. Navigation is locked during the operation and confirmation to avoid overlapping UI actions.

Validation: eight optimisation action tests plus four Debloat action regression tests; browser mock apply and restore flow. No native Windows modifications were performed for this UI change.

## Start actions since 0.9.4

Start Optimisations now confirms and applies every available, inactive entry in the visible performance category, including high-risk entries; no selection is required. Start Debloat refreshes app, tweak and startup inventories, then confirms all removable apps, available inactive Debloat policies and supported active unmanaged startup entries. App removal and Recall data-loss warnings remain explicit. Each eligible item is attempted once per run; independent actions continue after an error, and failures remain visible. Already-applied/unavailable entries are excluded. Status indicators replace selection controls. Revert All scope and backend safety/backup checks are unchanged. This behavior supersedes the earlier selection-based workflow described above.

## Network tab since 0.9.9

The Netzwerk / Network / Rete tab lists 12 `network.*` entries from `OptimizationCatalog.json` plus `windows.mmcss.latency` (shown there by the UI, still category `performance` in the backend). Start Network and Revert All use the same batch as Start Optimisations, scoped to this tab. All entries use the shared journal, restore point, verification and automatic rollback in `Optimization.ps1`.

| ID | Concrete behavior | Risk |
|---|---|---|
| `network.winsock.udp` | AFD `FastSendDatagramThreshold` = 1500. | medium |
| `network.throttle.off` | MMCSS `NetworkThrottlingIndex` = 0xFFFFFFFF (off). | medium |
| `network.dns.fast` | Measures Cloudflare and Google (median of five lookups, Cloudflare wins ties) once when applied, stores the choice in `network-dns.txt` next to the journals and sets it as IPv4 DNS on every physical Ethernet/Wi-Fi card via netsh. IPv6 DNS is untouched. | medium |
| `network.nagle.off` | `TcpAckFrequency` = 1 and `TCPNoDelay` = 1 on every physical card. TCP only. | medium |
| `network.wifisense.off` | `AutoConnectAllowedOEM` = 0 and PolicyManager `AllowAutoConnectToWiFiSenseHotspots` = 0. | low |
| `network.nic.powersave.off` | `PnPCapabilities` = 24 in each physical card's driver class key. | medium |
| `network.tcp.gaming` | `TcpTimedWaitDelay` = 30 and `Tcp1323Opts` = 1. Auto-tuning unchanged; legacy `MaxUserPort`/`DefaultTTL` deliberately not used. | medium |
| `network.teredo.off` | v6Transition policies `Teredo_State`, `6to4_State`, `ISATAP_State` = Disabled. | medium |
| `network.delivery.off` | Delivery Optimization policy `DODownloadMode` = 0. | low |
| `network.qos.reserve.off` | Psched policy `NonBestEffortLimit` = 0 (honestly described as rarely measurable). | low |
| `network.llmnr.off` | DNS client policy `EnableMulticast` = 0 and NetBT `NodeType` = 2. | medium |
| `network.lanman.lan` | LanmanServer `Size` = 3 and LanmanWorkstation `DisableBandwidthThrottling` = 1. | low |

Per-card values (`ifreg`/`dns` adapters in `OptimizationNetwork.ps1`) are encoded as `{InterfaceGuid}=value|...` over all physical cards sorted by GUID, so a backup restores every card exactly. A different set of cards at restore time is reported as `external_change_detected`; a write that fails after some cards were changed is recognised as an intermediate state and rolled back. `tests/NetworkLive.Tests.ps1` reads all fields on real Windows and round-trips `TCPNoDelay`; `tests/network-windows.test.cjs` runs it and the full catalog test in the Windows release workflow.

## Keyboard tab since 0.9.13

The Tastatur / Keyboard / Tastiera tab (category `keyboard`, button "Tweak Keyboard" plus Revert All) shows eight entries. `keyboard.repeat.fast`, `keyboard.filterkeys.off`, `keyboard.stickykeys.off`, `keyboard.togglekeys.off` (TOGGLEKEYS flags 0x3F, clears ON and HOTKEYACTIVE), `keyboard.mousekeys.off` (MOUSEKEYS flags 0xFF, clears ON and HOTKEYACTIVE), `keyboard.mouse.accel.off` (SPI_SETMOUSE 0/0/0, encoded as threshold1*65536 + threshold2*256 + acceleration) and `keyboard.mouse.speed.native` (SPI_SETMOUSESPEED 10) use `Keyboard.ps1` with live SystemParametersInfo calls and exact restore. `keyboard.buffer.large` sets kbdclass `KeyboardDataQueueSize` = 400 through `OptimizationCatalog.json` (restart). "Raw input optimised" from the reference was replaced by the 1:1 pointer speed because raw-input games bypass Windows pointer settings. `tests/KeyboardLive.Tests.ps1` reads all fields on Windows and round-trips the four live ones.
