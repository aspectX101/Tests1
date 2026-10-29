// Every adjustable value of the showcase: format, scene timing and copy.
// Times are seconds from the start of the video. The cut grid follows 120 BPM (one beat = 0.5 s),
// so music laid under the export lines up with the transitions.

export const VIDEO = { width: 1920, height: 1080, fps: 60, duration: 45 };
export const BPM = 120;

export const BRAND = {
  site: 'H1T.CC',
  discord: 'discord.gg/h1tcc',
  logo: 'assets/brand/h1t-logo-main.png',
};

export const SCENES = {
  intro: { start: 0, end: 5 },
  reveal: { start: 5, end: 12 },
  features: { start: 12, end: 25 },
  experience: { start: 25, end: 35 },
  finale: { start: 35, end: 45 },
};

export const COPY = {
  intro: { wordmark: 'H1T.CC', tagline: ['PERFORMANCE.', 'REDEFINED.'] },
  reveal: { headline: 'CONTROL EVERY DETAIL.', label: 'H1T.CC TWEAK UTILITY' },
  // Only categories that exist in the app (PC Optimization, Gaming Tweaks, Network, Debloat).
  features: [
    { label: 'WINDOWS OPTIMIZATION', headline: 'Optimize Your System.' },
    { label: 'GAMING PERFORMANCE', headline: 'Built For Competitive Gaming.' },
    { label: 'NETWORK OPTIMIZATION', headline: 'Fine-Tune Your Connection.' },
    { label: 'SYSTEM DEBLOAT', headline: "Remove What You Don't Need." },
  ],
  experience: ['LESS CLUTTER.', 'MORE CONTROL.', 'BUILT FOR PERFORMANCE.'],
  finale: { wordmark: 'H1T.CC', headline: "UNLOCK YOUR SYSTEM'S POTENTIAL.", call: 'JOIN THE MOVEMENT.', discord: 'discord.gg/h1tcc' },
};

// Real app captures (scripts/capture-ui.cjs) in assets/ui.
export const UI = (name) => `assets/ui/${name}.webp`;
