'use strict';
// Runs in <head> before the first paint: picks this start's boot animation so the old splash never flashes up first.
// Halloween season with Halloween mode on (same season and preference as halloween.js): halloween-boot.js;
// otherwise the code eye for the dark design: eye-boot.js. Halloween runs 8 s, the eye 5.8 s (1.4 s with reduced motion).
(() => {
  try {
    const d = new Date(), m = d.getMonth(), day = d.getDate();
    let halloween = (m === 9 && day >= 15) || (m === 10 && day <= 1);
    if (halloween) {
      const p = JSON.parse(localStorage.getItem('h1tHalloween') || 'null');
      if (p && p.year === d.getFullYear() && p.on === false) halloween = false;
    }
    document.documentElement.classList.add(halloween ? 'hw-boot' : 'eye-boot');
    window.H1T_BOOT_MS = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1400 : halloween ? 8000 : 5800;
  } catch { /* normal boot */ }
})();
