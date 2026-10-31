// Cut a logo mark out of its background (used by build/cut-logos.cjs).
async (src, polys, rects, dil, thr) => {
  const img = new Image(); img.src = src; await img.decode();
  const w = img.width, h = img.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const px = g.getImageData(0, 0, w, h).data;
  const m = document.createElement('canvas'); m.width = w; m.height = h; const mg = m.getContext('2d');
  mg.fillStyle = '#fff'; mg.strokeStyle = '#fff'; mg.lineWidth = dil * 2; mg.lineJoin = 'round';
  for (const p of polys) { mg.beginPath(); p.forEach(([x, y], i) => (i ? mg.lineTo(x, y) : mg.moveTo(x, y))); mg.closePath(); mg.fill(); mg.stroke(); }
  for (const [x, y, rw, rh] of rects) mg.fillRect(x, y, rw, rh);
  const md = mg.getImageData(0, 0, w, h).data, inR = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) inR[i] = md[i * 4] > 128 ? 1 : 0;
  const lum = (i) => .3 * px[i * 4] + .59 * px[i * 4 + 1] + .11 * px[i * 4 + 2];
  const bg = new Uint8Array(w * h), st = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (inR[i] && (!inR[i - 1] || !inR[i + 1] || !inR[i - w] || !inR[i + w]) && lum(i) < thr) st.push(i); }
  while (st.length) { const i = st.pop(); if (bg[i] || !inR[i] || lum(i) >= thr) continue; bg[i] = 1; st.push(i - 1, i + 1, i - w, i + w); }
  const a = document.createElement('canvas'); a.width = w; a.height = h; const ag = a.getContext('2d');
  // the traced polygons themselves are always kept; the flood only trims the dilated margin around them
  const k = document.createElement('canvas'); k.width = w; k.height = h; const kg = k.getContext('2d'); kg.fillStyle = '#fff';
  for (const p of polys) { kg.beginPath(); p.forEach(([x, y], i) => (i ? kg.lineTo(x, y) : kg.moveTo(x, y))); kg.closePath(); kg.fill(); }
  const kd = kg.getImageData(0, 0, w, h).data;
  const keep = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) keep[i] = kd[i * 4] > 128 || (inR[i] && !bg[i]) ? 1 : 0;
  // drop loose specks (small separate pieces such as sparks)
  const lab = new Int32Array(w * h);
  for (let i = 0, n = 0; i < w * h; i++) {
    if (!keep[i] || lab[i]) continue; n++; const comp = [], st2 = [i]; lab[i] = n;
    while (st2.length) { const j = st2.pop(); comp.push(j); for (const q of [j - 1, j + 1, j - w, j + w]) if (q >= 0 && q < w * h && keep[q] && !lab[q]) { lab[q] = n; st2.push(q); } }
    if (comp.length < 400) for (const j of comp) keep[j] = 0;
  }
  const ad = ag.createImageData(w, h); for (let i = 0; i < w * h; i++) ad.data[i * 4 + 3] = keep[i] ? 255 : 0; ag.putImageData(ad, 0, 0);
  // soften the cut by a pixel, then apply as alpha
  const sm = document.createElement('canvas'); sm.width = w; sm.height = h; const sg = sm.getContext('2d'); sg.filter = 'blur(.7px)'; sg.drawImage(a, 0, 0);
  g.globalCompositeOperation = 'destination-in'; g.drawImage(sm, 0, 0);
  // crop to content
  const d2 = g.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d2[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const pad = 6, o = document.createElement('canvas'); o.width = x1 - x0 + 1 + pad * 2; o.height = y1 - y0 + 1 + pad * 2;
  o.getContext('2d').drawImage(c, x0, y0, x1 - x0 + 1, y1 - y0 + 1, pad, pad, x1 - x0 + 1, y1 - y0 + 1);
  return { url: o.toDataURL('image/png'), box: [x0, y0, x1, y1] };
}
