'use strict';
// H1T.CC Halloween boot animation (6.4 s, canvas, 60 fps). Four scenes after the concept board:
//   1 Darkness awakes  – drifting smoke, two glowing eyes open and blink
//   2 The pumpkin rises – the jack-o'-lantern forms around those eyes, throbs, glowing cracks run through it
//   3 Into the shadows – it bursts (flash, shockwave, sparks, burning chunks) and a bat swarm pours out
//   4 H1T.CC revealed   – lightning shows the castle under the blood moon, the lettering ignites left to right
// Everything heavy (smoke, embers, bats, castle scene, lettering, pumpkin layers) is pre-rendered once into sprites;
// each frame only composes them, so it stays smooth. Active only when <html> has .hw-boot (halloween-boot-head.js).
(() => {
  if (!document.documentElement.classList.contains('hw-boot')) return;
  const splash = document.getElementById('splash');
  if (!splash) return;
  const W = 1280, H = 720, DUR = 6.4;
  const T_BURST = 2.95, T_BOLT = 4.12, T_IGNITE = 4.45;
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
  const bump = (t, at, w) => Math.exp(-(((t - at) / w) ** 2));
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
      grd.addColorStop(0, `rgba(${84 + rnd() * 30},${62 + rnd() * 18},${54 + rnd() * 14},.5)`); grd.addColorStop(1, 'rgba(40,30,28,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
  }));
  const darkSmoke = smoke.map((c) => sprite(c.width, c.height, (g) => { g.filter = 'brightness(.18)'; g.drawImage(c, 0, 0); }));
  const ember = sprite(48, 48, (g) => {
    const grd = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    grd.addColorStop(0, 'rgba(255,236,170,1)'); grd.addColorStop(.18, 'rgba(255,150,40,.95)'); grd.addColorStop(.5, 'rgba(255,80,10,.25)'); grd.addColorStop(1, 'rgba(255,60,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 48, 48);
  });
  const BAT_PATH = new Path2D('M32 11c-1.6-3.6-5-5.4-5-5.4s.9 3.4-.7 5.4c-2.8-2.6-8.3-3.6-12-1.8 2.8 1 4.6 2.9 4.6 5.6-3.7-1.8-8.3-.9-12 1.8 5.5 0 8.3 1.8 10.1 4.6 2.8-1.8 6.4-2.7 9.2-1.8 1.8.9 3.7 2.7 5.8 5.4 2.1-2.7 4-4.5 5.8-5.4 2.8-.9 6.4 0 9.2 1.8 1.8-2.8 4.6-4.6 10.1-4.6-3.7-2.7-8.3-3.6-12-1.8 0-2.7 1.8-4.6 4.6-5.6-3.7-1.8-9.2-.8-12 1.8-1.6-2-.7-5.4-.7-5.4S33.6 7.4 32 11Z');
  // Eight wing positions (a full flap cycle as vertical squash), black with a thin fire rim and glowing eyes.
  const bats = [1, .9, .72, .5, .34, .5, .72, .9].map((k) => sprite(140, 70, (g) => {
    g.translate(70, 35); g.scale(2, 2 * k); g.translate(-32, -15);
    g.shadowColor = 'rgba(255,110,20,.8)'; g.shadowBlur = 5; g.fillStyle = '#040103'; g.fill(BAT_PATH);
    g.shadowBlur = 0; g.fillStyle = '#ff7a1a'; g.beginPath(); g.arc(30.4, 12.4, .9, 0, TAU); g.arc(33.6, 12.4, .9, 0, TAU); g.fill();
  }));
  const vignette = sprite(W, H, (g) => {
    const grd = g.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, 820);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,.86)'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
  });
  // Scene 4 backdrop: blood-orange moon, castle on the hill, dead trees, wet ground with reflections.
  const MOON_X = 1060, MOON_Y = 200;
  const castle = sprite(W, H, (g) => {
    let grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#0a0303'); grd.addColorStop(.55, '#1a0602'); grd.addColorStop(1, '#050101'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
    grd = g.createRadialGradient(MOON_X, MOON_Y, 0, MOON_X, MOON_Y, 420); grd.addColorStop(0, 'rgba(255,120,30,.35)'); grd.addColorStop(1, 'rgba(255,90,10,0)'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
    grd = g.createRadialGradient(MOON_X - 20, MOON_Y - 18, 0, MOON_X, MOON_Y, 92); grd.addColorStop(0, '#ffd59a'); grd.addColorStop(.6, '#ff9a3c'); grd.addColorStop(1, '#d4520c'); g.fillStyle = grd;
    g.shadowColor = 'rgba(255,130,40,.9)'; g.shadowBlur = 60; g.beginPath(); g.arc(MOON_X, MOON_Y, 92, 0, TAU); g.fill(); g.shadowBlur = 0;
    g.fillStyle = 'rgba(150,60,10,.3)'; for (const [x, y, r] of [[1088, 176, 16], [1036, 236, 11], [1040, 170, 8], [1094, 236, 7]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    // wisps of cloud across the moon
    g.filter = 'blur(6px)'; g.fillStyle = 'rgba(20,6,4,.75)';
    for (const [x, y, w, h] of [[990, 232, 190, 10], [1050, 178, 150, 7], [930, 262, 120, 6]]) { g.beginPath(); g.ellipse(x, y, w / 2, h / 2, 0, 0, TAU); g.fill(); }
    g.filter = 'none';
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
  // Lightning bolt that reveals the castle: a jagged main channel with two forks, pre-rendered with its glow.
  const bolt = sprite(W, H, (g) => {
    const jag = (x, y, x2, y2, n, spread) => { const pts = [[x, y]]; for (let i = 1; i < n; i++) { const k = i / n; pts.push([x + (x2 - x) * k + (rnd() - .5) * spread, y + (y2 - y) * k + (rnd() - .5) * spread * .3]); } pts.push([x2, y2]); return pts; };
    const main = jag(905, -10, 1128, 214, 16, 46);
    const forks = [jag(...main[6], 1010, 150, 7, 26), jag(...main[10], 1205, 190, 6, 22)];
    const stroke = (pts, w) => { g.lineWidth = w; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.stroke(); };
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.shadowColor = 'rgba(255,170,90,1)'; g.shadowBlur = 28; g.strokeStyle = 'rgba(255,190,120,.55)';
    stroke(main, 9); for (const f of forks) stroke(f, 5);
    g.shadowBlur = 8; g.strokeStyle = '#fff8ec'; stroke(main, 2.6); for (const f of forks) stroke(f, 1.4);
  });
  // Burning lettering, rendered once at 2x so it stays crisp while it scales.
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
    // fine cracks of darker char across the letters
    g.globalCompositeOperation = 'source-atop'; g.strokeStyle = 'rgba(70,14,0,.4)'; g.lineWidth = 1.3;
    for (let i = 0; i < 18; i++) { const cx = 230 + rnd() * 640, cy = y - 70 + rnd() * 140; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + (rnd() - .5) * 40, cy + (rnd() - .5) * 30); g.lineTo(cx + (rnd() - .5) * 60, cy + (rnd() - .5) * 50); g.stroke(); }
    g.globalCompositeOperation = 'source-over';
    // molten drips under the letters
    for (let i = 0; i < 12; i++) {
      const dx = 250 + rnd() * 600, dy = y + 62 + rnd() * 10, len = 10 + rnd() * 30;
      const d = g.createLinearGradient(0, dy, 0, dy + len); d.addColorStop(0, '#ff7a18'); d.addColorStop(1, 'rgba(255,90,10,0)');
      g.fillStyle = d; g.beginPath(); g.moveTo(dx - 3, dy); g.lineTo(dx + 3, dy); g.lineTo(dx + 1.5, dy + len); g.arc(dx, dy + len, 1.6, 0, Math.PI); g.fill();
    }
  });
  // White-hot letter shapes without any glow, for the burn front while the lettering ignites.
  const logoCore = sprite(LOGO_W * 2, LOGO_H * 2, (g) => {
    g.scale(2, 2);
    g.font = '900 176px Impact, "Arial Black", "Segoe UI Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffd27a'; g.fillText('H1T.CC', LOGO_W / 2, LOGO_H / 2);
  });

  // ---------- pumpkin (1190x865 artwork) ----------
  // Stage placement: image point (ix, iy) lands at PX + (ix - IMG_CX) * PS, PY + (iy - IMG_CY) * PS.
  const PX = 640, PY = 400, PS = 0.78, IMG_CX = 1190 * .54, IMG_CY = 865 * .5;
  const toStage = (ix, iy) => [PX + (ix - IMG_CX) * PS, PY + (iy - IMG_CY) * PS];
  const EYE_L = toStage(405, 410), EYE_R = toStage(770, 430), MOUTH = toStage(640, 590);
  const [FX, FY] = toStage(630, 425); // centre of the pumpkin body, where it breaks open
  // Two layers: the pumpkin body (it fractures) and the smoky halo around it (it is blown away), plus a charred
  // copy of the body for chunks that burn out while flying.
  const pumpkinImg = new Image();
  let body = null, halo = null, charred = null;
  pumpkinImg.onload = () => {
    const w = pumpkinImg.width, h = pumpkinImg.height;
    const feathered = sprite(w, h, (g) => {
      g.drawImage(pumpkinImg, 0, 0);
      g.globalCompositeOperation = 'destination-in';
      const grd = g.createRadialGradient(w * .54, h * .5, h * .22, w * .54, h * .5, h * .62);
      grd.addColorStop(0, 'rgba(0,0,0,1)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    });
    const bodyMask = (g, keep) => {
      g.globalCompositeOperation = keep ? 'destination-in' : 'destination-out';
      g.save(); g.translate(630, 405); g.scale(1, 350 / 345);
      const grd = g.createRadialGradient(0, 0, 265, 0, 0, 345); grd.addColorStop(0, 'rgba(0,0,0,1)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(-w, -h * 2, w * 2, h * 4); g.restore();
    };
    body = sprite(w, h, (g) => { g.drawImage(feathered, 0, 0); bodyMask(g, true); });
    halo = sprite(w, h, (g) => { g.drawImage(feathered, 0, 0); bodyMask(g, false); });
    charred = sprite(w, h, (g) => { g.filter = 'brightness(.22) saturate(.5)'; g.drawImage(body, 0, 0); });
    warm([body, halo, charred]);
  };
  pumpkinImg.src = 'assets/halloween-pumpkin.jpg';

  // Fracture pattern: a jittered polar web around the body centre. Neighbouring pieces share their vertices,
  // so the pumpkin stays whole until it bursts and the glowing cracks run exactly along the break lines.
  const RINGS = [0, 52, 112, 176, 238, 300], SECT = 11, ELL = 300 / 340;
  const vtx = RINGS.map((r, i) => Array.from({ length: SECT }, (_, j) => {
    if (i === 0) return [FX, FY];
    const a = (j + (rnd() - .5) * .55) / SECT * TAU + i * .23, rr = r * (1 + (rnd() - .5) * .22) * (i === RINGS.length - 1 ? 1.25 : 1);
    return [FX + Math.cos(a) * rr, FY + Math.sin(a) * rr * ELL];
  }));
  const mid = RINGS.map((r, i) => Array.from({ length: SECT }, (_, j) => {
    if (i === 0) return null;
    const [ax, ay] = vtx[i][j], [bx, by] = vtx[i][(j + 1) % SECT], k = .5 + (rnd() - .5) * .3, n = (rnd() - .5) * r * .16;
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    return [ax + dx * k - (dy / len) * n, ay + dy * k + (dx / len) * n];
  }));
  const pieces = [];
  for (let i = 1; i < RINGS.length; i++) for (let j = 0; j < SECT; j++) {
    const j2 = (j + 1) % SECT;
    const pts = i === 1 ? [vtx[0][0], vtx[1][j], mid[1][j], vtx[1][j2]]
      : [vtx[i - 1][j], vtx[i][j], mid[i][j], vtx[i][j2], vtx[i - 1][j2], mid[i - 1][j]];
    const path = new Path2D(); pts.forEach(([x, y], k) => (k ? path.lineTo(x, y) : path.moveTo(x, y))); path.closePath();
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const bx = Math.min(...xs) - 2, by = Math.min(...ys) - 2, bw = Math.max(...xs) - bx + 4, bh = Math.max(...ys) - by + 4;
    const dx = cx - FX, dy = cy - FY, d = Math.hypot(dx, dy) || 1, sp = 340 + rnd() * 520 + (1 - i / RINGS.length) * 260;
    pieces.push({ path, cx, cy, bx, by, bw, bh, vx: (dx / d) * sp, vy: (dy / d) * sp - 140 - rnd() * 160,
      spin: (rnd() - .5) * 7, grow: rnd() < .3 ? .9 + rnd() * .8 : rnd() * .25, life: .55 + rnd() * .4 });
  }
  // Glowing cracks that spread from the centre before the burst: jagged, wandering lines with short side branches.
  // Each point carries its distance from the start, so the cracks can be revealed as they grow.
  const cracks = [];
  const crack = (x, y, ang, steps, d0) => {
    const pts = [[x, y, d0]];
    for (let i = 0; i < steps; i++) {
      ang += (rnd() - .5) * .7; const len = 12 + rnd() * 12; x += Math.cos(ang) * len; y += Math.sin(ang) * len * ELL;
      pts.push([x, y, pts[pts.length - 1][2] + len]);
      if (steps > 5 && i > 1 && rnd() < .28) crack(x, y, ang + (rnd() < .5 ? -1 : 1) * (.6 + rnd() * .5), 2 + (rnd() * 3 | 0), pts[pts.length - 1][2]);
    }
    cracks.push(pts);
  };
  for (let k = 0; k < 10; k++) crack(FX, FY, (k + rnd() * .6) / 10 * TAU, 8 + (rnd() * 5 | 0), 0);

  // ---------- particles (state-free: position is a function of time) ----------
  const puffs = Array.from({ length: 26 }, () => ({ x: rnd() * W, y: 380 + rnd() * 380, s: .9 + rnd() * 1.6, v: 10 + rnd() * 26, a: .18 + rnd() * .3, k: (rnd() * 3) | 0, p: rnd() * TAU }));
  const sparks = Array.from({ length: 110 }, () => ({ x: rnd() * W, y: rnd() * H, v: 40 + rnd() * 110, d: (rnd() - .5) * 40, s: .25 + rnd() * .6, p: rnd() * TAU }));
  const blast = Array.from({ length: 240 }, () => ({ a: rnd() * TAU, v: 500 + rnd() * 1300, life: .45 + rnd() * .75, hot: rnd() }));
  const blastSmoke = Array.from({ length: 16 }, (_, i) => ({ a: (i / 16) * TAU + rnd() * .3, v: 260 + rnd() * 260, s: 1 + rnd() * 1.2, k: i % 3 }));
  // Bats pour out of the burst, mostly upwards; some fly at the camera and grow fast. Drawn far to near.
  const swarm = Array.from({ length: 70 }, () => ({
    a: -Math.PI / 2 + (rnd() - .5) * 3.6, v: 260 + rnd() * 420, z0: .55 + rnd() * .55,
    zv: rnd() < .22 ? 2.2 + rnd() * 2 : .3 + rnd() * .8, d: rnd() * .5, f: rnd() * 8, wob: rnd() * TAU,
  })).sort((p, q) => p.zv - q.zv);
  const circlers = Array.from({ length: 9 }, () => ({ r: 90 + rnd() * 160, a: rnd() * TAU, v: (.6 + rnd() * .7) * (rnd() < .5 ? -1 : 1), z: .25 + rnd() * .35, y: rnd() * 60 }));
  const igniteSparks = Array.from({ length: 70 }, () => ({ k: rnd(), y: rnd(), v: 60 + rnd() * 140, d: (rnd() - .5) * 60, s: .3 + rnd() * .5, life: .5 + rnd() * .7 }));

  // ---------- drawing ----------
  function drawSmoke(t, alpha) {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (const p of puffs) {
      const x = ((p.x + t * p.v + Math.sin(t * .7 + p.p) * 30) % (W + 400)) - 200, y = p.y - t * p.v * .35 + Math.sin(t + p.p) * 12;
      const s = 320 * p.s;
      ctx.globalAlpha = alpha * p.a * (.7 + .3 * Math.sin(t * .9 + p.p));
      ctx.drawImage(smoke[p.k], x - s / 2, y - s / 2, s, s);
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
    ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -1 : 1, 1); ctx.rotate(.2);
    const hh = h * open;
    const path = new Path2D(); path.moveTo(-w / 2, -hh * .1); path.quadraticCurveTo(-w * .05, -hh * 1.1, w / 2, -hh * .1); path.quadraticCurveTo(w * .1, hh * .9, -w / 2, -hh * .1);
    ctx.shadowColor = `rgba(255,110,20,${.9 * glow})`; ctx.shadowBlur = 44 * glow;
    const grd = ctx.createRadialGradient(w * .05, -hh * .1, 0, 0, 0, w * .6);
    grd.addColorStop(0, '#fff6c8'); grd.addColorStop(.35, '#ffb02e'); grd.addColorStop(1, '#ff4d00');
    ctx.fillStyle = grd; ctx.fill(path); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(40,6,0,.85)'; ctx.beginPath(); ctx.ellipse(w * .08, -hh * .15, w * .045, hh * .4, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // Pumpkin layers in stage coordinates, scaled by z around the body centre.
  function placeImg(img, z, a) {
    if (a <= 0) return;
    ctx.globalAlpha = a;
    ctx.drawImage(img, FX + (PX - IMG_CX * PS - FX) * z, FY + (PY - IMG_CY * PS - FY) * z, img.width * PS * z, img.height * PS * z);
    ctx.globalAlpha = 1;
  }
  function fireGlow(t, a, z, boost) {
    const f = .55 + .25 * Math.sin(t * 17) + .2 * Math.sin(t * 7.3 + 1) + boost;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [[ex, ey], r] of [[EYE_L, 95], [EYE_R, 95], [MOUTH, 150]]) {
      const x = FX + (ex - FX) * z, y = FY + (ey - FY) * z, rr = r * z;
      ctx.globalAlpha = a * clamp(f, 0, 1.6) * .5;
      const grd = ctx.createRadialGradient(x, y, 0, x, y, rr); grd.addColorStop(0, 'rgba(255,175,70,.95)'); grd.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = grd; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    ctx.restore();
  }
  function drawCracks(t, z) {
    const grow = ss(2.3, 2.92, t); if (grow <= 0) return;
    const reach = grow * 280;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.translate(FX, FY); ctx.scale(z, z); ctx.translate(-FX, -FY);
    const path = new Path2D();
    for (const c of cracks) {
      if (c[0][2] > reach) continue;
      path.moveTo(c[0][0], c[0][1]);
      for (let i = 1; i < c.length; i++) {
        const [px, py, pd] = c[i - 1], [x, y, d] = c[i];
        if (d <= reach) { path.lineTo(x, y); continue; }
        const k = (reach - pd) / (d - pd); path.lineTo(px + (x - px) * k, py + (y - py) * k); break;
      }
    }
    const pulse = .8 + .2 * Math.sin(t * 40);
    ctx.shadowColor = 'rgba(255,110,10,1)'; ctx.shadowBlur = 14; ctx.strokeStyle = `rgba(255,140,40,${.55 * pulse})`; ctx.lineWidth = 3 + grow * 3; ctx.stroke(path);
    ctx.shadowBlur = 0; ctx.strokeStyle = `rgba(255,240,200,${.85 * pulse})`; ctx.lineWidth = .9 + grow * .8; ctx.stroke(path);
    ctx.restore();
  }
  function drawPieces(t) {
    const u = t - T_BURST; if (!body || u < 0 || u > 1.3) return;
    const k = (1 - Math.exp(-u * 2.6)) / 2.6; // travelled distance per unit speed, with air drag
    for (const p of pieces) {
      const a = clamp(1 - (u - p.life * .55) / (p.life * .45), 0, 1); if (a <= 0) continue;
      const s = 1 + p.grow * u;
      ctx.save(); ctx.globalAlpha = a;
      ctx.translate(p.cx + p.vx * k, p.cy + p.vy * k + 420 * u * u); ctx.rotate(p.spin * u); ctx.scale(s, s); ctx.translate(-p.cx, -p.cy);
      ctx.clip(p.path);
      const sx = IMG_CX + (p.bx - PX) / PS, sy = IMG_CY + (p.by - PY) / PS, sw = p.bw / PS, sh = p.bh / PS;
      ctx.drawImage(body, sx, sy, sw, sh, p.bx, p.by, p.bw, p.bh);
      // chunks glow hot right after the burst, then cool down and char in flight
      const heat = clamp(1 - u / .4, 0, 1), char = ss(.3, .8, u) * .9;
      if (heat > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * heat * .8; ctx.drawImage(body, sx, sy, sw, sh, p.bx, p.by, p.bw, p.bh); }
      else if (char > 0) { ctx.globalAlpha = a * char; ctx.drawImage(charred, sx, sy, sw, sh, p.bx, p.by, p.bw, p.bh); }
      ctx.restore();
    }
  }
  // Core flash and shockwave ring, drawn behind the flying chunks so the gaps between them glow.
  function drawFlash(t) {
    const u = t - T_BURST; if (u < 0 || u > .55) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (u < .4) {
      const f = (1 - u / .4) ** 1.5, r = 140 + 420 * easeOut(u / .4);
      // the pumpkin's own fire, blown up and over-exposed, fills the gaps between the chunks with real flames
      if (body) { placeImg(body, 1.05 + .25 * easeOut(u / .4), f); placeImg(body, 1.15 + .35 * easeOut(u / .4), f * .6); }
      const grd = ctx.createRadialGradient(FX, FY, 0, FX, FY, r);
      grd.addColorStop(0, `rgba(255,244,210,${f})`); grd.addColorStop(.3, `rgba(255,150,40,${.6 * f})`); grd.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    }
    if (u < .55) {
      const v = u / .55, r = 60 + 1000 * easeOut(v);
      ctx.strokeStyle = '#ffb060'; ctx.beginPath(); ctx.ellipse(FX, FY, r, r * .82, 0, 0, TAU);
      ctx.globalAlpha = (1 - v) * (1 - v) * .14; ctx.lineWidth = 30 * (1 - v) + 4; ctx.stroke();
      ctx.globalAlpha = (1 - v) * (1 - v) * .22; ctx.lineWidth = 10 * (1 - v) + 1.5; ctx.stroke();
    }
    ctx.restore();
  }
  function drawBlast(t) {
    const u = t - T_BURST; if (u < 0 || u > 1.4) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // spark streaks: fast, with drag and gravity, drawn as short trails, batched per colour and brightness
    ctx.lineCap = 'round'; ctx.lineWidth = 1.8;
    const pos = (b, q) => { const k = (1 - Math.exp(-q * 3.2)) / 3.2; return [FX + Math.cos(b.a) * b.v * k, FY + Math.sin(b.a) * b.v * k * .85 + 300 * q * q]; };
    const batches = Array.from({ length: 12 }, () => new Path2D());
    for (const b of blast) {
      if (u > b.life) continue;
      const [x, y] = pos(b, u), [x0, y0] = pos(b, Math.max(0, u - .045)), level = Math.min(3, ((1 - u / b.life) * 4) | 0);
      const path = batches[(b.hot > .6 ? 0 : b.hot > .25 ? 1 : 2) * 4 + level]; path.moveTo(x0, y0); path.lineTo(x, y);
    }
    batches.forEach((path, i) => { ctx.strokeStyle = ['#fff1c4', '#ffb347', '#ff6a10'][i >> 2]; ctx.globalAlpha = ((i & 3) + 1) / 4; ctx.stroke(path); });
    ctx.restore();
    // a ring of black smoke rolling outwards
    ctx.save();
    for (const p of blastSmoke) {
      const k = easeOut(u / 1.4), d = 60 + p.v * k, s = 260 * p.s * (.6 + k);
      ctx.globalAlpha = .7 * (1 - u / 1.4) * clamp((u - .08) * 5, 0, 1);
      ctx.drawImage(darkSmoke[p.k], FX + Math.cos(p.a) * d - s / 2, FY + Math.sin(p.a) * d * .8 - s / 2, s, s);
    }
    ctx.restore();
  }
  function drawSwarm(t) {
    const u0 = t - (T_BURST + .06); if (u0 < 0 || u0 > 2) return;
    for (const b of swarm) {
      const u = u0 - b.d * .6; if (u < 0) continue;
      const z = b.z0 * (1 + b.zv * u * u * 1.3), dist = b.v * u * (1 + u * .6);
      const x = FX + Math.cos(b.a) * dist + Math.sin(u * 5 + b.wob) * 16, y = FY + Math.sin(b.a) * dist * .7 - 90 * u + Math.cos(u * 7 + b.wob) * 10;
      const w = 70 * z, h = 35 * z;
      if (x < -w || x > W + w || y < -h || y > H + h) continue;
      ctx.globalAlpha = clamp(u * 6, 0, 1) * clamp((2 - u0) * 2.5, 0, 1);
      ctx.drawImage(bats[((t * 26 + b.f) | 0) % bats.length], x - w / 2, y - h / 2, w, h);
    }
    ctx.globalAlpha = 1;
  }
  function drawCirclers(t, a) {
    if (a <= 0) return;
    for (const c of circlers) {
      const ang = c.a + t * c.v, x = MOON_X + Math.cos(ang) * c.r, y = MOON_Y + Math.sin(ang) * c.r * .45 + c.y;
      const spr = bats[((t * 20 + c.r) | 0) % bats.length], w = 70 * c.z, h = 35 * c.z;
      ctx.globalAlpha = a; ctx.drawImage(spr, x - w / 2, y - h / 2, w, h);
    }
    ctx.globalAlpha = 1;
  }
  const boltFlash = (t) => bump(t, T_BOLT + .02, .035) + .7 * bump(t, T_BOLT + .14, .03) + .25 * bump(t, T_BOLT + .24, .03);
  function drawLightning(t) {
    const flash = clamp(boltFlash(t), 0, 1); if (flash < .01) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = flash; ctx.drawImage(bolt, 0, 0);
    ctx.globalAlpha = flash * .16; ctx.fillStyle = '#ffd0a0'; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  function drawLogo(t) {
    const a = ss(T_IGNITE - .05, T_IGNITE + .15, t); if (a <= 0) return;
    const sc = 1.05 - .05 * easeOut((t - T_IGNITE) / 1.1);
    const dw = LOGO_W * .92 * sc, dh = LOGO_H * .92 * sc, x0 = W / 2 - dw / 2, y0 = 360 - dh / 2;
    // the letters catch fire from left to right; the burn front glows white-hot and throws sparks
    const span = (k) => x0 + (.2 + .6 * k) * dw; // lettering covers 20–80 % of the sprite width
    const sweep = easeOut((t - T_IGNITE) / .75), front = span(sweep);
    const strip = (from, to, img, alpha, op) => {
      ctx.save(); ctx.beginPath(); ctx.rect(from, 0, to - from, H); ctx.clip();
      ctx.globalCompositeOperation = op; ctx.globalAlpha = alpha; ctx.drawImage(img, x0, y0, dw, dh); ctx.restore();
    };
    if (sweep >= 1) strip(0, W, logo, a, 'source-over');
    else {
      // burnt-in part, a soft edge, then the white-hot front fading back into the flames
      strip(0, front - 24, logo, a, 'source-over'); strip(front - 24, front, logo, a * .7, 'source-over'); strip(front, front + 16, logo, a * .3, 'source-over');
      [[110, .2], [70, .3], [40, .4], [18, .5]].forEach(([w, k]) => strip(front - w, front + 2, logoCore, k * a * .6, 'lighter'));
    }
    // heat shimmer after ignition: a soft additive copy that breathes
    const glow = ss(T_IGNITE + .5, T_IGNITE + 1.1, t);
    if (glow > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = glow * (.16 + .08 * Math.sin(t * 6) + .05 * Math.sin(t * 17));
      ctx.drawImage(logo, x0, y0 - 1.5, dw, dh); ctx.restore();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of igniteSparks) {
      const born = T_IGNITE + p.k * .75, u = t - born; if (u < 0 || u > p.life) continue;
      const x = span(easeOut(p.k)) + p.d * u, y = y0 + dh * (.3 + p.y * .4) - p.v * u - 40 * u * u, s = 48 * p.s * (1 - u / p.life * .5);
      ctx.globalAlpha = 1 - u / p.life; ctx.drawImage(ember, x - s / 2, y - s / 2, s, s);
    }
    ctx.restore();
  }

  // ---------- frame ----------
  let fitS = 1, fitX = 0, fitY = 0;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), cw = splash.clientWidth || innerWidth, ch = splash.clientHeight || innerHeight;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    canvas.style.width = `${cw}px`; canvas.style.height = `${ch}px`;
    fitS = Math.max(canvas.width / W, canvas.height / H); fitX = (canvas.width - W * fitS) / 2; fitY = (canvas.height - H * fitS) / 2;
  }
  function frame(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(fitS, 0, 0, fitS, fitX, fitY);
    // camera: slow push-in towards the pumpkin, a punch and a decaying shake at the burst, then a gentle drift
    const sb = t - T_BURST, shake = sb > 0 && sb < .5 ? Math.pow(1 - sb / .5, 2) * 9 : 0;
    const cam = 1 + .06 * ss(0, T_BURST, t) - .06 * ss(T_BURST, T_BURST + .6, t) + .035 * ss(T_BOLT, DUR, t) + .03 * bump(t, T_BURST + .05, .08);
    ctx.translate(W / 2 + Math.sin(t * 61) * shake, H / 2 + Math.cos(t * 53) * shake); ctx.scale(cam, cam); ctx.translate(-W / 2, -H / 2);

    // scene 4 backdrop: dimly there after the burst, lit by the lightning and then fully revealed
    const lit = ss(T_BOLT, T_BOLT + .35, t);
    const back = Math.max(ss(T_BURST + .45, T_BOLT - .1, t) * .4, lit) + .9 * clamp(boltFlash(t), 0, 1) * (1 - lit);
    if (back > 0) { ctx.globalAlpha = clamp(back, 0, 1); ctx.drawImage(castle, 0, 0); ctx.globalAlpha = 1; }
    // the blast clears the smoke, which then slowly drifts back in thinner
    const cleared = 1 - .85 * ss(T_BURST, T_BURST + .12, t) + .4 * ss(T_BURST + .5, T_BURST + 1.5, t);
    drawSmoke(t, (.72 + .28 * ss(1.4, 2.4, t)) * cleared * (1 - .6 * lit));

    // scene 1: eyes open where the pumpkin's eyes will be, blink, then the pumpkin forms around them
    const eyesA = ss(.3, .9, t) * (1 - ss(1.75, 2.3, t));
    if (eyesA > 0) {
      const blink = t > 1.08 && t < 1.3 ? Math.abs(Math.cos(((t - 1.08) / .22) * Math.PI)) : 1;
      const open = ss(.3, 1.0, t) * blink, glow = eyesA * (.8 + .2 * Math.sin(t * 6));
      ctx.globalAlpha = eyesA; eye(EYE_L[0], EYE_L[1], 104, 38, open, glow, false); eye(EYE_R[0], EYE_R[1], 104, 38, open, glow, true); ctx.globalAlpha = 1;
    }
    // scene 2: the pumpkin materialises, throbs faster and faster while cracks of fire spread, then bursts
    if (body && t < T_BURST) {
      const form = ss(1.25, 2.3, t);
      const throb = (.022 * bump(t, 2.36, .05) + .03 * bump(t, 2.62, .045) + .042 * bump(t, 2.83, .04)) * (1 - ss(2.9, T_BURST, t));
      const z = .9 + .1 * easeOut((t - 1.25) / 1.1) + throb;
      placeImg(halo, z, form); placeImg(body, z, form);
      fireGlow(t, form, z, ss(2.3, T_BURST, t) * 1.1 + throb * 12);
      drawCracks(t, z);
    }
    // scene 3: the smoky halo is blown away, burning chunks fly, blast, then the bat swarm
    if (halo && sb >= 0 && sb < .45) placeImg(halo, 1.02 + .5 * easeOut(sb / .45), 1 - ss(0, .45, sb));
    drawFlash(t);
    drawPieces(t);
    drawBlast(t);
    drawSwarm(t);
    // scene 4: lightning, bats around the moon, the lettering
    drawLightning(t);
    drawCirclers(t, lit);
    drawLogo(t);
    drawEmbers(t, ss(1.6, 2.4, t) * (1 - .45 * ss(T_BURST, T_BURST + 1, t)));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(vignette, 0, 0, canvas.width, canvas.height);
    const fadeIn = 1 - ss(0, .35, t);
    if (fadeIn > 0) { ctx.globalAlpha = fadeIn; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
  }

  // Draw every sprite once into a hidden corner so the GPU uploads happen now, not mid-scene.
  function warm(list) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const c of list) ctx.drawImage(c, 0, 0, 1, 1);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 2, 2); ctx.restore();
  }

  resize();
  warm([...smoke, ...darkSmoke, ember, ...bats, vignette, castle, bolt, logo, logoCore]);
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
  window.H1tHalloweenBoot = { renderAt: (t) => { cancelAnimationFrame(raf); frame(t); }, duration: DUR, ready: () => !!body };
})();
