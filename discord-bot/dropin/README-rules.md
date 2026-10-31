# H1T.CC Rules & Verify — Modul für euren Bot

Fügt eurem bestehenden Bot den Regel-Post (Banner, Regeln mit eigenen Emojis, **Verify**-Button, Link-Buttons) hinzu.
Alles auf Discord ist Englisch. Eure anderen Funktionen (Tickets, Giveaways, Panels …) bleiben unverändert.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `rules-verify.mjs` | Das Modul: `/post-rules`, `/sync-emojis`, Verify-Button, Emoji-Upload |
| `rules-config.mjs` | Texte, Regeln, Buttons, Farbe und **die Rollen-ID** — hier wird angepasst |
| `rules-assets/banner.png` | Banner |
| `rules-assets/emojis/*.png` | Die 14 eigenen Emojis (Dateiname = Emoji-Name) |

`index.mjs` und `package.json` sind **nicht** dabei, eure Dateien werden also nicht überschrieben.

## Einbauen (Wispbyte)

1. ZIP unter **Files** in den Bot-Ordner hochladen (da wo `index.mjs` liegt) → Rechtsklick → **Unarchive**.
2. `index.mjs` öffnen und zwei Zeilen ergänzen:
   - ganz oben bei den anderen `import`-Zeilen:
     ```js
     import { setupRulesVerify } from './rules-verify.mjs';
     ```
   - direkt unter der Zeile mit `new Client(` … `});` (also nachdem `client` erstellt wurde, vor `client.login(`):
     ```js
     setupRulesVerify(client);
     ```
     Heißt eure Variable anders (z. B. `bot`), dann `setupRulesVerify(bot);`.
3. `rules-config.mjs` öffnen und bei `"roleId": ""` die ID der Rolle eintragen, die der Verify-Button vergibt
   (Discord: Entwicklermodus an → Rechtsklick auf die Rolle → *Rollen-ID kopieren*).
4. In `package.json` muss `discord.js` mindestens Version **14.19** sein (für das neue Post-Layout). Steht dort etwas
   Älteres, auf `"discord.js": "^14.28.0"` ändern.
5. Bot neu starten. In der Konsole erscheint `[rules] 14 Emojis bereit` und nach ein paar Sekunden
   `[rules] /post-rules und /sync-emojis registriert`.
6. Im Rules-Kanal `/post-rules` eingeben.

Damit der Button die Rolle vergeben darf: Bot-Rolle in den Servereinstellungen **über** die Verified-Rolle ziehen und
ihr „Rollen verwalten“ geben. `@everyone` sieht nur den Rules-Kanal, Verified den Rest.

## Befehle (nur Admins)

| Befehl | Was er macht |
| --- | --- |
| `/post-rules` | Schickt den Post in diesen Kanal (oder `channel:`). Mit `message:` + ID des alten Posts wird **dieser aktualisiert**, niemand muss sich neu verifizieren. |
| `/sync-emojis` | Lädt neue Emojis aus `rules-assets/emojis` hoch. `replace:True` ersetzt geänderte. |

## Anpassen

- **Regeln, Texte, Link-Buttons:** `rules-config.mjs`. Neuer Button:
  `{ "label": "Shop", "emoji": "h1t_link", "url": "https://…" }` in `links`. Danach Bot neu starten und
  `/post-rules message:<ID>`.
- **Eigenes Emoji:** PNG (128×128, unter 256 KB) mit dem Namen in `rules-assets/emojis/` legen, z. B. `h1t_shop.png`,
  `/sync-emojis` ausführen und in `rules-config.mjs` als `"emoji": "h1t_shop"` verwenden.

## Falls die Befehle nicht auftauchen

Registriert euer Bot seine Befehle mit `commands.set([...])` erst später (z. B. per Befehl), löscht das die Rules-Befehle
wieder. Dann in `index.mjs` die Liste ergänzen:
```js
import { setupRulesVerify, RULES_COMMANDS } from './rules-verify.mjs';
// … commands.set([...eureBefehle, ...RULES_COMMANDS])
```

Antwortet euer Bot auf unbekannte Befehle oder Buttons mit einer Fehlermeldung („Unknown command“ o. ä.), dann dort
`post-rules`, `sync-emojis` und den Button `h1t:verify` ausnehmen — die beantwortet das Rules-Modul.
