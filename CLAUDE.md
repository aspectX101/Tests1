# UND.CC Tweaker – Hinweise für Claude

Windows-Gaming-Tweaker für FiveM (Electron-UI + PowerShell-Backend). Sprache mit dem Nutzer: **Deutsch**.
Oberfläche dreisprachig (de/en/it, `app/renderer/i18n.js`) – neue Texte immer in allen drei Sprachen.

## Aufbau

- `app/` – Electron-App (UI von Claude): `main.js` (Fenster, IPC, nur Anfragen der eigenen Oberfläche), `preload.js`,
  `renderer/` (index.html, styles.css, i18n.js, app.js), `updater.js` (eigener Updater), `elevate.js`, `usage.js`, `mock.js`.
- Repo-Root – PowerShell-Backend: `tweaker.ps1` (JSON-CLI), `Tweaker.psm1`, `Keyboard.ps1`, `CacheCleaner.ps1`, `SafeMode.ps1`,
  `Backup.ps1`, `Optimization.ps1` (von ChatGPT), `ModManager.ps1` (Mod Manager + Ingame-Auflösung, von Claude).
  Mock-Katalog der echten Tweaks: `app/tweak-catalog.js` (aus `Get-TweakerCatalog` erzeugt).
- `electron/backend.cjs` – einziger Weg vom Hauptprozess zum Backend; prüft alle Felder. `electron/safemode-monitor.cjs`.
- Doku: `docs/optimization.md`, `docs/backend.md`, `docs/backup.md`, `docs/safemode.md`, `docs/mods.md`, `packaging/README.md`, `README.md`.

## Regeln aus der bisherigen Arbeit

- Backend-Vertrag: genau ein JSON-Objekt auf stdout, Fehler als stabile Codes (`{"ok":false,"error":"code"}`), die das UI übersetzt.
- Jede Systemänderung umkehrbar: vorher sichern, bei Teilfehler zurückdrehen. FiveM muss bei Datei-Änderungen geschlossen sein.
- Die Oberfläche gibt nie Pfade/Skripte ans Backend; Dateipfade nur aus nativen Dialogen im Hauptprozess.
- Mod Manager installiert nie ausführbare Dateien (.exe/.dll/.asi/Skripte). Soundpacks gehen in `<GTA V>\x64\audio\sfx` (`gta:`-Ziele).
- Mod Manager: RAR/7z über 7-Zip oder `tar.exe` (nie eigene Entpacker); Aktivieren/Deaktivieren muss wiederholbar bleiben
  (Sicherung = Original, nie überschreiben/löschen, solange sie Dateien enthält). Details: `docs/mods.md`.
- Design: Schwarz, Blutrot `#e3112b`, Weiß; feine rote Verlaufslinien, Animationen respektieren `prefers-reduced-motion`.

## Auslieferung (wichtig – lange Fehlersuche dahinter)

- **Eine portable Exe** `UNDCC-Tweaker-<version>.exe`, **kein Installer**. Der NSIS-Installer (0.4.0–0.5.3) scheiterte auf dem
  Test-PC wiederholt am Entfernen alter Versionen. Nicht dorthin zurück, ohne es auf Windows gründlich zu testen.
- Updates: `app/updater.js` fragt die GitHub-API (`aspectX101/Tests1`, neuestes Release), lädt per Node `https`
  (Electron `net.fetch` bekommt von GitHubs Asset-Server HTTP 500), prüft SHA-256 und tauscht die Exe per WMI-gestartetem
  PowerShell-Skript. Protokolle: `%APPDATA%\UND.CC Tweaker\logs\updater.log` und `updater-swap.log`.
- Icon/Versionsinfo der inneren Exe: `build/after-pack.cjs` (resedit); Icons erzeugen: `npx electron build/make-icons.cjs`.

## Befehle

```
npm install
npm start               # echtes Backend (als Administrator)
npm run start:mock      # Testdaten
npm test                # Node-Tests (electron/backend.cjs, Mod-Validierung, SafeMode-Monitor)
pwsh -NoProfile -File tests/ModManager.Tests.ps1    # u. a. auch Performance/Keyboard/CacheCleaner/SafeMode/Backup-Tests
npm run dist            # dist/UNDCC-Tweaker-<version>.exe
```

## Neue Version veröffentlichen

Nur nach ausdrücklichem OK des Nutzers.
1. `version` in `package.json`/`package-lock.json` erhöhen, Notizen in `release-notes/v<version>.md` schreiben, testen.
2. Commit + Push (vorher `git fetch` – auf den Branches wurde auch von ChatGPT gepusht).
3. Tag `v<version>` auf diesen Commit pushen. `.github/workflows/release.yml` baut auf Windows (Node- und
   Mod-Manager-Tests, `npm run dist`) und veröffentlicht `UNDCC-Tweaker-<version>.exe` als Release.
   (Bis 0.8.1 von Hand: `gh release create … --target codex/performance-backend`.)
4. Prüfen, dass `https://api.github.com/repos/aspectX101/Tests1/releases/latest` die neue Exe mit `digest` zeigt.
