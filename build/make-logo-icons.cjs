// Erzeugt das App- und Taskleisten-Icon aus dem freigestellten Standard-Logo app/renderer/assets/h1t-logo-main.png
// (build/cut-logos.cjs): build/icon.ico (16–256 px), build/icon.png (256 px), app/assets/icon.ico (Fenster-Icon).
// Dunkle abgerundete Kachel, das H1T-Zeichen mittig (kleine Größen mit weniger Rand, damit es lesbar bleibt).
// Ausführen mit Electron:  npx electron build/make-logo-icons.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SIZES = [16, 24, 32, 48, 64, 128, 256];

const icon = `(async (src, s) => {
  const img = new Image(); img.src = src; await img.decode();
  const c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
  g.beginPath(); g.roundRect(0, 0, s, s, s * .22); g.clip();
  const bg = g.createLinearGradient(0, 0, 0, s); bg.addColorStop(0, '#202020'); bg.addColorStop(1, '#050505');
  g.fillStyle = bg; g.fillRect(0, 0, s, s);
  const fit = (s <= 24 ? .98 : s <= 48 ? .9 : .84) * s, k = fit / img.width, dw = img.width * k, dh = img.height * k;
  g.drawImage(img, (s - dw) / 2, (s - dh) / 2, dw, dh);
  if (s >= 32) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = Math.max(1, s / 96); g.beginPath(); g.roundRect(g.lineWidth / 2, g.lineWidth / 2, s - g.lineWidth, s - g.lineWidth, s * .22); g.stroke(); }
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
  const src = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'app/renderer/assets/h1t-logo-main.png')).toString('base64');
  const pngs = [];
  for (const size of SIZES) pngs.push({ size, buf: png(await win.webContents.executeJavaScript(`${icon}(${JSON.stringify(src)}, ${size})`)) });
  const out = ico(pngs);
  fs.writeFileSync(path.join(ROOT, 'build/icon.ico'), out);
  fs.writeFileSync(path.join(ROOT, 'app/assets/icon.ico'), out);
  fs.writeFileSync(path.join(ROOT, 'build/icon.png'), pngs[pngs.length - 1].buf);
  console.log('icons written:', SIZES.join(', '));
  app.quit();
});
