// Erzeugt aus build/h1t-logo-source.webp (Logo auf weißem Grund):
//  - app/renderer/assets/h1t-logo.png  (freigestellt, für Seitenleiste und Startanimation)
//  - build/icon.ico, build/icon.png, app/assets/icon.ico  (App- und Taskleisten-Icon, 16–256 px)
// Weiß wird nur dort entfernt, wo es von außen zusammenhängt (Flood-Fill), Glanzlichter im Logo bleiben.
// Ausführen mit Electron:  npx electron build/make-h1t-assets.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SIZES = [16, 24, 32, 48, 64, 128, 256];

const cutout = `(async (src) => {
  const img = new Image(); img.src = src; await img.decode();
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, w, h), px = d.data;
  const white = (i) => Math.min(px[i], px[i + 1], px[i + 2]);
  // Flood-Fill vom Rand über helle Pixel (>= 200)
  const bg = new Uint8Array(w * h), stack = [];
  for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }
  while (stack.length) {
    const p = stack.pop(); if (bg[p]) continue;
    if (white(p * 4) < 200) continue;
    bg[p] = 1; const x = p % w, y = (p - x) / w;
    if (x > 0) stack.push(p - 1); if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w); if (y < h - 1) stack.push(p + w);
  }
  // Alpha: Hintergrund transparent; Übergang je nach Helligkeit weich auslaufen lassen
  for (let p = 0; p < w * h; p++) {
    if (!bg[p]) continue;
    const v = white(p * 4); // 200..255
    px[p * 4 + 3] = Math.max(0, Math.min(255, Math.round((255 - v) * 255 / 55)));
  }
  g.putImageData(d, 0, 0);
  // Auf den sichtbaren Inhalt zuschneiden
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, max = 640, s = Math.min(1, max / Math.max(cw, ch));
  const o = document.createElement('canvas'); o.width = Math.round(cw * s); o.height = Math.round(ch * s);
  const og = o.getContext('2d'); og.imageSmoothingQuality = 'high'; og.drawImage(c, x0, y0, cw, ch, 0, 0, o.width, o.height);
  return o.toDataURL('image/png');
})`;

const icon = `(async (src, s) => {
  const img = new Image(); img.src = src; await img.decode();
  const c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
  const pad = s >= 48 ? s * 0.02 : 0, box = s - 2 * pad, k = Math.min(box / img.width, box / img.height);
  const dw = img.width * k, dh = img.height * k;
  g.drawImage(img, (s - dw) / 2, (s - dh) / 2, dw, dh);
  return c.toDataURL('image/png');
})`;

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
const png = (url) => Buffer.from(url.split(',')[1], 'base64');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html,<html></html>');
  const src = 'data:image/webp;base64,' + fs.readFileSync(path.join(ROOT, 'build/h1t-logo-source.webp')).toString('base64');
  const logoUrl = await win.webContents.executeJavaScript(`${cutout}(${JSON.stringify(src)})`);
  fs.writeFileSync(path.join(ROOT, 'app/renderer/assets/h1t-logo.png'), png(logoUrl));
  const pngs = [];
  for (const size of SIZES) pngs.push({ size, buf: png(await win.webContents.executeJavaScript(`${icon}(${JSON.stringify(logoUrl)}, ${size})`)) });
  fs.writeFileSync(path.join(ROOT, 'build/icon.ico'), ico(pngs));
  fs.writeFileSync(path.join(ROOT, 'build/icon.png'), pngs[pngs.length - 1].buf);
  fs.copyFileSync(path.join(ROOT, 'build/icon.ico'), path.join(ROOT, 'app/assets/icon.ico'));
  console.log('h1t-logo.png + icons:', SIZES.join(', '));
  app.quit();
});
