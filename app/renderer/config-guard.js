'use strict';
/* Config guard: before a config, "Recommended" or a tab's bulk start applies tweaks, the system check
   (SystemCheck.ps1) decides which tweaks this PC should not get, with the reason shown to the user.
   Power supply wattage cannot be read by software; its traces can: unexpected power-offs (Kernel-Power 41),
   graphics driver resets (Display 4101, LiveKernelEvent 141/117) and hardware errors (WHEA) of the last 30 days.
   Unknown facts never remove a tweak. Single switches stay possible after an extra confirmation.
   Pure function guard(facts, tweaks) so the rules can be tested without a UI. */
(function (root) {
  const GPU = ['gaming.gpu.hags', 'gaming.gpu.iommu', 'gaming.gpu.latency', 'windows.gpu.tdr'];
  // Tweaks that keep CPU, GPU or devices at higher power all the time.
  const POWER = ['windows.power.profile', 'windows.power.high', 'windows.cpu.unpark', 'windows.power.extras', 'hitreg.input.power', 'gaming.gpu.latency'];
  const count = (v) => (Number.isFinite(v) && v > 0 ? v : 0);
  const cpuName = (f) => String(f?.cpu?.name || '');
  const hybrid = (name) => /Core\(TM\) Ultra|Core Ultra|1[2-4]th Gen|i[3579]-1[2-4]\d{3}/i.test(name);
  // [reason, (facts) => applies, tweak ids, (facts) => number shown in the text]
  const RULES = [
    ['gpu_resets', (f) => count(f.gpuResets) > 0, GPU, (f) => f.gpuResets],
    ['power_loss', (f) => count(f.unexpectedShutdowns) > 0, POWER, (f) => f.unexpectedShutdowns],
    ['hardware_errors', (f) => count(f.hardwareErrors) > 0, [...new Set([...POWER, ...GPU])], (f) => f.hardwareErrors],
    ['laptop', (f) => f.laptop === true, ['windows.power.profile', 'windows.cpu.unpark', 'windows.power.extras', 'hitreg.input.power'], () => 0],
    ['x3d', (f) => /X3D/i.test(cpuName(f)), ['windows.cpu.unpark'], () => 0],
    ['hybrid_cpu', (f) => hybrid(cpuName(f)), ['windows.cpu.unpark'], () => 0],
    ['old_driver', (f) => Number.isFinite(f.gpuDriverAgeDays) && f.gpuDriverAgeDays > 540, ['gaming.gpu.hags'], (f) => Math.floor(f.gpuDriverAgeDays / 30)],
    ['anticheat_hvci', (f) => f.antiCheatHvci === true, ['gaming.hvci.off'], () => 0],
  ];

  // -> { allowed: tweaks, skipped: [{ tweak, reasons: [{ key, n }] }] }; without facts nothing is removed.
  function guard(facts, tweaks) {
    const list = tweaks || [];
    if (!facts) return { allowed: list, skipped: [] };
    const why = new Map();
    for (const [key, applies, ids, num] of RULES) {
      if (!applies(facts)) continue;
      for (const id of ids) { if (!why.has(id)) why.set(id, []); why.get(id).push({ key, n: num(facts) || 0 }); }
    }
    const allowed = [], skipped = [];
    for (const tw of list) (why.has(tw.id) ? skipped.push({ tweak: tw, reasons: why.get(tw.id) }) : allowed.push(tw));
    return { allowed, skipped };
  }

  const TEXT = {
    de: {
      title: 'Für deinen PC weggelassen', confirmTitle: 'Für deinen PC nicht empfohlen', confirmGo: 'Trotzdem anwenden',
      skippedNote: (n) => `${n} Tweak(s) werden für deinen PC weggelassen, die Gründe stehen in der Liste.`,
      checkFailed: 'Die Systemprüfung war nicht möglich. Es wird nichts weggelassen.',
      reasons: {
        gpu_resets: (n) => `Der Grafiktreiber ist in den letzten 30 Tagen ${n}× abgestürzt oder wurde von Windows zurückgesetzt (z. B. DXGI_ERROR_DEVICE_HUNG). GPU-Tweaks könnten das verstärken.`,
        power_loss: (n) => `Windows ist in den letzten 30 Tagen ${n}× ohne sauberes Herunterfahren ausgegangen. Häufige Ursachen: Netzteil an der Grenze, Überhitzung oder instabile Übertaktung. Tweaks, die dauerhaft mehr Strom ziehen, bleiben aus.`,
        hardware_errors: (n) => `Windows hat in den letzten 30 Tagen ${n} Hardware-Fehler gemeldet (WHEA), oft durch instabile Übertaktung oder zu wenig Spannung. Leistungs- und GPU-Tweaks bleiben aus.`,
        laptop: () => 'Laptop: mehr Hitze, lautere Lüfter und kürzere Akkulaufzeit.',
        x3d: () => 'X3D-CPU: Das Parken der Kerne ist hier gewollt und hält Spiele auf den Kernen mit dem großen Cache.',
        hybrid_cpu: () => 'CPU mit Leistungs- und Effizienzkernen: Windows verteilt die Last selbst, Entparken kann schaden.',
        old_driver: (n) => `Der Grafiktreiber ist über ${n} Monate alt. Hardware-GPU-Scheduling braucht einen aktuellen Treiber.`,
        anticheat_hvci: () => 'Riot Vanguard oder FACEIT ist installiert und braucht die Speicherintegrität.',
      },
    },
    en: {
      title: 'Left out for your PC', confirmTitle: 'Not recommended for your PC', confirmGo: 'Apply anyway',
      skippedNote: (n) => `${n} tweak(s) are left out for your PC; the reasons are in the list.`,
      checkFailed: 'The system check was not possible. Nothing is left out.',
      reasons: {
        gpu_resets: (n) => `The graphics driver crashed or was reset by Windows ${n}× in the last 30 days (e.g. DXGI_ERROR_DEVICE_HUNG). GPU tweaks could make this worse.`,
        power_loss: (n) => `Windows went off without a clean shutdown ${n}× in the last 30 days. Common causes: a power supply at its limit, overheating or an unstable overclock. Tweaks that draw more power all the time stay off.`,
        hardware_errors: (n) => `Windows reported ${n} hardware error(s) in the last 30 days (WHEA), often from an unstable overclock or too little voltage. Performance and GPU tweaks stay off.`,
        laptop: () => 'Laptop: more heat, louder fans and shorter battery life.',
        x3d: () => 'X3D CPU: core parking is intended here and keeps games on the cores with the large cache.',
        hybrid_cpu: () => 'CPU with performance and efficiency cores: Windows balances the load itself, unparking can hurt.',
        old_driver: (n) => `The graphics driver is over ${n} months old. Hardware GPU scheduling needs a current driver.`,
        anticheat_hvci: () => 'Riot Vanguard or FACEIT is installed and needs memory integrity.',
      },
    },
    it: {
      title: 'Esclusi per il tuo PC', confirmTitle: 'Non consigliato per il tuo PC', confirmGo: 'Applica comunque',
      skippedNote: (n) => `${n} tweak vengono esclusi per il tuo PC; i motivi sono nell’elenco.`,
      checkFailed: 'Il controllo del sistema non è stato possibile. Non viene escluso nulla.',
      reasons: {
        gpu_resets: (n) => `Il driver grafico si è bloccato o è stato ripristinato da Windows ${n} volte negli ultimi 30 giorni (es. DXGI_ERROR_DEVICE_HUNG). I tweak GPU potrebbero peggiorare la situazione.`,
        power_loss: (n) => `Windows si è spento senza un arresto regolare ${n} volte negli ultimi 30 giorni. Cause frequenti: alimentatore al limite, surriscaldamento o overclock instabile. I tweak che consumano sempre più energia restano disattivati.`,
        hardware_errors: (n) => `Windows ha segnalato ${n} errori hardware negli ultimi 30 giorni (WHEA), spesso per overclock instabile o tensione insufficiente. I tweak di prestazioni e GPU restano disattivati.`,
        laptop: () => 'Portatile: più calore, ventole più rumorose e batteria che dura meno.',
        x3d: () => 'CPU X3D: il parcheggio dei core è voluto e tiene i giochi sui core con la cache grande.',
        hybrid_cpu: () => 'CPU con core ad alte prestazioni ed efficienti: Windows distribuisce il carico da solo, sbloccare i core può nuocere.',
        old_driver: (n) => `Il driver grafico ha più di ${n} mesi. La pianificazione GPU hardware richiede un driver aggiornato.`,
        anticheat_hvci: () => 'Riot Vanguard o FACEIT è installato e richiede l’integrità della memoria.',
      },
    },
  };
  const reasonText = (lang, r) => (TEXT[lang] || TEXT.en).reasons[r.key]?.(r.n) || r.key;

  const api = { guard, RULES, TEXT, reasonText };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ConfigGuard = api;
})(this);
