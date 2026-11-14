#!/usr/bin/env node
// Adds or updates one H1T mod in the GitHub release "h1t-mods" (never marked as latest, so the app updater ignores it).
// Needs the GitHub CLI (gh) logged in with write access to aspectX101/Tests1.
//   node tools/publish-h1t-mod.cjs --id h1t-nve-midnight --name "H1T Midnight NVE" --category nve --version 1.0 \
//     --zip ./Midnight.zip --preview ./midnight.jpg --de "Dunkle Nächte …" --en "Dark nights …" --it "Notti scure …"
// category: nve | minimap. id: lowercase letters, digits, dashes. The app shows the mod right after publishing.
'use strict';
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const REPO = 'aspectX101/Tests1', TAG = 'h1t-mods';
const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const fail = (m) => { console.error('Fehler: ' + m); process.exit(1); };
if (!/^[a-z0-9][a-z0-9-]{2,47}$/.test(args.id || '')) fail('--id: nur Kleinbuchstaben, Ziffern und Bindestriche (3-48 Zeichen)');
if (!['nve', 'minimap'].includes(args.category)) fail('--category muss nve oder minimap sein');
if (!args.name || args.name.length > 60) fail('--name fehlt oder ist länger als 60 Zeichen');
if (!args.zip || !fs.existsSync(args.zip) || !/\.zip$/i.test(args.zip)) fail('--zip: Pfad zu einer .zip-Datei');
if (args.preview && (!fs.existsSync(args.preview) || !/\.(jpe?g|png|webp)$/i.test(args.preview))) fail('--preview: .jpg, .png oder .webp');
const gh = (...a) => execFileSync('gh', [...a, '--repo', REPO], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'h1t-mods-'));
try { gh('release', 'view', TAG); } catch {
  gh('release', 'create', TAG, '--title', 'H1T Mods', '--notes', 'Katalog für den Tab FiveM > H1T Mods. Nicht als App-Update verwenden.', '--prerelease', '--latest=false');
}
let index = { version: 1, mods: [] };
try { gh('release', 'download', TAG, '--pattern', 'index.json', '--dir', work); index = JSON.parse(fs.readFileSync(path.join(work, 'index.json'), 'utf8')); } catch { /* first mod */ }
const zip = path.join(work, `${args.id}.zip`); fs.copyFileSync(args.zip, zip);
const entry = { id: args.id, name: args.name, category: args.category, version: args.version || '1.0', author: args.author || 'H1T.CC',
  description: { de: args.de || '', en: args.en || args.de || '', it: args.it || args.en || args.de || '' },
  file: `${args.id}.zip`, size: fs.statSync(zip).size, sha256: sha(zip), preview: null, previewSha256: null };
const uploads = [zip];
if (args.preview) {
  const ext = path.extname(args.preview).toLowerCase().replace('.jpeg', '.jpg');
  const prev = path.join(work, `${args.id}${ext}`); fs.copyFileSync(args.preview, prev);
  entry.preview = path.basename(prev); entry.previewSha256 = sha(prev); uploads.push(prev);
}
index.mods = [...index.mods.filter((m) => m.id !== args.id), entry];
fs.writeFileSync(path.join(work, 'index.json'), JSON.stringify(index, null, 2));
gh('release', 'upload', TAG, ...uploads, path.join(work, 'index.json'), '--clobber');
console.log(`Veröffentlicht: ${entry.name} (${entry.category}, v${entry.version}, ${(entry.size / 1048576).toFixed(1)} MB). ${index.mods.length} H1T Mods im Katalog.`);
