'use strict';
/* Tweaks that Windows reset: the backup still says "applied", but the setting is no longer active
   (typically after a Windows feature update, sometimes another tool). The dashboard offers to apply them again.
   Process priority for a running FiveM ends with the game by design and never counts. */
(function (root) {
  const TRANSIENT = new Set(['fivem.priority.high']);
  function find(backups, tweaks) {
    const active = new Set((backups || []).filter((b) => b.kind === 'tweak' && b.status === 'applied').map((b) => b.tweakId));
    return (tweaks || []).filter((tw) => active.has(tw.id) && tw.applied === false && tw.available !== false && !TRANSIENT.has(tw.id));
  }
  // Identifies one finding, so "Hide" only hides it until something else is reset.
  const key = (list) => list.map((x) => x.id).sort().join(',');
  const api = { find, key, TRANSIENT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.H1tDrift = api;
})(this);
