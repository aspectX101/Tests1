// H1T.CC "QuickFlash" logo animation. Deterministic: renderAt(t) draws exactly the frame at time t (seconds),
// so the preview plays it in real time and the export renders it frame by frame.
// createQuickFlash(canvas, logoImage, { transparent }) → { renderAt, DUR, CUES }
(function (root) {
  'use strict';
  const W = 1920, H = 1080, DUR = 4.6;
  const T0 = 0.42;   // impact
  const T2 = 2.2;    // second hit
  // sound cues (seconds) — the audio script reads these
  const CUES = { riser: [0, T0], impact: T0, sweep: T0 + 0.24, strobe: [T0 + 0.62, T0 + 0.7], glint: T0 + 1.02, hit2: T2, sweep2: T2 + 0.06, glint2: T2 + 0.62, end: DUR };

  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIn = (x) => Math.pow(clamp(x), 2.4);
  const decay = (u, tau) => (u < 0 ? 0 : Math.exp(-u / tau));
  function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function createQuickFlash(canvas, logo, { transparent = false } = {}) {
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const LW = 1040, LH = Math.round(LW * logo.height / logo.width);
    const CX = W / 2, CY = H / 2 - 14;
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

    // ---- prepared layers (all at final logo size, with padding for glows) ----
    const PAD = 260;
    const layer = (fn) => { const c = mk(LW + 2 * PAD, LH + 2 * PAD); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; fn(x, c); return c; };
    const LOGO = layer((x) => x.drawImage(logo, PAD, PAD, LW, LH));
    const fillIn = (color) => layer((x, c) => { x.drawImage(LOGO, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); });
    const SIL = fillIn('#fff');
    const BLK = fillIn('#000');
    const chan = (color) => layer((x, c) => { x.drawImage(LOGO, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); x.globalCompositeOperation = 'destination-in'; x.drawImage(LOGO, 0, 0); });
    const RED = chan('#ff0000'), GRN = chan('#00ff00'), BLU = chan('#0000ff');
    const blurred = (src, px) => layer((x) => { x.filter = `blur(${px}px)`; x.drawImage(src, 0, 0); });
    const GLOW_S = blurred(SIL, 14), GLOW_M = blurred(SIL, 36), GLOW_L = blurred(SIL, 80);
    // floor reflection: flipped logo, fading out downwards
    const REF = layer((x, c) => {
      x.save(); x.translate(0, c.height); x.scale(1, -1); x.drawImage(LOGO, 0, 0); x.restore();
      x.globalCompositeOperation = 'destination-in';
      const g = x.createLinearGradient(0, PAD, 0, PAD + LH * 0.55);
      g.addColorStop(0, 'rgba(0,0,0,0.42)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    });
    const SWEEP = mk(LOGO.width, LOGO.height), sx = SWEEP.getContext('2d');
    // film grain tile
    const GRAIN = mk(256, 256);
    { const g = GRAIN.getContext('2d'), d = g.createImageData(256, 256), r = rng(7);
      for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      g.putImageData(d, 0, 0); }

    // ---- particles (seeded, so every render is identical) ----
    const r = rng(1337);
    const inflow = Array.from({ length: 90 }, () => ({ a: r() * Math.PI * 2, r0: 650 + r() * 700, s: r() * 0.22, w: 1 + r() * 2.2, l: 40 + r() * 140 }));
    const burst = (n, seed, power) => { const q = rng(seed); return Array.from({ length: n }, () => {
      const a = q() * Math.PI * 2, sp = (450 + Math.pow(q(), 2) * 2300) * power;
      const e = 0.46 + q() * 0.1; return { x: Math.cos(a) * LW * e, y: Math.sin(a) * LH * e, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.62, life: 0.4 + q() * 0.95, w: 1.2 + q() * 2.6, d: q() * 0.05, warm: q() < 0.25 };
    }); };
    const SPARKS = burst(170, 99, 1), SPARKS2 = burst(60, 5, 0.65);
    const dust = Array.from({ length: 110 }, () => ({ x: r() * W, y: r() * H, z: 0.3 + r() * 0.7, ph: r() * 6.28, sp: 6 + r() * 16 }));
    const glitchSeed = (f) => rng(f * 7919 + 3);

    // draw an image prepared with PAD around the logo, in logo space (centre, scale, offset)
    const at = (img, s, dx, dy, alpha = 1, op = 'source-over') => {
      if (alpha <= 0.002) return;
      ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.globalCompositeOperation = op;
      ctx.translate(CX + dx, CY + dy); ctx.scale(s, s); ctx.drawImage(img, -LW / 2 - PAD, -LH / 2 - PAD); ctx.restore();
    };
    const lp = (fx, fy) => [(fx - 0.5) * LW, (fy - 0.5) * LH];   // point on the logo (fractions of its box)

    function streak(x, y, len, thick, alpha, tint = '255,255,255') {
      if (alpha <= 0.002) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); ctx.scale(len / 2, thick);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, `rgba(${tint},${alpha})`); g.addColorStop(0.25, `rgba(${tint},${alpha * 0.35})`); g.addColorStop(1, `rgba(${tint},0)`);
      ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
    }
    function star(x, y, size, alpha, rot = 0) {
      if (alpha <= 0.002) return;
      streak(x, y, size * 7, size * 0.09, alpha);
      streak(x, y, size * 0.09 * 2, size * 2.2, alpha * 0.8);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); ctx.rotate(rot + Math.PI / 4);
      for (let k = 0; k < 2; k++) { ctx.rotate(Math.PI / 2); ctx.save(); ctx.scale(size * 1.1, size * 0.05);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, `rgba(255,255,255,${alpha * 0.7})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore(); }
      const c = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.55);
      c.addColorStop(0, `rgba(255,255,255,${alpha})`); c.addColorStop(0.3, `rgba(235,240,255,${alpha * 0.5})`); c.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    function ring(u, dur, maxR, width, alpha) {
      const p = u / dur; if (p <= 0 || p >= 1) return;
      const rr = 60 + maxR * ease(p), a = alpha * Math.pow(1 - p, 1.8), w = width * (1 + p * 2.5);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(CX, CY + 30); ctx.scale(1, 0.34);
      const g = ctx.createRadialGradient(0, 0, Math.max(0, rr - w * 3), 0, 0, rr + w);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.72, `rgba(230,236,255,${a * 0.18})`);
      g.addColorStop(0.92, `rgba(255,255,255,${a * 0.55})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rr + w, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    function sparks(list, u, s, ox, oy) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (const p of list) {
        const a = u - p.d; if (a <= 0 || a > p.life) continue;
        const k = 2.4, e = Math.exp(-k * a), f = (1 - e) / k;
        const x = CX + ox + p.x * s + p.vx * f, y = CY + oy + p.y * s + p.vy * f + 520 * a * a;
        const vx = p.vx * e, vy = p.vy * e + 1040 * a, tail = 0.028 + 0.02 * (1 - a / p.life);
        const al = Math.pow(1 - a / p.life, 1.4);
        ctx.strokeStyle = p.warm ? `rgba(255,236,205,${al})` : `rgba(255,255,255,${al})`;
        ctx.lineWidth = p.w * (0.5 + 0.5 * (1 - a / p.life));
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - vx * tail, y - vy * tail); ctx.stroke();
      }
      ctx.restore();
    }
    function sweep(p, s, dx, dy, width, alpha, dir = 1) {
      if (p <= -0.2 || p >= 1.2 || alpha <= 0) return;
      sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = 'source-over'; sx.clearRect(0, 0, SWEEP.width, SWEEP.height);
      const x0 = PAD - 200 + (LW + 400) * (dir > 0 ? p : 1 - p);
      sx.save(); sx.translate(x0, SWEEP.height / 2); sx.rotate(0.38);
      const g = sx.createLinearGradient(-width, 0, width, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.42, 'rgba(255,255,255,0.55)'); g.addColorStop(0.5, 'rgba(255,255,255,1)');
      g.addColorStop(0.58, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      sx.fillStyle = g; sx.fillRect(-width, -SWEEP.height, width * 2, SWEEP.height * 2);
      sx.fillStyle = 'rgba(255,255,255,0.35)'; sx.fillRect(width * 1.6, -SWEEP.height, width * 0.22, SWEEP.height * 2);
      sx.restore();
      sx.globalCompositeOperation = 'destination-in'; sx.drawImage(LOGO, 0, 0);
      at(SWEEP, s, dx, dy, alpha, 'lighter');
    }

    function renderAt(t) {
      const u = t - T0, u2 = t - T2, frame = Math.round(t * 60);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);

      // ---- levels ----
      const hit = decay(u, 0.22), hit2 = decay(u2, 0.18);
      const glow = (u < 0 ? 0.25 * easeIn(t / T0) : 0.2 + 0.75 * hit + 0.4 * hit2) + (u > 0.6 ? 0.035 * Math.sin(t * 3.1) : 0);
      // scale: slams in from big with a springy settle, then a slow push-in
      const spring = u < 0 ? 0 : 0.55 * Math.exp(-u * 12) * Math.cos(u * 15);
      const s = 1 + spring + 0.035 * ease((t - T0 - 0.4) / (DUR - T0)) + 0.012 * hit2 * Math.cos(u2 * 30);
      const shakeA = 20 * decay(u, 0.11) + 7 * decay(u2, 0.08);
      const dx = shakeA * Math.sin(t * 52.3) * Math.cos(t * 13.1), dy = shakeA * 0.8 * Math.sin(t * 44.7 + 1.3);
      const split = 26 * decay(u, 0.09) + 9 * decay(u2, 0.07);

      // ---- background ----
      if (!transparent) {
        ctx.fillStyle = '#030303'; ctx.fillRect(0, 0, W, H);
        const bg = ctx.createRadialGradient(CX, CY, 0, CX, CY, 1050);
        const bgA = 0.38 + 0.55 * hit + 0.25 * hit2;
        bg.addColorStop(0, `rgba(46,46,52,${bgA})`); bg.addColorStop(0.45, `rgba(22,22,26,${bgA * 0.6})`); bg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        // faint horizon line the logo stands on
        if (u > 0) { const hy = CY + LH / 2 * s + 22; const hg = ctx.createLinearGradient(CX - 900, 0, CX + 900, 0);
          const ha = 0.1 * ease(u / 0.6) + 0.25 * hit; hg.addColorStop(0, 'rgba(255,255,255,0)'); hg.addColorStop(0.5, `rgba(255,255,255,${ha})`); hg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = hg; ctx.fillRect(CX - 900, hy, 1800, 1.5); }
      }

      // ---- lead-in: light rushing into the centre ----
      if (u < 0.05) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (const p of inflow) {
          const q = (t - p.s) / (T0 - p.s); if (q <= 0 || q > 1.02) continue;
          const rr = p.r0 * (1 - easeIn(q)), len = p.l * (0.3 + q * 1.4);
          const al = Math.min(1, q * 1.8) * 0.75;
          const ca = Math.cos(p.a), sa = Math.sin(p.a) * 0.6;
          ctx.strokeStyle = `rgba(255,255,255,${al})`; ctx.lineWidth = p.w;
          ctx.beginPath(); ctx.moveTo(CX + ca * rr, CY + sa * rr); ctx.lineTo(CX + ca * (rr + len), CY + sa * (rr + len)); ctx.stroke();
        }
        ctx.restore();
        const pre = easeIn(t / T0);
        streak(CX, CY, 2600 * pre, 3 + 5 * pre, 0.9 * pre);
        streak(CX, CY, 500 * pre, 60 * pre, 0.35 * pre);
      }

      // ---- glows and shock rings behind the logo ----
      if (u >= 0) {
        at(GLOW_L, s, dx, dy, glow * 0.75, 'lighter');
        at(GLOW_M, s, dx, dy, glow * 0.55, 'lighter');
        ring(u, 0.7, 1500, 34, 0.95);
        ring(u - 0.06, 0.8, 1000, 18, 0.5);
        ring(u2, 0.6, 1100, 26, 0.6);
        if (!transparent) at(REF, s, dx, dy + 14, 0.9 * ease(u / 0.25));
        sparks(SPARKS, u, s, dx, dy);   // behind the logo: they burst out from under it
        sparks(SPARKS2, u2, s, dx, dy);
      }

      // ---- the logo ----
      if (u < 0) {
        // glitch flickers of the logo before the hit (every other frame inside three short windows)
        const win = [[0.13, 0.19], [0.25, 0.3], [0.34, 0.39]].find(([a, b]) => t >= a && t < b);
        if (win && frame % 2 === 0) {
          const q = glitchSeed(frame), slices = 9, sl = LH / slices;
          for (let i = 0; i < slices; i++) {
            if (q() < 0.3) continue;
            const off = (q() - 0.5) * 140, a = 0.25 + q() * 0.5, sc = 1.12;
            ctx.save(); ctx.beginPath(); ctx.rect(0, CY + (-LH / 2 + i * sl) * sc, W, sl * sc); ctx.clip();
            at(RED, sc, off - 12, 0, a, 'lighter'); at(GRN, sc, off, 0, a, 'lighter'); at(BLU, sc, off + 12, 0, a, 'lighter');
            ctx.restore();
          }
        }
      } else {
        if (split > 0.6) {
          at(BLK, s, dx, dy, 1);
          at(RED, s, dx - split, dy, 1, 'lighter'); at(GRN, s, dx, dy, 1, 'lighter'); at(BLU, s, dx + split, dy - split * 0.25, 1, 'lighter');
        } else at(LOGO, s, dx, dy, 1);
        // burn-in: the logo flashes white and cools down to chrome
        const burn = 0.95 * decay(u, 0.11) + 0.75 * decay(u2, 0.07)
          + 0.7 * decay(t - CUES.strobe[0], 0.025) + 0.45 * decay(t - CUES.strobe[1], 0.025);
        at(SIL, s, dx, dy, burn);
        at(GLOW_S, s, dx, dy, 0.25 * hit + 0.3 * hit2 + 0.06, 'lighter');
        // chrome light sweeps
        sweep((t - CUES.sweep) / 0.75, s, dx, dy, 120, 0.85);
        sweep((t - CUES.sweep - 0.12) / 0.75, s, dx, dy, 40, 0.5);
        sweep((t - CUES.sweep2) / 0.6, s, dx, dy, 90, 0.7, -1);
        // slow idle shimmer during the hold
        sweep(((t - 3.1) % 2.6) / 1.3, s, dx, dy, 160, 0.18);
      }

      // ---- sparks, flares, glints ----
      if (u >= 0) {
        streak(CX, CY, 3400, 5, 0.95 * decay(u, 0.2));
        streak(CX, CY, 1600, 80, 0.28 * decay(u, 0.16));
        streak(CX, CY, 2600, 3, 0.7 * decay(u2, 0.16));
        const g1 = lp(0.955, 0.12), g2 = lp(0.06, 0.06), g3 = lp(0.58, 0.39);
        const pulse = (x, tau) => (x < 0 ? Math.exp(x / 0.05) : Math.exp(-x / tau));
        star(CX + dx + g1[0] * s, CY + dy + g1[1] * s, 120, 0.95 * pulse(t - CUES.glint, 0.22), t * 0.6);
        star(CX + dx + g2[0] * s, CY + dy + g2[1] * s, 90, 0.85 * pulse(t - CUES.glint2, 0.2), -t * 0.5);
        star(CX + dx + g3[0] * s, CY + dy + g3[1] * s, 70, 0.6 * pulse(t - (CUES.sweep + 0.32), 0.12), 0.3);
      }

      // ---- dust in the light ----
      if (u > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const da = 0.4 * ease((u - 0.2) / 1.2);
        for (const p of dust) {
          const x = (p.x + t * p.sp * p.z) % W, y = p.y - t * p.sp * 0.6 * p.z;
          const yy = ((y % H) + H) % H;
          const near = Math.exp(-(((x - CX) / 900) ** 2 + ((yy - CY) / 520) ** 2));
          const a = da * near * (0.5 + 0.5 * Math.sin(t * 1.7 + p.ph)) * p.z;
          if (a < 0.01) continue;
          ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.arc(x, yy, 0.8 + p.z * 1.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }

      // ---- full-frame flash, vignette, grain ----
      if (!transparent) {
        const flash = (u < 0 ? 0.5 * Math.exp(u / 0.02) : 0.92 * decay(u, 0.06)) + 0.35 * decay(u2, 0.045)
          + 0.12 * decay(t - CUES.strobe[0], 0.02) + 0.08 * decay(t - CUES.strobe[1], 0.02);
        if (flash > 0.003) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, flash)})`; ctx.fillRect(0, 0, W, H); }
        const v = ctx.createRadialGradient(CX, CY, 420, CX, CY, 1250);
        v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.75)');
        ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.globalAlpha = 0.045; ctx.globalCompositeOperation = 'overlay';
        const gr = glitchSeed(frame + 11); ctx.translate(-gr() * 256, -gr() * 256);
        ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat'); ctx.fillRect(0, 0, W + 256, H + 256); ctx.restore();
      }
    }
    return { renderAt, DUR, CUES, W, H };
  }
  root.createQuickFlash = createQuickFlash;
  root.QUICKFLASH = { DUR, T0, T2 };
})(typeof window !== 'undefined' ? window : globalThis);
