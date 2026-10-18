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
| liegt in einem Ordner `xyz.rpf\…` (Inhalt eines RPF-Archivs, OpenIV-Anleitung) | wird nicht installiert |
| Pfad enthält `x64\audio\…` | GTA-V-Ordner `x64\audio\…` (intern `gta:x64\audio\…`) |
| Pfad enthält Ordner `citizen`, `mods` oder `plugins` | `FiveM.app\` ab diesem Ordner |
| Pfad enthält `audio\sfx\…` (ohne x64) | GTA-V-Ordner `x64\audio\sfx\…` |
| `.rpf` ohne Struktur in einer **Sound**-Mod oder mit dem Namen einer GTA-Sounddatei (RESIDENT.rpf, WEAPONS_PLAYER.rpf, alle `.rpf` aus `x64\audio\sfx` des gefundenen GTA-Ordners) – in jeder Kategorie | GTA-V-Ordner `x64\audio\sfx\<Datei>.rpf` |
| `.rpf` unter `update\…` oder `x64\…` | `FiveM.app\mods\update\…` bzw. `mods\x64\…` – die Spielstruktur bleibt erhalten (mehrere `dlc.rpf` gehen nicht verloren) |
| andere `.rpf` ohne Struktur | `FiveM.app\mods\<Datei>.rpf` (Grafik/NVE, Waffen-Skins, Minimaps) |
| Pfad enthält `platform` oder `common` | `citizen\<ab dort>` |
| alles andere | wird nicht installiert (zählt als „übersprungen“) |

Nur Asset-Dateien (`.rpf .ytd .ydr .yft .awc .dat .meta .xml .gfx …`) werden installiert. Ausführbarer Code
(`.exe .dll .asi`, Skripte) wird nie installiert – Sicherheit und Anticheat. Unter `plugins` nur ReShade-Dateien (`.fx .ini .png …`).
ZIPs werden Eintrag für Eintrag entpackt: absolute Pfade und `..` werden abgelehnt (`mod_archive_unsafe`), Limit 16 GB / 20.000 Dateien.
RAR und 7z entpackt 7-Zip, falls installiert (Registry `HKLM/HKCU\SOFTWARE\7-Zip` oder `Program Files\7-Zip\7z.exe`), sonst
`tar.exe` von Windows (libarchive; RAR5 erst unter Windows 11). Das Archiv wird zuerst aufgelistet und geprüft (absolute Pfade,
`..`), dann ohne Fenster und ohne Eingabe entpackt; danach wird der entpackte Ordner geprüft (Verknüpfungen, Namen, Limit).
Fehler: `mod_archive_tool_missing` (weder 7-Zip noch tar.exe), `mod_archive_password` (passwortgeschützt), `mod_archive_failed`.
Archive im Archiv (`.zip/.rar/.7z`, z. B. „FiveM-Version.zip“ im Download) werden eine Ebene tief mit entpackt (max. 20).
OIV-Pakete und `.tar/.gz` werden nicht unterstützt (`mod_archive_unsupported`) – entpacken und den Ordner importieren.

Prüfungen beim Import:

- Zwei verschiedene Dateien mit demselben Ziel (z. B. `Gold\weapons.rpf` und `Silver\weapons.rpf`) sind Varianten:
  `mod_multiple_variants` – den Ordner der gewünschten Variante importieren. Identische Kopien werden übersprungen.
- Nur lose Spieldateien (`.ytd`, `.ydr` …) ohne installierbares Ziel: `mod_loose_files` (FiveM braucht sie als `.rpf`).
- Name der Mod: angegebener Name, sonst Datei- bzw. Ordnername.

GTA-V-Ordner (für Soundpacks): `IVPath` aus `FiveM.app\CitizenFX.ini`, sonst Registry (Rockstar/Steam/Epic, auch „GTA V Legacy“),
sonst übliche Pfade wie `Program Files\Rockstar Games\Grand Theft Auto V Legacy`. Gültig ist ein Ordner mit `x64\audio\sfx`
(`gta_not_found` sonst). Im GTA-Ordner werden nur Dateien unter `x64\audio\` ersetzt; Sicherungen liegen unter `backup\<modId>\gta\`.
Hinweis: Eine Dateiprüfung im Rockstar-Launcher/Steam kann ersetzte Sounddateien zurücksetzen.

## Aktivieren / Deaktivieren

- FiveM muss geschlossen sein (`close_fivem_first`).
- Aktivieren: vorhandene Zieldateien werden nach `backup\<modId>` kopiert, dann die Mod-Dateien hineinkopiert.
  Schlägt eine Datei fehl, wird alles bisher Kopierte zurückgedreht – auch eine halb kopierte Datei.
  Liegt von einem abgebrochenen Aktivieren schon eine Sicherung vor, ist sie das echte Original und wird nicht überschrieben.
- Zwei aktive Mods dürfen nicht dieselbe Zieldatei ersetzen (`mod_conflict`).
- Deaktivieren: Mod-Dateien löschen, gesicherte Originale zurückspielen. Wiederholbar: ist eine Sicherung schon
  zurückgespielt, bleibt das Original unangetastet. Schlägt eine Datei fehl (gesperrt, GTA-Ordner weg), bleibt die Mod aktiv
  (`mod_disable_partial`); erneutes Deaktivieren macht dort weiter.
- Entfernen: deaktiviert zuerst, löscht dann Bibliothek und Sicherung.

## Zustand, Konflikte, Reparieren

`mods-list` prüft jede aktive Mod: Fehlt eine Zieldatei oder hat sie eine andere Größe als die Mod-Datei (Spiel-Update,
Dateiprüfung im Rockstar-Launcher/Steam, manuell gelöscht), ist `health` = `broken` mit `brokenCount`.
`mods-enable` auf eine aktive Mod repariert: nur fehlende/ersetzte Dateien werden neu kopiert. Was dort inzwischen liegt
(z. B. eine neuere Spieldatei), wird vorher als Original gesichert – Deaktivieren spielt dann diese neuere Datei zurück.
`conflictsWith` nennt alle Mods (aktiv oder nicht), die mindestens eine gleiche Zieldatei haben.

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

`mods-list` → `{ok, fivemFound, root, gtaRoot, mods:[{id,name,category,enabled,sizeBytes,fileCount,skippedCount,importedUtc,enabledUtc,
targets (max. 50), usesGta, health (null|ok|broken), brokenCount, conflictsWith:[id]}], enabledCount, brokenCount}`.
Import, Aktivieren, Deaktivieren und Entfernen haben in `electron/backend.cjs` 60 Minuten Zeit (große Packs), alles andere 10.
In Electron kommt `modPath` nie von der Oberfläche: der Hauptprozess öffnet den Datei-Dialog (`tweaker:mod-import`).

## Tests

```
pwsh -NoProfile -File tests/ModManager.Tests.ps1     # nachgebaute FiveM-Installation, ändert nichts am System
                                                      # RAR/7z-Teil nur, wenn 7z und bsdtar im PATH sind
node --test tests/mods-backend.test.cjs               # Eingabeprüfung in electron/backend.cjs
```
