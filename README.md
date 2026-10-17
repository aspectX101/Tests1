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
ModManager.ps1       FiveM Mod Manager + Ingame-Auflösung (siehe docs/mods.md)
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
npm run dist         # dist/UNDCC-Tweaker-<version>.exe (eine portable Exe, kein Installer)
```

Die Exe ist nicht signiert, deshalb warnt Windows SmartScreen beim ersten Start („Weitere Informationen“ → „Trotzdem ausführen“).
Sie fordert beim Start Adminrechte an. Kein Installer: einfach die Exe irgendwo ablegen und starten.

### Neue Version veröffentlichen (Auto-Update)

`app/updater.js` fragt beim Start, beim Öffnen der Einstellungen und alle 2 Stunden die GitHub-API nach dem neuesten
Release, lädt `UNDCC-Tweaker-<version>.exe` neben die laufende Exe, prüft Größe und SHA-256 und ersetzt die Exe beim
Neustart („Jetzt neu starten“) oder beim Beenden. Protokoll: Einstellungen → Update-Hilfe → Protokoll öffnen.

1. `version` in `package.json` erhöhen (z. B. 0.6.0 → 0.6.1). Ohne höhere Version gibt es kein Update.
2. `npm run dist`
3. Release mit der Exe anlegen (der Dateiname muss `UNDCC-Tweaker-<version>.exe` bleiben):
   ```
   gh release create v0.6.1 dist/UNDCC-Tweaker-0.6.1.exe --target codex/performance-backend --title "UND.CC Tweaker 0.6.1"
   ```
   Das Release darf kein Entwurf und keine Vorabversion sein.
