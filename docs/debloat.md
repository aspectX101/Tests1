# Debloat and startup management

The Debloat tab has eight groups and a startup section, translated into German, English and Italian. No apps are preselected. App removal is separate from reversible Windows settings and from bulk-safe optimization.

## App removal

`DebloatApps.json` is the fixed allowlist of 19 optional apps: Weather, News, Solitaire, Clipchamp, both Teams variants, two Candy Crush variants, Game Bar, Xbox/current and legacy, Mail/Calendar, Camera, Store OneNote, Paint 3D, Copilot, PC Manager, Edge Game Assist and OneDrive. Availability depends on the installation. Desktop Office/OneNote, Store, Gaming Services, Edge/WebView2, frameworks, resource packages and protected packages are not removed. Appx packages must be Store-signed, removable and not development packages.

Removal uses `Remove-AppxPackage` for the current user only. No provisioning, all-user removal or automatic removal of subsequently installed apps. Run the elevated Electron app as the same Windows user. App package names and native executable paths cannot be supplied by the renderer.

1. `-Action debloat-list`: `{ok, apps, scope:"current_user", dataBackup:false}`. Each app has `id`, `group`, `name`, `installed`, `removable`, `reason`, `packages` and `installerHash`.
2. `-Action debloat-preview -AppIds weather,news`: selected installed packages, versions and a 64-character `previewToken`.
3. `-Action debloat-remove -AppIds weather,news -PreviewToken TOKEN -ConfirmDataLoss`: explicit consent is mandatory. Token binds the user, exact selected inventory and approved OneDrive binary hash. Inventory is checked again after the restore-point step and before package removal. A process lock prevents overlapping operations.

Before deletion the shared archive and source journal save the inventory. They **do not back up app data**. A failed archive blocks removal. Failure after removal begins returns a partial result and stops subsequent apps. There is no rollback claim: part of a selected app group may already have been removed. Re-read inventory to determine current state. Journals are under `%LOCALAPPDATA%\Tweaker\Debloat`; recovery evidence is indexed by the existing common backup manager. `backup-restore-all` skips these records with `app_reinstall_required`.

Each app has an installation-page button. The main process accepts only fixed app IDs, then opens a fixed Microsoft Store search, Microsoft's OneDrive page, or Game Assist instructions. Reinstallation is user-controlled; neither availability, the old version, nor recovery of app data is guaranteed. Discontinued Mail/Paint 3D may no longer be available. No automatic download or executable installer is supplied.

OneDrive removal is offered only for a recognized per-user registration with a Microsoft-signed `OneDriveSetup.exe` in an approved directory. Machine-wide or unrecognized installs are directed to Windows Installed apps. OneDrive must be closed. The binary is hash-checked and locked while launched without a shell. Synced folders and cloud files are not deleted by this utility. A separate policy can block syncing; undo it before using OneDrive again. Reinstallation prevention is not guaranteed.

## Windows settings

Four `category: debloat` entries use the existing exact original-value backup and restore engine. All are excluded from bulk-safe apply:

| ID | Behavior | Risk |
|---|---|---|
| `debloat.widgets.hide` | Disable Widgets/news using Dsh policy and taskbar preferences; effectiveness depends on Windows version/edition | medium |
| `debloat.onedrive.block` | Set `DisableFileSyncNGSC`; blocks OneDrive sync, not a universal reinstall blocker | high |
| `debloat.recall.off` | Set current-user `DisableAIDataAnalysis`; stops Recall recording and Windows deletes existing snapshots | high |
| `debloat.suggestions.off` | Disable ContentDeliveryManager promoted/preinstalled app preferences | medium |

Recall requires the supported Windows 11 24H2 build/edition (26100.3915 or later) and `-ConfirmDataLoss` on apply. Reverting restores the original policy value, **not deleted Recall snapshots**. The high-risk UI confirmation includes this warning. Copilot's standalone app is removed through app selection; the old Copilot policy is not presented as a standalone-app uninstall.

App suggestions settings do not guarantee that Windows upgrades, OEM tools or user actions will never reinstall an app. Store app updates, Windows Update, security services and other critical services remain active.

## Startup entries

`startup-list` lists current-user 64-bit `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` entries. Other sources (scheduled tasks, startup folders, machine-wide entries, packaged startup tasks) are accessed through the Windows Startup settings button. Presence of a Run value does not override Task Manager's separate disabled state; the UI says “entry present”, not “definitely enabled”. Commands are never executed by this manager.

`startup-disable -Id ID -PreviewToken TOKEN` archives the exact registry type and unexpanded string before removing the selected value. IDs bind the current user's SID and entry name. `startup-restore -Id ID` or common `backup-restore` restores the original String/ExpandString; a conflicting external value is never overwritten. Pending journals remain recoverable after interruption. `managed` distinguishes entries disabled by the utility. App updates may recreate their own startup entries.

All actions return one UTF-8 JSON object, exit 0 on success and 1 on failure. Electron passes only fixed argument arrays, never shell commands. App removal requires admin, explicit consent and a fresh preview. Tests simulate Windows mutations; they do not uninstall apps or change the developer's registry. Native app removal, OneDrive behavior and policy effects still need validation in a disposable Windows VM before release. This change does not build or publish a new EXE; the new module/catalog are included in the existing portable-EXE packaging configuration.

## Verification and references

`tests/Debloat.Tests.ps1` (PowerShell 5.1 and 7) covers allowlists, protected packages, stale previews, checkpoint races, failed archives, partial removal, reinstall-only evidence, exact startup restore, conflicts and user/source validation. Node tests cover IPC argument validation, fixed external destinations, mock recovery, translations and packaging. Existing optimization, shared-backup and CLI contract checks remain applicable.

- [Microsoft Remove-AppxPackage](https://learn.microsoft.com/powershell/module/appx/remove-appxpackage): normal Store-app removal does not promise preservation of app data.
- [WindowsAI policy](https://learn.microsoft.com/windows/client-management/mdm/policy-csp-windowsai): DisableAIDataAnalysis deletes saved snapshots.
- [Manage Copilot](https://learn.microsoft.com/windows/client-management/manage-windows-copilot): standalone app removal differs from legacy policy.
- [Widgets policy](https://learn.microsoft.com/windows/client-management/mdm/policy-csp-newsandinterests).
- [Turn off or uninstall OneDrive](https://support.microsoft.com/en-us/onedrive/turn-off-disable-or-uninstall-onedrive).
- [Game Assist FAQ](https://support.microsoft.com/en-gb/edge/microsoft-edge-game-assist-faq).
- [Launch Microsoft Store](https://learn.microsoft.com/windows/apps/develop/launch/launch-store-app).
