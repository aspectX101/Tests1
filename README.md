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

**Rollback (ab Updates, die 1.0.18 installiert):** Beim Austausch bleibt die laufende Exe als
`%APPDATA%\UND.CC Tweaker\previous\H1T.CC-Tweaker-previous.exe` erhalten (`previous.json`). Endet die neue Version zweimal,
bevor ihre Oberfläche bereit ist (normales Schließen zählt nicht), tauscht `app/update-health.js` beim dritten Start auf die
gesicherte Exe zurück und markiert die Version als schlecht; der Updater bietet sie nicht mehr an, eine neuere schon.

**Support-Bericht:** Jede fehlgeschlagene Backend-Anfrage landet mit Code, technischem Detail (`detail`, z. B. Windows-Fehlercode)
und Fundstelle (`at`) in `logs\backend.log` (`app/support.js`, Benutzernamen werden ersetzt). Einstellungen → Support →
„Support-Bericht exportieren“ speichert Systeminfos, Lizenz-/Update-Stand, aktive Sicherungen und die letzten Protokolle als JSON.

**Von Windows zurückgesetzte Tweaks:** Steht eine Sicherung auf „aktiv“, der Tweak ist aber nicht mehr angewendet (meist nach
einem Windows-Update), zeigt das Dashboard „Erneut anwenden“ (`app/renderer/drift.js`: Sicherung zurücksetzen, dann neu anwenden).

**Tests:** `npm test` führt auf Windows auch alle PowerShell-Suiten aus (`tests/powershell-suites.test.cjs`);
`.github/workflows/tests.yml` läuft bei jedem Push und meldet rote Suiten als Annotationen.

1. `version` in `package.json` erhöhen (z. B. 0.6.0 → 0.6.1). Ohne höhere Version gibt es kein Update.
2. `npm run dist`
3. Release mit der Exe anlegen (der Dateiname muss `UNDCC-Tweaker-<version>.exe` bleiben):
   ```
   gh release create v0.6.1 dist/UNDCC-Tweaker-0.6.1.exe --target codex/performance-backend --title "UND.CC Tweaker 0.6.1"
   ```
   Das Release darf kein Entwurf und keine Vorabversion sein.


## Debloat

Der Debloat-Tab bietet acht Bereiche mit gezielter App-Auswahl, Vorschau und Datenverlust-Bestätigung sowie eine Autostart-Verwaltung. App-Entfernungen werden als Nachweis archiviert; die Neuinstallation erfolgt über verlinkte Microsoft-Seiten. App-Daten werden nicht gesichert. Einstellungen und Autostart-Einträge nutzen das gemeinsame Wiederherstellungssystem. Details: [docs/debloat.md](docs/debloat.md).
