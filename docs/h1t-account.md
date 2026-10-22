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
