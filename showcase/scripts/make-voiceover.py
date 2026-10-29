#!/usr/bin/env python3
"""AI voice-over for the vertical (TikTok) cut, with Kokoro-82M (Apache-2.0), fully local.

Each line starts with its scene of src/vertical.js and must end before the next one; the script reports every line.

Setup (once):
  python3 -m venv .venv-tts && .venv-tts/bin/pip install kokoro-onnx soundfile
  npm pack kokoro-js@1.2.1 kokoro-q8-shards@1.0.0     # official voices + the quantised model weights
  tar xzf kokoro-js-1.2.1.tgz && mv package kokoro-js
  tar xzf kokoro-q8-shards-1.0.0.tgz && cat package/kokoro-q8.part*.bin > kokoro-q8.onnx
  (sha256 of kokoro-q8.onnx: fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478)

Usage: .venv-tts/bin/python make-voiceover.py kokoro-q8.onnx kokoro-js/voices <voice> out.wav [speed]
  voice e.g. am_michael (male) or af_heart (female); speed default 1.05
"""
import glob
import os
import sys
import tempfile

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

LINES = [  # (start s, latest end s, text) — "H1T dot C C" makes the voice spell the brand
    (0.25, 2.55, "This is H1T dot C C."),
    (2.75, 6.3, "The Windows and FiveM tweaker that puts you in control."),
    (6.55, 8.85, "Optimize your system."),
    (9.05, 11.35, "Built for competitive gaming."),
    (11.55, 13.85, "Fine-tune your connection."),
    (14.05, 16.35, "And remove what you don't need."),
    (16.45, 17.85, "Less clutter."),
    (17.95, 19.35, "More control."),
    (19.45, 20.9, "Built for performance."),
    (21.25, 24.7, "Join the Discord now. Link in bio."),
]
DURATION = 25


def main():
    model, voice_dir, voice, out = sys.argv[1:5]
    speed = float(sys.argv[5]) if len(sys.argv) > 5 else 1.05
    # kokoro-js ships each voice as raw float32 (510, 1, 256); kokoro-onnx wants them in one .npz.
    voices = {os.path.basename(f)[:-4]: np.fromfile(f, dtype='<f4').reshape(-1, 1, 256) for f in glob.glob(f'{voice_dir}/*.bin')}
    pack = os.path.join(tempfile.mkdtemp(), 'voices.npz')
    np.savez(pack, **voices)
    tts = Kokoro(model, pack)
    rate = 24000
    track = np.zeros(DURATION * rate, dtype=np.float32)
    for start, end, text in LINES:
        audio, sr = tts.create(text, voice=voice, speed=speed, lang='en-us')
        assert sr == rate
        loud = np.where(np.abs(audio) > 0.01)[0]
        audio = audio[max(0, loud[0] - 240): loud[-1] + 1200]
        finish = start + len(audio) / rate
        print(f'{start:5.2f}–{finish:5.2f} s (until {end:5.2f}) {"OK " if finish <= end else "TOO LONG"} {text}')
        i = int(start * rate)
        track[i:i + len(audio)] += audio[: len(track) - i]
    sf.write(out, track, rate)


if __name__ == '__main__':
    main()
