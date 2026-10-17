# Tweaker

Windows gaming utility for FiveM and Fortnite. Languages: German, English, Italian.

UI and backend are developed independently. Feature changes are reviewed through pull requests.

## Desktop-App (Electron)

Die Oberfläche liegt in `app/` (Claude), das Backend im Repo-Root (ChatGPT). `app/main.js` spricht das Backend nur über `electron/backend.cjs` an.

```
app/main.js          rahmenloses Fenster, IPC nur von der eigenen Oberfläche → electron/backend.cjs
                     (eine Instanz, startet auch den SafeMode-Monitor; Bericht-Export per Speichern-Dialog)
app/preload.js       window.tweaker: call({action,id,lang,backupId,confirmPurge}), mode, exportJson(what, backupId),
                     lastSafeMode, onSafeMode, minimize, close, onUsage
app/usage.js         Live-CPU/RAM/GPU fürs Dashboard (nur lesend)
app/mock.js          Testdaten im selben JSON-Format (auf macOS/Linux oder mit --mock)
app/renderer/        index.html, styles.css, i18n.js (de/en/it), app.js
electron-builder.config.cjs   übernimmt packaging/electron-builder.cjs, ergänzt nur die App-Dateien
                              (Backend-Helper wird gepackt aus resources/backend/electron geladen)
```

```
npm install
npm start            # echtes Backend (Windows, als Administrator)
npm run start:mock   # Testdaten, läuft auch auf macOS
npm test             # Tests für electron/backend.cjs
npm run dist         # dist/Tweaker-Setup-<version>.exe + latest.yml (Installer mit Auto-Update)
```

Die Exe ist nicht signiert, deshalb warnt Windows SmartScreen beim ersten Start („Weitere Informationen“ → „Trotzdem ausführen“).
Der Installer installiert pro Benutzer ohne Admin. Die App fragt beim Start selbst per UAC nach Adminrechten (`app/elevate.js`).

### Neue Version veröffentlichen (Auto-Update)

Die installierte App prüft beim Start und alle 2 Stunden die GitHub-Releases dieses Repos (`app/updater.js`),
lädt neue Versionen im Hintergrund und installiert sie beim Beenden oder über „Jetzt neu starten“.

1. `version` in `package.json` erhöhen (z. B. 0.4.0 → 0.4.1). Ohne höhere Version gibt es kein Update.
2. `npm run dist`
3. Release mit allen drei Dateien anlegen, sonst findet der Updater nichts:
   ```
   gh release create v0.4.1 dist/Tweaker-Setup-0.4.1.exe dist/Tweaker-Setup-0.4.1.exe.blockmap dist/latest.yml --target codex/performance-backend --title "Tweaker 0.4.1"
   ```
   Das Release darf kein Entwurf und keine Vorabversion sein.
