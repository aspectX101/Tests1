'use strict';
// H1T.CC Halloween boot animation (8 s, canvas, 60 fps), a logo reveal in five scenes:
//   1 Ghost      – a glowing sheet ghost rises into a spotlight between cobwebs, floats and blinks
//   2 Sheet      – the sheet is blown off, flutters towards the camera and wipes away to the next scene
//   3 Pumpkin    – a carved jack-o'-lantern lights up in the dark, the camera rushes into its grin
//   4 Witch      – a white flash bursts into smoke, a witch on her broom crosses the full moon with a swarm of bats
//   5 Logo       – the Halloween H1T mark condenses out of purple fog: bats burst out, the drips run, lightning strikes,
//                  "HAPPY HALLOWEEN, NAME"
// Everything is drawn in code (no video); heavy parts are pre-rendered into sprites once and each frame only
// composes them. A cheap two-step bloom gives the glow. Active only when <html> has .hw-boot.
(() => {
  if (!document.documentElement.classList.contains('hw-boot')) return;
  const splash = document.getElementById('splash');
  if (!splash) return;
  const W = 1280, H = 720, DUR = 8.0;
  const T_BLOW = 2.2, T_CUT = 2.5, T_COVER = 3.0, T_PUMPKIN = 3.12, T_RUSH = 4.25, T_FLASH = 4.62, T_WITCH = 4.95, T_LOGO = 6.15, T_BOLT = 7.0;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'hw-boot-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  splash.append(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });

  // ---------- helpers ----------
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const ss = (a, b, t) => { const u = clamp((t - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
  const lin = (a, b, t) => clamp((t - a) / (b - a), 0, 1);
  const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
  const easeIn = (u) => Math.pow(clamp(u, 0, 1), 3);
  const TAU = Math.PI * 2;
  let seed = 20261031;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 100000) / 100000; };
  const sprite = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };

  // ---------- sprites ----------
  const smoke = [0, 1, 2].map(() => sprite(320, 320, (g, w, h) => {
    g.filter = 'blur(22px)';
    for (let i = 0; i < 16; i++) {
      const r = 30 + rnd() * 60, x = w / 2 + (rnd() - .5) * 150, y = h / 2 + (rnd() - .5) * 110, c = 70 + rnd() * 40;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(${c},${c},${c},.5)`); grd.addColorStop(1, `rgba(${c},${c},${c},0)`);
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
  }));
  const whiteSmoke = smoke.map((c) => sprite(c.width, c.height, (g) => { g.filter = 'brightness(3.4)'; g.drawImage(c, 0, 0); }));
  const warmSmoke = smoke.map((c) => sprite(c.width, c.height, (g) => { g.filter = 'sepia(1) saturate(4) hue-rotate(-12deg) brightness(.9)'; g.drawImage(c, 0, 0); }));
  const ember = sprite(48, 48, (g) => {
    const grd = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    grd.addColorStop(0, 'rgba(255,236,170,1)'); grd.addColorStop(.18, 'rgba(255,150,40,.95)'); grd.addColorStop(.5, 'rgba(255,80,10,.25)'); grd.addColorStop(1, 'rgba(255,60,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 48, 48);
  });
  const mote = sprite(16, 16, (g) => {
    const grd = g.createRadialGradient(8, 8, 0, 8, 8, 8); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(.35, 'rgba(255,255,255,.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 16, 16);
  });
  const vignette = sprite(W, H, (g) => {
    const grd = g.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 820);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,.8)'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
  });
  const BAT_PATH = new Path2D('M32 11c-1.6-3.6-5-5.4-5-5.4s.9 3.4-.7 5.4c-2.8-2.6-8.3-3.6-12-1.8 2.8 1 4.6 2.9 4.6 5.6-3.7-1.8-8.3-.9-12 1.8 5.5 0 8.3 1.8 10.1 4.6 2.8-1.8 6.4-2.7 9.2-1.8 1.8.9 3.7 2.7 5.8 5.4 2.1-2.7 4-4.5 5.8-5.4 2.8-.9 6.4 0 9.2 1.8 1.8-2.8 4.6-4.6 10.1-4.6-3.7-2.7-8.3-3.6-12-1.8 0-2.7 1.8-4.6 4.6-5.6-3.7-1.8-9.2-.8-12 1.8-1.6-2-.7-5.4-.7-5.4S33.6 7.4 32 11Z');
  // eight wing positions (one flap as a vertical squash), black with a faint violet rim and glowing eyes
  const bats = [1, .9, .72, .5, .34, .5, .72, .9].map((k) => sprite(140, 70, (g) => {
    g.translate(70, 35); g.scale(2, 2 * k); g.translate(-32, -15);
    g.shadowColor = 'rgba(170,120,255,.7)'; g.shadowBlur = 5; g.fillStyle = '#040206'; g.fill(BAT_PATH);
    g.shadowBlur = 0; g.fillStyle = '#ff8a2a'; g.beginPath(); g.arc(30.4, 12.4, .9, 0, TAU); g.arc(33.6, 12.4, .9, 0, TAU); g.fill();
  }));
  // a full moon with craters and a halo
  const MOON_R = 175;
  const moon = sprite(MOON_R * 4, MOON_R * 4, (g) => {
    const c = MOON_R * 2;
    let grd = g.createRadialGradient(c, c, MOON_R * .9, c, c, MOON_R * 2); grd.addColorStop(0, 'rgba(255,214,160,.32)'); grd.addColorStop(1, 'rgba(180,120,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, c * 2, c * 2);
    grd = g.createRadialGradient(c - MOON_R * .3, c - MOON_R * .35, MOON_R * .1, c, c, MOON_R); grd.addColorStop(0, '#fff6dc'); grd.addColorStop(.6, '#f1d9a2'); grd.addColorStop(1, '#c79a5c');
    g.fillStyle = grd; g.beginPath(); g.arc(c, c, MOON_R, 0, TAU); g.fill();
    g.save(); g.clip(); g.fillStyle = 'rgba(150,105,60,.25)';
    for (let i = 0; i < 22; i++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * MOON_R * .9, r = 6 + rnd() * 30; g.beginPath(); g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, r, 0, TAU); g.fill(); }
    g.restore();
  });
  // lightning bolt with forks, pre-rendered with its glow
  const bolt = sprite(W, H, (g) => {
    const jag = (x, y, x2, y2, n, sp) => { const pts = [[x, y]]; for (let i = 1; i < n; i++) { const k = i / n; pts.push([x + (x2 - x) * k + (rnd() - .5) * sp, y + (y2 - y) * k + (rnd() - .5) * sp * .3]); } pts.push([x2, y2]); return pts; };
    const main = jag(820, -10, 700, 330, 18, 60), forks = [jag(...main[7], 900, 200, 7, 30), jag(...main[11], 610, 250, 6, 26)];
    const line = (pts, w) => { g.lineWidth = w; g.beginPath(); g.moveTo(...pts[0]); for (const q of pts.slice(1)) g.lineTo(...q); g.stroke(); };
    g.lineJoin = g.lineCap = 'round';
    g.shadowColor = 'rgba(190,150,255,1)'; g.shadowBlur = 30; g.strokeStyle = 'rgba(200,170,255,.6)'; line(main, 10); forks.forEach((f) => line(f, 5));
    g.shadowBlur = 8; g.strokeStyle = '#fbf7ff'; line(main, 2.8); forks.forEach((f) => line(f, 1.4));
  });
  // A cobweb anchored in the top-left corner; the other corners use mirrored copies.
  const web = sprite(340, 340, (g) => {
    const threads = 9, len = Array.from({ length: threads }, () => 250 + rnd() * 80), ang = Array.from({ length: threads }, (_, i) => (i / (threads - 1)) * Math.PI / 2 + (rnd() - .5) * .08);
    g.strokeStyle = 'rgba(210,210,210,.5)'; g.lineWidth = 1.1;
    for (let i = 0; i < threads; i++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(ang[i]) * len[i], Math.sin(ang[i]) * len[i]); g.stroke(); }
    g.lineWidth = .8;
    for (let k = 1; k <= 10; k++) {
      const r = k * 24 + rnd() * 6;
      g.beginPath();
      for (let i = 0; i < threads; i++) {
        if (r > len[i]) break;
        const x = Math.cos(ang[i]) * r, y = Math.sin(ang[i]) * r;
        if (i === 0) g.moveTo(x, y);
        else { const m = (ang[i] + ang[i - 1]) / 2, sag = r * .86; g.quadraticCurveTo(Math.cos(m) * sag, Math.sin(m) * sag, x, y); }
      }
      g.stroke();
    }
  });

  // ---------- jack-o'-lantern (pre-rendered at 2x: body, glowing face, light spill) ----------
  const PK = 2, PW = 640, PH = 600, PCX = 320, PCY = 330; // sprite size and pumpkin centre inside it (1x units)
  const facePath = (() => {
    const p = new Path2D();
    const eye = (s) => { p.moveTo(-108 * s, -42); p.lineTo(-24 * s, -8); p.quadraticCurveTo(-44 * s, 30, -82 * s, 20); p.quadraticCurveTo(-110 * s, 6, -108 * s, -42); p.closePath(); };
    eye(1); eye(-1);
    for (const s of [1, -1]) { p.moveTo(-3 * s, 24); p.lineTo(-17 * s, 52); p.lineTo(-2 * s, 48); p.closePath(); }
    // grin with jagged teeth: top edge zigzags down, bottom edge zigzags up
    const n = 14, top = [], bot = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = -118 + 236 * u, arc = Math.sin(u * Math.PI);
      top.push([x, 46 + arc * 26 + (i % 2 && i > 1 && i < n - 1 ? 20 : 0)]);
      bot.push([x, 46 + arc * 84 - (i % 2 === 0 && i > 2 && i < n - 2 ? 22 : 0)]);
    }
    top.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    for (let i = bot.length - 1; i >= 0; i--) p.lineTo(...bot[i]);
    p.closePath();
    return p;
  })();
  const pumpkinBody = sprite(PW * PK, PH * PK, (g) => {
    g.scale(PK, PK); g.translate(PCX, PCY);
    // stem
    let grd = g.createLinearGradient(-10, -175, 20, -110); grd.addColorStop(0, '#5a4a26'); grd.addColorStop(1, '#2a1d0c'); g.fillStyle = grd;
    g.beginPath(); g.moveTo(-14, -108); g.bezierCurveTo(-12, -140, 0, -168, 22, -182); g.bezierCurveTo(26, -178, 24, -170, 18, -166); g.bezierCurveTo(6, -150, 8, -130, 12, -106); g.closePath(); g.fill();
    // ribs, outer ones first so the centre rib sits on top
    for (const i of [-3, 3, -2, 2, -1, 1, 0]) {
      const cx = i * 31, rx = 66 - Math.abs(i) * 3, ry = 122 - Math.abs(i) * 8;
      grd = g.createRadialGradient(cx - 18, -48, 4, cx, 0, ry * 1.05);
      grd.addColorStop(0, '#e2741f'); grd.addColorStop(.45, '#b4480f'); grd.addColorStop(1, '#3d1203');
      g.fillStyle = grd; g.beginPath(); g.ellipse(cx, 0, rx, ry, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(40,10,0,.55)'; g.lineWidth = 2.5; g.stroke();
    }
    // darker top and bottom, then the carved holes (hollow, dark inside)
    g.globalCompositeOperation = 'source-atop';
    grd = g.createRadialGradient(0, 8, 70, 0, 8, 200); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,.6)');
    g.fillStyle = grd; g.fillRect(-200, -200, 400, 400);
    // glossy highlights on the upper ribs
    for (const i of [-2, -1, 0, 1, 2]) {
      grd = g.createRadialGradient(i * 31 - 14, -70, 1, i * 31 - 14, -70, 34);
      grd.addColorStop(0, 'rgba(255,214,150,.35)'); grd.addColorStop(1, 'rgba(255,214,150,0)');
      g.fillStyle = grd; g.fillRect(i * 31 - 60, -110, 92, 80);
    }
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#1a0500'; g.fill(facePath);
  });
  const pumpkinFace = sprite(PW * PK, PH * PK, (g) => {
    g.scale(PK, PK); g.translate(PCX, PCY);
    const grd = g.createRadialGradient(0, 30, 10, 0, 30, 150);
    grd.addColorStop(0, '#fff6c0'); grd.addColorStop(.45, '#ffc23e'); grd.addColorStop(1, '#ff7410');
    // the carved wall: a band of lit pumpkin flesh along the top of every cut-out, the bright inside below it
    g.shadowColor = 'rgba(255,140,30,.9)'; g.shadowBlur = 26;
    g.fillStyle = '#d9640f'; g.fill(facePath);
    g.shadowBlur = 0;
    g.save(); g.clip(facePath); g.translate(0, 7); g.fillStyle = grd; g.fill(facePath); g.restore();
    g.strokeStyle = 'rgba(255,190,90,.7)'; g.lineWidth = 1.5; g.stroke(facePath);
  });
  const pumpkinSpill = sprite(PW * PK, PH * PK, (g) => {
    g.scale(PK, PK); g.translate(PCX, PCY);
    g.drawImage(pumpkinBody, -PCX, -PCY, PW, PH);
    g.globalCompositeOperation = 'source-in';
    const grd = g.createRadialGradient(0, 30, 20, 0, 30, 170); grd.addColorStop(0, 'rgba(255,170,60,.85)'); grd.addColorStop(1, 'rgba(255,110,20,0)');
    g.fillStyle = grd; g.fillRect(-PCX, -PCY, PW, PH);
  });

  // ---------- logo: the Halloween edition of the H1T mark, cut out on transparency (build/cut-logos.cjs) ----------
  const logoImg = new Image();
  let logo = null, logoSoft = null;
  const SOFT_PAD = 60;
  // the drips hang below this row of the cut-out (letters end there); their tips drop droplets
  const DRIP_Y = 326;
  let dripTips = [];
  logoImg.onload = () => {
    logo = logoImg;
    try {
      const g = sprite(logoImg.width, logoImg.height, (gg) => gg.drawImage(logoImg, 0, 0)).getContext('2d'), d = g.getImageData(0, 0, logoImg.width, logoImg.height).data;
      const low = Array.from({ length: logoImg.width }, (_, x) => { for (let y = logoImg.height - 1; y > DRIP_Y; y--) if (d[(y * logoImg.width + x) * 4 + 3] > 140) return y; return 0; });
      for (let x = 3; x < low.length - 3; x++) if (low[x] > DRIP_Y + 40 && low[x] >= Math.max(...low.slice(x - 3, x + 4))) { if (!dripTips.length || x - dripTips[dripTips.length - 1][0] > 12) dripTips.push([x, low[x]]); }
      dripTips = dripTips.sort((p, q) => q[1] - p[1]).slice(0, 6);
    } catch { dripTips = []; }
    // the glow copy gets a margin so the blur is not clipped into a visible rectangle
    logoSoft = sprite(logoImg.width + SOFT_PAD * 2, logoImg.height + SOFT_PAD * 2, (g) => { g.filter = 'blur(16px) brightness(1.4)'; g.drawImage(logoImg, SOFT_PAD, SOFT_PAD); });
    warm([logo, logoSoft]);
  };
  logoImg.src = 'assets/h1t-logo-halloween.png';
  const purpleSmoke = smoke.map((c) => sprite(c.width, c.height, (g) => { g.filter = 'sepia(1) saturate(3) hue-rotate(225deg) brightness(.9)'; g.drawImage(c, 0, 0); }));

  // ---------- particles (state-free: position is a function of time) ----------
  const motes = Array.from({ length: 90 }, () => ({ x: rnd() * W, y: rnd() * H, v: 6 + rnd() * 16, d: (rnd() - .5) * 20, s: .2 + rnd() * .5, p: rnd() * TAU }));
  const embers = Array.from({ length: 70 }, () => ({ x: rnd() * W, y: rnd() * H, v: 30 + rnd() * 70, d: (rnd() - .5) * 30, s: .2 + rnd() * .45, p: rnd() * TAU }));
  const fog = Array.from({ length: 18 }, () => ({ x: rnd() * W, y: 520 + rnd() * 260, s: 1.2 + rnd() * 1.6, v: 8 + rnd() * 18, a: .25 + rnd() * .35, k: (rnd() * 3) | 0, p: rnd() * TAU }));
  const clouds = Array.from({ length: 22 }, () => ({ x: rnd() * W, y: rnd() * H, s: 1.4 + rnd() * 2, v: (rnd() - .5) * 30, a: .25 + rnd() * .35, k: (rnd() * 3) | 0, p: rnd() * TAU }));
  const dust = Array.from({ length: 300 }, () => { const a = rnd() * TAU, r = 60 + Math.pow(rnd(), .6) * 620; return { a, r, v: 20 + rnd() * 90, s: .12 + rnd() * .4, p: rnd() * TAU }; });
  const burstPuffs = Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * TAU + rnd() * .4, d: 20 + rnd() * 60, v: 120 + rnd() * 180, s: .9 + rnd() * .9, k: i % 3 }));
  const streaks = Array.from({ length: 70 }, () => ({ a: rnd() * TAU, r: .2 + rnd() * .5, l: .15 + rnd() * .35, w: 1 + rnd() * 3 }));

  // ---------- scene 1: ghost ----------
  function ghostPath(R, wave, flare) {
    const p = new Path2D(), hemY = 270, hw = R * (1.8 + flare);
    p.moveTo(-R, 0); p.arc(0, 0, R, Math.PI, 0);
    p.bezierCurveTo(R * 1.12, 70, hw * .9, 150, hw, hemY + Math.sin(wave) * 10);
    // hem: soft hanging lobes of cloth that sway
    const n = 6;
    for (let i = 1; i <= n; i++) {
      const u = i / n, x = hw - u * hw * 2, y = hemY - 6 + Math.sin(wave + u * 7) * (6 + flare * 30);
      const cx = hw - (u - .5 / n) * hw * 2, cy = hemY + 22 + Math.cos(wave * 1.3 + u * 5) * 6 + flare * 20;
      p.quadraticCurveTo(cx, cy, x, y);
    }
    p.bezierCurveTo(-hw * .9, 150, -R * 1.12, 70, -R, 0);
    p.closePath();
    return p;
  }
  function drawGhost(t, x, y, s, rot, flare, a) {
    if (a <= 0) return;
    const R = 62, path = ghostPath(R, t * 3.2, flare);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.shadowColor = 'rgba(215,195,255,.55)'; ctx.shadowBlur = 36;
    let grd = ctx.createRadialGradient(-R * .35, -R * .45, 4, 0, 90, 420);
    grd.addColorStop(0, '#ffffff'); grd.addColorStop(.4, '#ebe8f2'); grd.addColorStop(1, '#9b93b4');
    ctx.fillStyle = grd; ctx.fill(path); ctx.shadowBlur = 0;
    ctx.clip(path);
    // soft folds hanging from the head and shading towards the sides
    ctx.lineCap = 'round';
    for (const [fx, sway] of [[-.55, -1], [-.15, .6], [.3, -.4], [.7, 1]]) {
      for (const [w, al] of [[26, .05], [12, .07], [4, .08]]) {
        ctx.strokeStyle = `rgba(0,0,0,${al})`; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(fx * R * .7, R * .55);
        ctx.quadraticCurveTo(fx * R * 1.3 + Math.sin(t * 2 + fx * 3) * 8 * sway, 160, fx * R * (2.1 + flare), 262); ctx.stroke();
      }
    }
    grd = ctx.createLinearGradient(-R * 1.6, 0, R * 1.6, 0);
    grd.addColorStop(0, 'rgba(30,10,60,.34)'); grd.addColorStop(.3, 'rgba(30,10,60,0)'); grd.addColorStop(.7, 'rgba(30,10,60,0)'); grd.addColorStop(1, 'rgba(30,10,60,.38)');
    ctx.fillStyle = grd; ctx.fillRect(-R * 4, -R * 2, R * 8, 460);
    // the hem catches light from below
    grd = ctx.createLinearGradient(0, 200, 0, 290); grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(1, 'rgba(255,255,255,.4)');
    ctx.fillStyle = grd; ctx.fillRect(-R * 4, 215, R * 8, 80);
    // light from above: a bright cap on the head and a faint glow coming through the cloth
    grd = ctx.createRadialGradient(-R * .2, -R * .9, 2, -R * .2, -R * .6, R * 1.3);
    grd.addColorStop(0, 'rgba(255,255,255,.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd; ctx.fillRect(-R * 2, -R * 2, R * 4, R * 3);
    // eyes, blinking once: soft-edged holes with a faint inner shadow
    const blink = t > 1.55 && t < 1.72 ? Math.abs(Math.cos(((t - 1.55) / .17) * Math.PI)) : 1;
    for (const sx of [-1, 1]) {
      const ex = sx * R * .33, ey = -R * .02, ry = R * .21 * blink + .5;
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(ex, ey + 2, R * .17, ry + 3, 0, 0, TAU); ctx.fill();
      grd = ctx.createRadialGradient(ex, ey - ry * .4, 1, ex, ey, R * .2); grd.addColorStop(0, '#2a2a2a'); grd.addColorStop(1, '#070707');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.ellipse(ex, ey, R * .14, ry, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- scene 2: the blown-off sheet as a fluttering cloth mesh ----------
  const NU = 30, NV = 34, F = 900;
  // The cloth is rendered at 3/4 resolution into its own canvas, then glows as one piece on the stage.
  const clothCanvas = document.createElement('canvas'), cc = clothCanvas.getContext('2d');
  const LIGHT = (() => { const v = [-.35, -.55, -.75], l = Math.hypot(...v); return v.map((c) => c / l); })();
  const verts = Array.from({ length: (NU + 1) * (NV + 1) }, () => [0, 0, 0, 0, 0]);
  const quads = Array.from({ length: NU * NV }, (_, q) => ({ i: q % NU, j: (q / NU) | 0, z: 0 }));
  const shade = new Float32Array((NU + 1) * (NV + 1));
  function drawCloth(t, cx, cy, cz, sw, sh, rx, ry, rz, amp, a) {
    if (a <= 0) return;
    const crx = Math.cos(rx), srx = Math.sin(rx), cry = Math.cos(ry), sry = Math.sin(ry), crz = Math.cos(rz), srz = Math.sin(rz);
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
      const u = i / NU, v = j / NV, vt = verts[j * (NU + 1) + i];
      // the free edges ripple a little in the plane too, so the outline never looks like a stiff rectangle
      const edge = Math.max(Math.abs(u - .5), Math.abs(v - .5)) * 2;
      let X = (u - .5) * sw + Math.sin(v * 7 - t * 9) * 10 * edge * amp, Y = (v - .5) * sh + Math.sin(u * 6.5 - t * 8) * 12 * edge * amp;
      let Z = (Math.sin(u * 5.2 - t * 10 + v * 1.8) * 40 * (.35 + u * .65) + Math.sin(v * 4.4 + u * 2.4 - t * 7) * 24) * amp;
      [X, Y] = [X * crz - Y * srz, X * srz + Y * crz];
      [Y, Z] = [Y * crx - Z * srx, Y * srx + Z * crx];
      [X, Z] = [X * cry + Z * sry, -X * sry + Z * cry];
      const wx = cx - W / 2 + X, wy = cy - H / 2 + Y, wz = cz + Z, k = F / Math.max(60, F + wz);
      vt[0] = W / 2 + wx * k; vt[1] = H / 2 + wy * k; vt[2] = wx; vt[3] = wy; vt[4] = wz;
    }
    // per-vertex brightness from the averaged surface normal, so neighbouring facets blend into each other
    const V = (i, j) => verts[clamp(j, 0, NV) * (NU + 1) + clamp(i, 0, NU)];
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
      const l = V(i - 1, j), r = V(i + 1, j), d = V(i, j - 1), b = V(i, j + 1);
      const ax = r[2] - l[2], ay = r[3] - l[3], az = r[4] - l[4], bx = b[2] - d[2], by = b[3] - d[3], bz = b[4] - d[4];
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, nl = Math.hypot(nx, ny, nz) || 1;
      shade[j * (NU + 1) + i] = 120 + 135 * Math.pow(Math.abs((nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / nl), .75);
    }
    for (const q of quads) { const a0 = verts[q.j * (NU + 1) + q.i], a1 = verts[(q.j + 1) * (NU + 1) + q.i + 1]; q.z = a0[4] + a1[4]; }
    quads.sort((p, q) => q.z - p.z);
    const cw = Math.round(canvas.width * .75), ch = Math.round(canvas.height * .75);
    if (clothCanvas.width !== cw || clothCanvas.height !== ch) { clothCanvas.width = cw; clothCanvas.height = ch; }
    cc.setTransform(1, 0, 0, 1, 0, 0); cc.clearRect(0, 0, clothCanvas.width, clothCanvas.height);
    cc.setTransform(fitS * .75, 0, 0, fitS * .75, fitX * .75, fitY * .75); cc.lineJoin = 'round'; cc.lineWidth = 1.4;
    for (const q of quads) {
      const p00 = verts[q.j * (NU + 1) + q.i], p10 = verts[q.j * (NU + 1) + q.i + 1], p01 = verts[(q.j + 1) * (NU + 1) + q.i], p11 = verts[(q.j + 1) * (NU + 1) + q.i + 1];
      const k0 = q.j * (NU + 1) + q.i, k1 = k0 + NU + 1;
      const cl = ((shade[k0] + shade[k1]) / 2) | 0, cr = ((shade[k0 + 1] + shade[k1 + 1]) / 2) | 0;
      const g = cc.createLinearGradient((p00[0] + p01[0]) / 2, (p00[1] + p01[1]) / 2, (p10[0] + p11[0]) / 2, (p10[1] + p11[1]) / 2);
      g.addColorStop(0, `rgb(${cl * .95 | 0},${cl * .93 | 0},${cl})`); g.addColorStop(1, `rgb(${cr * .95 | 0},${cr * .93 | 0},${cr})`);
      cc.fillStyle = cc.strokeStyle = g;
      cc.beginPath(); cc.moveTo(p00[0], p00[1]); cc.lineTo(p10[0], p10[1]); cc.lineTo(p11[0], p11[1]); cc.lineTo(p01[0], p01[1]); cc.closePath();
      cc.fill(); cc.stroke();
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a;
    if (hq) { ctx.shadowColor = 'rgba(255,255,255,.35)'; ctx.shadowBlur = 30; }
    ctx.drawImage(clothCanvas, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  // A gust of wind: thin bright streaks sweeping right to left across the ghost.
  const gusts = Array.from({ length: 26 }, () => ({ y: 120 + rnd() * 420, l: 160 + rnd() * 320, d: rnd() * .25, v: 2600 + rnd() * 1400, w: .6 + rnd() * 1.6 }));
  function drawGust(t) {
    const u0 = t - (T_BLOW - .05); if (u0 < 0 || u0 > .75) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const g of gusts) {
      const u = u0 - g.d; if (u < 0) continue;
      const x = W + 200 - g.v * u, y = g.y + Math.sin(x * .006) * 18;
      const grd = ctx.createLinearGradient(x, 0, x + g.l, 0); grd.addColorStop(0, 'rgba(255,255,255,.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grd; ctx.lineWidth = g.w; ctx.globalAlpha = clamp(1 - u0 / .75, 0, 1);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + g.l / 2, y - 10, x + g.l, y); ctx.stroke();
    }
    ctx.restore();
  }
  // Full-screen sheet used while it covers the camera, then slides off to the right with a wavy edge.
  function drawSheetCover(t, edge, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    const rim = new Path2D(), path = new Path2D();
    for (let y = -20; y <= H + 20; y += 40) { const x = edge + Math.sin(y * .011 + t * 7) * 46 + Math.sin(y * .03 - t * 11) * 12; rim.lineTo(x, y); path.lineTo(x, y); }
    path.lineTo(W + 400, H + 20); path.lineTo(W + 400, -20); path.closePath();
    // a soft shadow the sheet throws on the scene it uncovers
    ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,.18)';
    for (const w of [110, 70, 36]) { ctx.lineWidth = w; ctx.stroke(rim); }
    let grd = ctx.createLinearGradient(edge, 0, edge + 900, H);
    grd.addColorStop(0, '#eeebf5'); grd.addColorStop(.25, '#bbb5cc'); grd.addColorStop(.5, '#dedaea'); grd.addColorStop(.8, '#a49cba'); grd.addColorStop(1, '#d2cde0');
    ctx.fillStyle = grd; ctx.fill(path);
    // long diagonal folds moving with the cloth
    ctx.clip(path);
    for (let k = 0; k < 5; k++) {
      const x = edge + 120 + k * 260 + Math.sin(t * 3 + k) * 40;
      grd = ctx.createLinearGradient(x - 70, 0, x + 70, 0);
      grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(.5, k % 2 ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.12)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd; ctx.save(); ctx.translate(x, H / 2); ctx.rotate(.35); ctx.translate(-x, -H / 2); ctx.fillRect(x - 70, -200, 140, H + 400); ctx.restore();
    }
    ctx.restore();
  }

  // ---------- scene 3: pumpkin ----------
  function drawPumpkinScene(t, rush) {
    let grd = ctx.createRadialGradient(W / 2, 390, 40, W / 2, 390, 760);
    grd.addColorStop(0, '#3a1a07'); grd.addColorStop(.5, '#170802'); grd.addColorStop(1, '#060201');
    ctx.fillStyle = grd; ctx.fillRect(-40, -40, W + 80, H + 80);
    ctx.globalAlpha = .35; ctx.drawImage(web, 0, 0); ctx.save(); ctx.translate(0, H); ctx.scale(1, -1); ctx.drawImage(web, 0, 0); ctx.restore(); ctx.globalAlpha = 1;
    // lantern: a slow push-in, then the rush into the grin (with a few trailing copies as zoom blur)
    const zoom = (k) => (1 + .14 * ss(T_PUMPKIN, T_RUSH, t)) * (1 + 9 * easeIn(clamp(k, 0, 1)));
    const ru = lin(T_RUSH, T_FLASH, t), z = zoom(ru);
    const place = (zz) => { const w = PW * zz, h = PH * zz; return [W / 2 - PCX * zz, 360 - PCY * zz - 60 * rush, w, h]; };
    const [x0, y0, w, h] = place(z), cx = W / 2, cy = 360;
    // ground: a soft contact shadow and a warm pool of light
    if (rush < .3) {
      grd = ctx.createRadialGradient(cx, cy + 118 * z, 4, cx, cy + 118 * z, 190 * z);
      grd.addColorStop(0, 'rgba(0,0,0,.65)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.translate(cx, cy + 118 * z); ctx.scale(1, .18); ctx.translate(-cx, -(cy + 118 * z)); ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H * 6); ctx.restore();
    }
    ctx.drawImage(pumpkinBody, x0, y0, w, h);
    const light = ss(T_PUMPKIN + .5, T_PUMPKIN + .78, t) * (.82 + .1 * Math.sin(t * 23) + .08 * Math.sin(t * 9.7)) + .3 * rush;
    // the face is carved first: glowing knife lines trace every cut, then the candle catches
    const carve = lin(T_PUMPKIN + .14, T_PUMPKIN + .56, t), carveA = carve > 0 ? 1 - ss(T_PUMPKIN + .55, T_PUMPKIN + .8, t) : 0;
    if (carveA > 0) {
      ctx.save(); ctx.translate(x0 + PCX * z, y0 + PCY * z); ctx.scale(z, z); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.setLineDash([carve * 760, 760]);
      ctx.globalAlpha = carveA * .35; ctx.strokeStyle = '#ff8a2a'; ctx.lineWidth = 9; ctx.stroke(facePath);
      ctx.globalAlpha = carveA; ctx.strokeStyle = '#ffe2a8'; ctx.lineWidth = 2.6; ctx.stroke(facePath);
      ctx.restore();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp(light * .3, 0, 1); ctx.drawImage(pumpkinSpill, x0, y0, w, h);
    ctx.globalAlpha = clamp(light * .92, 0, 1); ctx.drawImage(pumpkinFace, x0, y0, w, h);
    if (ru > 0) for (const lag of [.06, .12]) { const [bx, by, bw, bh] = place(zoom(ru - lag)); ctx.globalAlpha = .35 * ru; ctx.drawImage(pumpkinFace, bx, by, bw, bh); }
    // the candle flame inside, seen through the cut-outs
    if (light > .05 && ru < .5) {
      ctx.save(); ctx.translate(x0 + PCX * z, y0 + PCY * z); ctx.scale(z, z); ctx.clip(facePath);
      const fl = 1 + .18 * Math.sin(t * 31) + .1 * Math.sin(t * 17 + 1), sway = Math.sin(t * 9) * 4;
      ctx.translate(sway * .4, 92); ctx.scale(1, fl);
      const fg = ctx.createRadialGradient(0, -22, 2, 0, -18, 46); fg.addColorStop(0, 'rgba(255,255,235,1)'); fg.addColorStop(.35, 'rgba(255,214,120,.9)'); fg.addColorStop(1, 'rgba(255,120,20,0)');
      ctx.globalAlpha = clamp(light, 0, 1); ctx.fillStyle = fg;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-16, -14, -12, -40, sway, -62); ctx.bezierCurveTo(12, -40, 16, -14, 0, 0); ctx.fill();
      ctx.restore();
    }
    grd = ctx.createRadialGradient(cx, cy + 40 * z, 10, cx, cy + 40 * z, 260 * z); grd.addColorStop(0, `rgba(255,130,30,${.1 * light})`); grd.addColorStop(1, 'rgba(255,90,10,0)');
    ctx.globalAlpha = 1; ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // smoke curling up from the lid, lit orange from below
    const sm = ss(T_PUMPKIN + .6, T_PUMPKIN + 1, t) * (1 - rush);
    if (sm > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 5; i++) {
        const k = ((t - T_PUMPKIN) * .55 + i / 5) % 1, sz = (50 + 140 * k) * z;
        ctx.globalAlpha = sm * .32 * Math.sin(k * Math.PI); ctx.drawImage(warmSmoke[i % 3], cx + (Math.sin(k * 5 + i) * 26 - 10) * z - sz / 2, y0 + (PCY - 150 - 190 * k) * z - sz / 2, sz, sz);
      }
      ctx.restore();
    }
    // warm fog drifting along the ground
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (const f of fog) {
      const s = 320 * f.s, x = ((f.x + t * f.v) % (W + 500)) - 250;
      ctx.globalAlpha = f.a * .45 * (1 - rush); ctx.drawImage(warmSmoke[f.k], x - s / 2, f.y - s / 2 + Math.sin(t + f.p) * 8, s, s * .6);
    }
    ctx.restore();
  }
  function drawRush(t) {
    const u = lin(T_RUSH + .08, T_FLASH, t); if (u <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const s of streaks) {
      const r0 = (s.r + u * 1.4) * 700, r1 = r0 + s.l * 700 * (.4 + u);
      ctx.globalAlpha = u * .7; ctx.strokeStyle = '#ffc070'; ctx.lineWidth = s.w * (1 + u * 2);
      ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(s.a) * r0, H / 2 + Math.sin(s.a) * r0); ctx.lineTo(W / 2 + Math.cos(s.a) * r1, H / 2 + Math.sin(s.a) * r1); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- scene 4: burst and skeleton ----------
  function drawFogBackdrop(t, a) {
    const grd = ctx.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#120a20'); grd.addColorStop(1, '#06030b');
    ctx.fillStyle = grd; ctx.fillRect(-40, -40, W + 80, H + 80);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (const c of clouds) {
      const s = 320 * c.s, x = ((c.x + t * c.v + W + 600) % (W + 600)) - 300, y = c.y + Math.sin(t * .5 + c.p) * 14;
      ctx.globalAlpha = c.a * a; ctx.drawImage(purpleSmoke[c.k], x - s / 2, y - s / 2, s, s * .7);
    }
    ctx.restore();
  }
  function drawBurst(t) {
    const u = t - T_FLASH; if (u < 0 || u > 1.6) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // white core that tears apart into puffs
    const core = (1 - lin(0, .4, u)) ** 2;
    if (core > 0) {
      const r = 160 + 140 * easeOut(u / .4), grd = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r);
      grd.addColorStop(0, `rgba(255,255,255,${core})`); grd.addColorStop(.6, `rgba(255,255,255,${core * .9})`); grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    }
    for (const p of burstPuffs) {
      const k = easeOut(u / 1.2), d = p.d + p.v * k * 1.4, s = 200 * p.s * (1 + k);
      ctx.globalAlpha = clamp(1 - u / .8, 0, 1) ** 1.5 * .4;
      ctx.drawImage(whiteSmoke[p.k], W / 2 + Math.cos(p.a) * d - s / 2, H / 2 + Math.sin(p.a) * d * .7 - s / 2, s, s);
    }
    ctx.restore();
  }
  function drawDust(t, a) {
    if (a <= 0) return;
    const u = Math.max(0, t - T_FLASH);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of dust) {
      const r = p.r * (.55 + .45 * easeOut(u / .9)) + p.v * u * .3, x = W / 2 + Math.cos(p.a) * r, y = H / 2 + Math.sin(p.a) * r * .62 - u * 6;
      const s = 16 * p.s;
      ctx.globalAlpha = a * (.35 + .65 * Math.abs(Math.sin(t * 2.4 + p.p)));
      ctx.drawImage(mote, x - s / 2, y - s / 2, s, s);
    }
    ctx.restore();
  }
  // ---------- act 4: a witch on her broom crosses the full moon, a swarm of bats behind her ----------
  const MOON_X = 880, MOON_Y = 300;
  const witchCanvas = document.createElement('canvas'), wg = witchCanvas.getContext('2d');
  const bristles = Array.from({ length: 16 }, (_, i) => [118 + rnd() * 14, (i - 7.5) * 3.1 + (rnd() - .5) * 2]);
  const swarm = Array.from({ length: 22 }, () => ({ d: .04 + rnd() * .3, ox: (rnd() - .5) * 220, oy: (rnd() - .5) * 170, z: .35 + rnd() * .6, f: rnd() * 8 }));
  const witchPos = (u) => [1480 - 1800 * u, 392 - 118 * Math.sin(u * Math.PI) + 14 * Math.sin(u * 13)];
  function drawMoon(t) {
    const a = ss(T_FLASH + .25, T_WITCH + .35, t) * (1 - ss(T_LOGO - .2, T_LOGO + .5, t)); if (a <= 0) return;
    const rise = 30 * (1 - easeOut(lin(T_FLASH + .25, T_WITCH + .6, t)));
    ctx.save(); ctx.globalAlpha = a; ctx.drawImage(moon, MOON_X - MOON_R * 2, MOON_Y - MOON_R * 2 + rise); ctx.restore();
  }
  function witchShape(g, t) {
    // local coordinates: facing left, broom along x
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = g.fillStyle = '#050208';
    g.lineWidth = 4.5; g.beginPath(); g.moveTo(-104, 4); g.lineTo(64, 13); g.stroke();
    g.lineWidth = 1.7; for (const [bx, by] of bristles) { g.beginPath(); g.moveTo(60, 13); g.quadraticCurveTo(90, 13 + by * .5, bx, 13 + by + Math.sin(t * 20 + by) * 1.5); g.stroke(); }
    g.lineWidth = 6; g.beginPath(); g.moveTo(58, 9); g.lineTo(64, 17); g.stroke();
    // flowing cape
    const w1 = Math.sin(t * 9), w2 = Math.sin(t * 8 + 1.7), w3 = Math.sin(t * 11 + .6);
    g.beginPath(); g.moveTo(-6, -34); g.bezierCurveTo(26, -44 + w1 * 4, 62, -36 + w2 * 7, 98 + w3 * 6, -16 + w1 * 8);
    g.bezierCurveTo(80, -8 + w2 * 5, 58, 2 + w3 * 4, 30, 2); g.lineTo(6, 2); g.closePath(); g.fill();
    // body, leg and pointed boot, arm on the broom
    g.beginPath(); g.moveTo(-4, 4); g.lineTo(24, 4); g.lineTo(14, -34); g.lineTo(-10, -30); g.closePath(); g.fill();
    g.lineWidth = 7; g.beginPath(); g.moveTo(10, 4); g.lineTo(-16, 12); g.lineTo(-22, 28); g.stroke();
    g.beginPath(); g.moveTo(-18, 24); g.lineTo(-30, 30); g.lineTo(-40, 26); g.lineTo(-24, 32); g.closePath(); g.lineWidth = 2; g.stroke(); g.fill();
    g.lineWidth = 5; g.beginPath(); g.moveTo(-4, -26); g.lineTo(-36, 3); g.stroke();
    // head with a long crooked nose and chin, hair streaming back
    g.beginPath(); g.arc(-10, -42, 9, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-16, -46); g.lineTo(-31, -38); g.lineTo(-17, -40); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-14, -36); g.lineTo(-20, -30); g.lineTo(-10, -34); g.closePath(); g.fill();
    g.lineWidth = 1.6; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-4, -46 + i * 2.5); g.quadraticCurveTo(16, -48 + i * 3 + w1 * 3, 34 + i * 3, -40 + i * 4 + w2 * 4); g.stroke(); }
    // hat: wide brim and a tall cone that flops back at the tip
    g.beginPath(); g.ellipse(-8, -50, 22, 3.6, -.16, 0, TAU); g.fill();
    const tip = w3 * 4;
    g.beginPath(); g.moveTo(-20, -50); g.quadraticCurveTo(-4, -70, 12, -84); g.quadraticCurveTo(24 + tip, -96, 36 + tip, -90); g.quadraticCurveTo(22, -86, 18, -78); g.quadraticCurveTo(10, -64, 4, -51); g.closePath(); g.fill();
  }
  function drawWitch(t) {
    const u = lin(T_WITCH, T_WITCH + 1.5, t); if (u <= 0 || u >= 1) return;
    // the bat swarm trails her, wings flapping
    for (const b of swarm) {
      const q = u - b.d; if (q <= 0) continue;
      const [bx, by] = witchPos(q), w = 70 * b.z, h = 35 * b.z;
      ctx.drawImage(bats[((t * 24 + b.f) | 0) % bats.length], bx + b.ox * (.4 + q) - w / 2, by + b.oy * (.4 + q) - h / 2 + Math.sin(t * 9 + b.f) * 6, w, h);
    }
    // the witch: drawn into her own layer so the violet rim glow is a single blur
    const [x, y] = witchPos(u), [nx, ny] = witchPos(u + .01), slope = -Math.atan2(ny - y, x - nx) * .8; // nose dips when she descends
    if (witchCanvas.width !== canvas.width || witchCanvas.height !== canvas.height) { witchCanvas.width = canvas.width; witchCanvas.height = canvas.height; }
    wg.setTransform(1, 0, 0, 1, 0, 0); wg.clearRect(0, 0, witchCanvas.width, witchCanvas.height);
    wg.setTransform(fitS, 0, 0, fitS, fitX, fitY); wg.translate(x, y); wg.rotate(slope); wg.scale(1.35, 1.35);
    witchShape(wg, t);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (hq) { ctx.shadowColor = 'rgba(190,140,255,.75)'; ctx.shadowBlur = 10 * fitS; }
    ctx.drawImage(witchCanvas, 0, 0); ctx.restore();
  }

  // ---------- scene 5: logo ----------
  function drawLogo(t) {
    if (!logo) return;
    const a = ss(T_LOGO, T_LOGO + .8, t); if (a <= 0) return;
    const sharp = ss(T_LOGO + .35, T_LOGO + 1.1, t), sc = 1.08 - .08 * easeOut(lin(T_LOGO, T_LOGO + 1.75, t));
    const lw = 700 * sc, f = lw / logo.width, lh = logo.height * f, x0 = W / 2 - lw / 2, y0 = 345 - lh / 2;
    ctx.save();
    const grd = ctx.createRadialGradient(W / 2, 345, 40, W / 2, 345, 700); grd.addColorStop(0, `rgba(120,60,190,${.3 * a})`); grd.addColorStop(1, 'rgba(60,20,110,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    // bats burst out from behind the logo
    const bu = lin(T_LOGO + .2, T_LOGO + 1.7, t);
    if (bu > 0 && bu < 1) for (const b of logoBats) {
      const q = Math.max(0, bu - b.d), d = 150 + q * b.v, w = 90 * b.z * (1 + q), h = 45 * b.z * (1 + q);
      ctx.globalAlpha = clamp(q * 8, 0, 1) * (1 - ss(.7, 1, bu)); ctx.drawImage(bats[((t * 26 + b.f) | 0) % bats.length], W / 2 + Math.cos(b.a) * d - w / 2, 345 + Math.sin(b.a) * d * .7 - q * 80 - h / 2, w, h);
    }
    ctx.globalAlpha = 1;
    // lightning behind the logo
    const flash = Math.exp(-(((t - T_BOLT) / .04) ** 2)) + .6 * Math.exp(-(((t - T_BOLT - .13) / .035) ** 2));
    if (flash > .01) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(flash, 0, 1); ctx.drawImage(bolt, 0, 0); ctx.globalAlpha = clamp(flash, 0, 1) * .22; ctx.fillStyle = '#d8c8ff'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    // it condenses out of the smoke: a blurred copy first, then the sharp artwork
    ctx.globalAlpha = a * (1 - sharp * .7); ctx.drawImage(logoSoft, x0 - SOFT_PAD * f, y0 - SOFT_PAD * f, logoSoft.width * f, logoSoft.height * f);
    // the sharp mark; the drips below the letters run down slowly
    const drip = .15 + .85 * ss(T_LOGO + .3, T_LOGO + 1.5, t) + .22 * ss(T_LOGO + 1.5, DUR, t);
    const drawMark = () => {
      ctx.drawImage(logo, 0, 0, logo.width, DRIP_Y, x0, y0, lw, DRIP_Y * f);
      ctx.drawImage(logo, 0, DRIP_Y, logo.width, logo.height - DRIP_Y, x0, y0 + DRIP_Y * f, lw, (logo.height - DRIP_Y) * f * drip);
    };
    ctx.globalAlpha = sharp; drawMark();
    // the glowing edges breathe, and flare up with the lightning
    const pulse = ss(T_LOGO + 1, T_LOGO + 1.5, t) * (.12 + .08 * Math.sin(t * 5) + .04 * Math.sin(t * 13)) + .7 * clamp(flash, 0, 1);
    if (pulse > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(pulse, 0, 1); drawMark(); }
    ctx.restore();
    // droplets falling from the drip tips
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    dripTips.forEach(([dx, dy], i) => {
      const t0 = T_LOGO + 1.45 + i * .23, period = 1.25 + i * .11, k = t < t0 ? -1 : ((t - t0) % period) / period; if (k < 0) return;
      const px = x0 + dx * f, py = y0 + (DRIP_Y + (dy - DRIP_Y) * drip) * f + 4 + 260 * k * k, al = 1 - k;
      const g2 = ctx.createRadialGradient(px, py, 0, px, py, 6); g2.addColorStop(0, `rgba(255,170,70,${al})`); g2.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(px, py, 3.4, 5 + 6 * k, 0, 0, TAU); ctx.fill();
    });
    ctx.restore();
    // HAPPY HALLOWEEN, NAME
    const tx = ss(T_LOGO + .9, T_LOGO + 1.5, t);
    if (tx > 0) {
      ctx.save(); ctx.globalAlpha = tx; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '800 18px "Segoe UI", system-ui, sans-serif';
      ctx.shadowColor = 'rgba(255,120,20,.9)'; ctx.shadowBlur = 14; ctx.fillStyle = '#ffb35a';
      const text = greeting(), sp = 7, widths = [...text].map((ch) => ctx.measureText(ch).width), total = widths.reduce((s2, w) => s2 + w + sp, -sp);
      let x = W / 2 - total / 2;
      [...text].forEach((ch, i) => { ctx.fillText(ch, x + widths[i] / 2, 612 + (1 - tx) * 8); x += widths[i] + sp; });
      ctx.restore();
    }
    // purple fog drifting in front along the bottom
    drawGroundFog(t, .5 * a);
  }
  const logoBats = Array.from({ length: 16 }, () => ({ a: -Math.PI / 2 + (rnd() - .5) * 3.2, v: 260 + rnd() * 520, z: .45 + rnd() * .6, d: rnd() * .25, f: rnd() * 8 }));
  // "HAPPY HALLOWEEN, NAME": the signed-in account (cached from the last start, updated by the account UI)
  let bootName = '';
  try { bootName = localStorage.getItem('h1tBootName') || ''; } catch { /* no storage */ }
  const greeting = () => { const n = bootName.replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 18).toUpperCase(); return n ? `HAPPY HALLOWEEN, ${n}` : 'HAPPY HALLOWEEN'; };
  // purple fog rolling along the ground
  function drawGroundFog(t, a, lift = 0) {
    if (a <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (const f of fog) {
      const s = 320 * f.s, x = ((f.x + t * f.v * 1.5) % (W + 500)) - 250;
      ctx.globalAlpha = f.a * a; ctx.drawImage(purpleSmoke[f.k], x - s / 2, f.y + 40 - lift - s / 2 + Math.sin(t + f.p) * 8, s, s * .6);
    }
    ctx.restore();
  }
  function drawMotes(t, a, img, list, size) {
    if (a <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of list) {
      let y = (p.y - t * p.v) % (H + 40); if (y < -20) y += H + 40;
      const x = (p.x + t * p.d + Math.sin(t * 1.7 + p.p) * 12 + W) % W, s = size * p.s;
      ctx.globalAlpha = a * (.4 + .6 * Math.abs(Math.sin(t * 2.6 + p.p)));
      ctx.drawImage(img, x - s / 2, y - s / 2, s, s);
    }
    ctx.restore();
  }

  // ---------- sound (synthesized, no audio files) ----------
  // Wind and a ghostly "whooo", the sheet flapping, the knife carving, the candle catching and crackling, a riser
  // into the white burst, the witch's cackle with squeaking bats, an organ chord for the logo and rolling thunder.
  // Off with the "Startanimation > Sound" switch in the settings (localStorage h1tBootSound = '0') and with reduced motion.
  let audio = null;
  function startSound(startMs) {
    try { if (reduced || localStorage.getItem('h1tBootSound') === '0') return; } catch { /* no storage: play */ }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ac = new AC(), out = buildSound(ac, ac.currentTime - (performance.now() - startMs) / 1000 + .03);
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    audio = { ac, out };
  }
  function buildSound(ac, base) {
    const out = ac.createGain(), limiter = ac.createDynamicsCompressor(), verb = ac.createConvolver(), wet = ac.createGain();
    limiter.threshold.value = -6; limiter.knee.value = 4; limiter.ratio.value = 12; limiter.attack.value = .002; limiter.release.value = .2;
    out.gain.value = .5; out.connect(limiter).connect(ac.destination); wet.gain.value = .4; verb.connect(wet).connect(out);
    // a big dark hall
    const ir = ac.createBuffer(2, ac.sampleRate * 2.4, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6); }
    verb.buffer = ir;
    const noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const at = (t) => Math.max(ac.currentTime, base + t);
    const send = (node, amount) => { node.connect(out); if (amount) { const s2 = ac.createGain(); s2.gain.value = amount; node.connect(s2).connect(verb); } };
    const shape = (g, t0, pts) => { g.gain.setValueAtTime(0, t0); for (const [dt, v] of pts) g.gain.linearRampToValueAtTime(v, t0 + dt); };
    const env = (g, t0, peak, dur, attack = .004) => { g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + attack); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); };
    const noiseSrc = (t0, dur) => { const src = ac.createBufferSource(); src.buffer = noise; src.loop = true; src.start(t0, Math.random() * 1.5); src.stop(t0 + dur + .05); return src; };
    const hiss = (t, dur, type, f0, f1, q, peak, rv = .3, attack = .004) => {
      const t0 = at(t), f = ac.createBiquadFilter(), g = ac.createGain();
      f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      env(g, t0, peak, dur, attack); noiseSrc(t0, dur).connect(f).connect(g); send(g, rv);
    };
    const boom = (t, f0, f1, dur, peak, rv = .5) => {
      const o = ac.createOscillator(), g = ac.createGain(), t0 = at(t); o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      env(g, t0, peak, dur); o.connect(g); send(g, rv); o.start(t0); o.stop(t0 + dur + .05);
    };
    // wind: two slowly sweeping band-pass noises over the whole ghost act
    for (const [f0, f1, v] of [[380, 900, .32], [1400, 600, .14]]) {
      const t0 = at(0), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'bandpass'; f.Q.value = 3;
      f.frequency.setValueAtTime(f0, t0); f.frequency.linearRampToValueAtTime(f1, t0 + 1.3); f.frequency.linearRampToValueAtTime(f0, t0 + 2.6);
      shape(g, t0, [[.8, v], [2.2, v * .8], [T_COVER + .1, 0]]); noiseSrc(t0, T_COVER + .2).connect(f).connect(g); send(g, .4);
    }
    // the ghost's "whooo": a wavering sine with a breathy band of noise
    { const t0 = at(.55), o = ac.createOscillator(), vib = ac.createOscillator(), vg = ac.createGain(), g = ac.createGain();
      o.frequency.setValueAtTime(300, t0); o.frequency.linearRampToValueAtTime(390, t0 + .5); o.frequency.linearRampToValueAtTime(240, t0 + 1.5);
      vib.frequency.value = 5.5; vg.gain.value = 9; vib.connect(vg).connect(o.frequency);
      shape(g, t0, [[.3, .17], [1.1, .14], [1.6, 0]]); o.connect(g); send(g, .8); o.start(t0); vib.start(t0); o.stop(t0 + 1.7); vib.stop(t0 + 1.7);
      hiss(.55, 1.6, 'bandpass', 600, 420, 6, .08, .7, .4); }
    // gust and the sheet flapping away
    hiss(T_BLOW - .1, .7, 'bandpass', 500, 2600, 1.4, .42, .3, .2);
    { const t0 = at(T_CUT), f = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
      f.type = 'lowpass'; f.frequency.value = 1100; lfo.frequency.setValueAtTime(15, t0); lfo.frequency.linearRampToValueAtTime(9, t0 + .6); lg.gain.value = .22;
      shape(g, t0, [[.05, .24], [.5, .2], [.62, 0]]); lfo.connect(lg).connect(g.gain); noiseSrc(t0, .7).connect(f).connect(g); send(g, .25); lfo.start(t0); lfo.stop(t0 + .7); }
    hiss(T_COVER - .08, .35, 'lowpass', 2400, 300, .7, .5, .3, .03);
    // carving: a scraping knife, then the candle catching ("fwoomp") and crackling
    { const t0 = at(T_PUMPKIN + .14), f = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
      f.type = 'bandpass'; f.Q.value = 4; f.frequency.setValueAtTime(2200, t0); f.frequency.linearRampToValueAtTime(3200, t0 + .42); lfo.frequency.value = 9; lg.gain.value = .09;
      shape(g, t0, [[.04, .1], [.4, .1], [.45, 0]]); lfo.connect(lg).connect(g.gain); noiseSrc(t0, .5).connect(f).connect(g); send(g, .2); lfo.start(t0); lfo.stop(t0 + .5); }
    boom(T_PUMPKIN + .5, 140, 55, .55, .55, .5); hiss(T_PUMPKIN + .5, .5, 'lowpass', 900, 200, .7, .3, .4, .05);
    for (let i = 0; i < 26; i++) { const tt = T_PUMPKIN + .6 + Math.random() * (T_RUSH - T_PUMPKIN - .6); hiss(tt, .025, 'highpass', 2500, 2000, 1, .05 + Math.random() * .08, .1, .001); }
    // riser into the white burst, then the burst
    hiss(T_RUSH - .1, T_FLASH - T_RUSH + .1, 'bandpass', 300, 4500, 1.6, .55, .3, .4);
    boom(T_FLASH, 110, 30, 1.4, 1, .7); hiss(T_FLASH, 1.1, 'lowpass', 3000, 150, .7, .6, .7, .01);
    // the witch: a cackle of falling "ha" syllables (saw tone through two formants) and squeaking bats
    { const f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter(), mix = ac.createGain(); f1.type = f2.type = 'bandpass'; f1.frequency.value = 820; f1.Q.value = 6; f2.frequency.value = 1350; f2.Q.value = 7; mix.gain.value = .9;
      f1.connect(mix); f2.connect(mix); send(mix, .7);
      for (let i = 0; i < 7; i++) {
        const t0 = at(T_WITCH + .35 + i * .118), o = ac.createOscillator(), g = ac.createGain(), pitch = 760 - i * 42 + (i % 2) * 30;
        o.type = 'sawtooth'; o.frequency.setValueAtTime(pitch * 1.06, t0); o.frequency.exponentialRampToValueAtTime(pitch * .88, t0 + .09);
        env(g, t0, .2 - i * .015, .1, .008); o.connect(g); g.connect(f1); g.connect(f2); o.start(t0); o.stop(t0 + .12);
      } }
    for (let i = 0; i < 12; i++) {
      const t0 = at(T_WITCH + .2 + Math.random() * 1.3), o = ac.createOscillator(), g = ac.createGain(), f = 6500 + Math.random() * 2500;
      o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * .7, t0 + .05); env(g, t0, .035, .06, .003); o.connect(g); send(g, .3); o.start(t0); o.stop(t0 + .08);
    }
    { const t0 = at(T_WITCH + .2), f = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
      f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1; lfo.frequency.value = 22; lg.gain.value = .07;
      shape(g, t0, [[.2, .08], [1.1, .06], [1.4, 0]]); lfo.connect(lg).connect(g.gain); noiseSrc(t0, 1.5).connect(f).connect(g); send(g, .3); lfo.start(t0); lfo.stop(t0 + 1.5); }
    // the logo: a low organ chord in D minor swelling up
    { const t0 = at(T_LOGO), lp = ac.createBiquadFilter(), g = ac.createGain(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t0); lp.frequency.linearRampToValueAtTime(1800, t0 + 1.4);
      shape(g, t0, [[.6, .1], [1.6, .085], [DUR - T_LOGO + .4, 0]]); lp.connect(g); send(g, .9);
      for (const [hz, v] of [[73.4, 1], [110, .8], [146.8, .7], [174.6, .6], [220, .45], [293.7, .3]]) for (const det of [-3, 3]) {
        const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = hz; o.detune.value = det; og.gain.value = v * .5; o.connect(og).connect(lp); o.start(t0); o.stop(t0 + DUR - T_LOGO + .5);
      } }
    // lightning: a sharp crack, then thunder rolling away
    hiss(T_BOLT, .12, 'highpass', 3500, 1800, .7, .7, .5, .002);
    hiss(T_BOLT + .05, 2.4, 'lowpass', 600, 60, .8, .9, .6, .08); boom(T_BOLT + .02, 70, 28, 1.6, .7, .6);
    return out;
  }
  function stopSound() {
    if (!audio) return;
    const { ac, out } = audio; audio = null;
    try { out.gain.setTargetAtTime(0, ac.currentTime, .06); setTimeout(() => ac.close().catch(() => {}), 400); } catch { /* already closed */ }
  }
  splash.addEventListener('pointerdown', stopSound);

  // ---------- frame ----------
  // hq: bloom and soft shadows on. If the machine cannot hold 60 fps it drops to a lighter mode (no bloom, 1x pixels).
  let fitS = 1, fitX = 0, fitY = 0, hq = true;
  const bloomA = document.createElement('canvas'), bloomB = document.createElement('canvas');
  const bA = bloomA.getContext('2d'), bB = bloomB.getContext('2d');
  function resize() {
    const cw = splash.clientWidth || innerWidth, ch = splash.clientHeight || innerHeight;
    // never render more than ~2560x1440 pixels: sharp on HiDPI, but bounded work per frame
    const dpr = hq ? Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3.7e6 / (cw * ch))) : 1;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    canvas.style.width = `${cw}px`; canvas.style.height = `${ch}px`;
    fitS = Math.max(canvas.width / W, canvas.height / H); fitX = (canvas.width - W * fitS) / 2; fitY = (canvas.height - H * fitS) / 2;
    bloomA.width = Math.max(1, canvas.width >> 2); bloomA.height = Math.max(1, canvas.height >> 2);
    bloomB.width = Math.max(1, canvas.width >> 4); bloomB.height = Math.max(1, canvas.height >> 4);
  }
  function frame(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(fitS, 0, 0, fitS, fitX, fitY);

    if (t < T_PUMPKIN + .3) {
      // scene 1–2: spotlight, cobwebs, ghost, the sheet blowing at the camera
      const room = ss(.15, .9, t);
      // purple moonlit night: dark violet sky, a cool moonbeam from above, light rising from below where the ghost comes up
      let grd = ctx.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#0e0818'); grd.addColorStop(1, '#040208');
      ctx.globalAlpha = room; ctx.fillStyle = grd; ctx.fillRect(-40, -40, W + 80, H + 80); ctx.globalAlpha = 1;
      grd = ctx.createRadialGradient(W / 2, -60, 20, W / 2, 120, 640);
      grd.addColorStop(0, `rgba(205,190,255,${.22 * room})`); grd.addColorStop(1, 'rgba(160,130,255,0)');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
      grd = ctx.createRadialGradient(W / 2, H + 60, 10, W / 2, H, 420 * ss(.1, .6, t) + 1);
      grd.addColorStop(0, `rgba(220,205,255,${.35 * (1 - ss(.9, 1.6, t))})`); grd.addColorStop(1, 'rgba(180,150,255,0)');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
      drawGroundFog(t, room * .55);
      const webs = ss(.5, 1.4, t) * .55;
      if (webs > 0) {
        ctx.globalAlpha = webs;
        for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { ctx.save(); ctx.translate(sx < 0 ? W : 0, sy < 0 ? H : 0); ctx.scale(sx, sy); ctx.drawImage(web, 0, 0); ctx.restore(); }
        ctx.globalAlpha = 1;
      }
      drawMotes(t, room * .6, mote, motes, 14);
      // the ghost rises into the light, then floats a little further back and sways
      const rise = easeOut(lin(.2, 1.15, t)), back = ss(1.0, 1.7, t);
      const gy = 1000 - rise * 720 + back * -40 + Math.sin(t * 2.4) * 8 * back;
      const gs = 1.32 - .32 * back, blow = ss(T_BLOW, T_BLOW + .35, t);
      if (t < T_CUT) drawGhost(t, W / 2 + Math.sin(t * 1.6) * 10 * back - blow * 40, gy - blow * 30, gs * (1 + blow * .1), Math.sin(t * 1.9) * .05 * back - blow * .5, blow * .7, 1);
      drawGust(t);
      // the sheet: the wind tears it off the ghost in one cut, it flutters up and left, then swoops into the camera
      const c0 = t >= T_CUT ? 1 : 0;
      if (c0 > 0 && t < T_COVER + .12) {
        const fly = Math.pow(lin(T_CUT, T_COVER + .06, t), 2.2), drift = easeOut(lin(T_CUT - .1, T_CUT + .4, t));
        drawCloth(t, W / 2 - 70 * drift + 200 * fly, 250 - 30 * drift + 110 * fly, -840 * fly, 330 + 80 * drift, 330, .2 + .3 * drift - .3 * fly, -1.2 + .55 * drift + .75 * fly, -.35 * drift + .2 * fly, .6 + .7 * drift, c0);
      }
    }
    if (t >= T_COVER - .05) {
      // scene 3 underneath, uncovered by the sheet sliding off
      const rush = lin(T_RUSH, T_FLASH, t);
      if (t >= T_PUMPKIN - .02 && t < T_FLASH + .05) {
        drawPumpkinScene(t, rush);
        drawMotes(t, ss(T_PUMPKIN, T_PUMPKIN + .5, t) * (1 - rush), ember, embers, 40);
        drawRush(t);
      }
      const cover = ss(T_COVER - .05, T_COVER + .06, t), edge = easeIn(lin(T_PUMPKIN, T_PUMPKIN + .32, t)) * (W + 260) - 60;
      if (t < T_PUMPKIN + .34) drawSheetCover(t, t < T_PUMPKIN ? -200 : edge, cover);
    }
    if (t >= T_RUSH + .1 && t < T_FLASH + .25) {
      // white-out at the end of the rush: fire-light from the centre first, then pure white
      const wf = ss(T_RUSH + .1, T_FLASH, t) * (1 - ss(T_FLASH + .02, T_FLASH + .25, t));
      ctx.save(); ctx.globalAlpha = wf;
      if (t < T_FLASH) {
        const grd = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 760);
        grd.addColorStop(0, '#fffaf0'); grd.addColorStop(.45, '#ffd9a0'); grd.addColorStop(1, '#ff9a40');
        ctx.fillStyle = grd;
      } else ctx.fillStyle = '#ffffff';
      ctx.fillRect(-40, -40, W + 80, H + 80); ctx.restore();
    }
    if (t >= T_FLASH) {
      // scene 4–5: grey fog, dust, burst, skeleton, logo
      drawFogBackdrop(t, .55 + .45 * ss(T_FLASH, T_FLASH + 1, t));
      // the grey fog turns into a purple Halloween night for the logo
      const night = ss(T_LOGO - .3, T_LOGO + .8, t) * .5;
      if (night > 0) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = night; ctx.fillStyle = 'rgb(150,95,215)'; ctx.fillRect(-40, -40, W + 80, H + 80); ctx.restore(); }
      drawDust(t, (1 - .7 * ss(T_FLASH + .8, T_LOGO, t)) * ss(T_FLASH, T_FLASH + .08, t));
      drawBurst(t);
      drawMoon(t);
      drawWitch(t);
      drawLogo(t);
      drawMotes(t, ss(T_LOGO, T_LOGO + 1, t) * .5, ember, embers, 30);
    }

    // bloom: brightest parts, blurred by down-scaling, added back on top (calmer while big white areas fill the screen)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const glow = 1 - .65 * Math.max(ss(T_COVER - .1, T_COVER, t) * (1 - ss(T_PUMPKIN + .1, T_PUMPKIN + .35, t)), ss(T_RUSH + .2, T_FLASH, t) * (1 - ss(T_FLASH + .2, T_FLASH + .5, t)));
    if (hq) {
      bA.filter = 'brightness(.62) contrast(3)'; bA.drawImage(canvas, 0, 0, bloomA.width, bloomA.height); bA.filter = 'none';
      bB.drawImage(bloomA, 0, 0, bloomB.width, bloomB.height);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = .16 * glow; ctx.drawImage(bloomA, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = .22 * glow; ctx.drawImage(bloomB, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    ctx.drawImage(vignette, 0, 0, canvas.width, canvas.height);
    const fadeIn = 1 - ss(0, .3, t);
    if (fadeIn > 0) { ctx.globalAlpha = fadeIn; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
  }
  // Draw every sprite once into a hidden corner so the GPU uploads happen now, not mid-scene.
  function warm(list) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const c of list) ctx.drawImage(c, 0, 0, 1, 1);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 2, 2); ctx.restore();
  }

  resize();
  warm([...smoke, ...whiteSmoke, ...warmSmoke, ...purpleSmoke, ...bats, moon, bolt, ember, mote, vignette, web, pumpkinBody, pumpkinFace, pumpkinSpill]);
  // Render one frame of every scene up front (the screen is still black) so first-use costs never stall a scene.
  for (const t of [1.2, 2.7, 3.05, 3.4, 3.9, 4.5, 4.75, 5.4, 6.6, 7.0]) frame(t);
  window.addEventListener('resize', resize);
  const start = performance.now();
  const STEP = 1000 / 60;
  startSound(start);
  let raf = 0, last = -1e9, due = 0, slow = 0, frames = 0;
  function tick(now) {
    if (!canvas.isConnected) { stopSound(); return; }
    raf = requestAnimationFrame(tick);
    // steady 60 fps: on 120/144 Hz screens the extra vsyncs are skipped, keeping an average of exactly 60 renders a second
    if (now < due - 3) return;
    due = now - due > STEP ? now + STEP : due + STEP;
    const gap = now - last; last = now;
    const t = reduced ? DUR : Math.min(DUR, (now - start) / 1000);
    frame(t);
    // more than a third of the last 30 frames late: switch to the lighter mode once
    if (hq && t > .5) { frames++; if (gap > 24) slow++; if (frames >= 30) { if (slow > 10) { hq = false; resize(); } frames = slow = 0; } }
    if (t >= DUR) { cancelAnimationFrame(raf); setTimeout(stopSound, 2200); }
  }
  raf = requestAnimationFrame(tick);
  // Test/preview hook: render any moment (used by the frame captures).
  window.H1tHalloweenBoot = { renderAt: (t) => { cancelAnimationFrame(raf); frame(t); }, duration: DUR, ready: () => !!logo, setName: (n) => { bootName = String(n || ''); },
    // test hook: render the soundtrack offline (for listening checks)
    renderSound: async () => { const oc = new OfflineAudioContext(2, 44100 * 10, 44100); buildSound(oc, 0); return oc.startRendering(); } };
})();
