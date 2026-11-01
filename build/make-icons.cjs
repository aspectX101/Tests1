// Erzeugt build/icon.ico (16–256 px) und build/icon.png aus app/renderer/assets/logo.png.
// Abgerundetes Quadrat, Logo leicht vergrößert, feiner roter Verlaufsrand mit Glow.
// Ausführen mit Electron (zeichnet per Canvas):  npx electron build/make-icons.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SIZES = [16, 24, 32, 48, 64, 128, 256];

function draw(size, logoUrl) {
  return `(async () => {
    const img = new Image(); img.src = ${JSON.stringify(logoUrl)}; await img.decode();
    const s = ${size}, c = document.createElement('canvas'); c.width = c.height = s;
    const g = c.getContext('2d');
    const r = s * 0.22, pad = s >= 48 ? s * 0.02 : 0;
    const rr = (x, y, w, h, rad) => { g.beginPath(); g.roundRect(x, y, w, h, rad); };
    // Grund + Logo (leicht hineingezoomt, damit der Vogel das Icon füllt)
    g.save(); rr(pad, pad, s - 2 * pad, s - 2 * pad, r); g.clip();
    g.fillStyle = '#050506'; g.fillRect(0, 0, s, s);
    const z = s >= 48 ? 1.12 : 1.22; const d = s * z;
    g.drawImage(img, (s - d) / 2, (s - d) / 2 - s * 0.01, d, d);
    // dezente Vignette
    const v = g.createRadialGradient(s / 2, s / 2, s * 0.25, s / 2, s / 2, s * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
    g.fillStyle = v; g.fillRect(0, 0, s, s);
    g.restore();
    // feiner Rand: rot oben links → weißlich unten rechts, wie das Logo
    if (s >= 24) {
      const lw = Math.max(1, s / 64);
      const grad = g.createLinearGradient(0, 0, s, s);
      grad.addColorStop(0, 'rgba(255,45,71,.95)'); grad.addColorStop(.55, 'rgba(227,17,43,.55)'); grad.addColorStop(1, 'rgba(255,255,255,.45)');
      g.shadowColor = 'rgba(227,17,43,.8)'; g.shadowBlur = s / 24;
      rr(pad + lw / 2, pad + lw / 2, s - 2 * pad - lw, s - 2 * pad - lw, r - lw / 2);
      g.lineWidth = lw; g.strokeStyle = grad; g.stroke();
    }
    return c.toDataURL('image/png');
  })()`;
}

// ICO mit PNG-Einträgen (Windows Vista+)
function ico(pngs) {
  const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const dir = pngs.map(({ size, buf }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(buf.length, 8); e.writeUInt32LE(offset, 12);
    offset += buf.length;
    return e;
  });
  return Buffer.concat([head, ...dir, ...pngs.map((p) => p.buf)]);
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html,<html></html>');
  const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'app/renderer/assets/logo.png')).toString('base64');
  const pngs = [];
  for (const size of SIZES) {
    const url = await win.webContents.executeJavaScript(draw(size, logo));
    pngs.push({ size, buf: Buffer.from(url.split(',')[1], 'base64') });
  }
  fs.writeFileSync(path.join(ROOT, 'build/icon.ico'), ico(pngs));
  fs.writeFileSync(path.join(ROOT, 'build/icon.png'), pngs[pngs.length - 1].buf);
  fs.copyFileSync(path.join(ROOT, 'build/icon.ico'), path.join(ROOT, 'app/assets/icon.ico'));
  fs.copyFileSync(path.join(ROOT, 'build/icon.png'), path.join(ROOT, 'app/renderer/assets/logo-icon.png'));
  console.log('icons:', SIZES.join(', '));
  app.quit();
});
