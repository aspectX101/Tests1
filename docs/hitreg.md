# FiveM > Hitreg

Own tab in the FiveM group (since 0.9.22; the earlier read-only check in the Keyboard tab was moved here).

## Live connection test (`app/hitreg-net.js`)
- Input: `IP:port`, hostname, `[IPv6]:port`, `cfx.re/join/<code>` or the 6-character code. Join codes resolve through
  `servers-frontend.fivem.net/api/servers/single/<code>` (`connectEndPoints`).
- 30 FiveM out-of-band queries (`\xFF\xFF\xFF\xFFgetinfo h1t<n>` -> `infoResponse`, the server-browser ping) on the game
  port, 100 ms apart, 1.5 s timeout each: median ping, p95 spikes, jitter (mean change between replies), packet loss.
  Replies are matched by the echoed challenge (fallback: oldest open probe).
- If the server ignores UDP queries, ten HTTP `/info.json` requests are timed instead (latency only; loss not shown).
- `rateHitreg` (renderer) rates excellent/good/fair/poor (loss > 2 % or ping > 120 ms or jitter > 15 ms = poor) and lists
  tips: loss, high ping, jitter, spikes, Wi-Fi without LAN (from the read-only system check), inactive Hitreg Boost items.

## Hitreg Boost
Curated switches (`HITREG_IDS`), backed up and restorable like every tweak:
`hitreg.nic.latency` (driver keywords *InterruptModeration/*FlowControl/*EEE/*LsoV2IPv4/*LsoV2IPv6 = 0, *RSS = 1, only where
the driver offers them; switching off writes the driver default), `hitreg.qos.fivem` (policy-based QoS DSCP 46 for every
FiveM game executable build + `Do not use NLA`), `hitreg.timer.global` (GlobalTimerResolutionRequests = 1),
`hitreg.input.power` (USB selective suspend and PCIe link power management off, AC), `hitreg.fivem.priority` (IFEO
PerfOptions CpuPriorityClass = High for all FiveM game builds), plus network throttling, Winsock UDP, NIC power saving,
Delivery Optimization, MMCSS reserve, foreground scheduling, fullscreen optimizations, Game DVR, mouse acceleration and
the High performance plan from other tabs.

## Input test
WASD/Space/Shift/E/R test field; counts only key events received in the field, never global keystrokes.

Tests: `tests/hitreg-net.test.cjs` (parsing, statistics, join-code lookup, real UDP round trip against a local
FiveM-style responder with 10 % loss), `tests/hitreg.test.cjs`, Windows live test reads all hitreg fields and
round-trips the QoS rules.
