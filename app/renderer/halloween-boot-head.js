'use strict';
// Runs in <head> before the first paint: decides whether this start shows the Halloween boot animation
// (same season and preference as halloween.js), so the normal splash never flashes up first.
(() => {
  try {
    const d = new Date(), m = d.getMonth(), day = d.getDate();
    if (!((m === 9 && day >= 15) || (m === 10 && day <= 1))) return;
    const p = JSON.parse(localStorage.getItem('h1tHalloween') || 'null');
    if (p && p.year === d.getFullYear() && p.on === false) return;
    document.documentElement.classList.add('hw-boot');
    window.H1T_BOOT_MS = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1400 : 6400;
  } catch { /* normal boot */ }
})();
