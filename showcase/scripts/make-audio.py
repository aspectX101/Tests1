#!/usr/bin/env python3
"""Original sound design for the H1T.CC showcase, synthesised from scratch (no samples, no licences needed).

Reads the cue list the animation writes (assets/audio/cues.json: impacts, whooshes, clicks, ...) and builds a
48 kHz stereo WAV: a dark low drone, a 120 BPM pulse that grows into the montage, and one sound per cue.
It is meant as a finished temp score and a sync guide; music can be laid over it or replace the bed.

Usage: python3 make-audio.py cues.json out.wav [--sfx-only]   (needs NumPy)
  --sfx-only  only the cue sounds, without drone and pulse (for laying a song underneath)
"""
import json
import sys
import wave

import numpy as np

SR = 48000
BPM = 120
BEAT = 60 / BPM
rng = np.random.default_rng(20261029)


# ---------- helpers ----------

def t_axis(seconds):
    return np.arange(int(seconds * SR)) / SR


def env_exp(seconds, decay):
    return np.exp(-t_axis(seconds) / decay)


def fade(n, attack, release):
    e = np.ones(n)
    a, r = min(n, int(attack * SR)), min(n, int(release * SR))
    if a:
        e[:a] = np.linspace(0, 1, a) ** 2
    if r:
        e[-r:] *= np.linspace(1, 0, r) ** 2
    return e


def noise(seconds):
    return rng.standard_normal(int(seconds * SR))


def stft_filter(x, gain_fn, size=2048, hop=512):
    """Time-varying filter: gain_fn(time_s, freqs_hz) -> gain per bin, applied frame by frame."""
    win = np.hanning(size)
    pad = np.concatenate([np.zeros(size), x, np.zeros(size)])
    out = np.zeros_like(pad)
    norm = np.zeros_like(pad)
    freqs = np.fft.rfftfreq(size, 1 / SR)
    for start in range(0, len(pad) - size, hop):
        frame = pad[start:start + size] * win
        spec = np.fft.rfft(frame) * gain_fn((start - size + size / 2) / SR, freqs)
        out[start:start + size] += np.fft.irfft(spec) * win
        norm[start:start + size] += win ** 2
    out /= np.maximum(norm, 1e-6)
    return out[size:size + len(x)]


def bandpass(f, center, width):
    return np.exp(-0.5 * ((np.log2(np.maximum(f, 1)) - np.log2(center)) / width) ** 2)


def lowpass(f, cutoff, slope=4):
    return 1 / (1 + (f / cutoff) ** slope)


def highpass(f, cutoff, slope=4):
    return 1 - lowpass(f, cutoff, slope)


def static_filter(x, gain):
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(spec * gain(freqs), len(x))


def pan(mono, position):
    """position -1..1 (scalar or array) → stereo with constant power."""
    p = (np.asarray(position) + 1) * np.pi / 4
    return np.stack([mono * np.cos(p), mono * np.sin(p)])


class Mix:
    def __init__(self, seconds):
        self.dry = np.zeros((2, int(seconds * SR) + SR))
        self.send = np.zeros_like(self.dry)

    def add(self, stereo, at, gain=1.0, reverb=0.25):
        if stereo.ndim == 1:
            stereo = pan(stereo, 0)
        i = int(at * SR)
        if i < 0:
            stereo, i = stereo[:, -i:], 0
        n = min(stereo.shape[1], self.dry.shape[1] - i)
        if n <= 0:
            return
        self.dry[:, i:i + n] += stereo[:, :n] * gain
        self.send[:, i:i + n] += stereo[:, :n] * gain * reverb


def reverb_ir(seconds=3.2, decay=0.9):
    ir = []
    for _ in range(2):
        n = noise(seconds) * env_exp(seconds, decay / 3)
        n = static_filter(n, lambda f: lowpass(f, 7000, 2) * highpass(f, 180, 2))
        n[: int(0.012 * SR)] = 0  # pre-delay
        ir.append(n / np.sqrt(np.sum(n ** 2)))
    return np.stack(ir)


def convolve(x, ir):
    n = x.shape[1] + ir.shape[1]
    size = 1 << (n - 1).bit_length()
    return np.stack([np.fft.irfft(np.fft.rfft(x[c], size) * np.fft.rfft(ir[c], size), size)[: x.shape[1]] for c in range(2)])


# ---------- instruments ----------

def kick(level=1.0, length=0.5, top=120, bottom=44):
    t = t_axis(length)
    freq = bottom + (top - bottom) * np.exp(-t / 0.035)
    body = np.sin(2 * np.pi * np.cumsum(freq) / SR) * env_exp(length, 0.16)
    click = static_filter(noise(length), lambda f: bandpass(f, 3500, 0.8)) * env_exp(length, 0.004) * 0.3
    return np.tanh((body + click) * 1.6) * level


def impact(length=3.2):
    t = t_axis(length)
    freq = 34 + 150 * np.exp(-t / 0.06)
    boom = np.sin(2 * np.pi * np.cumsum(freq) / SR) * env_exp(length, 0.55)
    crack = static_filter(noise(length), lambda f: lowpass(f, 2500, 2)) * env_exp(length, 0.05) * 0.5
    sub = np.sin(2 * np.pi * 36 * t) * env_exp(length, 1.1) * 0.45
    return pan(np.tanh((boom + crack + sub) * 1.4), 0)


def whoosh(length=0.8):
    n = noise(length)
    peak = 0.6

    def gain(time, f):
        p = min(1, max(0, time / length))
        center = 300 * 2 ** (4.2 * np.sin(np.pi * p) ** 0.8)
        return bandpass(f, center, 0.9)

    body = stft_filter(n, gain) * np.sin(np.pi * np.clip(t_axis(length) / length, 0, 1)) ** (1 / peak)
    return pan(body * 0.9, np.linspace(-0.7, 0.7, len(body)))


def riser(length=1.6):
    t = t_axis(length)
    n = noise(length)
    body = stft_filter(n, lambda time, f: bandpass(f, 400 * 2 ** (3.2 * min(1, max(0, time / length))), 0.6))
    tone = np.sin(2 * np.pi * np.cumsum(180 * 2 ** (2 * t / length)) / SR) * 0.25
    return pan((body * 0.7 + tone) * (t / length) ** 2.2, 0)


def shimmer(length=1.2):
    t = t_axis(length)
    partials = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * a for f, a in [(2637, 0.5), (3520, 0.35), (4699, 0.25), (5274, 0.2)])
    air = static_filter(noise(length), lambda f: bandpass(f, 7500, 0.5)) * 0.5
    e = np.sin(np.pi * np.clip(t / length, 0, 1)) ** 1.5 * (0.75 + 0.25 * np.sin(2 * np.pi * 9 * t))
    return pan((partials * 0.25 + air) * e * 0.35, np.sin(np.linspace(-1.2, 1.2, len(t))) * 0.8)


def glitch(length=0.3):
    out = np.zeros(int(length * SR) + 1)
    pos = 0
    while pos < len(out) - 200:
        n = int(rng.uniform(0.006, 0.03) * SR)
        f = rng.choice([180, 440, 880, 1760, 3100])
        seg = np.sign(np.sin(2 * np.pi * f * np.arange(n) / SR)) * rng.uniform(0.2, 0.6)
        seg = np.round(seg * 4) / 4  # crushed
        out[pos:pos + n] += seg[: len(out) - pos]
        pos += n + int(rng.uniform(0, 0.015) * SR)
    return pan(static_filter(out, lambda f: lowpass(f, 9000, 2)) * fade(len(out), 0.002, 0.05) * 0.45, rng.uniform(-0.4, 0.4))


def click(length=0.12):
    t = t_axis(length)
    tone = np.sin(2 * np.pi * 2900 * t) * env_exp(length, 0.012) + np.sin(2 * np.pi * 5800 * t) * env_exp(length, 0.005) * 0.4
    body = np.sin(2 * np.pi * 220 * t) * env_exp(length, 0.02) * 0.6
    return pan((tone + body) * 0.35, 0.1)


def tick(length=0.25):
    t = t_axis(length)
    tone = sum(np.sin(2 * np.pi * f * t) * a for f, a in [(4186, 0.5), (6272, 0.3), (8372, 0.15)]) * env_exp(length, 0.03)
    return pan(tone * 0.22, 0)


def swell(length=2.4):
    t = t_axis(length)
    n = stft_filter(noise(length), lambda time, f: lowpass(f, 300 + 3000 * min(1, max(0, time / length)) ** 2, 3))
    tone = np.sin(2 * np.pi * 110 * t) + 0.5 * np.sin(2 * np.pi * 164.8 * t)
    e = (t / length) ** 1.6 * fade(len(t), 0.01, 0.25)
    return pan((n * 0.6 + tone * 0.2) * e, 0)


def reverse_cymbal(length=0.9):
    t = t_axis(length)
    n = static_filter(noise(length), lambda f: highpass(f, 3000, 2)) * (t / length) ** 3
    return pan(n * 0.45 * fade(len(t), 0, 0.02), 0)


# ---------- the bed: drone + pulse ----------

# A minor progression, one chord per bar (2 s): Am, F, C, G.
ROOTS = [55.0, 43.65, 65.41, 49.0]


def drone(seconds):
    t = t_axis(seconds)
    bar = (t // (4 * BEAT)).astype(int) % len(ROOTS)
    root = np.array(ROOTS)[bar]
    # Smooth the root changes so the pad glides.
    k = int(0.25 * SR)
    root = np.convolve(np.pad(root, (k, k), mode='edge'), np.ones(k) / k, mode='same')[k:-k]
    phase = 2 * np.pi * np.cumsum(root) / SR
    voices = []
    for detune, side in [(1.0, -0.5), (1.004, 0.5), (0.996, 0)]:
        saw = sum(np.sin(h * phase * detune) / h for h in range(1, 9))
        fifth = sum(np.sin(h * phase * 1.5 * detune) / h for h in range(1, 5)) * 0.45
        voices.append(pan((saw + fifth) * 0.25, side))
    pad = sum(voices)
    pad = np.stack([static_filter(c, lambda f: lowpass(f, 520, 3)) for c in pad])
    return pad * (0.85 + 0.15 * np.sin(2 * np.pi * 0.12 * t))


def hat(length=0.08, level=0.18):
    n = static_filter(noise(length), lambda f: highpass(f, 8000, 3))
    return n * env_exp(length, 0.012) * level


def bass_note(freq, length):
    t = t_axis(length)
    x = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(4 * np.pi * freq * t)
    return np.tanh(x * 1.5) * fade(len(t), 0.005, 0.12) * env_exp(length, 0.6)


def level_at(time, points):
    """Piecewise-linear automation: points = [(time, value), ...]."""
    xs, ys = zip(*points)
    return np.interp(time, xs, ys)


def build(cues, duration, bed=True):
    mix = Mix(duration + 4)
    if bed:
        add_bed(mix, duration)
    add_cues(mix, cues)
    return master(mix, duration)


def add_bed(mix, duration):
    # Drone automation across the five scenes.
    bed = drone(duration + 3)
    tt = t_axis(bed.shape[1] / SR)
    auto = level_at(tt, [(0, 0), (1.4, 0.25), (1.6, 0.55), (4.8, 0.45), (5.2, 0.6), (12, 0.5), (24.8, 0.55), (25, 0.75),
                         (34.2, 0.8), (35.0, 0.2), (36, 0.6), (42.4, 0.55), (45, 0.0)])
    mix.add(bed * auto * 0.5, 0, reverb=0.35)

    # Pulse: half-time in the reveal and features, every beat in the montage, gone for the finale.
    t = 5.0
    while t < 34.4:
        montage = t >= 25
        if montage or (round((t - 5) / BEAT) % 2 == 0):
            mix.add(kick(0.75 if montage else 0.5), t, reverb=0.08)
        if montage:
            mix.add(pan(hat(), 0.25), t + BEAT / 2, reverb=0.1)
            if round((t - 25) / BEAT) % 4 == 3:
                mix.add(pan(hat(0.06, 0.12), -0.25), t + BEAT * 0.75, reverb=0.1)
        t += BEAT
    # Bass on the chord roots from the reveal onwards.
    t = 5.0
    while t < 34.4:
        bar = int(round(t / (4 * BEAT))) % len(ROOTS)
        mix.add(pan(bass_note(ROOTS[bar], 4 * BEAT), 0) * 0.32, t, reverb=0.05)
        t += 4 * BEAT


def add_cues(mix, cues):
    makers = {
        'impact': lambda c: impact(), 'whoosh': lambda c: whoosh(c.get('duration', 0.8)), 'riser': lambda c: riser(c.get('duration', 1.6)),
        'shimmer': lambda c: shimmer(c.get('duration', 1.2)), 'glitch': lambda c: glitch(c.get('duration', 0.3)), 'click': lambda c: click(),
        'tick': lambda c: tick(), 'swell': lambda c: swell(c.get('duration', 2.4)), 'reverse': lambda c: reverse_cymbal(c.get('duration', 0.9)),
        'tail': lambda c: swell(c.get('duration', 2.4))[:, ::-1] * 0.6,
    }
    sends = {'impact': 0.45, 'whoosh': 0.3, 'shimmer': 0.5, 'click': 0.12, 'tick': 0.4, 'swell': 0.4, 'tail': 0.6}
    gains = {'impact': 0.9, 'whoosh': 0.55, 'riser': 0.6, 'shimmer': 0.6, 'glitch': 0.6, 'click': 0.55, 'tick': 0.6, 'swell': 0.6, 'reverse': 0.6, 'tail': 0.6}
    for cue in cues:
        kind = cue['type']
        if kind not in makers:
            continue
        sound = makers[kind](cue)
        # Reverse-shaped sounds end on their cue time; everything else starts on it.
        at = cue['t'] - (sound.shape[1] / SR if kind == 'reverse' else 0)
        mix.add(sound, at, gain=gains[kind] * cue.get('gain', 1.0), reverb=sends.get(kind, 0.25))


def master(mix, duration):
    wet = convolve(mix.send, reverb_ir())
    out = mix.dry + wet * 0.9
    out = out[:, : int(duration * SR)]
    out *= fade(out.shape[1], 0.0, 0.4)
    out = np.tanh(out * 0.9) / np.tanh(0.9)
    out /= max(1e-9, np.max(np.abs(out))) / 0.89  # -1 dBFS peak
    return out


def main():
    cues_file, target = sys.argv[1], sys.argv[2]
    data = json.load(open(cues_file))
    audio = build(data['cues'], data['duration'], bed='--sfx-only' not in sys.argv[3:])
    pcm = (np.clip(audio.T, -1, 1) * 32767).astype('<i2')
    with wave.open(target, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f'Sound design: {target} ({data["duration"]:.1f} s, {len(data["cues"])} cues)')


if __name__ == '__main__':
    main()
