'use strict';
// H1T.CC Halloween boot animation (6.4 s, canvas, 60 fps). Four scenes after the concept board:
//   1 Darkness awakes  – drifting smoke, two glowing eyes open and blink
//   2 The pumpkin rises – the jack-o'-lantern rises out of the smoke, inner fire flickers, embers fly
//   3 Into the shadows – the pumpkin bursts into shards that become a bat swarm, the moon breaks through
//   4 H1T.CC revealed   – burning H1T.CC lettering with glitch, HALLOWEEN EDITION, moon, castle, bats
// Everything heavy (smoke, embers, bats, castle scene, lettering, vignette) is pre-rendered once into sprites;
// each frame only composes them, so it stays smooth. Active only when <html> has .hw-boot (halloween-boot-head.js).
(() => {
  if (!document.documentElement.classList.contains('hw-boot')) return;
  const splash = document.getElementById('splash');
  if (!splash) return;
  const W = 1280, H = 720, DUR = 6.4;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'hw-boot-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  splash.append(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });

  // ---------- helpers ----------
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const ss = (a, b, t) => { const u = clamp((t - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
  const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
  const TAU = Math.PI * 2;
  let seed = 20261031;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 100000) / 100000; };
  const sprite = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };

  // ---------- sprites ----------
  const smoke = [0, 1, 2].map(() => sprite(320, 320, (g, w, h) => {
    g.filter = 'blur(22px)';
    for (let i = 0; i < 16; i++) {
      const r = 30 + rnd() * 60, x = w / 2 + (rnd() - .5) * 150, y = h / 2 + (rnd() - .5) * 110;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(${78 + rnd() * 30},${70 + rnd() * 22},${68 + rnd() * 20},.5)`); grd.addColorStop(1, 'rgba(40,36,36,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
  }));
  const ember = sprite(48, 48, (g) => {
    const grd = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    grd.addColorStop(0, 'rgba(255,236,170,1)'); grd.addColorStop(.18, 'rgba(255,150,40,.95)'); grd.addColorStop(.5, 'rgba(255,80,10,.25)'); grd.addColorStop(1, 'rgba(255,60,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 48, 48);
  });
  const BAT_PATH = new Path2D('M32 11c-1.6-3.6-5-5.4-5-5.4s.9 3.4-.7 5.4c-2.8-2.6-8.3-3.6-12-1.8 2.8 1 4.6 2.9 4.6 5.6-3.7-1.8-8.3-.9-12 1.8 5.5 0 8.3 1.8 10.1 4.6 2.8-1.8 6.4-2.7 9.2-1.8 1.8.9 3.7 2.7 5.8 5.4 2.1-2.7 4-4.5 5.8-5.4 2.8-.9 6.4 0 9.2 1.8 1.8-2.8 4.6-4.6 10.1-4.6-3.7-2.7-8.3-3.6-12-1.8 0-2.7 1.8-4.6 4.6-5.6-3.7-1.8-9.2-.8-12 1.8-1.6-2-.7-5.4-.7-5.4S33.6 7.4 32 11Z');
  // Six wing positions (flap = vertical squash), black with a thin fire rim and glowing eyes.
  const bats = [1, .86, .68, .52, .68, .86].map((k) => sprite(140, 70, (g) => {
    g.translate(70, 35); g.scale(2, 2 * k); g.translate(-32, -15);
    g.shadowColor = 'rgba(255,110,20,.85)'; g.shadowBlur = 6; g.fillStyle = '#050204'; g.fill(BAT_PATH);
    g.shadowBlur = 0; g.fillStyle = '#ff6a1a'; g.beginPath(); g.arc(30.4, 12.4, .9, 0, TAU); g.arc(33.6, 12.4, .9, 0, TAU); g.fill();
  }));
  const vignette = sprite(W, H, (g) => {
    const grd = g.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, 820);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,.86)'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
  });
  // Scene 4 backdrop: blood-orange moon, castle on the hill, dead trees, wet ground with reflections.
  const castle = sprite(W, H, (g) => {
    let grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#0a0303'); grd.addColorStop(.55, '#1a0602'); grd.addColorStop(1, '#050101'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
    grd = g.createRadialGradient(1060, 200, 0, 1060, 200, 420); grd.addColorStop(0, 'rgba(255,120,30,.35)'); grd.addColorStop(1, 'rgba(255,90,10,0)'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
    grd = g.createRadialGradient(1040, 182, 0, 1060, 200, 92); grd.addColorStop(0, '#ffd59a'); grd.addColorStop(.6, '#ff9a3c'); grd.addColorStop(1, '#d4520c'); g.fillStyle = grd;
    g.shadowColor = 'rgba(255,130,40,.9)'; g.shadowBlur = 60; g.beginPath(); g.arc(1060, 200, 92, 0, TAU); g.fill(); g.shadowBlur = 0;
    g.fillStyle = 'rgba(150,60,10,.3)'; for (const [x, y, r] of [[1088, 176, 16], [1036, 236, 11], [1040, 170, 8], [1094, 236, 7]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    g.fillStyle = '#030101';
    g.beginPath(); g.moveTo(820, 520); g.bezierCurveTo(930, 455, 1080, 440, 1280, 470); g.lineTo(1280, 720); g.lineTo(820, 720); g.fill();
    // castle
    const tower = (x, y, w, h, roof) => { g.fillRect(x, y, w, h); g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + w / 2, y - roof); g.lineTo(x + w + 4, y); g.fill(); };
    tower(1010, 330, 34, 170, 70); tower(1060, 360, 26, 140, 50); tower(1110, 300, 40, 200, 90); tower(1170, 350, 30, 150, 60); tower(1215, 380, 22, 120, 44);
    g.fillRect(1000, 420, 250, 90);
    g.fillStyle = 'rgba(255,150,50,.85)'; for (const [x, y] of [[1022, 380], [1124, 350], [1180, 400], [1070, 410], [1130, 440]]) g.fillRect(x, y, 5, 9);
    // dead trees on the left
    g.strokeStyle = '#030101'; g.lineCap = 'round';
    const branch = (x, y, len, ang, w, depth) => {
      if (depth === 0 || w < .6) return;
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + x2) / 2 + (rnd() - .5) * 18, (y + y2) / 2, x2, y2); g.stroke();
      branch(x2, y2, len * (.62 + rnd() * .14), ang - .35 - rnd() * .35, w * .62, depth - 1);
      branch(x2, y2, len * (.6 + rnd() * .14), ang + .3 + rnd() * .35, w * .6, depth - 1);
    };
    branch(110, 640, 150, -Math.PI / 2 - .08, 22, 7); branch(260, 660, 110, -Math.PI / 2 + .12, 14, 6);
    // ground
    grd = g.createLinearGradient(0, 600, 0, H); grd.addColorStop(0, '#0d0605'); grd.addColorStop(1, '#020101'); g.fillStyle = grd;
    g.beginPath(); g.moveTo(0, 610); g.bezierCurveTo(300, 590, 700, 600, 1280, 605); g.lineTo(1280, H); g.lineTo(0, H); g.fill();
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,${90 + rnd() * 60},20,${.03 + rnd() * .08})`; g.fillRect(rnd() * W, 615 + rnd() * 100, 30 + rnd() * 160, 1 + rnd() * 1.5); }
  });
  // Burning lettering, rendered once at 2x for crisp glitch slices.
  const LOGO_W = 1100, LOGO_H = 300;
  const logo = sprite(LOGO_W * 2, LOGO_H * 2, (g) => {
    g.scale(2, 2);
    g.font = '900 176px Impact, "Arial Black", "Segoe UI Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const x = LOGO_W / 2, y = LOGO_H / 2;
    g.shadowColor = 'rgba(255,90,10,.95)'; g.shadowBlur = 46; g.fillStyle = '#ff6a00'; g.fillText('H1T.CC', x, y);
    g.shadowBlur = 0;
    const grd = g.createLinearGradient(0, y - 80, 0, y + 80);
    grd.addColorStop(0, '#fff3c4'); grd.addColorStop(.35, '#ffb347'); grd.addColorStop(.7, '#ff6a00'); grd.addColorStop(1, '#a12a00');
    g.fillStyle = grd; g.fillText('H1T.CC', x, y);
    g.lineWidth = 2; g.strokeStyle = 'rgba(60,10,0,.85)'; g.strokeText('H1T.CC', x, y);
    // cracks of darker char across the letters
    g.globalCompositeOperation = 'source-atop'; g.strokeStyle = 'rgba(70,14,0,.55)'; g.lineWidth = 1.6;
    for (let i = 0; i < 26; i++) { const cx = 230 + rnd() * 640, cy = y - 70 + rnd() * 140; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + (rnd() - .5) * 40, cy + (rnd() - .5) * 30); g.lineTo(cx + (rnd() - .5) * 60, cy + (rnd() - .5) * 50); g.stroke(); }
    g.globalCompositeOperation = 'source-over';
    // molten drips under the letters
    for (let i = 0; i < 14; i++) {
      const dx = 250 + rnd() * 600, dy = y + 62 + rnd() * 10, len = 10 + rnd() * 34;
      const d = g.createLinearGradient(0, dy, 0, dy + len); d.addColorStop(0, '#ff7a18'); d.addColorStop(1, 'rgba(255,90,10,0)');
      g.fillStyle = d; g.beginPath(); g.moveTo(dx - 3, dy); g.lineTo(dx + 3, dy); g.lineTo(dx + 1.5, dy + len); g.arc(dx, dy + len, 1.6, 0, Math.PI); g.fill();
    }
  });
  // Pumpkin artwork with feathered edges so it melts into the smoke.
  const pumpkinImg = new Image();
  let pumpkin = null;
  pumpkinImg.onload = () => {
    pumpkin = sprite(pumpkinImg.width, pumpkinImg.height, (g, w, h) => {
      g.drawImage(pumpkinImg, 0, 0);
      g.globalCompositeOperation = 'destination-in';
      const grd = g.createRadialGradient(w * .54, h * .5, h * .22, w * .54, h * .5, h * .62);
      grd.addColorStop(0, 'rgba(0,0,0,1)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    });
  };
  pumpkinImg.src = 'assets/halloween-pumpkin.jpg';

  // ---------- particles (state-free: position is a function of time) ----------
  const puffs = Array.from({ length: 26 }, () => ({ x: rnd() * W, y: 380 + rnd() * 380, s: .9 + rnd() * 1.6, v: 10 + rnd() * 26, a: .18 + rnd() * .3, k: (rnd() * 3) | 0, p: rnd() * TAU }));
  const sparks = Array.from({ length: 130 }, () => ({ x: rnd() * W, y: rnd() * H, v: 40 + rnd() * 110, d: (rnd() - .5) * 40, s: .25 + rnd() * .6, p: rnd() * TAU }));
  const PX = 640, PY = 400; // pumpkin centre on stage
  const PS = 0.78;          // pumpkin draw scale (1190x865 artwork)
  const shards = [];
  for (let gy = 0; gy < 18; gy++) for (let gx = 0; gx < 22; gx++) for (let tri = 0; tri < 2; tri++) {
    const sw = 680 / 22, sh = 640 / 18, sx = 290 + gx * sw, sy = 60 + gy * sh;
    const cx = (sx + sw / 2 - 1190 * .54) * PS, cy = (sy + sh / 2 - 865 * .5) * PS, dist = Math.hypot(cx, cy) || 1;
    shards.push({ tri, sx, sy, sw, sh, cx, cy, vx: (cx / dist) * (260 + rnd() * 520), vy: (cy / dist) * (220 + rnd() * 420) - 120 * rnd(), spin: (rnd() - .5) * 9, delay: (dist / 320) * .18 + rnd() * .08 });
  }
  const swarm = Array.from({ length: 120 }, (_, i) => { const s = shards[(i * 7) % shards.length]; return { x: s.cx, y: s.cy, a: Math.atan2(s.cy - 40, s.cx) + (rnd() - .5) * .9, v: 300 + rnd() * 560, z: .5 + rnd() * 1.25, d: .02 + rnd() * .4, f: rnd() * 6 }; });
  const circlers = Array.from({ length: 9 }, () => ({ r: 90 + rnd() * 160, a: rnd() * TAU, v: (.6 + rnd() * .7) * (rnd() < .5 ? -1 : 1), z: .25 + rnd() * .35, y: rnd() * 60 }));

  // ---------- drawing ----------
  function drawSmoke(t, alpha, tint) {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (const p of puffs) {
      const x = ((p.x + t * p.v + Math.sin(t * .7 + p.p) * 30) % (W + 400)) - 200, y = p.y - t * p.v * .35 + Math.sin(t + p.p) * 12;
      const s = 320 * p.s;
      ctx.globalAlpha = alpha * p.a * (.7 + .3 * Math.sin(t * .9 + p.p));
      ctx.drawImage(smoke[p.k], x - s / 2, y - s / 2, s, s);
    }
    if (tint > 0) {
      ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = tint;
      const g2 = ctx.createRadialGradient(PX, PY + 60, 40, PX, PY + 60, 620); g2.addColorStop(0, 'rgba(255,106,16,1)'); g2.addColorStop(1, 'rgba(255,106,16,0)');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }
  function drawEmbers(t, alpha) {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of sparks) {
      let y = (p.y - t * p.v) % (H + 40); if (y < -20) y += H + 40;
      const x = (p.x + t * p.d + Math.sin(t * 2.2 + p.p) * 14 + W) % W, s = 48 * p.s * (.75 + .25 * Math.sin(t * 9 + p.p));
      ctx.globalAlpha = alpha * (.45 + .55 * Math.abs(Math.sin(t * 3 + p.p)));
      ctx.drawImage(ember, x - s / 2, y - s / 2, s, s);
    }
    ctx.restore();
  }
  function eye(x, y, w, h, open, glow, flip) {
    if (open <= 0.01) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -1 : 1, 1); ctx.rotate(.16);
    const hh = h * open;
    const path = new Path2D(); path.moveTo(-w / 2, 0); path.quadraticCurveTo(-w * .05, -hh * 1.1, w / 2, -hh * .25); path.quadraticCurveTo(w * .1, hh * .9, -w / 2, 0);
    ctx.shadowColor = `rgba(255,110,20,${.9 * glow})`; ctx.shadowBlur = 40 * glow;
    const grd = ctx.createRadialGradient(w * .05, -hh * .1, 0, 0, 0, w * .6);
    grd.addColorStop(0, '#fff6c8'); grd.addColorStop(.35, '#ffb02e'); grd.addColorStop(1, '#ff4d00');
    ctx.fillStyle = grd; ctx.fill(path); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(40,6,0,.85)'; ctx.beginPath(); ctx.ellipse(w * .08, -hh * .12, w * .05, hh * .42, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawPumpkin(t, a, lift, zoom, fireBoost) {
    if (!pumpkin || a <= 0) return;
    const w = pumpkin.width * PS * zoom, h = pumpkin.height * PS * zoom;
    ctx.save(); ctx.globalAlpha = a;
    ctx.drawImage(pumpkin, PX - w * .54, PY - h * .5 + lift, w, h);
    // inner fire flicker over eyes and mouth
    const f = .55 + .25 * Math.sin(t * 17) + .2 * Math.sin(t * 7.3 + 1) + fireBoost;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * clamp(f, 0, 1.3) * .55;
    for (const [ex, ey, r] of [[-185, 0, 120], [175, 0, 120], [0, 150, 170]]) {
      const x = PX + ex * zoom, y = PY + ey * zoom + lift, grd = ctx.createRadialGradient(x, y, 0, x, y, r * zoom);
      grd.addColorStop(0, 'rgba(255,170,60,.9)'); grd.addColorStop(1, 'rgba(255,80,0,0)'); ctx.fillStyle = grd; ctx.fillRect(x - r * zoom, y - r * zoom, r * 2 * zoom, r * 2 * zoom);
    }
    ctx.restore();
  }
  function drawShards(t) {
    if (!pumpkin) return;
    const u0 = t - 3.05;
    if (u0 < 0 || u0 > 1.6) return;
    ctx.save();
    for (const s of shards) {
      const u = Math.max(0, u0 - s.delay); if (u > 1.2) continue;
      const k = easeOut(u / 1.2) * 1.2;
      const x = PX + s.cx * 1.06 + s.vx * k, y = PY + s.cy * 1.06 + s.vy * k + 220 * u * u;
      ctx.globalAlpha = clamp(1 - u / .85, 0, 1);
      ctx.translate(x, y); ctx.rotate(s.spin * u);
      const dw = s.sw * PS * 1.06, dh = s.sh * PS * 1.06;
      // each cell breaks into two burning triangles
      ctx.beginPath();
      if (s.tri) { ctx.moveTo(-dw / 2, -dh / 2); ctx.lineTo(dw / 2, -dh / 2); ctx.lineTo(-dw / 2, dh / 2); }
      else { ctx.moveTo(dw / 2, -dh / 2); ctx.lineTo(dw / 2, dh / 2); ctx.lineTo(-dw / 2, dh / 2); }
      ctx.closePath(); ctx.save(); ctx.clip();
      ctx.drawImage(pumpkin, s.sx, s.sy, s.sw, s.sh, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
      ctx.strokeStyle = `rgba(255,${120 + (u * 60 | 0)},30,${.55 * (1 - u)})`; ctx.lineWidth = 1; ctx.stroke();
      ctx.setTransform(baseT);
    }
    ctx.restore();
  }
  function drawSwarm(t) {
    const u0 = t - 3.25; if (u0 < 0 || u0 > 1.9) return;
    for (const b of swarm) {
      const u = u0 - b.d; if (u < 0) continue;
      const dist = b.v * u * (1 + u * .8), grow = b.z * (1 + u * 1.6);
      const x = PX + b.x * .6 + Math.cos(b.a) * dist, y = PY + b.y * .6 + Math.sin(b.a) * dist - 120 * u;
      ctx.globalAlpha = clamp(u * 5, 0, 1) * clamp((1.9 - u0) * 2, 0, 1);
      const spr = bats[((t * 22 + b.f) | 0) % bats.length], w = 70 * grow, h = 35 * grow;
      ctx.drawImage(spr, x - w / 2, y - h / 2, w, h);
    }
    ctx.globalAlpha = 1;
  }
  function drawMoonGlow(a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    let grd = ctx.createRadialGradient(980, 170, 0, 980, 170, 560); grd.addColorStop(0, 'rgba(235,225,215,.55)'); grd.addColorStop(1, 'rgba(120,115,115,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    grd = ctx.createRadialGradient(960, 150, 0, 980, 170, 110); grd.addColorStop(0, '#fbf6ee'); grd.addColorStop(1, '#bfb6ab');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(980, 170, 110, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawLogo(t) {
    const a = ss(4.45, 4.95, t); if (a <= 0) return;
    const glitch = (1 - ss(4.45, 5.35, t)) + (t > 5.9 && t < 5.98 ? .6 : 0);
    const dw = LOGO_W * .92, dh = LOGO_H * .92, x0 = W / 2 - dw / 2, y0 = 205;
    const slices = 14, frame = (t * 30) | 0;
    ctx.save(); ctx.globalAlpha = a;
    for (let i = 0; i < slices; i++) {
      const sy = (LOGO_H * 2 / slices) * i, sh = LOGO_H * 2 / slices;
      const n = Math.sin(frame * 12.9898 + i * 78.233) * 43758.5453, jitter = (n - Math.floor(n) - .5) * 70 * glitch;
      ctx.drawImage(logo, 0, sy, LOGO_W * 2, sh, x0 + jitter, y0 + (dh / slices) * i, dw, dh / slices + .5);
    }
    // heat shimmer: a second faint copy flickers additively
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * (.18 + .1 * Math.sin(t * 13));
    ctx.drawImage(logo, x0, y0 - 2, dw, dh);
    ctx.restore();
    // HALLOWEEN EDITION + rule + tiny pumpkin
    const b = ss(5.0, 5.5, t); if (b <= 0) return;
    ctx.save(); ctx.globalAlpha = b; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 30px "Segoe UI", Arial, sans-serif'; ctx.fillStyle = '#ff9a3c';
    ctx.shadowColor = 'rgba(255,110,20,.8)'; ctx.shadowBlur = 16;
    const text = 'H A L L O W E E N   E D I T I O N';
    ctx.fillText(text, W / 2, 510);
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,140,50,.75)';
    const half = 330 * easeOut((t - 5.0) / .6);
    ctx.fillRect(W / 2 - half, 548, half - 26, 1.5); ctx.fillRect(W / 2 + 26, 548, half - 26, 1.5);
    ctx.fillStyle = '#ff7a18'; ctx.beginPath(); ctx.ellipse(W / 2, 550, 14, 11, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a0a00'; ctx.beginPath(); ctx.moveTo(W / 2 - 8, 547); ctx.lineTo(W / 2 - 3, 544); ctx.lineTo(W / 2 - 3, 549); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W / 2 + 8, 547); ctx.lineTo(W / 2 + 3, 544); ctx.lineTo(W / 2 + 3, 549); ctx.fill();
    ctx.fillRect(W / 2 - 6, 553, 12, 2.5);
    ctx.restore();
  }
  function drawCirclers(t, a) {
    if (a <= 0) return;
    for (const c of circlers) {
      const ang = c.a + t * c.v, x = 1060 + Math.cos(ang) * c.r, y = 200 + Math.sin(ang) * c.r * .45 + c.y;
      const spr = bats[((t * 18 + c.r) | 0) % bats.length], w = 70 * c.z, h = 35 * c.z;
      ctx.globalAlpha = a; ctx.drawImage(spr, x - w / 2, y - h / 2, w, h);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- frame ----------
  let fitS = 1, fitX = 0, fitY = 0, baseT = null;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), cw = splash.clientWidth || innerWidth, ch = splash.clientHeight || innerHeight;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    canvas.style.width = `${cw}px`; canvas.style.height = `${ch}px`;
    fitS = Math.max(canvas.width / W, canvas.height / H); fitX = (canvas.width - W * fitS) / 2; fitY = (canvas.height - H * fitS) / 2;
  }
  function frame(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(fitS, 0, 0, fitS, fitX, fitY);
    // camera: slow push-in over the whole piece, small shake at the burst
    const shake = t > 3.05 && t < 3.4 ? (1 - (t - 3.05) / .35) * 6 : 0;
    const cam = 1 + .045 * ss(0, 3.1, t);
    ctx.translate(W / 2 + Math.sin(t * 61) * shake, H / 2 + Math.cos(t * 53) * shake); ctx.scale(cam, cam); ctx.translate(-W / 2, -H / 2);
    baseT = ctx.getTransform(); // shards reset to this after each rotate

    // scene 4 backdrop first (it rises behind everything at the end)
    const s4 = ss(4.15, 4.8, t);
    if (s4 > 0) { ctx.globalAlpha = s4; ctx.drawImage(castle, 0, 0); ctx.globalAlpha = 1; }
    drawMoonGlow(ss(3.3, 3.9, t) * (1 - ss(4.2, 4.8, t)));
    drawSmoke(t, (.72 + .28 * ss(1.4, 2.4, t)) * (1 - ss(4.3, 5.2, t) * .55), ss(1.5, 2.6, t) * .35 * (1 - ss(3.3, 3.9, t)));
    // scene 1: eyes
    const eyesA = ss(.25, .9, t) * (1 - ss(1.75, 2.15, t));
    if (eyesA > 0) {
      const blink = t > 1.12 && t < 1.32 ? Math.abs(Math.cos(((t - 1.12) / .2) * Math.PI)) : 1;
      const open = ss(.25, 1.0, t) * blink, glow = eyesA * (.8 + .2 * Math.sin(t * 6));
      ctx.globalAlpha = eyesA; eye(PX - 108, 330, 96, 34, open, glow, false); eye(PX + 108, 330, 96, 34, open, glow, true); ctx.globalAlpha = 1;
    }
    // scene 2: pumpkin rises, burns brighter, then bursts at 3.05 s
    const pa = ss(1.45, 2.3, t) * (t < 3.05 ? 1 : 0);
    drawPumpkin(t, pa, 150 * (1 - easeOut((t - 1.45) / 1.2)), .92 + .08 * ss(1.45, 2.6, t), ss(2.6, 3.05, t) * .9);
    // scene 3: shards + bat swarm
    drawShards(t);
    if (t >= 3.05 && t < 3.3) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - (t - 3.05) / .25;
      const grd = ctx.createRadialGradient(PX, PY, 0, PX, PY, 520); grd.addColorStop(0, 'rgba(255,190,90,.95)'); grd.addColorStop(1, 'rgba(255,80,0,0)'); ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    drawSwarm(t);
    // scene 4: lettering, bats around the moon, small pumpkin
    drawCirclers(t, s4);
    if (pumpkin && s4 > 0) { ctx.globalAlpha = s4 * .95; const w = 210, h = w * pumpkin.height / pumpkin.width; ctx.drawImage(pumpkin, 975, 520, w, h); ctx.globalAlpha = 1; }
    drawLogo(t);
    drawEmbers(t, ss(1.6, 2.4, t) * (1 - ss(3.6, 4.2, t) * .5));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(vignette, 0, 0, canvas.width, canvas.height);
  }

  resize();
  window.addEventListener('resize', resize);
  const start = performance.now();
  let raf = 0;
  function tick(now) {
    if (!canvas.isConnected) return;
    const t = reduced ? DUR : Math.min(DUR, (now - start) / 1000);
    frame(t);
    if (t < DUR) raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  // Test/preview hook: render any moment (used by the frame captures).
  window.H1tHalloweenBoot = { renderAt: (t) => { cancelAnimationFrame(raf); frame(t); }, duration: DUR, ready: () => !!pumpkin };
})();
