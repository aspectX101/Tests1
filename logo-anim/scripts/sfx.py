#!/usr/bin/env python3
"""Sound for the H1T.CC QuickFlash logo: riser, impact, whooshes, strobe ticks, shimmer, second hit.
Synthesised from scratch with NumPy (no samples). Timing comes from the animation's cues.
usage: sfx.py cues.json out.wav"""
import json, sys, wave
import numpy as np

SR = 48000
cues = json.load(open(sys.argv[1]))
DUR = cues['end']
N = int(DUR * SR)
rng = np.random.default_rng(42)
t_all = np.arange(N) / SR
mix = np.zeros((N, 2))


def band(x, lo=None, hi=None):
    """Zero-phase FFT filter with soft edges (lo/hi in Hz)."""
    n = len(x); f = np.fft.rfftfreq(n, 1 / SR); X = np.fft.rfft(x); g = np.ones_like(f)
    if hi: g *= 1 / (1 + (f / hi) ** 4)
    if lo: g *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4)
    return np.fft.irfft(X * g, n)


def noise(sec):
    return rng.standard_normal(int(sec * SR))


def place(sig, at, gain=1.0, pan=0.0):
    """Add mono (pan -1..1) or stereo signal at time `at`."""
    i = int(at * SR)
    if i >= N: return
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l, sig * r], axis=1) * np.sqrt(2)
    j = min(N, i + len(sig)); s = max(0, -i)
    mix[max(i, 0):j] += sig[s:j - i] * gain


def stereo_noise(sec, lo=None, hi=None):
    return np.stack([band(noise(sec), lo, hi), band(noise(sec), lo, hi)], axis=1)


# ---- riser into the hit: filtered noise opening up + rising tone ----
t0 = cues['impact']; L = t0
tt = np.arange(int(L * SR)) / SR; p = tt / L
dark, mid, bright = stereo_noise(L, 200, 900), stereo_noise(L, 800, 4000), stereo_noise(L, 3000, 14000)
env = p ** 2.2
riser = dark * (1 - p)[:, None] + mid * np.clip(p * 1.5, 0, 1)[:, None] * 0.8 + bright * (p ** 3)[:, None] * 0.9
riser *= env[:, None] * 0.55
tone = np.sin(2 * np.pi * np.cumsum(180 + 900 * p ** 2) / SR) * env * 0.12
riser += np.stack([tone, tone], axis=1)
place(riser, 0, 1.0)


def impact(at, size=1.0):
    # sub drop
    d = 1.6 * size; tt = np.arange(int(d * SR)) / SR
    f = 38 + 120 * np.exp(-tt * 16)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / (0.75 * size))
    sub = np.tanh(sub * 1.6) * 0.95
    place(sub, at, 0.9 * size)
    # crack: bright transient
    c = 0.25; tt = np.arange(int(c * SR)) / SR
    crack = stereo_noise(c, 1500, 16000) * np.exp(-tt / 0.028)[:, None]
    place(crack, at, 0.9 * size)
    # body + tail
    b = 2.0 * size; tt = np.arange(int(b * SR)) / SR
    body = stereo_noise(b, 60, 1800) * (np.exp(-tt / 0.18) * 0.8 + np.exp(-tt / 1.1) * 0.12)[:, None]
    place(body, at, 0.7 * size)
    # metallic ring (chrome)
    r = 1.8; tt = np.arange(int(r * SR)) / SR
    ring = sum(np.sin(2 * np.pi * fr * tt + ph) * a for fr, ph, a in [(523, 0, 1), (1187, 1, .6), (1979, 2, .4), (3011, .5, .25)])
    place(ring * np.exp(-tt / 0.5) * 0.06 * size, at, 1.0, 0.0)


def whoosh(at, dur=0.7, pan_from=-0.8, pan_to=0.8, gain=0.5):
    tt = np.arange(int(dur * SR)) / SR; p = tt / dur
    env = np.sin(np.pi * np.clip(p, 0, 1)) ** 2
    w = band(noise(dur), 400, 5000) * 0.6 + band(noise(dur), 2500, 12000) * 0.4
    pan = pan_from + (pan_to - pan_from) * p
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    place(np.stack([w * env * l, w * env * r], axis=1) * np.sqrt(2), at - dur * 0.35, gain)


def tick(at, gain=0.35):
    tt = np.arange(int(0.08 * SR)) / SR
    s = np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt / 0.012) + band(noise(0.08), 3000, None) * np.exp(-tt / 0.006) * 0.6
    place(s, at, gain)


def shimmer(at, gain=0.16, pan=0.4):
    d = 1.2; tt = np.arange(int(d * SR)) / SR
    env = np.minimum(1, tt / 0.01) * np.exp(-tt / 0.35)
    s = sum(np.sin(2 * np.pi * fr * tt * (1 + 0.002 * np.sin(2 * np.pi * 5 * tt))) for fr in (3136, 4699, 6272, 7902, 9397))
    place(s * env / 5, at - 0.04, gain, pan)


impact(t0, 1.0)
whoosh(cues['sweep'] + 0.2, 0.75, -0.7, 0.7, 0.42)
tick(cues['strobe'][0]); tick(cues['strobe'][1], 0.25)
shimmer(cues['glint'], 0.2, 0.5)
impact(cues['hit2'], 0.6)
whoosh(cues['sweep2'] + 0.15, 0.6, 0.7, -0.7, 0.35)
shimmer(cues['glint2'], 0.17, -0.5)

# ---- room: short synthetic reverb (decaying noise impulse response) ----
irl = int(1.1 * SR); tt = np.arange(irl) / SR
ir = np.stack([rng.standard_normal(irl), rng.standard_normal(irl)], axis=1) * np.exp(-tt / 0.32)[:, None]
ir[:, 0] = band(ir[:, 0], 150, 7000); ir[:, 1] = band(ir[:, 1], 150, 7000)
ir /= np.sqrt((ir ** 2).sum(axis=0))
wet = np.zeros_like(mix); n2 = 1 << int(np.ceil(np.log2(N + irl)))
for ch in range(2):
    wet[:, ch] = np.fft.irfft(np.fft.rfft(mix[:, ch], n2) * np.fft.rfft(ir[:, ch], n2), n2)[:N]
out = mix + wet * 0.22

# ---- master: gentle saturation, fade the very end, peak -2.5 dBFS ----
out = np.tanh(out * 1.2) / np.tanh(1.2)
fade = np.clip((DUR - t_all) / 0.25, 0, 1)
out *= fade[:, None]
out *= 10 ** (-2.5 / 20) / np.max(np.abs(out))   # headroom so AAC stays below -1 dBTP
pcm = (out * 32767).astype('<i2')
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f'sound: {sys.argv[2]} ({DUR:.2f} s)')
