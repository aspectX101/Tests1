'use strict';
// Runs in <head> before the first paint: selects the canvas boot animation (eye-boot.js) so the old splash never
// flashes up first, and sets its length for app.js: 5.8 s, 1.4 s with reduced motion.
(() => {
  try {
    document.documentElement.classList.add('eye-boot');
    // Light design (Settings > Design or the sun button): white UI and a white start animation from the first paint.
    if (localStorage.getItem('h1tTheme') === 'light') document.documentElement.classList.add('light');
    window.H1T_BOOT_MS = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1400 : 5800;
    // The Halloween mode (with its boot greeting) was removed in 1.0.39; its stored values are no longer needed.
    localStorage.removeItem('h1tHalloween'); localStorage.removeItem('h1tBootName');
  } catch { /* normal boot */ }
})();
