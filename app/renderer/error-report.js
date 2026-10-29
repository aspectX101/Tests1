'use strict';
// Loaded first: script errors and unhandled promise rejections in the window go to the support log
// (main process, logs\backend.log). At most 30 per window, so a broken loop cannot flood it.
(() => {
  let sent = 0;
  const send = (info) => {
    if (sent >= 30 || !window.tweaker?.reportError) return;
    sent++;
    try { window.tweaker.reportError(info); } catch { /* reporting must never cause another error */ }
  };
  window.addEventListener('error', (ev) => {
    if (!ev.error && !ev.message) return; // resource load errors (img/link) are not script errors
    send({ message: String(ev.message || ev.error), source: String(ev.filename || '').split('/').pop(), line: ev.lineno, stack: String(ev.error?.stack || '').slice(0, 1200) });
  });
  window.addEventListener('unhandledrejection', (ev) => {
    send({ message: String(ev.reason?.message || ev.reason || 'unhandled rejection'), stack: String(ev.reason?.stack || '').slice(0, 1200) });
  });
})();
