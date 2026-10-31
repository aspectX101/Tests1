// Stellt die H1T-Logos frei (nur das Zeichen, ohne Hintergrund) und schreibt transparente PNGs:
//   build/logo-sources/h1t-main.webp      -> app/renderer/assets/h1t-logo-main.png
//   build/logo-sources/h1t-halloween.webp -> app/renderer/assets/h1t-logo-halloween.png
// Die Umrisse stehen in build/logo-sources/*.json (Polygone in Bildpixeln, bei Halloween zusätzlich die Tropfen als
// Rechtecke). Innerhalb der Polygone bleibt alles erhalten; im Rand ringsum entfernt ein Flood-Fill von außen alle
// dunklen Pixel bis an die helle Kontur der Buchstaben. Lose Splitter (< 400 px) fallen weg.
// Ausführen mit Electron:  npx electron build/cut-logos.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CUT = fs.readFileSync(path.join(__dirname, 'logo-sources', 'cut.js'), 'utf8');
const JOBS = [['h1t-main', 'h1t-logo-main.png'], ['h1t-halloween', 'h1t-logo-halloween.png']];

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html,<html></html>');
  for (const [name, out] of JOBS) {
    const spec = JSON.parse(fs.readFileSync(path.join(__dirname, 'logo-sources', `${name}.json`), 'utf8'));
    const src = 'data:image/webp;base64,' + fs.readFileSync(path.join(__dirname, 'logo-sources', `${name}.webp`)).toString('base64');
    const r = await win.webContents.executeJavaScript(`(${CUT})(${JSON.stringify(src)}, ${JSON.stringify(spec.polys)}, ${JSON.stringify(spec.rects || [])}, ${spec.dil}, ${spec.thr})`);
    fs.writeFileSync(path.join(ROOT, 'app/renderer/assets', out), Buffer.from(r.url.split(',')[1], 'base64'));
    console.log(out, 'box', r.box.join(','));
  }
  app.quit();
});
