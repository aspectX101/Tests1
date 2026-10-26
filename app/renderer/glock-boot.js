'use strict';
// H1T.CC boot animation for the dark design (8 s, canvas, steady 60 fps), a gunshot logo reveal in four shots:
//   1 Barrel     – staring down the muzzle of a black Glock: the bore starts to glow, then fires at the camera
//   2 Slow-mo    – side view in slow motion: trigger, the slide recoils, muzzle flash, the casing spins out,
//                  the camera follows the bullet as time speeds up again
//   3 Impact     – the bullet comes straight at the camera and hits the screen: the glass cracks
//   4 Logo       – the glass shatters towards the viewer and reveals the H1T logo, "WELCOME BACK"
// Everything is drawn in code; the gun, bullet and casing are pre-rendered once as sprites (dimensions in mm, close
// to a real Glock 17) and each frame only composes them. Active only when <html> has .gun-boot.
(() => {
  if (!document.documentElement.classList.contains('gun-boot')) return;
  const splash = document.getElementById('splash');
  if (!splash) return;
  const W = 1280, H = 720, DUR = 8.0;
  const T_FIRE1 = 1.3, T_SIDE = 1.5, T_TRIG = 2.02, T_SHOT = 2.12, T_FAST = 3.5, T_CUT = 4.55, T_HIT = 5.35, T_SHATTER = 5.95, T_LOGO = 6.25;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'gun-boot-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  splash.append(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });

  // ---------- helpers ----------
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const ss = (a, b, t) => { const u = clamp((t - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
  const lin = (a, b, t) => clamp((t - a) / (b - a), 0, 1);
  const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
  const easeIn = (u) => Math.pow(clamp(u, 0, 1), 3);
  const mix = (a, b, k) => a + (b - a) * k;
  const TAU = Math.PI * 2;
  let seed = 9192026;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 100000) / 100000; };
  const sprite = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
  const vgrad = (g, y0, y1, stops) => { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([k, c]) => gr.addColorStop(k, c)); return gr; };

  // ---------- generic sprites ----------
  const smoke = [0, 1, 2].map(() => sprite(320, 320, (g, w, h) => {
    g.filter = 'blur(22px)';
    for (let i = 0; i < 16; i++) {
      const r = 30 + rnd() * 60, x = w / 2 + (rnd() - .5) * 150, y = h / 2 + (rnd() - .5) * 110, c = 90 + rnd() * 50;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(${c},${c},${c},.5)`); grd.addColorStop(1, `rgba(${c},${c},${c},0)`);
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
  }));
  const mote = sprite(16, 16, (g) => {
    const grd = g.createRadialGradient(8, 8, 0, 8, 8, 8); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(.35, 'rgba(255,255,255,.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 16, 16);
  });
  const spark = sprite(32, 32, (g) => {
    const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grd.addColorStop(0, 'rgba(255,248,225,1)'); grd.addColorStop(.25, 'rgba(255,196,110,.9)'); grd.addColorStop(1, 'rgba(255,120,30,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
  });
  const vignette = sprite(W, H, (g) => {
    const grd = g.createRadialGradient(W / 2, H / 2, 220, W / 2, H / 2, 820);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,.85)'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
  });

  // ---------- the pistol, side view (mm; x towards the muzzle, y down, origin = rear top of the slide) ----------
  const PX = 7, MINX = -34, MINY = -8, GW = 224, GH = 142; // sprite: 7 px per mm
  const gunSprite = (draw) => sprite(GW * PX, GH * PX, (g) => { g.scale(PX, PX); g.translate(-MINX, -MINY); draw(g); });
  const MUZZLE = [187, 13.5], PORT = [91, 1];
  const gunFrame = gunSprite((g) => {
    const p = new Path2D();
    p.moveTo(12, 27); p.lineTo(178, 27); p.lineTo(178, 33); p.quadraticCurveTo(177, 38.5, 171, 39); p.lineTo(118, 40);
    p.lineTo(117.5, 55); p.quadraticCurveTo(117, 66, 107, 66); p.lineTo(88, 66); p.quadraticCurveTo(76, 66, 72, 56);
    // front strap with finger grooves, magazine base, back strap and beavertail
    p.quadraticCurveTo(66, 64, 64, 72); p.quadraticCurveTo(60, 78, 58, 86); p.quadraticCurveTo(52, 92, 52, 100); p.quadraticCurveTo(46, 108, 44, 118); p.lineTo(42, 124);
    p.lineTo(45, 124); p.quadraticCurveTo(47, 131, 41, 132); p.lineTo(-24, 132); p.quadraticCurveTo(-30, 131, -28, 124);
    p.lineTo(-25, 124); p.lineTo(4, 44); p.quadraticCurveTo(6, 36, -2, 33); p.quadraticCurveTo(-4, 29, 4, 27.5); p.closePath();
    // trigger guard opening
    p.moveTo(78, 41); p.lineTo(111, 41); p.lineTo(111.5, 54); p.quadraticCurveTo(111.5, 60.5, 105, 60.5); p.lineTo(90, 60.5); p.quadraticCurveTo(80, 60.5, 77, 52); p.closePath();
    g.fillStyle = vgrad(g, 27, 132, [[0, '#4a4a4a'], [.08, '#2e2e2e'], [.3, '#222'], [1, '#121212']]); g.fill(p, 'evenodd');
    // soft key light from the upper left across the polymer
    const kl = g.createRadialGradient(40, 40, 4, 40, 60, 110); kl.addColorStop(0, 'rgba(255,255,255,.1)'); kl.addColorStop(1, 'rgba(255,255,255,0)');
    g.save(); g.clip(p, 'evenodd'); g.fillStyle = kl; g.fillRect(-40, 20, 230, 120); g.restore();
    // stippled grip texture
    g.save(); g.clip(p, 'evenodd');
    const grip = new Path2D(); grip.moveTo(6, 46); grip.lineTo(69, 58); grip.lineTo(42, 121); grip.lineTo(-22, 121); grip.closePath(); g.clip(grip);
    for (let i = 0; i < 2600; i++) {
      const x = -26 + rnd() * 98, y = 44 + rnd() * 80;
      g.fillStyle = rnd() < .5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(x, y, .3 + rnd() * .3, 0, TAU); g.fill();
    }
    // light falling on the back strap
    const lg = g.createLinearGradient(-25, 0, 10, 0); lg.addColorStop(0, 'rgba(255,255,255,.12)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lg; g.fillRect(-30, 40, 45, 90);
    g.restore();
    // grip panel border, rail slots, slide stop, magazine release, the frame's own logo
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = .6; g.stroke(grip);
    g.fillStyle = '#050505'; for (const x of [128, 140, 152, 164]) g.fillRect(x, 33, 7, 1.8);
    g.fillStyle = '#1b1b1b'; g.beginPath(); g.roundRect(56, 28.3, 15, 3, 1); g.fill();
    g.fillStyle = '#080808'; g.fillRect(73.5, 46, 4, 6);
    g.strokeStyle = 'rgba(255,255,255,.32)'; g.lineWidth = .5; g.stroke(p);
    g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = .5; g.beginPath(); g.moveTo(14, 27.7); g.lineTo(177, 27.7); g.stroke();
  });
  const barrel = gunSprite((g) => {
    g.fillStyle = vgrad(g, 6, 21, [[0, '#1c1c1c'], [.28, '#8c8c8c'], [.45, '#3a3a3a'], [1, '#0e0e0e']]);
    g.fillRect(40, 6, 147, 15);
    g.fillStyle = vgrad(g, 1.5, 13, [[0, '#4a4a4a'], [.3, '#a8a8a8'], [.6, '#3b3b3b'], [1, '#161616']]);
    g.fillRect(66, 1.5, 44, 11.5);
    g.font = '600 3.6px "Segoe UI", Arial, sans-serif'; g.fillStyle = 'rgba(255,255,255,.35)'; g.fillText('9×19', 84, 8.5);
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = .5; g.beginPath(); g.moveTo(187, 6.5); g.lineTo(187, 20.5); g.stroke();
  });
  const slide = gunSprite((g) => {
    const p = new Path2D();
    p.moveTo(1.5, 0); p.lineTo(181, 0); p.quadraticCurveTo(186, 0, 186, 5); p.lineTo(186, 22); p.lineTo(182, 27); p.lineTo(1.5, 27);
    p.quadraticCurveTo(0, 27, 0, 25.5); p.lineTo(0, 1.5); p.quadraticCurveTo(0, 0, 1.5, 0); p.closePath();
    g.fillStyle = vgrad(g, 0, 27, [[0, '#2a2a2a'], [.1, '#9c9c9c'], [.18, '#e9e9e9'], [.28, '#6c6c6c'], [.55, '#262626'], [.88, '#121212'], [1, '#3a3a3a']]);
    g.fill(p);
    // sights: front sight with white dot, rear sight with notch
    g.fillStyle = '#121212'; g.beginPath(); g.moveTo(176, 0); g.lineTo(177, -4); g.lineTo(181.5, -4); g.lineTo(182, 0); g.fill();
    g.beginPath(); g.moveTo(5, 0); g.lineTo(5.5, -5); g.lineTo(10, -5); g.lineTo(10, -3); g.lineTo(11.5, -3); g.lineTo(11.5, -5); g.lineTo(16, -5); g.lineTo(16.5, 0); g.fill();
    g.fillStyle = '#f2f2f2'; g.beginPath(); g.arc(179.2, -2.2, .7, 0, TAU); g.fill();
    // rear serrations
    g.save(); g.clip(p);
    for (let x = 7; x < 38; x += 3.1) {
      g.strokeStyle = 'rgba(0,0,0,.75)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, 3); g.lineTo(x - 1.2, 25); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = .4; g.beginPath(); g.moveTo(x + .9, 3); g.lineTo(x - .3, 25); g.stroke();
    }
    // engraving
    g.font = '700 6.2px "Segoe UI", Arial, sans-serif'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillText('H1T.CC', 126.3, 18.3);
    g.fillStyle = 'rgba(255,255,255,.26)'; g.fillText('H1T.CC', 126, 18);
    g.font = '600 3.2px "Segoe UI", Arial, sans-serif'; g.fillStyle = 'rgba(255,255,255,.18)'; g.fillText('TWEAK UTILITY', 127, 23.2);
    g.restore();
    // edges: bright top bevel, dark lower edge
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = .5; g.beginPath(); g.moveTo(1.5, .4); g.lineTo(181, .4); g.quadraticCurveTo(185.6, .4, 185.6, 5); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = .6; g.stroke(p);
    // ejection port: cut out, the barrel hood shows through
    g.globalCompositeOperation = 'destination-out'; g.fillRect(70, -1, 40, 11.5);
  });
  const trigger = new Path2D();
  trigger.moveTo(86.5, 41); trigger.quadraticCurveTo(95.5, 46, 94.5, 56.5); trigger.lineTo(91, 57.5); trigger.quadraticCurveTo(91.5, 48, 85, 42.5); trigger.closePath();

  // bullet (9 mm full metal jacket, 15 mm long) and its brass casing, both side views at 24 px per mm
  const BX = 24;
  const bulletSide = sprite(16 * BX, 10 * BX, (g) => {
    g.scale(BX, BX); g.translate(0, 5);
    const p = new Path2D(); p.moveTo(0, -4.5); p.lineTo(7, -4.5); p.bezierCurveTo(12.5, -4.5, 15.5, -2, 15.6, 0); p.bezierCurveTo(15.5, 2, 12.5, 4.5, 7, 4.5); p.lineTo(0, 4.5); p.closePath();
    g.fillStyle = vgrad(g, -4.5, 4.5, [[0, '#5a2e12'], [.18, '#f2b27a'], [.3, '#ffe2c2'], [.45, '#c8763f'], [.8, '#5e2f13'], [1, '#2a1406']]); g.fill(p);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = .3; g.beginPath(); g.moveTo(1, -4.4); g.lineTo(1, 4.4); g.stroke();
  });
  const casing = sprite(20 * BX, 11 * BX, (g) => {
    g.scale(BX, BX); g.translate(0, 5.5);
    g.fillStyle = vgrad(g, -5, 5, [[0, '#5e4410'], [.2, '#f5d98a'], [.32, '#fff2c4'], [.5, '#c79a3a'], [.85, '#5a3f0c'], [1, '#2c1e05']]);
    g.beginPath(); g.roundRect(0, -5, 19, 10, [1, .3, .3, 1]); g.fill();
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(1.6, -5, .8, 10);
    g.fillStyle = 'rgba(30,20,4,.9)'; g.beginPath(); g.ellipse(19, 0, .9, 4.6, 0, 0, TAU); g.fill();
  });

  // ---------- the pistol, front view down the barrel (mm, origin = bore centre) at 30 px per mm ----------
  const FPX = 30, FW = 32, FH = 64, FCX = 16, FCY = 20;
  const front = sprite(FW * FPX, FH * FPX, (g) => {
    g.scale(FPX, FPX); g.translate(FCX, FCY);
    // frame below: dust cover, then the front of the trigger guard
    g.fillStyle = vgrad(g, 13, 40, [[0, '#1d1d1d'], [1, '#090909']]);
    g.beginPath(); g.roundRect(-11, 12, 22, 12, 2.5); g.fill(); g.beginPath(); g.roundRect(-6.5, 22, 13, 20, 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = .25; g.beginPath(); g.roundRect(-11, 12, 22, 12, 2.5); g.stroke();
    // slide face with chamfered lower corners
    const face = new Path2D(); face.moveTo(-8.5, -13.5); face.lineTo(8.5, -13.5); face.quadraticCurveTo(12.75, -13.5, 12.75, -9); face.lineTo(12.75, 9); face.lineTo(10, 14);
    face.lineTo(-10, 14); face.lineTo(-12.75, 9); face.lineTo(-12.75, -9); face.quadraticCurveTo(-12.75, -13.5, -8.5, -13.5); face.closePath();
    let grd = g.createRadialGradient(-5, -8, .5, 0, 0, 20); grd.addColorStop(0, '#5c5c5c'); grd.addColorStop(.45, '#232323'); grd.addColorStop(1, '#0b0b0b');
    // the top of the slide receding away from the camera
    g.fillStyle = vgrad(g, -15.2, -13.4, [[0, '#0e0e0e'], [1, '#5a5a5a']]);
    g.beginPath(); g.moveTo(-7.5, -15.2); g.lineTo(7.5, -15.2); g.lineTo(8.5, -13.5); g.lineTo(-8.5, -13.5); g.closePath(); g.fill();
    g.fillStyle = grd; g.fill(face);
    // bevelled edge: lit from the upper left, in shadow at the lower right
    g.save(); g.clip(face);
    const bev = g.createLinearGradient(-12, -13, 12, 14); bev.addColorStop(0, 'rgba(255,255,255,.55)'); bev.addColorStop(.5, 'rgba(255,255,255,.08)'); bev.addColorStop(1, 'rgba(0,0,0,.6)');
    g.strokeStyle = bev; g.lineWidth = 1.6; g.stroke(face);
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = .2; g.stroke(face);
    // front sight post with its white dot
    g.fillStyle = '#141414'; g.beginPath(); g.roundRect(-1.8, -18, 3.6, 4.8, .6); g.fill();
    g.fillStyle = '#f2f2f2'; g.beginPath(); g.arc(0, -15.8, .85, 0, TAU); g.fill();
    // recoil spring guide rod below the barrel
    g.fillStyle = '#040404'; g.beginPath(); g.arc(0, 9.4, 2.7, 0, TAU); g.fill();
    g.fillStyle = vgrad(g, 7.6, 11.2, [[0, '#4a4a4a'], [1, '#141414']]); g.beginPath(); g.arc(0, 9.4, 1.8, 0, TAU); g.fill();
    // barrel: opening in the slide, muzzle crown, polygonal bore
    g.fillStyle = '#050505'; g.beginPath(); g.arc(0, 0, 7.3, 0, TAU); g.fill();
    grd = g.createLinearGradient(-6, -6, 6, 6); grd.addColorStop(0, '#d8d8d8'); grd.addColorStop(.35, '#6e6e6e'); grd.addColorStop(.6, '#2c2c2c'); grd.addColorStop(1, '#8a8a8a');
    g.fillStyle = grd; g.beginPath(); g.arc(0, 0, 6.6, 0, TAU); g.arc(0, 0, 4.6, 0, TAU, true); g.fill();
    // crown: a thin bright chamfer on the inner edge
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = .25; g.beginPath(); g.arc(0, 0, 4.75, Math.PI * .9, Math.PI * 1.7); g.stroke();
    g.fillStyle = '#000'; g.beginPath(); g.arc(0, 0, 4.6, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = .16;
    for (const r of [4.3, 3.0]) { g.beginPath(); for (let k = 0; k <= 6; k++) { const a = k / 6 * TAU + r * .4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); }
  });

  // ---------- logo ----------
  const logoImg = new Image();
  let logo = null, logoSoft = null;
  // the standard H1T artwork, its square edges feathered into the black
  logoImg.onload = () => {
    const w = logoImg.width, h = logoImg.height;
    logo = sprite(w, h, (g) => {
      g.drawImage(logoImg, 0, 0);
      g.globalCompositeOperation = 'destination-in';
      const grd = g.createRadialGradient(w / 2, h / 2, w * .3, w / 2, h / 2, w * .5); grd.addColorStop(0, 'rgba(0,0,0,1)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    });
    logoSoft = sprite(w, h, (g) => { g.filter = 'blur(18px) brightness(1.5)'; g.drawImage(logo, 0, 0); });
    warm([logo, logoSoft]);
  };
  logoImg.src = 'assets/h1t-logo-main.webp';
  const shine = document.createElement('canvas');

  // ---------- glass: a jittered polar web around the impact point; edges are the cracks, cells become shards ----------
  const GX = W / 2, GY = H / 2, RINGS = [0, 30, 85, 170, 290, 460, 690, 1000], SECT = 15;
  const gv = RINGS.map((r, i) => Array.from({ length: SECT }, (_, j) => {
    if (i === 0) return [GX, GY];
    const a = (j + (rnd() - .5) * .35) / SECT * TAU + (rnd() - .5) * .06 * i, rr = r * (1 + (rnd() - .5) * .3);
    return [GX + Math.cos(a) * rr, GY + Math.sin(a) * rr * .82];
  }));
  const cracks = [], shards = [];
  for (let i = 1; i < RINGS.length; i++) for (let j = 0; j < SECT; j++) {
    const j2 = (j + 1) % SECT, a = gv[i - 1][j], b = gv[i][j], c = gv[i][j2], d = gv[i - 1][j2];
    // jagged radial crack from the inner ring outwards
    const pts = [a]; for (let k = 1; k < 4; k++) pts.push([mix(a[0], b[0], k / 4) + (rnd() - .5) * RINGS[i] * .06, mix(a[1], b[1], k / 4) + (rnd() - .5) * RINGS[i] * .06]); pts.push(b);
    cracks.push({ r: RINGS[i - 1], len: RINGS[i] - RINGS[i - 1], pts });
    if (i < RINGS.length - 1 && i > 1 && rnd() < .55) cracks.push({ r: RINGS[i] + 20, len: 40, pts: [b, [mix(b[0], c[0], .5) + (rnd() - .5) * 14, mix(b[1], c[1], .5) + (rnd() - .5) * 14], c] });
    const poly = i === 1 ? [a, b, c] : [a, b, c, d];
    const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    const path = new Path2D(); poly.forEach(([x, y], k) => (k ? path.lineTo(x, y) : path.moveTo(x, y))); path.closePath();
    const dx = cx - GX, dy = cy - GY, dl = Math.hypot(dx, dy) || 1;
    shards.push({ path, cx, cy, vx: dx / dl * (520 + rnd() * 620), vy: dy / dl * (420 + rnd() * 520) + 120 * rnd(), spin: (rnd() - .5) * 6, z: 1.5 + rnd() * 3, delay: i * .03 + rnd() * .04, tint: .04 + rnd() * .07 });
  }
  const micro = Array.from({ length: 26 }, () => { const a = rnd() * TAU, r0 = 6 + rnd() * 20, r1 = r0 + 10 + rnd() * 30; return [a, r0, r1]; });

  // ---------- particles ----------
  const motes = Array.from({ length: 70 }, () => ({ x: rnd() * W, y: rnd() * H, v: 4 + rnd() * 12, d: (rnd() - .5) * 16, s: .15 + rnd() * .4, p: rnd() * TAU }));
  const flashSparks = Array.from({ length: 70 }, () => ({ a: (rnd() - .5) * 1.9, v: 50 + rnd() * 160, s: .25 + rnd() * .6, life: .5 + rnd() * .9 }));
  const streaks = Array.from({ length: 60 }, () => ({ y: rnd() * H, x: rnd() * W, l: 80 + rnd() * 260, w: .5 + rnd() * 1.4, v: .6 + rnd() * .8 }));
  const tunnel = Array.from({ length: 80 }, () => ({ a: rnd() * TAU, r: rnd(), l: .08 + rnd() * .2, w: .6 + rnd() * 1.6 }));

  // ---------- shot 1: down the barrel ----------
  function drawBarrelView(t) {
    const s = 8.6 + 7 * easeOut(lin(.1, T_FIRE1 + .2, t)), rot = -.05 + .04 * lin(0, T_FIRE1, t);
    ctx.save(); ctx.translate(W / 2, H / 2 + 20); ctx.rotate(rot);
    ctx.drawImage(front, -FCX * s, -FCY * s, FW * s, FH * s);
    // a glint travelling along the top edge of the slide
    const gl = lin(.45, 1.15, t);
    if (gl > 0 && gl < 1) {
      ctx.globalCompositeOperation = 'lighter';
      const x = mix(-9, 11, gl) * s, y = -13.5 * s, a = Math.sin(gl * Math.PI), grd = ctx.createRadialGradient(x, y, 0, x, y, 1.6 * s);
      grd.addColorStop(0, `rgba(255,255,255,${a})`); grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd; ctx.fillRect(x - 1.6 * s, y - 1.6 * s, 3.2 * s, 3.2 * s);
      for (const [w, h] of [[7, .12], [.12, 3]]) { const g2 = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * s); g2.addColorStop(0, `rgba(255,255,255,${.8 * a})`); g2.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g2; ctx.fillRect(x - w * s, y - h * s, 2 * w * s, 2 * h * s); }
      ctx.globalCompositeOperation = 'source-over';
    }
    // the bore lights up from inside
    const glow = ss(.8, T_FIRE1, t);
    if (glow > 0) {
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 4.6 * s, 0, TAU); ctx.clip();
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, 4.6 * s);
      grd.addColorStop(0, `rgba(255,250,235,${glow})`); grd.addColorStop(.5, `rgba(255,190,100,${glow * .9})`); grd.addColorStop(1, `rgba(255,110,30,${glow * .6})`);
      ctx.fillStyle = grd; ctx.fillRect(-5 * s, -5 * s, 10 * s, 10 * s); ctx.restore();
      ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(0, 0, 4 * s, 0, 0, 14 * s); halo.addColorStop(0, `rgba(255,170,80,${.35 * glow})`); halo.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = halo; ctx.fillRect(-14 * s, -14 * s, 28 * s, 28 * s);
    }
    ctx.restore();
    // the shot: a fireball out of the bore fills the screen
    const f = lin(T_FIRE1, T_FIRE1 + .2, t);
    if (f > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const r = 4.6 * s + 1500 * easeIn(f) + 60 * f, grd = ctx.createRadialGradient(W / 2, H / 2 + 20, 0, W / 2, H / 2 + 20, r);
      grd.addColorStop(0, 'rgba(255,255,250,1)'); grd.addColorStop(.35, 'rgba(255,224,170,1)'); grd.addColorStop(.75, `rgba(255,150,60,${.9 * f})`); grd.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = grd; ctx.fillRect(-40, -40, W + 80, H + 80); ctx.restore();
    }
  }

  // ---------- shot 2: slow-motion side view ----------
  const travel = (t) => Math.max(0, t - T_SHOT) * 48 + 900 * easeIn(lin(T_FAST, T_CUT, t));
  function camera(t) {
    // zoom (px per mm) and the point in mm that sits in the middle of the screen
    const b = MUZZLE[0] + travel(t), follow = ss(2.45, 3.25, t);
    const s = mix(mix(2.75, 3.6, ss(T_SIDE, T_TRIG, t)), 6.2, ss(2.3, 3.5, t)) + 1.2 * ss(T_FAST, T_CUT, t);
    const fx = mix(mix(72, 132, ss(T_SIDE, T_SHOT, t)), b + 4, follow), fy = mix(mix(58, 30, ss(T_SIDE, T_SHOT, t)), MUZZLE[1], follow);
    return { s, ox: W / 2 - fx * s, oy: H / 2 - fy * s };
  }
  function drawSideView(t) {
    const cam = camera(t), at = (x, y) => [cam.ox + x * cam.s, cam.oy + y * cam.s];
    // studio background: a soft key light behind the gun and a floor reflection
    let grd = ctx.createRadialGradient(W * .55, H * .45, 30, W * .55, H * .45, 760);
    grd.addColorStop(0, '#202020'); grd.addColorStop(.55, '#0b0b0b'); grd.addColorStop(1, '#030303');
    ctx.fillStyle = grd; ctx.fillRect(-40, -40, W + 80, H + 80);
    // speed streaks once the bullet picks up speed
    const speed = ss(T_FAST - .1, T_CUT - .2, t);
    if (speed > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (const s of streaks) {
        const x = ((s.x - t * 2600 * s.v * speed) % (W + 400) + W + 400) % (W + 400) - 200;
        const g2 = ctx.createLinearGradient(x, 0, x + s.l * (1 + speed * 2), 0); g2.addColorStop(0, `rgba(255,255,255,${.35 * speed})`); g2.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g2; ctx.lineWidth = s.w; ctx.beginPath(); ctx.moveTo(x, s.y); ctx.lineTo(x + s.l * (1 + speed * 2), s.y); ctx.stroke();
      }
      ctx.restore();
    }
    // the gun: frame, barrel and slide (the slide recoils back and returns), trigger
    const recoil = 22 * (ss(T_SHOT, T_SHOT + .22, t) - ss(T_SHOT + .32, T_SHOT + .55, t));
    const gx = cam.ox + MINX * cam.s, gy = cam.oy + MINY * cam.s, gw = GW * cam.s, gh = GH * cam.s;
    if (gx + gw > -50 && gx < W + 50) {
      ctx.drawImage(barrel, gx - recoil * .12 * cam.s, gy, gw, gh);
      ctx.drawImage(gunFrame, gx, gy, gw, gh);
      ctx.save(); ctx.translate(...at(86.5, 41)); ctx.rotate(.32 * (ss(T_TRIG, T_SHOT, t) - ss(T_SHOT + .5, T_SHOT + .8, t))); ctx.scale(cam.s, cam.s); ctx.translate(-86.5, -41);
      ctx.fillStyle = vgrad(ctx, 41, 58, [[0, '#2a2a2a'], [1, '#080808']]); ctx.fill(trigger);
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = .35; ctx.stroke(trigger); ctx.restore();
      ctx.drawImage(slide, gx - recoil * cam.s, gy, gw, gh);
      // a rim light sweeping along the slide while the camera glides in
      const sw = lin(T_SIDE + .05, T_TRIG, t);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const [x, y] = at(mix(10, 180, sw), .5), g2 = ctx.createRadialGradient(x, y, 0, x, y, 16 * cam.s);
        g2.addColorStop(0, 'rgba(255,255,255,.55)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g2; ctx.fillRect(x - 16 * cam.s, y - 16 * cam.s, 32 * cam.s, 32 * cam.s); ctx.restore();
      }
    }
    // muzzle flash, smoke and sparks
    drawMuzzleFlash(t, cam, at);
    // the casing spins out of the ejection port
    const cu = t - (T_SHOT + .1);
    if (cu > 0 && cu < 2.2) {
      const [x, y] = at(PORT[0] - recoil + 26 * cu, PORT[1] - 70 * cu + 38 * cu * cu);
      ctx.save(); ctx.translate(x, y); ctx.rotate(-.6 + cu * 7.5); const cw = 19 * cam.s, ch = 10 * cam.s;
      ctx.drawImage(casing, -cw / 2, -ch / 2, cw * 20 / 19, ch * 11 / 10); ctx.restore();
    }
    // the bullet
    const bu = t - T_SHOT;
    if (bu > .04) {
      const [x, y] = at(MUZZLE[0] - 15 + travel(t), MUZZLE[1]), bw = 16 * cam.s, bh = 10 * cam.s;
      // shock cone and trailing vortex rings
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,255,255,${.1 + .16 * speed})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + bw * .98 - 70 - 120 * speed, y - 70 - 60 * speed); ctx.quadraticCurveTo(x + bw * .9, y - 6, x + bw * 1.02, y); ctx.quadraticCurveTo(x + bw * .9, y + 6, x + bw * .98 - 70 - 120 * speed, y + 70 + 60 * speed); ctx.stroke();
      const mzx = at(MUZZLE[0], 0)[0];
      for (let k = 1; k <= 5; k++) {
        const back = k * (36 + 120 * speed), a = (1 - k / 6) * .16;
        if (x - back < mzx + 10) break;
        ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x - back, y, 4 + k * 1.5, bh * .55 + k * 3, 0, 0, TAU); ctx.stroke();
      }
      ctx.restore();
      ctx.drawImage(bulletSide, x, y - bh / 2, bw, bh);
      // spin: a highlight band running round the jacket
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .35 + .25 * Math.sin(t * 60);
      const hy = y - bh * .15 + Math.sin(t * 42) * bh * .25; ctx.fillStyle = 'rgba(255,230,200,.6)'; ctx.fillRect(x + bw * .05, hy, bw * .42, bh * .06); ctx.restore();
    }
  }
  function drawMuzzleFlash(t, cam, at) {
    const u = (t - T_SHOT) / .62; if (u < 0) return;
    const [mx, my] = at(MUZZLE[0], MUZZLE[1]), k = cam.s;
    if (u < 1) {
      const grow = easeOut(u / .28), a = 1 - ss(.35, 1, u), fl = .85 + .15 * Math.sin(t * 90);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      let grd = ctx.createRadialGradient(mx, my, 0, mx, my, 70 * k * grow + 1);
      grd.addColorStop(0, `rgba(255,190,110,${.45 * a})`); grd.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = grd; ctx.fillRect(mx - 70 * k, my - 70 * k, 140 * k, 140 * k);
      // the flame: one long forward tongue and a star of side jets
      const tongue = (ang, len, wid, alpha) => {
        ctx.save(); ctx.translate(mx, my); ctx.rotate(ang);
        const L = len * k * grow * fl, Wd = wid * k * grow;
        const g2 = ctx.createLinearGradient(0, 0, L, 0); g2.addColorStop(0, `rgba(255,255,248,${alpha})`); g2.addColorStop(.35, `rgba(255,222,160,${alpha * .9})`); g2.addColorStop(1, 'rgba(255,130,40,0)');
        ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(L * .4, -Wd, L, 0); ctx.quadraticCurveTo(L * .4, Wd, 0, 0); ctx.fill(); ctx.restore();
      };
      tongue(0, 74, 15, a); tongue(-.6, 34, 7, a * .85); tongue(.6, 34, 7, a * .85); tongue(-1.15, 22, 5, a * .6); tongue(1.15, 22, 5, a * .6);
      grd = ctx.createRadialGradient(mx, my, 0, mx, my, 13 * k * grow + 1); grd.addColorStop(0, `rgba(255,255,255,${a})`); grd.addColorStop(1, 'rgba(255,240,210,0)');
      ctx.fillStyle = grd; ctx.fillRect(mx - 13 * k, my - 13 * k, 26 * k, 26 * k);
      ctx.restore();
    }
    // sparks of burning powder
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const su = t - T_SHOT;
    for (const p of flashSparks) {
      if (su > p.life) continue;
      const d = p.v * (1 - Math.exp(-su * 2.2)) / 2.2 * k * .8, x = mx + Math.cos(p.a) * d, y = my + Math.sin(p.a) * d + 30 * su * su * k * .2, sz = 32 * p.s;
      ctx.globalAlpha = 1 - su / p.life; ctx.drawImage(spark, x - sz / 2, y - sz / 2, sz, sz);
    }
    ctx.restore();
    // smoke rolling out of the muzzle and the ejection port
    const sm = t - T_SHOT - .15;
    if (sm > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 7; i++) {
        const k2 = i / 7, d = (12 + 60 * k2) * (1 - Math.exp(-sm * 1.2)) * k, sz = (30 + 40 * k2) * k * (.6 + sm * .5);
        ctx.globalAlpha = .28 * (1 - ss(1.2, 2.6, sm)) * (1 - k2 * .4);
        ctx.drawImage(smoke[i % 3], mx + d - sz / 2, my - sm * 14 * k * k2 - sz / 2, sz, sz);
      }
      ctx.restore();
    }
  }

  // ---------- shot 3: head-on bullet and the impact ----------
  function drawHeadOn(t) {
    const u = lin(T_CUT, T_HIT, t), r = 14 * Math.pow(18, u * u) + 4;
    ctx.fillStyle = '#050505'; ctx.fillRect(-40, -40, W + 80, H + 80);
    // tunnel streaks rushing past
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const s of tunnel) {
      const k = ((s.r + t * 1.6) % 1), r0 = 80 + k * k * 900, r1 = r0 + s.l * 900 * (.3 + k);
      ctx.strokeStyle = `rgba(255,255,255,${.4 * k})`; ctx.lineWidth = s.w * (.5 + k);
      ctx.beginPath(); ctx.moveTo(GX + Math.cos(s.a) * r0, GY + Math.sin(s.a) * r0); ctx.lineTo(GX + Math.cos(s.a) * r1, GY + Math.sin(s.a) * r1); ctx.stroke();
    }
    // shock rings
    for (let i = 0; i < 4; i++) {
      const k = ((t * 3 + i / 4) % 1); ctx.strokeStyle = `rgba(255,255,255,${.22 * (1 - k)})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(GX, GY, r * (1.2 + k * 1.6), 0, TAU); ctx.stroke();
    }
    ctx.restore();
    // the bullet seen from the front: copper jacket with rifling marks, spinning
    ctx.save(); ctx.translate(GX, GY);
    let grd = ctx.createRadialGradient(-r * .3, -r * .34, r * .02, -r * .05, -r * .05, r);
    grd.addColorStop(0, '#fff6ea'); grd.addColorStop(.1, '#f6c08e'); grd.addColorStop(.42, '#c9783e'); grd.addColorStop(.82, '#6e3311'); grd.addColorStop(1, '#241004');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    // where the round nose meets the cylindrical jacket
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = Math.max(1, r * .04); ctx.beginPath(); ctx.arc(0, 0, r * .74, 0, TAU); ctx.stroke();
    // rim light on the right edge
    grd = ctx.createRadialGradient(r * .5, r * .2, r * .6, 0, 0, r * 1.02); grd.addColorStop(0, 'rgba(255,220,180,0)'); grd.addColorStop(1, 'rgba(255,220,180,.35)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.rotate(t * 9); ctx.strokeStyle = 'rgba(40,16,4,.5)'; ctx.lineWidth = Math.max(1, r * .03);
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * .82, Math.sin(a) * r * .82); ctx.lineTo(Math.cos(a + .12) * r * .99, Math.sin(a + .12) * r * .99); ctx.stroke(); }
    ctx.restore();
  }
  function drawGlass(t) {
    const u = t - T_HIT; if (u < 0) return;
    const reach = 1100 * easeOut(lin(0, .28, u)), shatter = t - T_SHATTER;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // cracks (before the glass breaks apart)
    if (shatter < .05) {
      const path = new Path2D();
      for (const c of cracks) {
        if (c.r > reach) continue;
        const k = clamp((reach - c.r) / c.len, 0, 1), n = c.pts.length - 1, upto = k * n;
        path.moveTo(...c.pts[0]);
        for (let i = 1; i <= n; i++) {
          const [px, py] = c.pts[i - 1], [x, y] = c.pts[i];
          if (i <= upto) path.lineTo(x, y); else { const f = upto - (i - 1); path.lineTo(px + (x - px) * f, py + (y - py) * f); break; }
        }
      }
      for (const [a, r0, r1] of micro) { path.moveTo(GX + Math.cos(a) * r0, GY + Math.sin(a) * r0); path.lineTo(GX + Math.cos(a + .2) * r1, GY + Math.sin(a + .2) * r1); }
      const pulse = .75 + .25 * Math.sin(t * 30);
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 5; ctx.stroke(path);
      ctx.strokeStyle = `rgba(255,255,255,${.85 * pulse})`; ctx.lineWidth = 1.3; ctx.stroke(path);
      // the impact point: crushed glass
      const grd = ctx.createRadialGradient(GX, GY, 0, GX, GY, 46);
      grd.addColorStop(0, 'rgba(255,255,255,.9)'); grd.addColorStop(.25, 'rgba(255,255,255,.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd; ctx.fillRect(GX - 50, GY - 50, 100, 100);
    }
    // impact flash
    if (u < .25) {
      const f = 1 - u / .25, grd = ctx.createRadialGradient(GX, GY, 0, GX, GY, 260 + 500 * u);
      grd.addColorStop(0, `rgba(255,255,255,${f})`); grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
    // shards flying at the camera
    if (shatter >= 0 && shatter < 1.2) {
      for (const sh of shards) {
        const v = shatter - sh.delay; if (v < 0) { drawShard(sh, 0, 0, 1, 0, 1); continue; }
        const a = clamp(1 - v / .6, 0, 1); if (a <= 0) continue;
        const k = easeIn(clamp(v / .9, 0, 1));
        drawShard(sh, sh.vx * v * (1 + v), sh.vy * v * (1 + v) + 200 * v * v, 1 + sh.z * k, sh.spin * v, a);
      }
    }
  }
  function drawShard(sh, dx, dy, sc, rot, a) {
    ctx.save(); ctx.globalAlpha = a;
    ctx.translate(sh.cx + dx, sh.cy + dy); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-sh.cx, -sh.cy);
    ctx.fillStyle = `rgba(255,255,255,${sh.tint})`; ctx.fill(sh.path);
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.2 / sc; ctx.stroke(sh.path);
    ctx.restore();
  }

  // ---------- shot 4: logo ----------
  function drawLogo(t) {
    if (!logo) return;
    const a = ss(T_SHATTER - .25, T_LOGO + .3, t); if (a <= 0) return;
    const sharp = ss(T_SHATTER, T_LOGO + .45, t), sc = 1.12 - .12 * easeOut(lin(T_SHATTER, T_LOGO + 1.6, t));
    const lw = 540 * sc, lh = lw * logo.height / logo.width, x0 = W / 2 - lw / 2, y0 = 300 - lh / 2;
    ctx.save();
    let grd = ctx.createRadialGradient(W / 2, 330, 30, W / 2, 330, 520); grd.addColorStop(0, `rgba(255,255,255,${.12 * a})`); grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = a * (1 - sharp * .75); ctx.drawImage(logoSoft, x0 - 14, y0 - 14, lw + 28, lh + 28);
    ctx.globalAlpha = sharp; ctx.drawImage(logo, x0, y0, lw, lh);
    ctx.restore();
    // a light sweep across the chrome, masked to the logo
    const sw = lin(T_LOGO + .7, T_LOGO + 1.35, t);
    if (sw > 0 && sw < 1) {
      const c = shine, g = c.getContext('2d');
      if (c.width !== logo.width) { c.width = logo.width; c.height = logo.height; }
      g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, c.width, c.height);
      const bx = -c.width * .4 + sw * c.width * 1.8, band = g.createLinearGradient(bx - 110, 0, bx + 110, c.height * .3);
      band.addColorStop(0, 'rgba(255,255,255,0)'); band.addColorStop(.5, 'rgba(255,255,255,.9)'); band.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = band; g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(logo, 0, 0);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .4; ctx.drawImage(c, x0, y0, lw, lh); ctx.restore();
    }
    // WELCOME BACK with a hairline that draws itself
    const tx = ss(T_LOGO + .55, T_LOGO + 1.1, t);
    if (tx > 0) {
      ctx.save(); ctx.globalAlpha = tx; ctx.fillStyle = '#e9e9ec'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 13px "Segoe UI", system-ui, sans-serif';
      const text = 'WELCOME BACK', sp = 8.5, widths = [...text].map((ch) => ctx.measureText(ch).width), total = widths.reduce((s, w) => s + w + sp, -sp);
      let x = W / 2 - total / 2;
      [...text].forEach((ch, i) => { ctx.fillText(ch, x + widths[i] / 2, 612 + (1 - tx) * 8); x += widths[i] + sp; });
      const half = 110 * easeOut(tx);
      const lg = ctx.createLinearGradient(W / 2 - half, 0, W / 2 + half, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(.5, 'rgba(255,255,255,.7)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lg; ctx.fillRect(W / 2 - half, 634, half * 2, 1);
      ctx.restore();
    }
  }
  function drawMotes(t, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of motes) {
      let y = (p.y - t * p.v) % (H + 40); if (y < -20) y += H + 40;
      const x = (p.x + t * p.d + Math.sin(t * 1.5 + p.p) * 10 + W) % W, s = 14 * p.s;
      ctx.globalAlpha = a * (.35 + .65 * Math.abs(Math.sin(t * 2.2 + p.p)));
      ctx.drawImage(mote, x - s / 2, y - s / 2, s, s);
    }
    ctx.restore();
  }

  // ---------- frame ----------
  // hq: bloom on and HiDPI pixels. If the machine cannot hold 60 fps it drops to a lighter mode once.
  let fitS = 1, fitX = 0, fitY = 0, hq = true;
  const bloomA = document.createElement('canvas'), bloomB = document.createElement('canvas');
  const bA = bloomA.getContext('2d'), bB = bloomB.getContext('2d');
  function resize() {
    const cw = splash.clientWidth || innerWidth, ch = splash.clientHeight || innerHeight;
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
    // camera shake after the shots and the impact
    const shake = 7 * Math.max(Math.pow(1 - lin(T_FIRE1 + .1, T_FIRE1 + .45, t), 2) * (t > T_FIRE1 + .1 ? 1 : 0), Math.pow(1 - lin(T_SHOT, T_SHOT + .3, t), 2) * (t > T_SHOT ? .5 : 0), Math.pow(1 - lin(T_HIT, T_HIT + .4, t), 2) * (t > T_HIT ? 1.3 : 0));
    ctx.setTransform(fitS, 0, 0, fitS, fitX + Math.sin(t * 71) * shake * fitS, fitY + Math.cos(t * 59) * shake * fitS);

    if (t < T_SIDE + .05) drawBarrelView(t);
    else if (t < T_CUT) drawSideView(t);
    else if (t < T_SHATTER + .9) {
      if (t < T_HIT) drawHeadOn(t);
      else { ctx.fillStyle = '#050505'; ctx.fillRect(-40, -40, W + 80, H + 80); }
    } else { ctx.fillStyle = '#050505'; ctx.fillRect(-40, -40, W + 80, H + 80); }
    if (t >= T_HIT) { drawMotes(t, ss(T_SHATTER, T_LOGO + .8, t) * .6); drawLogo(t); drawGlass(t); }
    // white-outs: out of shot 1 into the side view, and the cut to the head-on bullet
    const wo = Math.max(1 - lin(T_SIDE, T_SIDE + .3, t), 0) * (t >= T_SIDE ? 1 : 0) + Math.max(0, 1 - Math.abs(t - T_CUT) / .07) * .9;
    if (wo > 0) { ctx.save(); ctx.globalAlpha = clamp(wo, 0, 1); ctx.fillStyle = '#fff6ea'; ctx.fillRect(-40, -40, W + 80, H + 80); ctx.restore(); }

    // bloom: brightest parts, blurred by down-scaling, added back on top (calmer during white-outs)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const glow = 1 - .7 * clamp(wo, 0, 1);
    if (hq) {
      bA.filter = 'brightness(.62) contrast(3)'; bA.drawImage(canvas, 0, 0, bloomA.width, bloomA.height); bA.filter = 'none';
      bB.drawImage(bloomA, 0, 0, bloomB.width, bloomB.height);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = .17 * glow; ctx.drawImage(bloomA, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = .24 * glow; ctx.drawImage(bloomB, 0, 0, canvas.width, canvas.height);
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
  warm([...smoke, mote, spark, vignette, gunFrame, barrel, slide, bulletSide, casing, front]);
  // Render one frame of every shot up front (the screen is still black) so first-use costs never stall a scene.
  for (const t of [1.0, 1.4, 1.8, 2.3, 3.8, 4.9, 5.5, 6.2]) frame(t);
  window.addEventListener('resize', resize);
  const start = performance.now(), STEP = 1000 / 60;
  let raf = 0, last = -1e9, due = 0, slow = 0, frames = 0;
  function tick(now) {
    if (!canvas.isConnected) return;
    raf = requestAnimationFrame(tick);
    // steady 60 fps: on 120/144 Hz screens the extra vsyncs are skipped, keeping an average of exactly 60 renders a second
    if (now < due - 3) return;
    due = now - due > STEP ? now + STEP : due + STEP;
    const gap = now - last; last = now;
    const t = reduced ? DUR : Math.min(DUR, (now - start) / 1000);
    frame(t);
    // more than a third of the last 30 frames late: switch to the lighter mode once
    if (hq && t > .5) { frames++; if (gap > 24) slow++; if (frames >= 30) { if (slow > 10) { hq = false; resize(); } frames = slow = 0; } }
    if (t >= DUR) cancelAnimationFrame(raf);
  }
  raf = requestAnimationFrame(tick);
  // Test/preview hook: render any moment (used by the frame captures).
  window.H1tGunBoot = { renderAt: (t) => { cancelAnimationFrame(raf); frame(t); }, duration: DUR, ready: () => !!logo };
})();
