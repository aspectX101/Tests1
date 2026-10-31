# Auftrag für die KI: Rules & Verify in den bestehenden H1T.CC-Bot einbauen

Diese ZIP enthält ein fertiges, getestetes Modul (discord.js v14, ESM). Bau es in den bestehenden Bot ein,
**ohne** dessen vorhandene Funktionen (Tickets, Giveaways, Panels, Embeds, Settings) zu verändern oder zu entfernen.

## Dateien in dieser ZIP
- `rules-verify.mjs`: exportiert `setupRulesVerify(client, { guildId, registerCommands })`, `RULES_COMMANDS`,
  `buildRulesMessage`, `syncEmojis`, `VERIFY_ID` (= `'h1t:verify'`)
- `rules-config.mjs`: Texte, Regeln, Buttons (Englisch), `verify.roleId`
- `rules-assets/banner.png`, `rules-assets/emojis/*.png`: Banner und 14 App-Emojis

## Was das Modul tut
- Slash-Commands `/post-rules` (Optionen `channel`, `message` zum Aktualisieren eines alten Posts) und
  `/sync-emojis` (Option `replace`), beide nur für Administratoren.
- Postet einen Components-V2-Post (`MessageFlags.IsComponentsV2`): Container mit Banner, Regeln, Trennern und
  Buttons (Verify + Link-Buttons mit App-Emojis).
- Der Button mit customId `h1t:verify` gibt die Rolle `verify.roleId` (oder `process.env.VERIFIED_ROLE_ID`) und
  antwortet ephemeral.
- Beim Ready lädt es fehlende Emojis aus `rules-assets/emojis` als **Application Emojis** hoch und registriert nach
  5 s seine zwei Befehle einzeln mit `application.commands.create` (global, oder für `GUILD_ID`).
- Eigener `interactionCreate`-Listener, der **nur** auf `post-rules`, `sync-emojis` und `h1t:verify` reagiert.

## Einbau-Schritte
1. Die Dateien in den Bot-Ordner neben `index.mjs` legen (Ordner `rules-assets` mitsamt Inhalt).
2. In `index.mjs`: `import { setupRulesVerify, RULES_COMMANDS } from './rules-verify.mjs';` und direkt nach dem
   Erstellen des Clients (vor `login`) `setupRulesVerify(client);` aufrufen (Variablennamen des Clients anpassen).
3. **Befehlsregistrierung prüfen:** Registriert der Bot seine Befehle mit `commands.set([...])` (global oder pro
   Guild), dann `...RULES_COMMANDS` in genau diese Liste aufnehmen und `setupRulesVerify(client, { registerCommands: false })`
   verwenden, damit sich nichts gegenseitig überschreibt. Nutzt der Bot einen Command-Handler oder eine
   Command-Map, die unbekannte Befehle ablehnt, dann `post-rules` und `sync-emojis` dort ausnehmen.
4. **Interaction-Handler prüfen:** Falls der bestehende Handler auf unbekannte Buttons oder Befehle antwortet
   (z. B. „Unknown command“, `interaction.reply` im Default-Zweig), dann `h1t:verify`, `post-rules` und `sync-emojis`
   dort ignorieren, sonst wird die Interaction doppelt beantwortet.
5. Die Rollen-ID: Wenn der Bot eine zentrale Konfiguration (z. B. `settings.mjs`) hat, kann `verify.roleId` von dort
   kommen. Sonst in `rules-config.mjs` eintragen.
6. Abhängigkeit: `discord.js` muss **>= 14.19** sein (Components V2, Application Emojis). Sonst in `package.json` auf
   `^14.28.0` setzen.
7. Intents: `GatewayIntentBits.Guilds` reicht. Bot-Rechte auf dem Server: Manage Roles, Send Messages, Attach Files,
   View Channels. Die Bot-Rolle muss über der Verified-Rolle stehen.

## Nicht ändern
- Die Texte in `rules-config.mjs` bleiben **Englisch** (alles auf dem Discord ist Englisch).
- Keinen Bot-Token in Dateien schreiben.
- Bestehende Funktionen des Bots nicht umbauen. Nur die oben genannten Stellen anpassen.

## Kontrolle nach dem Einbau
Konsole beim Start: `[rules] 14 Emojis bereit` und `[rules] /post-rules und /sync-emojis registriert`
(bzw. die eigene Registrierung des Bots enthält die zwei Befehle). Dann im Rules-Kanal `/post-rules`, Verify klicken:
Rolle wird vergeben, Antwort „You are now verified. Welcome to H1T.CC!“. Alte Bot-Befehle müssen weiter funktionieren.
