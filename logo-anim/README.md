# H1T.CC QuickFlash logo

A 4.6-second animated logo sting in the "quick flash" style, built from the H1T chrome logo:
light rushes into the centre while the logo flickers through glitch slices, then a white flash: the logo slams in,
burns white and cools down to chrome, with RGB split, camera shake, a shockwave and a spark burst. A chrome light sweep,
a double strobe and a star glint on the tip follow, then a second, smaller hit with a reverse sweep, and the logo holds
with glow, floor reflection and dust in the light.

## Outputs (`out/`, after rendering)

| File | Use |
| --- | --- |
| `h1t-quickflash.mp4` | 1920×1080, 60 fps, H.264 with sound: Discord, YouTube, TikTok, intro for videos |
| `h1t-quickflash-silent.mp4` | the same without sound |
| `h1t-quickflash-alpha.webm` | transparent background (VP9 alpha) for OBS (media source) and browsers |
| `h1t-quickflash-alpha.mov` | transparent background, ProRes 4444 with sound, for Premiere, After Effects, DaVinci, CapCut PC |
| `h1t-quickflash.gif` | 720 px, 30 fps, loops: Discord, websites |
| `h1t-quickflash.wav` | the sound on its own (48 kHz) |

The transparent versions have no full-screen flash and no background, only the logo, light, sparks and glow.

## Render

```bash
node scripts/render.cjs
```

Needs Node with Playwright (Chromium), ffmpeg and Python 3 with NumPy. About 5 minutes.
`--stills 0.45,1,2.3` writes single frames to check the look, `--shutter 4` sets the motion-blur sub-frames.

## Structure

- `src/quickflash.js`: the whole animation as one deterministic function `renderAt(t)` on a 2D canvas: timing
  (`T0` impact, `T2` second hit, `CUES`), glows, sweeps, sparks, flares, glints. Change timing and look here.
- `scripts/render.cjs`: renders every frame (4 sub-frames each for motion blur), encodes all formats.
- `scripts/sfx.py`: synthesises the sound from the cues (riser, impact with sub drop and chrome ring, whooshes,
  strobe ticks, shimmer, second hit, room reverb). No samples or third-party audio.
- `assets/h1t-logo@2x.png`: the H1T logo, upscaled 2× (Lanczos + light sharpening) from the 756 px original.
