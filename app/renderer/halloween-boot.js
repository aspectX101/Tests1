'use strict';
// H1T.CC Halloween boot animation (8 s, canvas, 60 fps), a logo reveal in five scenes:
//   1 Ghost      – a glowing sheet ghost rises into a spotlight between cobwebs, floats and blinks
//   2 Sheet      – the sheet is blown off, flutters towards the camera and wipes away to the next scene
//   3 Pumpkin    – a carved jack-o'-lantern lights up in the dark, the camera rushes into its grin
//   4 Burst      – a white flash bursts into smoke and dust, a glowing skeleton runs through the fog
//   5 Logo       – the H1T.CC globe emerges from the smoke, a light sweep runs across it
// Everything is drawn in code (no video); heavy parts are pre-rendered into sprites once and each frame only
// composes them. A cheap two-step bloom gives the glow. Active only when <html> has .hw-boot.
(() => {
  if (!document.documentElement.classList.contains('hw-boot')) return;
  const splash = document.getElementById('splash');
  if (!splash) return;
  const W = 1280, H = 720, DUR = 8.0;
  const T_BLOW = 2.2, T_COVER = 3.0, T_PUMPKIN = 3.12, T_RUSH = 4.25, T_FLASH = 4.62, T_SKEL = 5.1, T_LOGO = 6.25;
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
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#1a0500'; g.fill(facePath);
  });
  const pumpkinFace = sprite(PW * PK, PH * PK, (g) => {
    g.scale(PK, PK); g.translate(PCX, PCY);
    g.shadowColor = 'rgba(255,140,30,1)'; g.shadowBlur = 34;
    const grd = g.createRadialGradient(0, 30, 10, 0, 30, 150);
    grd.addColorStop(0, '#fff6c0'); grd.addColorStop(.45, '#ffc23e'); grd.addColorStop(1, '#ff7410');
    g.fillStyle = grd; g.fill(facePath);
    g.shadowBlur = 0; g.strokeStyle = 'rgba(255,170,70,.9)'; g.lineWidth = 3; g.stroke(facePath);
  });
  const pumpkinSpill = sprite(PW * PK, PH * PK, (g) => {
    g.scale(PK, PK); g.translate(PCX, PCY);
    g.drawImage(pumpkinBody, -PCX, -PCY, PW, PH);
    g.globalCompositeOperation = 'source-in';
    const grd = g.createRadialGradient(0, 30, 20, 0, 30, 170); grd.addColorStop(0, 'rgba(255,170,60,.85)'); grd.addColorStop(1, 'rgba(255,110,20,0)');
    g.fillStyle = grd; g.fillRect(-PCX, -PCY, PW, PH);
  });

  // ---------- logo ----------
  const logoImg = new Image();
  let logo = null, logoSoft = null;
  logoImg.onload = () => {
    logo = logoImg;
    logoSoft = sprite(logoImg.width, logoImg.height, (g) => { g.filter = 'blur(14px) brightness(1.6)'; g.drawImage(logoImg, 0, 0); });
    warm([logo, logoSoft]);
  };
  logoImg.src = 'assets/h1t-logo.png';
  const shineCanvas = document.createElement('canvas');

  // ---------- particles (state-free: position is a function of time) ----------
  const motes = Array.from({ length: 90 }, () => ({ x: rnd() * W, y: rnd() * H, v: 6 + rnd() * 16, d: (rnd() - .5) * 20, s: .2 + rnd() * .5, p: rnd() * TAU }));
  const embers = Array.from({ length: 70 }, () => ({ x: rnd() * W, y: rnd() * H, v: 30 + rnd() * 70, d: (rnd() - .5) * 30, s: .2 + rnd() * .45, p: rnd() * TAU }));
  const fog = Array.from({ length: 18 }, () => ({ x: rnd() * W, y: 520 + rnd() * 260, s: 1.2 + rnd() * 1.6, v: 8 + rnd() * 18, a: .25 + rnd() * .35, k: (rnd() * 3) | 0, p: rnd() * TAU }));
  const clouds = Array.from({ length: 22 }, () => ({ x: rnd() * W, y: rnd() * H, s: 1.4 + rnd() * 2, v: (rnd() - .5) * 30, a: .25 + rnd() * .35, k: (rnd() * 3) | 0, p: rnd() * TAU }));
  const dust = Array.from({ length: 520 }, () => { const a = rnd() * TAU, r = 60 + Math.pow(rnd(), .6) * 620; return { a, r, v: 20 + rnd() * 90, s: .15 + rnd() * .5, p: rnd() * TAU }; });
  const burstPuffs = Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * TAU + rnd() * .4, d: 20 + rnd() * 60, v: 120 + rnd() * 180, s: .9 + rnd() * .9, k: i % 3 }));
  const streaks = Array.from({ length: 70 }, () => ({ a: rnd() * TAU, r: .2 + rnd() * .5, l: .15 + rnd() * .35, w: 1 + rnd() * 3 }));

  // ---------- scene 1: ghost ----------
  function ghostPath(R, wave, flare) {
    const p = new Path2D(), hemY = 270, hw = R * (1.8 + flare);
    p.moveTo(-R, 0); p.arc(0, 0, R, Math.PI, 0);
    p.bezierCurveTo(R * 1.12, 70, hw * .9, 150, hw, hemY + Math.sin(wave) * 10);
    // hem: soft scallops between little hanging points of cloth
    const n = 7;
    for (let i = 1; i <= n; i++) {
      const u = i / n, x = hw - u * hw * 2, y = hemY + Math.sin(wave + u * 7) * (8 + flare * 30) + (i % 2 ? 10 : 0);
      const cx = hw - (u - .5 / n) * hw * 2, cy = y - 16 + Math.cos(wave * 1.3 + u * 5) * 5;
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
    ctx.shadowColor = 'rgba(255,255,255,.5)'; ctx.shadowBlur = 36;
    let grd = ctx.createRadialGradient(-R * .35, -R * .45, 4, 0, 60, 300);
    grd.addColorStop(0, '#ffffff'); grd.addColorStop(.35, '#e2e2e2'); grd.addColorStop(1, '#7a7a7a');
    ctx.fillStyle = grd; ctx.fill(path); ctx.shadowBlur = 0;
    ctx.clip(path);
    // soft folds hanging from the head and shading towards the sides
    ctx.lineCap = 'round';
    for (const [fx, sway] of [[-.55, -1], [-.15, .6], [.3, -.4], [.7, 1]]) {
      for (const [w, al] of [[26, .05], [12, .07], [4, .08]]) {
        ctx.strokeStyle = `rgba(0,0,0,${al})`; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(fx * R * .7, R * .55);
        ctx.quadraticCurveTo(fx * R * 1.3 + Math.sin(t * 2 + fx * 3) * 8 * sway, 160, fx * R * (2.2 + flare), 282); ctx.stroke();
      }
    }
    grd = ctx.createLinearGradient(-R * 1.6, 0, R * 1.6, 0);
    grd.addColorStop(0, 'rgba(0,0,0,.32)'); grd.addColorStop(.3, 'rgba(0,0,0,0)'); grd.addColorStop(.7, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,.36)');
    ctx.fillStyle = grd; ctx.fillRect(-R * 3, -R * 2, R * 6, 360);
    // eyes, blinking once
    const blink = t > 1.55 && t < 1.72 ? Math.abs(Math.cos(((t - 1.55) / .17) * Math.PI)) : 1;
    ctx.fillStyle = '#121212';
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * R * .33, -R * .02, R * .14, R * .21 * blink + .5, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  // ---------- scene 2: the blown-off sheet as a fluttering cloth mesh ----------
  const NU = 34, NV = 24, F = 900;
  // The cloth is rendered at half resolution and scaled up, which smooths the flat-shaded facets.
  const clothCanvas = document.createElement('canvas'), cc = clothCanvas.getContext('2d');
  const LIGHT = (() => { const v = [-.35, -.55, -.75], l = Math.hypot(...v); return v.map((c) => c / l); })();
  const verts = Array.from({ length: (NU + 1) * (NV + 1) }, () => [0, 0, 0, 0, 0]);
  const quads = Array.from({ length: NU * NV }, (_, q) => ({ i: q % NU, j: (q / NU) | 0, z: 0 }));
  function drawCloth(t, cx, cy, cz, sw, sh, rx, ry, rz, amp, a) {
    if (a <= 0) return;
    const crx = Math.cos(rx), srx = Math.sin(rx), cry = Math.cos(ry), sry = Math.sin(ry), crz = Math.cos(rz), srz = Math.sin(rz);
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
      const u = i / NU, v = j / NV, vt = verts[j * (NU + 1) + i];
      let X = (u - .5) * sw, Y = (v - .5) * sh;
      let Z = (Math.sin(u * 5.2 - t * 10 + v * 1.8) * 40 * (.35 + u * .65) + Math.sin(v * 4.4 + u * 2.4 - t * 7) * 24) * amp;
      [X, Y] = [X * crz - Y * srz, X * srz + Y * crz];
      [Y, Z] = [Y * crx - Z * srx, Y * srx + Z * crx];
      [X, Z] = [X * cry + Z * sry, -X * sry + Z * cry];
      const wx = cx - W / 2 + X, wy = cy - H / 2 + Y, wz = cz + Z, k = F / Math.max(60, F + wz);
      vt[0] = W / 2 + wx * k; vt[1] = H / 2 + wy * k; vt[2] = wx; vt[3] = wy; vt[4] = wz;
    }
    for (const q of quads) { const a0 = verts[q.j * (NU + 1) + q.i], a1 = verts[(q.j + 1) * (NU + 1) + q.i + 1]; q.z = a0[4] + a1[4]; }
    quads.sort((p, q) => q.z - p.z);
    if (clothCanvas.width !== canvas.width >> 1 || clothCanvas.height !== canvas.height >> 1) { clothCanvas.width = canvas.width >> 1; clothCanvas.height = canvas.height >> 1; }
    cc.setTransform(1, 0, 0, 1, 0, 0); cc.clearRect(0, 0, clothCanvas.width, clothCanvas.height);
    cc.setTransform(fitS / 2, 0, 0, fitS / 2, fitX / 2, fitY / 2); cc.lineJoin = 'round'; cc.lineWidth = 1.4;
    for (const q of quads) {
      const p00 = verts[q.j * (NU + 1) + q.i], p10 = verts[q.j * (NU + 1) + q.i + 1], p01 = verts[(q.j + 1) * (NU + 1) + q.i], p11 = verts[(q.j + 1) * (NU + 1) + q.i + 1];
      const ax = p10[2] - p00[2], ay = p10[3] - p00[3], az = p10[4] - p00[4], bx = p01[2] - p00[2], by = p01[3] - p00[3], bz = p01[4] - p00[4];
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, nl = Math.hypot(nx, ny, nz) || 1;
      const lit = Math.abs((nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / nl), c = (128 + 127 * Math.pow(lit, .8)) | 0;
      cc.fillStyle = cc.strokeStyle = `rgb(${c},${c},${c})`;
      cc.beginPath(); cc.moveTo(p00[0], p00[1]); cc.lineTo(p10[0], p10[1]); cc.lineTo(p11[0], p11[1]); cc.lineTo(p01[0], p01[1]); cc.closePath();
      cc.fill(); cc.stroke();
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a;
    ctx.shadowColor = 'rgba(255,255,255,.35)'; ctx.shadowBlur = 30;
    ctx.drawImage(clothCanvas, 0, 0, canvas.width, canvas.height);
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
    const grd = ctx.createLinearGradient(edge, 0, edge + 900, H);
    grd.addColorStop(0, '#f2f2f2'); grd.addColorStop(.25, '#bdbdbd'); grd.addColorStop(.5, '#e4e4e4'); grd.addColorStop(.8, '#a9a9a9'); grd.addColorStop(1, '#d8d8d8');
    ctx.fillStyle = grd; ctx.fill(path);
    ctx.restore();
  }

  // ---------- scene 3: pumpkin ----------
  function drawPumpkinScene(t, rush) {
    let grd = ctx.createRadialGradient(W / 2, 390, 40, W / 2, 390, 760);
    grd.addColorStop(0, '#3a1a07'); grd.addColorStop(.5, '#170802'); grd.addColorStop(1, '#060201');
    ctx.fillStyle = grd; ctx.fillRect(-40, -40, W + 80, H + 80);
    ctx.globalAlpha = .35; ctx.drawImage(web, 0, 0); ctx.save(); ctx.translate(0, H); ctx.scale(1, -1); ctx.drawImage(web, 0, 0); ctx.restore(); ctx.globalAlpha = 1;
    // lantern: a slow push-in, then the rush into the grin
    const z = (1 + .14 * ss(T_PUMPKIN, T_RUSH, t)) * (1 + 9 * easeIn(lin(T_RUSH, T_FLASH, t)));
    const cx = W / 2, cy = 360 + 30 * (z - 1) * .12, w = PW * z, h = PH * z, x0 = cx - PCX * z, y0 = cy - PCY * z - 60 * rush;
    ctx.drawImage(pumpkinBody, x0, y0, w, h);
    const light = ss(T_PUMPKIN + .12, T_PUMPKIN + .55, t) * (.82 + .1 * Math.sin(t * 23) + .08 * Math.sin(t * 9.7)) + .3 * rush;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp(light * .45, 0, 1); ctx.drawImage(pumpkinSpill, x0, y0, w, h);
    ctx.globalAlpha = clamp(light * .92, 0, 1); ctx.drawImage(pumpkinFace, x0, y0, w, h);
    grd = ctx.createRadialGradient(cx, cy + 40 * z, 10, cx, cy + 40 * z, 260 * z); grd.addColorStop(0, `rgba(255,130,30,${.1 * light})`); grd.addColorStop(1, 'rgba(255,90,10,0)');
    ctx.globalAlpha = 1; ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    ctx.restore();
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
    ctx.fillStyle = '#0d0d0d'; ctx.fillRect(-40, -40, W + 80, H + 80);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (const c of clouds) {
      const s = 320 * c.s, x = ((c.x + t * c.v + W + 600) % (W + 600)) - 300, y = c.y + Math.sin(t * .5 + c.p) * 14;
      ctx.globalAlpha = c.a * a; ctx.drawImage(smoke[c.k], x - s / 2, y - s / 2, s, s * .7);
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
  // Side view of a running skeleton facing left. Angles are measured from straight down; positive swings forward.
  function drawSkeleton(t) {
    const u = lin(T_SKEL, T_SKEL + 1.35, t); if (u <= 0 || u >= 1) return;
    const hipX = 1460 - 1720 * u, p = (t - T_SKEL) * TAU * 2.1, S = 1.22;
    const hipY = 470 - Math.abs(Math.sin(p)) * 14 * S, lean = .5;
    const at = (x, y, ang, len) => [x - Math.sin(ang) * len * S, y + Math.cos(ang) * len * S];
    const bone = (a, b, w) => { ctx.lineWidth = w * S; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); };
    const knob = (pt, r) => { ctx.beginPath(); ctx.arc(pt[0], pt[1], r * S, 0, TAU); ctx.fill(); };
    const shoulder = at(hipX, hipY, Math.PI - lean, 150), neck = at(hipX, hipY, Math.PI - lean, 178);
    const limb = (root, a1, l1, a2, l2, w) => { const j = at(...root, a1, l1), e = at(...j, a2, l2); bone(root, j, w); bone(j, e, w * .85); knob(j, w * .62); return [j, e]; };
    const leg = (ph) => { const th = Math.sin(ph) * .85, kn = .25 + .95 * Math.max(0, Math.sin(ph + 1.9)); return [th, th - kn]; };
    const arm = (ph) => { const sh = -Math.sin(ph) * .95 + .35; return [sh, sh + 1.1 + .35 * Math.sin(ph + .6)]; };
    const foot = (ankle, ang) => bone(ankle, at(...ankle, ang + Math.PI / 2 + .2, 30), 6);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255,255,255,.7)'; ctx.shadowBlur = 16;
    // far leg and arm, dimmer
    ctx.globalAlpha = .55; ctx.strokeStyle = ctx.fillStyle = '#bdbdbd';
    const [bth, bsh] = leg(p + Math.PI), [, bAnkle] = limb([hipX, hipY], bth, 118, bsh, 112, 9); foot(bAnkle, bsh);
    const [ba1, ba2] = arm(p + Math.PI), [, bWrist] = limb(shoulder, ba1, 78, ba2, 74, 7); bone(bWrist, at(...bWrist, ba2, 22), 5);
    ctx.globalAlpha = 1; ctx.strokeStyle = ctx.fillStyle = '#f4f4f4';
    // spine with vertebrae, ribcage, pelvis
    ctx.lineWidth = 6 * S; ctx.beginPath(); ctx.moveTo(hipX, hipY);
    const spineMid = at(hipX, hipY, Math.PI - lean + .12, 90); ctx.quadraticCurveTo(...spineMid, ...neck); ctx.stroke();
    for (let k = 0; k <= 9; k++) knob(at(hipX, hipY, Math.PI - lean + .06 * Math.sin(k / 9 * Math.PI), 18 * k), 4.2);
    ctx.save(); ctx.translate(...at(hipX, hipY, Math.PI - lean, 92)); ctx.rotate(-lean); ctx.lineWidth = 4 * S;
    for (let k = 0; k < 6; k++) { const y = -k * 13 * S; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(-30 * S, y - 8 * S, -58 * S, y + 6 * S, -50 * S + k * 3 * S, y + 26 * S); ctx.stroke(); }
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(hipX + 4, hipY - 6, 24 * S, 17 * S, -lean, 0, TAU); ctx.fill();
    // skull looking ahead, slightly up
    ctx.save(); ctx.translate(...at(...neck, Math.PI - lean * .4, 26)); ctx.rotate(-.2);
    let grd = ctx.createRadialGradient(-6 * S, -10 * S, 2, 0, 0, 34 * S); grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, '#a8a8a8'); ctx.fillStyle = grd;
    ctx.beginPath(); ctx.ellipse(0, 0, 30 * S, 27 * S, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-26 * S, 8 * S); ctx.lineTo(-24 * S, 24 * S); ctx.lineTo(-4 * S, 30 * S); ctx.lineTo(6 * S, 16 * S); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#151515';
    ctx.beginPath(); ctx.ellipse(-15 * S, -1 * S, 8 * S, 9 * S, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-27 * S, 10 * S); ctx.lineTo(-22 * S, 12 * S); ctx.lineTo(-25 * S, 16 * S); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = ctx.fillStyle = '#f4f4f4';
    // front leg and arm
    const [th, sh] = leg(p), [, ankle] = limb([hipX, hipY], th, 118, sh, 112, 9.5); foot(ankle, sh);
    const [a1, a2] = arm(p), [, wrist] = limb(shoulder, a1, 78, a2, 74, 7.5);
    for (const d of [-.3, 0, .3]) bone(wrist, at(...wrist, a2 + d, 22), 3.5);
    ctx.restore();
  }

  // ---------- scene 5: logo ----------
  function drawLogo(t) {
    if (!logo) return;
    const a = ss(T_LOGO, T_LOGO + .7, t); if (a <= 0) return;
    const sharp = ss(T_LOGO + .35, T_LOGO + 1.1, t), sc = 1.1 - .1 * easeOut(lin(T_LOGO, T_LOGO + 1.6, t));
    const lw = 470 * sc, lh = lw * logo.height / logo.width, x0 = W / 2 - lw / 2, y0 = 345 - lh / 2;
    ctx.save();
    let grd = ctx.createRadialGradient(W / 2, 345, 20, W / 2, 345, 420); grd.addColorStop(0, `rgba(255,255,255,${.14 * a})`); grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    grd = ctx.createRadialGradient(W / 2, 560, 10, W / 2, 560, 360); grd.addColorStop(0, `rgba(255,120,30,${.16 * a})`); grd.addColorStop(1, 'rgba(255,90,10,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = a * (1 - sharp * .6); ctx.drawImage(logoSoft, x0 - 10, y0 - 10, lw + 20, lh + 20);
    ctx.globalAlpha = sharp; ctx.drawImage(logo, x0, y0, lw, lh);
    ctx.restore();
    // a light sweep across the chrome, masked to the logo
    const sw = lin(T_LOGO + 1.05, T_LOGO + 1.75, t);
    if (sw > 0 && sw < 1) {
      const c = shineCanvas, g = c.getContext('2d');
      if (c.width !== logo.width) { c.width = logo.width; c.height = logo.height; }
      g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, c.width, c.height);
      const bx = -c.width * .4 + sw * c.width * 1.8, band = g.createLinearGradient(bx - 120, 0, bx + 120, c.height * .3);
      band.addColorStop(0, 'rgba(255,255,255,0)'); band.addColorStop(.5, 'rgba(255,255,255,.85)'); band.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = band; g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(logo, 0, 0);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .75; ctx.drawImage(c, x0, y0, lw, lh); ctx.restore();
    }
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

  // ---------- frame ----------
  let fitS = 1, fitX = 0, fitY = 0;
  const bloomA = document.createElement('canvas'), bloomB = document.createElement('canvas');
  const bA = bloomA.getContext('2d'), bB = bloomB.getContext('2d');
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), cw = splash.clientWidth || innerWidth, ch = splash.clientHeight || innerHeight;
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
      let grd = ctx.createRadialGradient(W / 2, -60, 20, W / 2, 120, 640);
      grd.addColorStop(0, `rgba(255,255,255,${.2 * room})`); grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
      grd = ctx.createRadialGradient(W / 2, H + 60, 10, W / 2, H, 420 * ss(.1, .6, t) + 1);
      grd.addColorStop(0, `rgba(255,255,255,${.35 * (1 - ss(.9, 1.6, t))})`); grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
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
      drawGhost(t, W / 2 + Math.sin(t * 1.6) * 10 * back - blow * 40, gy - blow * 30, gs * (1 + blow * .1), Math.sin(t * 1.9) * .05 * back - blow * .5, blow * .7, 1 - ss(T_BLOW + .2, T_BLOW + .38, t));
      // the sheet: takes over from the ghost, flutters up and left, then swoops into the camera
      const c0 = ss(T_BLOW + .22, T_BLOW + .34, t);
      if (c0 > 0 && t < T_COVER + .12) {
        const fly = Math.pow(lin(T_BLOW + .3, T_COVER + .06, t), 2.2), drift = easeOut(lin(T_BLOW + .2, T_BLOW + .7, t));
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
      // white-out at the end of the rush
      const wf = ss(T_RUSH + .1, T_FLASH, t) * (1 - ss(T_FLASH + .02, T_FLASH + .25, t));
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = wf; ctx.fillStyle = t < T_FLASH ? '#ffe6c4' : '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore();
    }
    if (t >= T_FLASH) {
      // scene 4–5: grey fog, dust, burst, skeleton, logo
      drawFogBackdrop(t, .55 + .45 * ss(T_FLASH, T_FLASH + 1, t));
      drawDust(t, (1 - .7 * ss(T_FLASH + .8, T_LOGO, t)) * ss(T_FLASH, T_FLASH + .08, t));
      drawBurst(t);
      drawSkeleton(t);
      drawLogo(t);
      drawMotes(t, ss(T_LOGO, T_LOGO + 1, t) * .5, ember, embers, 30);
    }

    // bloom: brightest parts, blurred by down-scaling, added back on top
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    bA.filter = 'brightness(.62) contrast(3)'; bA.drawImage(canvas, 0, 0, bloomA.width, bloomA.height); bA.filter = 'none';
    bB.drawImage(bloomA, 0, 0, bloomB.width, bloomB.height);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = .16; ctx.drawImage(bloomA, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = .22; ctx.drawImage(bloomB, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
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
  warm([...smoke, ...whiteSmoke, ...warmSmoke, ember, mote, vignette, web, pumpkinBody, pumpkinFace, pumpkinSpill]);
  // Render one frame of every scene up front (the screen is still black) so first-use costs never stall a scene.
  for (const t of [1.2, 2.7, 3.05, 3.25, 4.5, 4.75, 5.6]) frame(t);
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
  window.H1tHalloweenBoot = { renderAt: (t) => { cancelAnimationFrame(raf); frame(t); }, duration: DUR, ready: () => !!logo };
})();
