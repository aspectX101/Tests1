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

## Voluntary device diagnostics (Account → Privacy & Diagnostics)
Implements the "Desktop ↔ Cloudflare Device Diagnostics Contract" exactly; client side only.
- **Default off**, own switch ("Share system diagnostics with H1T.CC support"), separate from the license/device consent. Login, license and device verification work the same with it off.
- **Collection** (`app/h1t-diagnostics.js`, main process): one fixed Windows PowerShell script; every WMI query is limited with `-Property` to model/config columns, so serial numbers are never read. Fields: `app_version`, `windows_version`, `windows_build`, `cpu_model`, `gpu_model`, `ram_gb`, `motherboard_model`, `tpm_available`, `secure_boot_enabled`. Strings have control characters stripped and lengths capped; values Windows does not provide are omitted (booleans too), never guessed.
- **Preview → confirm**: "Create report" collects and shows every value; only the "Send these values" button sends, and it sends the preview held in the main process (the renderer cannot change it; a preview expires after 10 minutes and is used once).
- **Upload**: `POST https://dev.h1tutility.cc/api/diagnostics` with the existing bearer session, `{action:'report', consent:true, device_id, device_proof, system}`. `device_id` comes from the `bind-device`/`verify-device` response and is re-verified before each upload; `device_proof` is the same 64-hex pseudonymous proof as the binding. Body ≤ 6000 bytes. Response `{ok:true, retention_days}` is shown as "Last sent" / "Retention".
- **Delete**: `{action:'delete', device_id}`; on success the local opt-in is switched off as well. Turning the switch off discards any pending preview immediately. Signing out clears the opt-in.
- Token, `device_id` and `device_proof` never reach the renderer. No background or periodic uploads.
- Server errors are shown separately: 404/405 → "service not available on the server", 403 → refused (license/device/consent), 400/422 → field validation, 429 → rate limit, 401 → session expired.
- Tests: `tests/h1t-diagnostics.test.cjs` (allowlist, no serial/MAC/IP/user fields in the script, exact request body, consent/withdraw/delete, 404 handling, persistence) plus a Windows-only test that runs the real collector and checks it contains no user name, MAC or IP.
