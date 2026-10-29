// Every adjustable value of the showcase: format, scene timing and copy.
// Times are seconds from the start of the video. The cut grid follows 120 BPM (one beat = 0.5 s),
// so music laid under the export lines up with the transitions.

// Format of this render: the 16:9 film (default) or ?format=vertical, the 9:16 TikTok / Reels / Shorts cut.
const query = new URLSearchParams(globalThis.location?.search || '');
export const FORMAT = query.get('format') === 'vertical' ? 'vertical' : 'wide';
export const VIDEO = FORMAT === 'vertical'
  ? { width: 1080, height: 1920, fps: 60, duration: 25 }
  : { width: 1920, height: 1080, fps: 60, duration: 45 };
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

// The vertical cut: the hook lands in the first second, everything is shorter.
export const SCENES_VERTICAL = {
  hook: { start: 0, end: 2.6 },
  reveal: { start: 2.6, end: 6.4 },
  features: { start: 6.4, end: 16.4 },
  montage: { start: 16.4, end: 21 },
  finale: { start: 21, end: 25 },
};

// Language of this render: ?lang=en|de|it (default en). Changes both the app captures and the copy.
export const LANGS = ['en', 'de', 'it'];
const requested = query.get('lang');
export const LANG = LANGS.includes(requested) ? requested : 'en';

// Only categories that exist in the app (PC Optimization, Gaming Tweaks, Network, Debloat).
const COPY_BY_LANG = {
  en: {
    intro: { wordmark: 'H1T.CC', tagline: ['PERFORMANCE.', 'REDEFINED.'] },
    reveal: { headline: 'CONTROL EVERY DETAIL.', label: 'H1T.CC TWEAK UTILITY' },
    features: [
      { label: 'WINDOWS OPTIMIZATION', headline: 'Optimize Your System.' },
      { label: 'GAMING PERFORMANCE', headline: 'Built For Competitive Gaming.' },
      { label: 'NETWORK OPTIMIZATION', headline: 'Fine-Tune Your Connection.' },
      { label: 'SYSTEM DEBLOAT', headline: "Remove What You Don't Need." },
    ],
    experience: ['LESS CLUTTER.', 'MORE CONTROL.', 'BUILT FOR PERFORMANCE.'],
    finale: { wordmark: 'H1T.CC', headline: "UNLOCK YOUR SYSTEM'S POTENTIAL.", call: 'JOIN THE MOVEMENT.', discord: 'discord.gg/h1tcc' },
  },
  de: {
    intro: { wordmark: 'H1T.CC', tagline: ['PERFORMANCE.', 'NEU DEFINIERT.'] },
    reveal: { headline: 'JEDES DETAIL IM GRIFF.', label: 'H1T.CC TWEAK UTILITY' },
    features: [
      { label: 'WINDOWS-OPTIMIERUNG', headline: 'Optimiere dein System.' },
      { label: 'GAMING-PERFORMANCE', headline: 'Gebaut für Competitive Gaming.' },
      { label: 'NETZWERK-OPTIMIERUNG', headline: 'Feinschliff für deine Verbindung.' },
      { label: 'SYSTEM-DEBLOAT', headline: 'Weg mit allem, was du nicht brauchst.' },
    ],
    experience: ['WENIGER BALLAST.', 'MEHR KONTROLLE.', 'GEBAUT FÜR PERFORMANCE.'],
    finale: { wordmark: 'H1T.CC', headline: 'HOL ALLES AUS DEINEM SYSTEM.', call: 'WERDE TEIL DER BEWEGUNG.', discord: 'discord.gg/h1tcc' },
  },
  it: {
    intro: { wordmark: 'H1T.CC', tagline: ['PERFORMANCE.', 'RIDEFINITA.'] },
    reveal: { headline: 'CONTROLLA OGNI DETTAGLIO.', label: 'H1T.CC TWEAK UTILITY' },
    features: [
      { label: 'OTTIMIZZAZIONE WINDOWS', headline: 'Ottimizza il tuo sistema.' },
      { label: 'GAMING PERFORMANCE', headline: 'Creato per il gaming competitivo.' },
      { label: 'OTTIMIZZAZIONE DI RETE', headline: 'Perfeziona la tua connessione.' },
      { label: 'DEBLOAT DI SISTEMA', headline: 'Rimuovi ciò che non ti serve.' },
    ],
    experience: ['MENO CAOS.', 'PIÙ CONTROLLO.', 'CREATO PER LA PERFORMANCE.'],
    finale: { wordmark: 'H1T.CC', headline: 'LIBERA IL POTENZIALE DEL TUO SISTEMA.', call: 'UNISCITI AL MOVIMENTO.', discord: 'discord.gg/h1tcc' },
  },
};
export const COPY = COPY_BY_LANG[LANG];

// Real app captures (scripts/capture-ui.cjs) in assets/ui/<lang>, in the same UI language as the copy.
export const UI = (name) => `assets/ui/${LANG}/${name}.webp`;
