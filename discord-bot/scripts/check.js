'use strict';
// Offline check of the rules post: builds the real payload with stand-in emojis and validates it against
// Discord's limits (no token needed). Run after editing config.json: npm run check
const fs = require('node:fs');
const path = require('node:path');
const { buildRulesMessage } = require('../src/message');

const root = path.join(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
const available = fs.readdirSync(path.join(root, 'assets', 'emojis')).map((f) => path.parse(f).name);
const fake = new Map(available.map((name, i) => [name, { id: String(1300000000000000000n + BigInt(i)), name, animated: false }]));
const problems = [];
const used = [config.verify.emoji, ...config.links.map((l) => l.emoji), ...config.rules.map((r) => r.emoji), 'h1t_rules'].filter(Boolean);
for (const name of used) if (!fake.has(name)) problems.push(`Emoji "${name}" fehlt in assets/emojis (npm run design)`);
if (config.banner && !fs.existsSync(path.join(root, config.banner))) problems.push(`Banner ${config.banner} fehlt`);
for (const l of config.links) if (!/^https?:\/\//.test(l.url ?? '')) problems.push(`Link-Button "${l.label}" braucht eine https-URL`);
for (const b of [config.verify, ...config.links]) if (!b.label || b.label.length > 80) problems.push(`Button-Text "${b.label}" leer oder länger als 80 Zeichen`);
if (!/^#[0-9a-f]{6}$/i.test(config.accentColor)) problems.push('accentColor muss wie #e4e4e7 aussehen');

let json;
try {
  const msg = buildRulesMessage(config, fake, root);
  json = msg.components.map((c) => c.toJSON());   // builders validate here
} catch (err) { problems.push(`Ungültiger Aufbau: ${err.message}`); }

if (json) {
  let count = 0; let chars = 0;
  const walk = (c) => { count++; if (c.content) chars += c.content.length; (c.components ?? []).forEach(walk); };
  json.forEach(walk);
  if (count > 40) problems.push(`${count} Komponenten (Discord erlaubt 40) — weniger Regeln oder Buttons`);
  if (chars > 4000) problems.push(`${chars} Zeichen Text (Discord erlaubt 4000) — Regeln kürzen`);
  console.log(`Post: ${config.rules.length} Regeln, ${1 + config.links.length} Buttons, ${count}/40 Komponenten, ${chars}/4000 Zeichen`);
}
if (problems.length) { problems.forEach((p) => console.error(`✗ ${p}`)); process.exit(1); }
console.log('✓ Alles gültig');
