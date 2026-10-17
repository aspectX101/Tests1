# Tweaker

Windows gaming utility for FiveM and Fortnite. Languages: German, English, Italian.

UI and backend are developed independently. Feature changes are reviewed through pull requests.

## Desktop-App (Electron)

Die Oberfläche liegt in `app/` (Claude), das Backend im Repo-Root (ChatGPT). `app/main.js` spricht das Backend nur über `electron/backend.cjs` an.

```
app/main.js          rahmenloses Fenster, IPC nur von der eigenen Oberfläche → electron/backend.cjs
app/preload.js       window.tweaker: call({action,id,lang,backupId,confirmPurge}), mode, minimize, close, onUsage
app/usage.js         Live-CPU/RAM/GPU fürs Dashboard (nur lesend)
app/mock.js          Testdaten im selben JSON-Format (auf macOS/Linux oder mit --mock)
app/renderer/        index.html, styles.css, i18n.js (de/en/it), app.js
electron-builder.config.cjs   übernimmt packaging/electron-builder.cjs, ergänzt nur die App-Dateien
```

```
npm install
npm start            # echtes Backend (Windows, als Administrator)
npm run start:mock   # Testdaten, läuft auch auf macOS
npm test             # Tests für electron/backend.cjs
npm run dist         # dist/Tweaker-<version>-x64.exe (portabel, fordert Adminrechte an)
```

Die Exe ist nicht signiert, deshalb warnt Windows SmartScreen beim ersten Start.
