# FiveM Hitreg Check

Read-only diagnostic card in the Keyboard tab. The card does not change Windows, game configuration, weapon data, process memory or the network. Existing keyboard switches and their original-value backup/restore remain separate.

The focused test area counts only physical W/A/S/D, Space, left/right Shift, E and R key events delivered to the renderer. Repeated keydown events are ignored. Focus loss, window blur and visibility changes clear held keys without inventing release events. Only aggregate counts remain in memory, with a reset button; no text, global keystrokes, files or telemetry are recorded. This cannot measure hardware-to-screen delay, diagnose keyboard rollover conclusively or measure FiveM hit registration.

The player reads FPS, ping and packet loss from FiveM using F8 and `cl_drawperf true`; `cl_drawperf false` hides the overlay. Values are entered manually. Guidance uses deliberately coarse thresholds: packet loss above zero, ping above 100 ms, FPS below 60. These are product heuristics, not FiveM server limits, a measurement service or a score. Blank and invalid values are rejected. Normal-looking values do not prove good hit registration.

The keyboard status action reads the existing list API only. Applied refers to the complete existing tweak (including shortcut bits), not a claim that Filter/Sticky Keys must currently be enabled when the tweak is inactive. No apply operation is triggered by diagnostics.

Sources: https://docs.fivem.net/docs/client-manual/console-commands/ and https://learn.microsoft.com/en-us/dotnet/api/system.windows.forms.systeminformation.keyboarddelay

Validation: isolated event/state/validation/localization tests and browser mock smoke test for W press/release and numeric analysis. Real FiveM telemetry is entered by the player and was not directly measured during development.
