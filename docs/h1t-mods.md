# H1T Mods (FiveM > H1T Mods)

Eigene NVEs und Minimaps, die Nutzer im Tweaker mit Vorschau sehen und mit einem Klick installieren.

## So funktioniert es in der App

1. Der Tab lädt `index.json` aus dem GitHub-Release **`h1t-mods`** (aspectX101/Tests1) und dazu die Vorschaubilder.
2. **Installieren** lädt `<id>.zip`, prüft Größe und SHA-256, importiert die ZIP über den normalen FiveM Mod Manager
   (NVE → Kategorie *Grafik*, Minimap → *Minimap*) und aktiviert sie. Ausführbare Dateien werden nie installiert,
   überschriebene Originaldateien werden gesichert. Eine neuere Version ersetzt die alte, statt sie zu stapeln.
3. Das Release ist eine Vorabversion und **nie „latest“** – der App-Updater sucht nur im neuesten Release.

## Mod veröffentlichen

Voraussetzung: GitHub CLI `gh`, angemeldet mit Schreibrechten.

```
node tools/publish-h1t-mod.cjs --id h1t-nve-midnight --name "H1T Midnight NVE" --category nve --version 1.0 --zip ./Midnight.zip --preview ./midnight.jpg --de "Dunkle, realistische Nächte." --en "Dark, realistic nights." --it "Notti scure e realistiche."
```

- `--id`: Kleinbuchstaben, Ziffern, Bindestriche (bleibt für Updates gleich).
- `--category`: `nve` oder `minimap`. `--version`: bei Updates erhöhen, dann zeigt die App „Aktualisieren“.
- `--preview`: 16:9-Bild (jpg/png/webp, max. 2 MB).
- Die ZIP enthält dieselben Dateien, die man sonst im Mod Manager importieren würde.

Die App zeigt neue Mods sofort nach dem Hochladen (Tab neu öffnen oder „Neu laden“).
