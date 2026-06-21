# Mock Gateway — Delivery Report

## Summary
Offline mock API gateway + 15 provider simulators + 18 scenarios + sanitizer + dashboard + doctor + check + smoke, added
as an isolated layer. No existing module rebuilt. No commit/push (ClickUp workspace only; Gumloop pushes later).


## Safety guarantees
Offline-only, dry-run, no external network calls, no live sends, no live payments, no webhook delivery, no secrets, PII
redacted, sample data only.


## Files safe to ZIP/copy

`lib/mockGateway/**`, `routes/mockGatewayRoutes.js`, `public/mock-gateway.*`, `scripts/mock-gateway-check.js`,
`tests/smoke/mockGatewaySmoke.js`, `docs/MOCK_*` / `OFFLINE_*` / `LOCAL_DEMO_*`, `demo/mock-scenarios.json`, plus the
marked hook snippets.


## Files to avoid copying
`.env`, `data/**`, `sessions/`, `.baileys-auth/`, `artifacts/**`, anything with tokens/secrets/keys.


## Readiness
Run `npm run mock-gateway:check` to get the doctor score + status (blocked / local_demo_ready / vscode_ready /
manual_zip_ready_with_caution).

HOOKS — server.js / public/index.html / .env.example /
.gitignore / package.json (append-only)

EXISTING-FILE HOOKS (append-only, clearly marked). Run git status --short --branch first. Add only the marked
blocks. No commit / push / rebase / reset / PR (only Gumloop pushes later).



1) server.js — route mount
  // BEGIN MOCK GATEWAY HOOK
  try {
    const mockGatewayRoutes = require('./routes/mockGatewayRoutes');
      app.use('/api/mock-gateway', mockGatewayRoutes);
      app.get('/mock-gateway', (req, res) => res.sendFile(require('path').join(__dirname, 'public', 'mock-gateway.html')));
    console.log('[mock-gateway] mounted at /api/mock-gateway (offline/dry-run)');
  } catch (e) {
      console.error('[mock-gateway] mount skipped:', e && e.message);
  }
  // END MOCK GATEWAY HOOK




2) public/index.html — nav link
  <!-- BEGIN MOCK GATEWAY HOOK -->
  <a href="/mock-gateway" class="nav-link" title="Mock Gateway (offline)">Mock Gateway <span style="font-
  size:11px;color:#58a6ff">OFFLINE</span></a>
  <!-- END MOCK GATEWAY HOOK -->




3) .env.example — placeholders only (never real secrets)
  # BEGIN MOCK GATEWAY HOOK
  MOCK_GATEWAY_ENABLED=true
  MOCK_GATEWAY_DRY_RUN=true
  MOCK_GATEWAY_OFFLINE_ONLY=true
  MOCK_GATEWAY_EXTERNAL_CALLS=false
  MOCK_GATEWAY_LIVE_ACTIONS=false
  MOCK_GATEWAY_REDACT_PII=true
  MOCK_GATEWAY_REDACT_SECRETS=true
  MOCK_GATEWAY_EVENTS_PATH=data/mock-gateway-events.json
  MOCK_GATEWAY_STRICT=false

  # Safe global defaults (add only if missing):
  DRY_RUN=true
  REQUIRE_APPROVAL=true
  ALLOW_LIVE_WHATSAPP=false
  ALLOW_LIVE_EMAIL=false
  ALLOW_LIVE_PAYMENTS=false
  ALLOW_LIVE_WEBHOOKS=false
  ALLOW_TENANT_WRITE=false

 ALLOW_AUTH_WRITE=false
 REDACT_PII=true
 REDACT_SECRETS=true
 # END MOCK GATEWAY HOOK




4) .gitignore — protections (append-only, do not remove existing)
 # BEGIN MOCK GATEWAY HOOK
 .env
 .env.*
 node_modules/
 logs/
 uploads/
 data/*.json
 data/**/*.json
 sessions/
 .wa-auth/
 .baileys-auth/
 baileys_auth*/
 browser-cache/
 private-backups/
 artifacts/*raw*
 artifacts/*private*
 *token*
 *secret*
 *.pem
 *.key
