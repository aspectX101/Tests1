# Windows EXE handoff for Claude

The final product launches as a Windows `.exe`. Users do not run scripts manually or install Node/PowerShell 7. Electron packages its runtime; Windows PowerShell 5.1 is invoked internally with a hidden window.

The repository currently contains no Electron package.json, main process or UI. Therefore this change supplies tested packaging configuration and backend integration, **not a built/launch-tested application**. Do not label a script or an archive as the finished EXE.

## Integrate into the Electron app

1. Keep the backend files together in the repository root. `packaging/electron-builder.cjs` copies the required scripts and native source outside ASAR to `resources/backend`.
2. In the Electron main process, import `createBackendClient` from `electron/backend.cjs`. Instantiate it with Electron's `app` and call it with a validated request object. The development path expects the helper in this repository; the packaged path is `process.resourcesPath/backend`.
3. Connect your existing preload/IPC to this main-process function. Validate the sending frame against the app's own loaded UI; do not register an IPC handler accessible to remote pages. Use contextIsolation, sandboxing and no renderer Node integration. Never expose child_process, script paths, arbitrary PowerShell arguments or raw command execution to renderer content.
4. From the directory containing your Electron package.json and existing UI/main entry, install Electron and electron-builder as project dev dependencies with a lockfile. Build with `npx electron-builder --config <absolute-repository-path>/packaging/electron-builder.cjs --win`. If you already have a builder configuration, merge this configuration's extraResources and Windows target instead of replacing your app configuration.
5. The output is `dist/Tweaker-<version>-x64.exe`, a portable executable. Its manifest requests administrator privileges, as agreed for the app. Run as the same Windows user; elevation using another account changes which user settings and FiveM installation are found. No persistent execution-policy change is made.

Example main-process requests:

```js
const { app } = require('electron');
const { createBackendClient } = require('../electron/backend.cjs'); // adapt to your main entry location
const backend = createBackendClient(app);
const preview = await backend({ action: 'cache-info', lang: 'de' });
// After the user chooses clean:
const cleaned = await backend({ action: 'cache-clean', lang: 'de' });
// User can restore, or explicitly discard the backup to reclaim disk space:
await backend({ action: 'cache-restore', backupId: cleaned.backupId, lang: 'de' });
// Alternative to restore; use a separate irreversible-delete confirmation in the UI:
await backend({ action: 'cache-purge', backupId: cleaned.backupId, confirmPurge: true, lang: 'de' });
```

Restore and purge above are alternatives. Cache operations are utilities, not permanent toggle states; keep them out of the reversible-tweak catalog. Error strings are stable codes where possible and should be translated by the UI. The helper validates action/ID/language, parses JSON even on exit 1 and never launches a visible console. Calls time out after ten minutes; an interrupted operation may leave a recoverable pending backup. Query `cache-info` after a failure/timeout.

## Required release checks

Build after the UI lands. Launch the actual EXE on a Windows test account without Node installed, check the UAC prompt, all three languages, bundled backend resource paths, hidden PowerShell windows and JSON handling. Test cache clean/restore/purge with a disposable fake FiveM folder before a real install. Verify the installed UI never enables accessibility changes automatically. Configure Windows code signing when releasing; this change does not provide a signing identity or claim a signed EXE.

References: [electron-builder Windows targets](https://www.electron.build/docs/win/), [portable target](https://www.electron.build/docs/nsis/).
