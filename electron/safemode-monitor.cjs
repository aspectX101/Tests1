'use strict';

// Main-process lifecycle helper: start after app.ready, stop before app.quit.
// No OS service/task installation, no work after the app exits.
function createSafeModeMonitor(backend, options = {}) {
  const { onReport = () => {}, onError = () => {}, getLanguage = () => 'de', setTimer = setTimeout, clearTimer = clearTimeout } = options;
  let stopped = true;
  let running = false;
  let timer = null;
  let pending = null;
  function tick() {
    if (stopped || running) return pending || Promise.resolve();
    running = true;
    pending = (async () => {
      try {
        const lang = getLanguage();
        let report = await backend({ action: 'safemode-scan', lang });
        if (!report.ok) throw new Error(report.error || 'safemode_scan_failed');
        if (report.enabled && !stopped) {
          report = await backend({ action: 'safemode-enforce', lang });
          if (!report.ok) throw new Error(report.error || 'safemode_enforcement_failed');
        }
        if (!stopped) onReport(report);
      } catch (error) {
        if (!stopped) { try { onError(error); } catch { /* UI callback cannot break scheduling. */ } }
      } finally {
        running = false;
        if (!stopped) {
          timer = setTimer(() => { timer = null; void tick(); }, 30000);
          if (timer && typeof timer.unref === 'function') timer.unref();
        }
      }
    })();
    return pending;
  }
  return {
    start() { if (!stopped) return pending || Promise.resolve(); stopped = false; return tick(); },
    stop() { stopped = true; if (timer !== null) clearTimer(timer); timer = null; }
  };
}
module.exports = { createSafeModeMonitor };
