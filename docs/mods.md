# FiveM Mod Manager und Ingame-Auflösung

`ModManager.ps1` (eingebunden in `Tweaker.psm1`, CLI über `tweaker.ps1`, Electron über `electron/backend.cjs`).
Mods werden aus eigenen Dateien des Nutzers importiert – es gibt keinen Download-Katalog (Lizenzen von NVE, Soundpacks, Skins).

## Ablage

`%LOCALAPPDATA%\Tweaker\Mods` (pro Windows-Benutzer):

- `library\<modId>\files\…` – importierte Mod-Dateien (Quelle für Aktivieren)
- `backup\<modId>\…` – Originaldateien, die beim Aktivieren überschrieben wurden
- `state.json` – Liste der Mods (atomar geschrieben über `Write-AtomicJson`)
- `settings-original.xml` + `.path` – Original der Spieleinstellungen vor der ersten Auflösungsänderung

## Zuordnung beim Import

| Datei im Mod | Ziel |
| --- | --- |
| Pfad enthält `x64\audio\…` | GTA-V-Ordner `x64\audio\…` (intern `gta:x64\audio\…`) |
| Pfad enthält Ordner `citizen`, `mods` oder `plugins` | `FiveM.app\` ab diesem Ordner |
| Pfad enthält `audio\sfx\…` (ohne x64) | GTA-V-Ordner `x64\audio\sfx\…` |
| `.rpf` in einer **Sound**-Mod ohne Struktur | GTA-V-Ordner `x64\audio\sfx\<Datei>.rpf` (RESIDENT.rpf, WEAPONS_PLAYER.rpf …) |
| andere `.rpf` ohne Struktur | `FiveM.app\mods\<Datei>.rpf` (Grafik/NVE, Waffen-Skins, Minimaps) |
| Pfad enthält `platform` oder `common` | `citizen\<ab dort>` |
| alles andere | wird nicht installiert (zählt als „übersprungen“) |

Nur Asset-Dateien (`.rpf .ytd .ydr .yft .awc .dat .meta .xml .gfx …`) werden installiert. Ausführbarer Code
(`.exe .dll .asi`, Skripte) wird nie installiert – Sicherheit und Anticheat. Unter `plugins` nur ReShade-Dateien (`.fx .ini .png …`).
ZIPs werden Eintrag für Eintrag entpackt: absolute Pfade und `..` werden abgelehnt (`mod_archive_unsafe`), Limit 16 GB / 20.000 Dateien.
RAR/7z/OIV werden nicht unterstützt (`mod_archive_unsupported`) – entpacken und den Ordner importieren.

GTA-V-Ordner (für Soundpacks): `IVPath` aus `FiveM.app\CitizenFX.ini`, sonst Registry (Rockstar/Steam/Epic, auch „GTA V Legacy“),
sonst übliche Pfade wie `Program Files\Rockstar Games\Grand Theft Auto V Legacy`. Gültig ist ein Ordner mit `x64\audio\sfx`
(`gta_not_found` sonst). Im GTA-Ordner werden nur Dateien unter `x64\audio\` ersetzt; Sicherungen liegen unter `backup\<modId>\gta\`.
Hinweis: Eine Dateiprüfung im Rockstar-Launcher/Steam kann ersetzte Sounddateien zurücksetzen.

## Aktivieren / Deaktivieren

- FiveM muss geschlossen sein (`close_fivem_first`).
- Aktivieren: vorhandene Zieldateien werden nach `backup\<modId>` kopiert, dann die Mod-Dateien hineinkopiert.
  Schlägt eine Datei fehl, wird alles bisher Kopierte zurückgedreht.
- Zwei aktive Mods dürfen nicht dieselbe Zieldatei ersetzen (`mod_conflict`).
- Deaktivieren: Mod-Dateien löschen, gesicherte Originale zurückspielen.
- Entfernen: deaktiviert zuerst, löscht dann Bibliothek und Sicherung.

## Ingame-Auflösung

Datei: `%APPDATA%\CitizenFX\gta5_settings.xml` (FiveM), sonst `Dokumente\Rockstar Games\GTA V\settings.xml`.
Gesetzt werden `video/ScreenWidth`, `video/ScreenHeight`, `video/Windowed` (0 = Vollbild, 1 = Fenster, 2 = Rahmenlos).
Vor der ersten Änderung wird das Original gesichert; `res-reset` stellt es wieder her. Stretched-Auflösungen brauchen im
Grafiktreiber die Skalierung „Vollbild“.

## JSON-Aktionen

```
tweaker.ps1 -Action mods-list
tweaker.ps1 -Action mods-import -ModPath <zip|rpf|Ordner> -Category graphics|sound|weapons|minimap|other [-Name <Name>]
tweaker.ps1 -Action mods-enable|mods-disable|mods-remove -ModId <12 hex>
tweaker.ps1 -Action res-get
tweaker.ps1 -Action res-set -Width 1440 -Height 1080 -Windowed 0|1|2
tweaker.ps1 -Action res-reset
```

`mods-list` → `{ok, fivemFound, root, mods:[{id,name,category,enabled,sizeBytes,fileCount,skippedCount,importedUtc,enabledUtc,targets}], enabledCount}`.
In Electron kommt `modPath` nie von der Oberfläche: der Hauptprozess öffnet den Datei-Dialog (`tweaker:mod-import`).

## Tests

```
pwsh -NoProfile -File tests/ModManager.Tests.ps1     # nachgebaute FiveM-Installation, ändert nichts am System
node --test tests/mods-backend.test.cjs               # Eingabeprüfung in electron/backend.cjs
```
