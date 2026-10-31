'use strict';
// H1T.CC boot animation for the dark design (about 5.8 s, canvas, steady 60 fps): an eye made of code.
//   1 Wake       – rows of the tweaker's own code stream across the tweaker's black (#050505); a curved seam of code (the shut eye) draws itself
//   2 Open       – the upper lid lifts: the white is rows of code along the lids, the iris rings of glowing blue code
//                  around a large dark pupil; it looks right, left, blinks, then looks at you (it follows the mouse)
//   3 Close      – the camera pushes into the iris until it fills the screen, the lids shut into a thick band of code,
//                  the band pulls back into a thin curved line
//   4 Into app   – as soon as the tweaker is ready, the wide line slowly opens like waking up and the tweaker is what
//                  the eye sees, first over-exposed, then clear (the canvas cuts the hole, the app shows through).
//                  If the app needs longer, the line breathes.
// Everything is drawn in code; the code textures are pre-rendered once into sprites and each frame only composes
// them. Active only when <html> has .eye-boot (halloween-boot-head.js picks it and sets H1T_BOOT_MS).
(() => {
  if (!document.documentElement.classList.contains('eye-boot')) return;
  const splash = document.getElementById('splash');
  if (!splash) return;
  const W = 1280, H = 720, DUR = 5.8;
  const T_SEAM = .3, T_OPEN = 1.0, T_LOOK = 1.8, T_BLINK = 2.6, T_STARE = 2.85, T_ZOOM = 3.55, T_CLOSE = 4.45, T_LINE = 4.85;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'eye-boot-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  splash.append(canvas);
  const ctx = canvas.getContext('2d');

  // ---------- helpers ----------
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const ss = (a, b, t) => { const u = clamp((t - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
  const lin = (a, b, t) => clamp((t - a) / (b - a), 0, 1);
  const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
  const easeIn = (u) => Math.pow(clamp(u, 0, 1), 3);
  const mix = (a, b, k) => a + (b - a) * k;
  const TAU = Math.PI * 2;
  let seed = 31102026;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 100000) / 100000; };
  const pick = (a) => a[(rnd() * a.length) | 0];
  const sprite = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };

  // the tweaker's own vocabulary: tweak ids, registry paths, backend calls
  const WORDS = ['Set-ItemProperty', 'HKLM:\\SYSTEM\\CurrentControlSet', 'Win32PrioritySeparation', 'NetworkThrottlingIndex', 'SystemResponsiveness',
    'Get-TweakerCatalog', 'Invoke-Tweak', 'GameDVR_Enabled', 'HwSchMode', 'TcpAckFrequency', 'TCPNoDelay', 'powercfg /setactive', 'bcdedit /set',
    'disabledynamictick yes', 'MouseSpeed = 0', 'keyboard.mouse.precision', 'Start-Process', 'fivem.exe', 'Clear-Cache', 'Restore-Backup',
    'SafeMode.ps1', 'Optimization.ps1', 'Test-Path', 'return @{ ok = $true }', '{"ok":true}', 'license.verify()', 'device_proof', 'sha256',
    'GlobalTimerResolutionRequests', 'Tweaker.psm1', 'Get-CimInstance', 'Win32_VideoController', 'MMCSS', 'Priority = 6', 'Affinity',
    'Stop-Service SysMain', 'DiagTrack', 'reg add', '/v Start /t REG_DWORD /d 4', 'for ($i = 0; $i -lt $n; $i++)', 'if (-not $ok) { throw }',
    'H1T.CC', 'tweak.apply()', 'backup.create()', 'await bridge.status()', 'const fps = 60', 'Invoke-Optimization', 'gpu.preference = 2'];
  const codeLine = (n) => { let s = ''; while (s.length < n) s += pick(WORDS) + pick(['  ', ' ; ', ' = ', ' . ', '  -> ', ' | ']); return s.slice(0, n); };

  // ---------- sprites ----------
  const vignette = sprite(W, H, (g) => {
    const grd = g.createRadialGradient(W / 2, H / 2, 240, W / 2, H / 2, 820);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,.78)'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
  });
  // background: dim grey rows of code on the tweaker's black, taller than the screen so it can drift
  const BG_H = H * 2;
  const bgCode = sprite(W, BG_H, (g) => {
    g.font = '10px Consolas, "Cascadia Mono", monospace'; g.textBaseline = 'middle';
    for (let y = 8; y < BG_H; y += 13) {
      let x = -rnd() * 200;
      while (x < W) {
        const s = codeLine(8 + ((rnd() * 40) | 0)), a = .08 + rnd() * .22;
        const c = 170 + rnd() * 60 | 0; g.fillStyle = `rgba(${c},${c},${c + 6},${a})`; g.fillText(s, x, y);
        x += g.measureText(s).width + 20 + rnd() * 120;
      }
    }
  });

  // the eye: almond outline, half-width EW, half-height EH; lower lid a little flatter
  const EW = 580, EH = 205, LOW = .82;
  const lidH = (x) => { const u = clamp(Math.abs(x) / EW, 0, 1); return EH * Math.pow(1 - u * u, .95) * (1 + .1 * (x / EW)); };
  // the white: rows of code following the lids, brightest at the lid edges, gaps here and there
  const SK = 1.5, SW = (EW * 2 + 300) * SK, SH = (EH * 2.3 + 40) * SK, SCX = SW / 2, SCY = SH / 2;
  const sclera = sprite(SW, SH, (g) => {
    g.translate(SCX, SCY); g.scale(SK, SK);
    g.textBaseline = 'middle';
    const ROWS = 19;
    for (const side of [-1, 1]) for (let k = ROWS; k >= 1; k--) {
      const r = k / ROWS, rowY = (x) => side * lidH(x) * r * (side > 0 ? LOW : 1);
      const edge = k === ROWS, size = edge ? 12 : 8 + 2 * r;
      g.font = `${edge ? 700 : 500} ${size}px Consolas, "Cascadia Mono", monospace`;
      let x = -EW + 4 + rnd() * 14;
      while (x < EW - 4) {
        const len = 3 + ((rnd() * 9) | 0), s = codeLine(len), w = g.measureText(s).width;
        if (x + w > EW - 2) break;
        if (rnd() < (edge ? .03 : .1)) { x += w + 6; continue; } // gaps
        const xm = x + w / 2, ang = Math.atan2(rowY(x + w) - rowY(x), w), a = edge ? 1 : .62 + .38 * Math.pow(r, .8) * (.7 + .3 * rnd());
        g.save(); g.translate(xm, rowY(xm)); g.rotate(ang);
        g.shadowColor = 'rgba(190,225,255,.8)'; g.shadowBlur = edge ? 8 : 3;
        const c = 228 + rnd() * 27 | 0; g.fillStyle = `rgba(${c - 18},${c - 4},255,${a})`; g.fillText(s, -w / 2, 0); g.restore();
        x += w + 2 + rnd() * 3;
      }
    }
    // the long tapered corners
    g.strokeStyle = 'rgba(240,240,240,.9)'; g.lineCap = 'round';
    for (const [x0, x1, w] of [[-EW, -EW - 150, 2.2], [EW, EW + 110, 1.8]]) { g.lineWidth = w; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x1, 2); g.stroke(); }
  });
  // the iris: rings of glowing blue code around a dark pupil, radial strands, a dark limbal ring (the only colour in the eye)
  const IR = 228, PR = 100, IK = 2, IS = IR * 2 * IK + 40;
  const iris = sprite(IS, IS, (g) => {
    g.translate(IS / 2, IS / 2); g.scale(IK, IK);
    let grd = g.createRadialGradient(0, 0, PR * .8, 0, 0, IR);
    grd.addColorStop(0, '#1fb4e6'); grd.addColorStop(.45, '#0f7fd0'); grd.addColorStop(1, '#0a3595');
    g.fillStyle = grd; g.beginPath(); g.arc(0, 0, IR, 0, TAU); g.arc(0, 0, PR * .9, 0, TAU, true); g.fill();
    // radial strands
    for (let i = 0; i < 520; i++) {
      const a = rnd() * TAU, r0 = PR + rnd() * 20, r1 = r0 + 30 + rnd() * (IR - r0 - 20);
      g.strokeStyle = `rgba(${90 + rnd() * 140 | 0},${200 + rnd() * 55 | 0},255,${.2 + rnd() * .4})`; g.lineWidth = .6 + rnd() * 1.6;
      g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.stroke();
    }
    // rings of code
    g.textBaseline = 'middle';
    for (let r = PR + 6; r < IR - 3; r += 6.2) {
      const k = (r - PR) / (IR - PR), size = 6.4 + 1.8 * (1 - k);
      g.font = `600 ${size}px Consolas, "Cascadia Mono", monospace`;
      let a = rnd() * TAU; const end = a + TAU;
      while (a < end) {
        const s = codeLine(2 + ((rnd() * 7) | 0)), w = g.measureText(s).width, da = (w + 4) / r;
        if (rnd() < .9) {
          g.save(); g.rotate(a + da / 2); g.translate(r, 0); g.rotate(Math.PI / 2);
          const lum = 1 - k * .55;
          g.shadowColor = 'rgba(80,220,255,.95)'; g.shadowBlur = 4;
          g.fillStyle = `rgba(${mix(70, 215, lum) | 0},${mix(205, 255, lum) | 0},255,${.7 + .3 * rnd()})`; g.fillText(s, -w / 2, 0); g.restore();
        }
        a += da + rnd() * .04;
      }
    }
    // bright collarette around the pupil and the dark limbal ring at the edge
    grd = g.createRadialGradient(0, 0, PR, 0, 0, PR + 26); grd.addColorStop(0, 'rgba(190,250,255,.55)'); grd.addColorStop(1, 'rgba(120,220,255,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(0, 0, PR + 26, 0, TAU); g.arc(0, 0, PR, 0, TAU, true); g.fill();
    grd = g.createRadialGradient(0, 0, IR - 16, 0, 0, IR + 2); grd.addColorStop(0, 'rgba(4,10,40,0)'); grd.addColorStop(1, 'rgba(4,10,40,.4)');
    g.fillStyle = grd; g.beginPath(); g.arc(0, 0, IR + 2, 0, TAU); g.fill();
  });
  const irisGlow = sprite(IS, IS, (g) => { g.filter = 'blur(18px) brightness(1.7) saturate(1.3)'; g.drawImage(iris, 0, 0); });

  // ---------- gaze: scripted looks, then it follows the mouse ----------
  let mouseX = W / 2, mouseY = H / 2, hasMouse = false;
  window.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect(); if (!r.width) return;
    const sx = canvas.width / r.width, sy = canvas.height / r.height;
    mouseX = ((e.clientX - r.left) * sx - fitX) / fitS; mouseY = ((e.clientY - r.top) * sy - fitY) / fitS; hasMouse = true;
  }, { passive: true });
  // Saccades: the gaze jumps quickly between targets (≈90 ms) and holds; a fine tremor never stops.
  // [time, x, y] in eye units; the blink at T_BLINK falls between two jumps.
  const SACCADES = [[T_OPEN + .55, 0, 0], [T_LOOK, 168, -10], [T_LOOK + .3, 168, -10], [T_LOOK + .4, -150, 22], [T_LOOK + .62, -150, 22], [T_LOOK + .7, 95, -36],
    [T_BLINK - .02, 95, -36], [T_BLINK + .14, -175, 8], [T_BLINK + .42, -175, 8], [T_STARE + .2, 40, 30], [T_STARE + .4, 40, 30], [T_STARE + .5, 0, 0]];
  function saccade(t) {
    let gx = 0, gy = 0;
    for (let i = 1; i < SACCADES.length; i++) {
      const [ta, xa, ya] = SACCADES[i - 1], [tb, xb, yb] = SACCADES[i];
      if (t < ta) break;
      // fast, with a tiny overshoot at the end of each jump
      const d = Math.min(.09, tb - ta), u = lin(ta, ta + d, t), k = u >= 1 ? 1 : 1 - Math.pow(1 - u, 3) + Math.sin(u * Math.PI) * .06;
      gx = mix(xa, xb, k); gy = mix(ya, yb, k);
    }
    return [gx, gy];
  }
  function gaze(t) {
    let [gx, gy] = saccade(t);
    if (hasMouse && t > T_STARE + .5) {
      const k = ss(T_STARE + .5, T_STARE + .7, t) * (1 - ss(T_ZOOM - .1, T_ZOOM + .3, t));
      gx = mix(gx, clamp((mouseX - W / 2) * .3, -175, 175), k); gy = mix(gy, clamp((mouseY - H / 2) * .22, -40, 40), k);
    }
    // micro tremor
    gx += Math.sin(t * 37) * 1.4 + Math.sin(t * 23 + 1) * 1.1; gy += Math.cos(t * 31) * 1.2;
    return [gx, gy];
  }
  // the whole eye floats and turns a little with its gaze, like a head following the look
  function eyeSway(t, gx, gy) {
    return [Math.sin(t * .9) * 16 + gx * .1, Math.sin(t * 1.3 + .5) * 7 + gy * .12, Math.sin(t * .7) * .022 + gx * .00008];
  }

  // ---------- drawing ----------
  function drawBackground(t, a, tint = 1) {
    if (a <= 0) return;
    const grd = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 820);
    // the tweaker's own black (#050505), only a faint lift behind the eye
    grd.addColorStop(0, `rgb(${14 * tint | 0},${14 * tint | 0},${15 * tint | 0})`); grd.addColorStop(.6, `rgb(${7 * tint | 0},${7 * tint | 0},${7 * tint | 0})`);
    grd.addColorStop(1, `rgb(${5 * tint | 0},${5 * tint | 0},${5 * tint | 0})`);
    ctx.globalAlpha = a; ctx.fillStyle = grd; ctx.fillRect(-40, -40, W + 80, H + 80);
    // rows of code stream sideways: a far, slow layer and a near, faster one (wraps around the sprite width)
    const flicker = .9 + .1 * Math.sin(t * 7);
    for (const [speed, alpha, y0] of [[38, .55, 0], [95, .8, -H * .5]]) {
      const off = (t * speed) % W;
      ctx.globalAlpha = a * alpha * flicker * tint;
      ctx.drawImage(bgCode, -off, y0); ctx.drawImage(bgCode, W - off, y0);
    }
    ctx.globalAlpha = 1;
  }
  // The lids. Shut, the eye is a gently sagging line (‿) on the lower lid's curve; opening lifts the upper lid off it.
  const SAG = .42;
  const shutY = (x) => lidH(x) * LOW * SAG;
  const upperY = (x, open) => -lidH(x) * open + shutY(x) * (1 - open);
  const lowerY = (x, open) => lidH(x) * LOW * open + shutY(x) * (1 - open);
  // aperture between the lids for an eye at (cx, cy), scale s, opening `open`; `k` < 1 gives a smaller inner window
  function aperture(cx, cy, s, open, k = 1) {
    const p = new Path2D(), n = 56;
    for (let i = 0; i <= n; i++) { const x = -EW + (2 * EW * i) / n, m = shutY(x) * (1 - open); p[i ? 'lineTo' : 'moveTo'](cx + x * s, cy + (m + (upperY(x, open) - m) * k) * s); }
    for (let i = n; i >= 0; i--) { const x = -EW + (2 * EW * i) / n, m = shutY(x) * (1 - open); p.lineTo(cx + x * s, cy + (m + (lowerY(x, open) - m) * k) * s); }
    p.closePath(); return p;
  }
  // the white: squashed with the lids and bent onto the shut line, drawn in vertical strips
  const STRIPS = 50;
  function drawSclera(cx, cy, s, open) {
    const op = Math.max(open, .012), sw = (2 * EW + 300) / STRIPS;
    for (let i = 0; i < STRIPS; i++) {
      const x0 = -EW - 150 + i * sw, xm = x0 + sw / 2, dy = shutY(clamp(xm, -EW, EW)) * (1 - op);
      ctx.drawImage(sclera, (x0 + SCX / SK) * SK, 0, sw * SK + 1, SH, cx + x0 * s, cy + (dy - SCY / SK * op) * s, sw * s + .6, SH / SK * op * s);
    }
  }
  function drawEye(t, cx, cy, s, open, gx, gy, opts = {}) {
    drawSclera(cx, cy, s, open);
    const ap = aperture(cx, cy, s, Math.max(open, .012));
    const irisA = opts.irisA ?? 1;
    if (open > .04 && !opts.noIris && irisA > 0) {
      // iris and pupil, clipped by the lids
      const ix = cx + gx * s, iy = cy + gy * s + shutY(gx) * (1 - open) * s, ir = IR * s, pad = 20 * s;
      ctx.save(); ctx.clip(ap);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .9 * irisA; ctx.drawImage(irisGlow, ix - ir - pad, iy - ir - pad, (ir + pad) * 2, (ir + pad) * 2);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = irisA;
      // looking sideways the round iris is seen at an angle: squash it along the gaze
      const fx = 1 - Math.min(.2, Math.abs(gx) / EW * .32), fy = 1 - Math.min(.12, Math.abs(gy) / EH * .2);
      ctx.save(); ctx.translate(ix, iy); ctx.scale(fx, fy); ctx.rotate(t * .08); ctx.drawImage(iris, -ir - pad, -ir - pad, (ir + pad) * 2, (ir + pad) * 2); ctx.restore();
      const pr = PR * s * (opts.pupil || 1);
      ctx.save(); ctx.translate(ix, iy); ctx.scale(fx, fy);
      const pg = ctx.createRadialGradient(0, 0, pr * .6, 0, 0, pr * 1.06); pg.addColorStop(0, '#03061a'); pg.addColorStop(.86, '#07103a'); pg.addColorStop(1, 'rgba(10,30,90,0)');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, pr * 1.06, 0, TAU); ctx.fill(); ctx.restore();
      ctx.restore();
    }
    // data flowing through the white: soft pulses of light travel along the rows of code
    if (open > .04) {
      ctx.save(); ctx.clip(ap); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const u = ((t * .55 + i / 3) % 1), px = cx + (-EW - 200 + u * (2 * EW + 400)) * s;
        const pg = ctx.createLinearGradient(px - 160 * s, 0, px + 160 * s, 0);
        pg.addColorStop(0, 'rgba(150,215,255,0)'); pg.addColorStop(.5, `rgba(170,225,255,${.22 * Math.min(1, open * 2)})`); pg.addColorStop(1, 'rgba(150,215,255,0)');
        ctx.fillStyle = pg; ctx.fillRect(px - 160 * s, cy - EH * 1.2 * s, 320 * s, EH * 2.4 * s);
      }
      ctx.restore();
    }
    // the lid edges: a glowing line of light along the aperture
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
    ctx.strokeStyle = `rgba(180,220,255,${open < .1 ? .3 : .18})`; ctx.lineWidth = 9 * s; ctx.stroke(ap);
    ctx.strokeStyle = 'rgba(250,250,250,.6)'; ctx.lineWidth = 1.6 * s; ctx.stroke(ap);
    ctx.restore();
  }
  // the shut eye drawing itself outwards from the centre, with a soft glow along its curve
  function drawSeam(t, t0, s, open = .014) {
    const u = easeOut(lin(t0, t0 + .55, t)); if (u <= 0) return;
    ctx.save(); ctx.beginPath(); ctx.rect(W / 2 - (EW + 90) * s * u, 0, (EW + 90) * 2 * s * u, H); ctx.clip();
    drawEye(t, W / 2, H / 2, s, open, 0, 0, { noIris: true });
    const line = new Path2D(); for (let i = 0; i <= 40; i++) { const x = -EW + (2 * EW * i) / 40; line[i ? 'lineTo' : 'moveTo'](W / 2 + x * s, H / 2 + shutY(x) * s); }
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalAlpha = (1 - lin(t0 + .3, t0 + .9, t) * .5) * (t > t0 + .9 ? .85 + .15 * Math.sin((t - t0) * 5) : 1);
    ctx.strokeStyle = 'rgba(220,220,225,.18)'; ctx.lineWidth = 26; ctx.stroke(line);
    ctx.strokeStyle = 'rgba(245,245,245,.32)'; ctx.lineWidth = 8; ctx.stroke(line);
    ctx.restore();
  }
  // horizontal glitch: slices of the frame jump sideways for a moment
  function glitch(amount, t) {
    if (amount < .02) return;
    const n = 7, f = (t * 30) | 0;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < n; i++) {
      const r = Math.sin(f * 12.9898 + i * 78.233) * 43758.5453, k = r - Math.floor(r);
      const y = (k * canvas.height) | 0, h = (6 + k * 40) * fitS | 0, dx = ((k - .5) * 90 * amount * fitS) | 0;
      if (h > 0 && y + h < canvas.height) ctx.drawImage(canvas, 0, y, canvas.width, h, dx, y, canvas.width, h);
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
  // the final eye: like waking up, the wide line of code opens slowly and the tweaker appears in it, at first
  // over-exposed as if the eye still has to get used to the light (`reveal` 0..1 over REVEAL_MS)
  const SEAM_S = 1.25, Z_IRIS = 2.7, REVEAL_MS = 1700;
  const revealOpen = (r) => mix(.014, 2.3, Math.pow(ss(0, 1, r), 1.6));
  function drawReveal(t, r) {
    const open = revealOpen(r), sc = SEAM_S + .45 * ss(0, 1, r);
    drawBackground(t, 1 - ss(.55, 1, r));
    drawEye(t, W / 2, H / 2, sc, open, 0, 0, { noIris: true });
    // cut the window between the lids: only the outer rows of code stay, as the lids
    const hole = aperture(W / 2, H / 2, sc, open, .9);
    ctx.globalCompositeOperation = 'destination-out'; ctx.fill(hole); ctx.globalCompositeOperation = 'source-over';
    // the light of the tweaker floods in first and then settles
    const flood = (1 - ss(.15, .85, r)) * .78;
    if (flood > 0) {
      ctx.save(); ctx.clip(hole);
      const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 760); g.addColorStop(0, `rgba(255,255,255,${flood})`); g.addColorStop(1, `rgba(210,225,240,${flood * .75})`);
      ctx.fillStyle = g; ctx.fillRect(-40, -40, W + 80, H + 80); ctx.restore();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(235,235,240,.25)'; ctx.lineWidth = 12; ctx.stroke(hole); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.stroke(hole);
    ctx.restore();
  }
  function frame(t, reveal = 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(fitS, 0, 0, fitS, fitX, fitY);
    if (reveal) drawReveal(t, reveal);
    else {
      const [gx, gy] = gaze(t);
      // camera: a slow push while it stares, into the iris, then back out to the shut line
      const zin = ss(T_ZOOM, T_CLOSE, t), zout = ss(T_CLOSE + .35, T_LINE + .7, t);
      const push = 1 + .06 * ss(T_STARE, T_ZOOM, t), zoom = mix(push * mix(1, Z_IRIS, zin), SEAM_S, zout);
      const fx = mix(W / 2 + gx * zin, W / 2, zout), fy = mix(H / 2 + gy * zin, H / 2, zout);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-fx, -fy);
      drawBackground(t, ss(0, .45, t));
      ctx.restore();
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-fx, -fy);
      if (t < T_OPEN) drawSeam(t, T_SEAM, 1);
      else {
        const opening = easeOut(lin(T_OPEN, T_OPEN + .75, t));
        const blink = t > T_BLINK && t < T_BLINK + .24 ? Math.abs(Math.cos(((t - T_BLINK) / .24) * Math.PI)) : 1;
        // shut: into a thick band while zoomed in, which thins to the line as the camera pulls back
        const shut = 1 - ss(T_CLOSE, T_CLOSE + .4, t), band = mix(.1, .014, zout);
        // the upper lid follows the gaze: looking down it drops, looking up it lifts
        const open = Math.max(mix(.014, 1, opening) * blink * clamp(1 - gy * .0042, .8, 1.12) * shut, t > T_CLOSE ? band : 0);
        if (t < T_LINE + .7) {
          const [sx, sy, rot] = eyeSway(t, gx, gy), still = 1 - zin;
          ctx.translate(W / 2 + sx * still, H / 2 + sy * still); ctx.rotate(rot * still); ctx.translate(-W / 2, -H / 2);
          // as the lids shut, the iris sinks away behind the code band
          drawEye(t, W / 2, H / 2, 1, open, gx, gy, { irisA: t > T_CLOSE ? ss(.12, .35, open) : 1 });
        }
        else { ctx.restore(); ctx.save(); drawSeam(t, T_LINE + .7 - .9, SEAM_S); }
      }
      ctx.restore();
    }
    // glitches: when the eye wakes, at the blink, when it shuts, and as the final eye snaps open
    const gl = Math.max(Math.exp(-(((t - T_OPEN) / .06) ** 2)), Math.exp(-(((t - T_BLINK - .12) / .05) ** 2)) * .6, Math.exp(-(((t - T_CLOSE - .3) / .07) ** 2)) * .8, reveal > 0 ? Math.exp(-(((reveal - .06) / .04) ** 2)) * .5 : 0);
    // bloom: brightest parts, blurred by down-scaling, added back on top
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (hq && !reveal) {
      bA.clearRect(0, 0, bloomA.width, bloomA.height); bB.clearRect(0, 0, bloomB.width, bloomB.height);
      bA.filter = 'brightness(.55) contrast(4)'; bA.drawImage(canvas, 0, 0, bloomA.width, bloomA.height); bA.filter = 'none';
      bB.drawImage(bloomA, 0, 0, bloomB.width, bloomB.height);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = .2; ctx.drawImage(bloomA, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = .28; ctx.drawImage(bloomB, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    glitch(gl, t);
    if (!reveal) ctx.drawImage(vignette, 0, 0, canvas.width, canvas.height);
    // the last frames of the reveal fade out whatever is left of the lids
    if (reveal > .82) { ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = ss(.82, 1, reveal); ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    const fadeIn = 1 - ss(0, .3, t);
    if (fadeIn > 0 && !reveal) { ctx.globalAlpha = fadeIn; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
  }
  // Draw every sprite once into a hidden corner so the GPU uploads happen now, not mid-scene.
  function warm(list) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const c of list) ctx.drawImage(c, 0, 0, 1, 1);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 2, 2); ctx.restore();
  }

  // ---------- sound (synthesized, no audio files) ----------
  // A digital hum, data chatter while the eye looks around, a shimmer as it opens, ticks at the blink, a sucking
  // riser into the iris, a sub hit as the lids shut, and a deep cinematic "braam" as it opens onto the tweaker.
  // Off with the "Startanimation > Sound" switch in the settings (localStorage h1tBootSound = '0') and with reduced motion.
  let audio = null;
  function startSound(startMs) {
    try { if (reduced || localStorage.getItem('h1tBootSound') === '0') return; } catch { /* no storage: play */ }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ac = new AC();
    audio = { ac, ...buildSound(ac, ac.currentTime - (performance.now() - startMs) / 1000 + .03) };
    if (ac.state === 'suspended') ac.resume().catch(() => {});
  }
  function buildSound(ac, base) {
    const out = ac.createGain(), limiter = ac.createDynamicsCompressor(), verb = ac.createConvolver(), wet = ac.createGain();
    limiter.threshold.value = -6; limiter.knee.value = 4; limiter.ratio.value = 12; limiter.attack.value = .002; limiter.release.value = .2;
    out.gain.value = .5; out.connect(limiter).connect(ac.destination); wet.gain.value = .35; verb.connect(wet).connect(out);
    const ir = ac.createBuffer(2, ac.sampleRate * 2, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.8); }
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
    const tone = (t, type, f0, f1, dur, pts, rv = .4) => {
      const t0 = at(t), o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      shape(g, t0, pts); o.connect(g); send(g, rv); o.start(t0); o.stop(t0 + dur + .05);
    };
    // the hum of the machine while the eye is open
    tone(0, 'sine', 55, 52, T_LINE, [[.6, .16], [T_CLOSE, .16], [T_LINE - .05, 0]], .2);
    tone(0, 'sine', 110.5, 110, T_LINE, [[.6, .05], [T_CLOSE, .05], [T_LINE - .05, 0]], .2);
    // data chatter: bursts of tiny clicks while code scrolls and the eye looks around
    for (let i = 0; i < 70; i++) { const tt = .3 + Math.random() * (T_ZOOM - .3); hiss(tt, .012 + Math.random() * .02, 'bandpass', 3000 + Math.random() * 4000, 2500, 3, .05 + Math.random() * .06, .15, .001); }
    // the seam appears, the eye opens (a rising shimmer)
    hiss(T_SEAM, .7, 'bandpass', 2000, 6000, 2, .18, .5, .2);
    tone(T_OPEN - .05, 'sine', 330, 880, .8, [[.3, .1], [.8, 0]], .6); hiss(T_OPEN - .05, .8, 'highpass', 3000, 9000, .7, .2, .5, .3);
    // eye movements: soft swishes; the blink: two ticks
    for (const tt of [T_LOOK + .05, T_LOOK + .65]) hiss(tt, .3, 'bandpass', 900, 1600, 1.5, .1, .3, .08);
    for (const tt of [T_BLINK, T_BLINK + .2]) { hiss(tt, .03, 'highpass', 5000, 4000, 1, .3, .2, .001); tone(tt, 'sine', 1800, 1200, .06, [[.004, .1], [.06, 0]], .2); }
    // it looks at you: a low pulse
    tone(T_STARE, 'sine', 70, 48, .9, [[.02, .45], [.9, 0]], .5);
    // the push into the iris: a sucking riser; the lids slam shut: a sub hit; the band pulls back into the line
    hiss(T_ZOOM - .1, T_CLOSE - T_ZOOM + .4, 'bandpass', 200, 5000, 1.4, .45, .4, .7);
    tone(T_ZOOM, 'sawtooth', 90, 300, T_CLOSE - T_ZOOM + .3, [[.2, .03], [T_CLOSE - T_ZOOM + .25, .07], [T_CLOSE - T_ZOOM + .3, 0]], .4);
    tone(T_CLOSE + .32, 'sine', 120, 28, 1.2, [[.01, .7], [1.2, 0]], .6); hiss(T_CLOSE + .32, .25, 'lowpass', 1800, 200, .7, .4, .5, .002);
    hiss(T_CLOSE + .4, .9, 'bandpass', 4000, 1200, 2, .14, .5, .3);
    const revealSound = (t0) => {
      // the eye slowly opens onto the tweaker: a deep braam (detuned saws through an opening low-pass) and a shimmer
      const tb = t0 + .05, lp = ac.createBiquadFilter(), g = ac.createGain(); lp.type = 'lowpass'; lp.Q.value = 3; lp.frequency.setValueAtTime(160, tb); lp.frequency.exponentialRampToValueAtTime(1500, tb + 1.1); lp.frequency.exponentialRampToValueAtTime(300, tb + 2.6);
      shape(g, tb, [[.6, .2], [1.5, .14], [2.6, 0]]); lp.connect(g); send(g, .7);
      for (const [hz, v] of [[43.65, 1], [65.4, .8], [87.3, .6], [130.8, .35]]) for (const det of [-7, 0, 7]) { const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = hz; o.detune.value = det; og.gain.value = v * .35; o.connect(og).connect(lp); o.start(tb); o.stop(tb + 2.7); }
      const f = ac.createBiquadFilter(), hg = ac.createGain(); f.type = 'highpass'; f.frequency.setValueAtTime(3000, tb); f.frequency.exponentialRampToValueAtTime(9000, tb + 1.4);
      env(hg, tb, .16, 1.6, .9); noiseSrc(tb, 1.6).connect(f).connect(hg); send(hg, .6);
    };
    return { out, revealSound };
  }
  function stopSound() {
    if (!audio) return;
    const { ac, out } = audio; audio = null;
    try { out.gain.setTargetAtTime(0, ac.currentTime, .06); setTimeout(() => ac.close().catch(() => {}), 400); } catch { /* already closed */ }
  }

  resize();
  warm([bgCode, sclera, iris, irisGlow, vignette]);
  // Render one frame of every act up front (the screen is still black) so first-use costs never stall a scene.
  for (const t of [.6, 1.5, 2.8, 3.8, 4.6, 5.2, 5.7]) frame(t);
  for (const r of [.15, .5, .9]) frame(5.8, r);
  window.addEventListener('resize', resize);
  const start = performance.now(), STEP = 1000 / 60;
  startSound(start);
  let raf = 0, last = -1e9, due = 0, slow = 0, frames = 0, revealStart = 0;
  function tick(now) {
    if (!canvas.isConnected) { stopSound(); return; }
    raf = requestAnimationFrame(tick);
    // steady 60 fps: on 120/144 Hz screens the extra vsyncs are skipped, keeping an average of exactly 60 renders a second
    if (now < due - 3) return;
    due = now - due > STEP ? now + STEP : due + STEP;
    const gap = now - last; last = now;
    // once the app starts hiding the splash, the giant eye opens wide and reveals the tweaker behind it
    if (splash.classList.contains('out')) {
      if (!revealStart) { revealStart = now; try { audio?.revealSound?.(audio.ac.currentTime); } catch { /* no sound */ } setTimeout(stopSound, 3200); }
      frame((now - start) / 1000, lin(0, REVEAL_MS, now - revealStart));
      return;
    }
    // after DUR the seam keeps breathing until the app is ready
    const t = reduced ? DUR : (now - start) / 1000;
    frame(t);
    // more than a third of the last 30 frames late: switch to the lighter mode once
    if (hq && t > .5) { frames++; if (gap > 24) slow++; if (frames >= 30) { if (slow > 10) { hq = false; resize(); } frames = slow = 0; } }
  }
  raf = requestAnimationFrame(tick);
  // Test/preview hooks: render any moment (used by the frame captures), the reveal, and the soundtrack offline.
  window.H1tEyeBoot = {
    renderAt: (t, reveal = 0) => { cancelAnimationFrame(raf); frame(t, reveal); }, duration: DUR, ready: () => true,
    look: (x, y) => { mouseX = x; mouseY = y; hasMouse = true; },
    renderSound: async () => { const oc = new OfflineAudioContext(2, 44100 * 9, 44100); buildSound(oc, 0).revealSound(5.9); return oc.startRendering(); },
  };
})();
