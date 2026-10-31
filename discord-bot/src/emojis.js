'use strict';
// Application emojis: the bot owns them, so they work in its posts on every server without a free emoji slot.
// Uploads every PNG in assets/emojis that the application does not have yet (name = file name).
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '..', 'assets', 'emojis');

async function syncEmojis(application, { replace = false, log = console.log } = {}) {
  const existing = await application.emojis.fetch();
  const byName = new Map(existing.map((e) => [e.name, e]));
  const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /\.(png|gif|webp)$/i.test(f)) : [];
  for (const file of files) {
    const name = path.parse(file).name;
    if (!/^[\w]{2,32}$/.test(name)) { log(`Emoji übersprungen (ungültiger Name): ${file}`); continue; }
    const old = byName.get(name);
    if (old && !replace) continue;
    if (old) await old.delete();
    const created = await application.emojis.create({ attachment: path.join(DIR, file), name });
    byName.set(name, created);
    log(`Emoji hochgeladen: ${name}`);
  }
  return byName;
}

module.exports = { syncEmojis };
