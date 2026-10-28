# H1T.CC — Desktop account & license integration

This branch integrates the Electron Windows Tweaker with the existing Cloudflare Worker API at `https://dev.h1tutility.cc/api/desktop`. Keep it a **development build** until Windows end-to-end testing is complete. The release workflow is intentionally **not** triggered by this branch.

## Authentication and license checks
- POST `/api/desktop` `{"action":"login","email":"...","password":"..."}` receives a 7-day bearer token (token is never returned to the renderer).
- GET `/api/desktop` returns account `user.display_name`, `user.email`, `entitled`, and the active `licenses[]` with `id`, `plan`, `expires_at`.
- Main-process account module encrypts the token using Electron `safeStorage`; on systems without OS encryption, the token is memory-only. The server hashes sessions in D1.
- The main process checks live authorization at most 2 minutes apart; network verification failures deny operations rather than silently granting access.
- Paid operations in the renderer are hidden behind a license gate, and the principal paid IPC handlers are guarded in the main process.

## Device enrollment
- Explicit consent is required before reading the Windows `MachineGuid` installation identifier.
- The Windows installation identifier is immediately hashed locally (SHA-256 with an application-specific domain prefix); the original value is never transmitted or stored by the Tweaker.
- The server then HMACs the pseudonymous proof using its **private** `H1T_HWID_PEPPER`. It stores only that HMAC in `h1t_devices`.
- This is an installation identifier, **not an immutable physical HWID**; reinstalling Windows can change it. Device resets must be handled in the admin console.
- A paid license alone doesn't mean the PC is verified. Device verification is also required for authorization.
- Do not hard-code `H1T_HWID_PEPPER` or the license-vault secret in the app.

## Data you can legitimately review in the admin console
Currently supported by existing D1 backend: account email/display name/status; license plan/status/expiry; encrypted key vault (administrators only); event history; active sessions; device bindings; device first/last-seen and app version; support tickets. 

Optional diagnostic reports **are not implemented** by this branch. CPU model, GPU model, RAM size, OS build, feature usage and failure traces may be collected in a later consent-driven feature with data minimization, retention limits, export/deletion and a privacy notice. Do not silently transmit local files, browser history, private IP addresses, passwords, Windows usernames, installed software inventories or full hardware serials.

## Prerequisites
1. Keep the existing Cloudflare D1 DB and Worker. Do not reset its tables.
2. Add a **separate** random 32+ character `H1T_HWID_PEPPER` through Cloudflare/Wrangler worker secrets (different from `H1T_LICENSE_VAULT_KEY`). Back it up; rotation invalidates existing device binding HMACs without migration.
3. Register a real customer account; create/activate a test license.
4. Run `npm ci && npm test && npm run start:mock` on a development machine.
5. For real Windows tests, run `npm start`, sign in with H1T.CC account, give consent, bind a valid license, then verify login, expiration, revocation, logout, and reset.
6. Test multiple licenses and no-network behavior. Verify denied operations stay blocked after closing/inspecting renderer DevTools.
7. Only after successful Windows tests, merge into `codex/performance-backend`, bump the version and follow the signed release/update workflow.

## Limitations
- An Electron application can be modified by a motivated attacker; this is licensing enforcement, not tamperproof DRM.
- Network access is required periodically for license validation.
- Server-side privacy controls/telemetry retention, payment webhooks and an admin diagnostics viewer are separate projects.
- Never use this development API as a permanent customer production domain without replacing it with the production hostname and reviewing CSP/update policies.

## Desktop account UI (Windows Tweaker)
- **Sign-in gate** (`app/renderer/h1t-account-ui.js` / `.css`): full-window Premium Black / Graphite / White screen for sign-in, "no license", device linking (with the explicit consent checkbox) and verification errors. It has its own DE/EN/IT switch and window buttons, because it covers the title bar. Server error codes are translated; unknown codes are shown as a code.
- **Account button** (top right): avatar or initials, display name, status dot. Its dropdown offers *My Account*, *Customer Area* (external), *Licenses* (account page, scrolls to the licenses), *Support* (external) and *Sign Out*. Keyboard: ↓ opens, ↑/↓/Home/End move, Esc closes.
- **Account page** (`route page: 'account'`): profile, session & security, licenses (plan, status, expiry, devices, key hint, "This PC" marker), this device (binding, label, linked since, last seen, app version) and help links.
- **Avatar**: the main process downloads `user.avatar_url` (own HTTPS host only, no redirects, ≤ 512 KB, PNG/JPEG/WebP/GIF checked by file signature) and hands the renderer a `data:` URI. That keeps the CSP at `img-src 'self' data:`. Without an avatar the UI shows initials.
- **External links** go through IPC `tweaker:h1t-open` with a fixed kind (`customer_area`, `licenses`, `support`). Only `https://h1tutility.cc` / `*.h1tutility.cc` URLs are opened.
- The license check, token storage, consent rule and device proof are unchanged. The UI only renders main-process snapshots.
- Browser preview without Electron: `app/renderer/index.html#acc=signed_out|active|active_avatar|license|device|error` uses a local demo bridge (never active inside the app).

## API fields the Tweaker needs (for the Cloudflare desktop API)
All fields are optional. The app works without them and falls back as noted. Field names are exact.

`GET /api/desktop` (authenticated):

| Field | Type | Used for | Fallback today |
|---|---|---|---|
| `user.avatar_url` | string \| null — absolute `https://` URL on `h1tutility.cc` or a subdomain; served **directly with 200, no redirect**; PNG/JPEG/WebP/GIF, ≤ 512 KB, square (256×256 recommended). If it is on the API host (`dev.h1tutility.cc`) the app sends the same `Authorization: Bearer` token, so it may be private. Do **not** inline the image into the JSON (responses are capped at 64 KB). | Avatar in button, menu and account page | Initials |
| `user.username` | string ≤ 50 | `@username` on the account page | hidden |
| `user.id` | string ≤ 64 | Account ID (shortened) | `–` |
| `user.created_at` | ISO 8601 string | "Member since" | `–` |
| `licenses[].status` | `active` \| `expired` \| `revoked` \| `suspended` \| `pending` | License status pill | `active` |
| `licenses[].key_hint` | string ≤ 12, **last 4 characters only** (never the full key) | `•••• ABCD` | `–` |
| `licenses[].max_devices` | integer | Devices `used / max` | `–` |
| `licenses[].devices_used` | integer | Devices `used / max` | `–` |
| `links.customer_area` | https URL on h1tutility.cc | Menu → Customer Area | `https://dev.h1tutility.cc/account` |
| `links.licenses` | https URL on h1tutility.cc | Account page → "Manage in Customer Area" | `https://dev.h1tutility.cc/account#licenses` |
| `links.support` | https URL on h1tutility.cc | Menu → Support | `https://dev.h1tutility.cc/account#support` (no `/support` page exists yet, it returns 404) |

`POST /api/desktop {action:'verify-device'}` response, when `verified: true`:

| Field | Type | Used for |
|---|---|---|
| `device.label` | string ≤ 60 | Device name on the account page (default "Windows PC") |
| `device.bound_at` | ISO 8601 string | "Linked since" |
| `device.last_seen_at` | ISO 8601 string | "Last seen" |

Existing fields that are still required unchanged: `token` (login), `user.display_name`, `user.email`, `entitled`, `licenses[].id/plan/expires_at`, `verified` (bind/verify), HTTP 401 for expired sessions.

## Device diagnostics (mandatory data-transfer notice since 0.9.27)
Client side of the "Desktop ↔ Cloudflare Device Diagnostics Contract", with one deliberate deviation decided by the product owner on 2026-10-22: **diagnostics are required to use the tweaker** (contract items 1, 4 and 7 said default-off / optional). The server contract is otherwise unchanged.
- **Startup notice**: after sign-in and a verified device, status `diagnostics_required` keeps the tweaker locked (main-process `checkAccess()` is false, so paid IPC stays blocked). The sign-in window reads the values automatically, shows every one of them and offers only "Accept and send" or "Sign out". Wording is a notice, not a voluntary consent.
- **Accept and send**: sends exactly the shown preview (`consent:true` is only ever sent after this click or after an earlier acceptance), stores `accepted_at` and unlocks. If the upload fails (e.g. server 404) the user stays unlocked, sees the server error and the app retries on the next start.
- **After acceptance**: on app start a current report is sent at most once every 7 days or when the app version changed. Account → Privacy & Diagnostics shows status, last sent and retention, and offers "Send report now" (preview → send), "Withdraw data transfer" (stops sending, locks the tweaker until accepted again) and "Delete shared diagnostics" (`{action:'delete', device_id}`, then locked until accepted again). Sign-out clears the acceptance.
- **Collection** (`app/h1t-diagnostics.js`, main process): one fixed Windows PowerShell script; every WMI query is limited with `-Property` to model/config columns, so serial numbers are never read. Fields: `app_version`, `windows_version`, `windows_build`, `cpu_model`, `gpu_model`, `ram_gb`, `motherboard_model`, `tpm_available`, `secure_boot_enabled`. Strings have control characters stripped and lengths capped; values Windows does not provide are omitted (booleans too), never guessed.
- **Upload**: `POST https://dev.h1tutility.cc/api/diagnostics` with the existing bearer session, `{action:'report', consent:true, device_id, device_proof, system}`; `device_id` comes from `bind-device`/`verify-device` and is re-verified before each upload; `device_proof` is the binding proof. Body ≤ 6000 bytes; `{ok:true, retention_days}` is shown.
- Token, `device_id` and `device_proof` never reach the renderer.
- Server errors are shown separately: 404/405 → "service not available on the server", 403 → refused, 400/422 → field validation, 429 → rate limit, 401 → session expired.
- **For the API owner**: the server may keep requiring `consent:true`; it now means "accepted the mandatory notice". If the server should know this explicitly (e.g. `notice_version`), add the field to the contract and the client will send it.
- Tests: `tests/h1t-diagnostics.test.cjs` (allowlist, no serial/MAC/IP/user fields in the script, locked until accepted, exact request body, withdraw/delete re-lock, 404 handling, weekly/after-update re-report, persistence) plus a Windows-only test running the real collector.

## License expiry: automatic restore of all tweaks
When a license ends, is revoked, or cannot be confirmed for 30 days, the tweaker restores every change it made on this PC to the original values.
- **What is restored:** all recovery records of kind `tweak` and `startup` that can be restored (exactly what "Revert All" / Backups would restore: performance, gaming, network, services, privacy, interface, keyboard and hitreg tweaks, disabled startup entries), enabled FiveM mods are switched off (`mods-disable`: original game files back, the mod library stays; skipped when no FiveM folder is found), the in-game resolution if it was changed (`res-reset`), and a saved display colour look. Not touched: SafeMode (a protection feature), cleaned caches and removed apps (debloat cannot be undone).
- **Armed only after use:** the guard (`app/license-expiry.js`) is armed once this PC ran with an `active` license. Accounts without a license never trigger a restore, so tweaks from the free versions before 0.9.25 stay.
- **Triggers and reasons** (the reason decides the message in the app):
  1. Server answers without an active license (`license_required`): `license_expired` when the stored end date has passed, otherwise `license_inactive` (revoked or removed, e.g. a key bound to a spoofed HWID).
  2. Offline, signed out or server blocked: `license_expired` after the stored end date (lifetime never expires by date), and `license_unconfirmed` once no server answer has confirmed the license for 30 days (`GRACE`, lifetime too). Every server answer that shows a license (`active`, `diagnostics_required`, `device_unbound`, `device_consent_required`) restarts the 30 days (`confirmed_at`, stored at most hourly). State files from before 1.0.17 start the 30 days at the update.
  3. App not running: the Windows scheduled task **"H1T.CC License Check"** (`app/license-task.js`) starts the portable exe with `--h1t-expiry-check` once a day for every licensed PC (lifetime too), and additionally one minute after the end date of a time-limited license (StartWhenAvailable: at the next opportunity if the PC was off). That run has no window: it checks the server, restores if the license is gone or unconfirmed for 30 days, and exits. The task is re-registered when the exe path or end date changes and removed after a complete restore.
- **Renewal:** a new active license re-arms the guard and clears the old result; re-applying tweaks is up to the user (Configs).
- **Failures** are shown in the sign-in window and retried after one hour (e.g. FiveM still running while mods are switched off). A restart notice is shown when restored tweaks need one.
- State lives in `%APPDATA%\UND.CC Tweaker\h1t-license-state.json` (not deleted on sign-out, so signing out does not avoid the restore).
- Tests: `tests/license-expiry.test.cjs`, `tests/license-expiry-account.test.cjs`, and a Windows-only test that really registers, queries and removes the scheduled task.
