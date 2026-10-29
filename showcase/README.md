# H1T.CC showcase

A 45-second product film for H1T.CC (1920×1080, 60 fps) for Discord, YouTube and the website.
It is built from the **real application**: every screen, switch and dialog is a capture of the app's own renderer
(`app/renderer` on `codex/performance-backend`), driven through its built-in demo mode. Nothing in the UI is mocked up.

## Commands

```bash
npm install
```

```bash
npm run showcase
```
Opens a live preview at http://localhost:4173. Space play / pause, ← → seek 1 s, R restart, F fullscreen,
click the bar at the bottom to jump. `?lang=de` / `?lang=it` shows the German / Italian version (app UI and copy),
`?t=18` starts at 18 s, `?paused` starts paused.

```bash
npm run showcase:render
```
Frame-accurate export into `showcase/out/`:
- `h1t-showcase-<lang>.mp4` — H.264 1080p60 with sound (AAC 320 kbps, −14 LUFS)
- `h1t-showcase-<lang>-silent.mp4` — the same picture without sound
- `h1t-sound-design.wav` — the synthesised sound on its own (48 kHz stereo)

Options: `--lang en|de|it` (default en), `--music song.mp3` (the song plays from its first note under the cue effects
instead of the synthesised score; leading silence is cut, it fades out with the logo), `--shutter 2` (motion-blur sub-frames per frame; 1 = off, 4 = smoother), `--from 12 --to 25` (a section),
`--crf 14` (quality), `--no-audio`. Needs ffmpeg; the sound needs Python 3 with NumPy. A full render takes about 20 minutes.

```bash
npm run showcase:capture -- ../h1t-app
```
Recaptures the interface in all three UI languages from an app checkout (for example
`git worktree add ../h1t-app origin/codex/performance-backend`) after the UI changes. Writes `assets/ui/<lang>/*.webp`
and the click positions per language in `src/ui-map.js`. Add `en`, `de` or `it` to recapture only some languages.

## Structure

| Path | What it is |
| --- | --- |
| `src/config.js` | Format, scene times and **all copy in English, German and Italian** — change text and timing here |
| `src/scenes/` | One file per scene: `intro`, `reveal`, `features`, `experience`, `finale` |
| `src/lib/motion.js` | Reusable building blocks: masked text reveals, light sweeps, streaks, the glitch, app window with cursor and clicks, close-up panels |
| `src/lib/atmosphere.js` | Dust particles and film grain, drawn from the timeline clock |
| `src/main.js` | Builds the single GSAP timeline, preview controls, export hook (`window.__showcase`) |
| `assets/ui/<lang>/` | Real app captures per UI language (3× resolution) |
| `scripts/` | `serve`, `render`, `capture-ui`, `make-audio.py` |

The whole film is one paused GSAP timeline: the preview plays it in real time, the export seeks it frame by frame,
so both always show the same thing.

## Timeline (120 BPM grid, one beat = 0.5 s)

| Time | Scene | What happens |
| --- | --- | --- |
| 0–5 s | Intro | A line of light opens on the logo, bass impact with one glitch burst at 1.55 s, light sweep, H1T.CC / PERFORMANCE. REDEFINED. |
| 5–12 s | Software reveal | The real dashboard rises out of the dark in 3D, the camera moves onto the sidebar and clicks PC Optimization → Gaming Tweaks → Configs, then CONTROL EVERY DETAIL. |
| 12–25 s | Features | Windows Optimization (four switches turn on, 0 → 33 %), Gaming Performance (four toggles), Network Optimization (Start Network → real confirmation → 13/13 active, 100 %), System Debloat |
| 25–35 s | Experience | Rotating close-ups of the sidebar and switches, a wall of real pages, LESS CLUTTER. / MORE CONTROL. / BUILT FOR PERFORMANCE. |
| 35–45 s | Final reveal | Logo out of darkness with light sweeps, UNLOCK YOUR SYSTEM'S POTENTIAL. / JOIN THE MOVEMENT. / discord.gg/h1tcc, fade to black |

Sound cues (impacts, whooshes, UI clicks, shimmer on light sweeps) are registered by the scenes themselves, so the sound
stays in sync when timing changes. The render writes them to `out/cues.json` — useful as a hit list for a sound designer.

## Content rules

- Only features that exist in the app. Copy contains no FPS, ping or benchmark claims.
- No other tool is named anywhere: the capture fails if a forbidden name is visible in the app.
- The captures use the app's own UI language (en/de/it) with its demo data (demo account "H1T Demo"); numbers on screen are what the app showed.
- The captures were rendered on Linux, where the app's Segoe UI falls back to Inter; on Windows the app uses Segoe UI.

## Licences

- GSAP 3 (`vendor/gsap.min.js`): free standard licence, including commercial use.
- Inter Tight and JetBrains Mono (`assets/fonts`): SIL Open Font License, licence files included.
- Sound: synthesised from scratch by `scripts/make-audio.py`; no samples or third-party audio.
- H1T.CC logo and UI: from this repository.
