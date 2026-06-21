   # White Label + Reseller Partner Portal — Gap Report

   ## Scan summary
   Scanned for reseller/commission modules, Tenant Portal, Public Funnel, Demo Sandbox,
   Pilot Ops, Support Helpdesk, Customer 360, Business Setup, KPI Command, Owner Command,
   Compliance Center, admin auth/RBAC, partner docs, plan/license/tenant models, public pages.


   ## Headline
   No reseller/white-label/partner portal exists. This coordination layer is new + isolated.
   SaaS Billing + Tenant Portal are referenced but unconfirmed; their adapters return

   `unavailable` and the portal never rebuilds or writes to them.

   ## Classification
   | Area | Status | Action |
   | --- | --- | --- |
   | SaaS Billing | unknown, billing_risk | commission preview reads read-only / estimates; no payouts |
   | Tenant Portal | unknown | read-only adapter, falls back to Business Setup; no tenant writes |
   | Pilot Ops / Support Helpdesk / Business Setup / KPI / Compliance | exists | safe_to_extend (adapters) |
   | Public SaaS Funnel | missing | partners page links demo sandbox; funnel link later |
   | admin auth / RBAC | unknown | needs_wiring (gate portal + admin endpoints) |
   | **Reseller Partner Portal** | **missing -> created** | new coordination layer |

   ## Privacy / billing / live-action risk
   - PII masked; tenant isolation enforced (no cross-reseller data, no raw client PII).
   - Commission is preview-only; no real payouts, no payment API calls.
   - White-label, custom domain, payouts, live messages all env-gated OFF by default.
   - Public partner form needs consent and creates a safe lead preview only.

   ## Follow-ups
   - needs_wiring: bind portal access + admin endpoints to existing auth/RBAC.
   - needs_wiring: confirm SaaS Billing reseller invoice + Tenant Portal entry points when present.



FILE: PATCHES — server.js, public/index.html, .env.example, package.json


   Append-only hooks. `git status --short --branch` first. No commit/push/rebase/reset. Paste only if missing.

   ### server.js (route mount)
   // BEGIN RESELLER PORTAL HOOK
   try {
     const resellerPortalRoutes = require('./routes/resellerPortalRoutes');
     app.use('/api/reseller-portal', resellerPortalRoutes);
   } catch (e) { console.warn('[reseller-portal] route not mounted:', e.message); }
   // END RESELLER PORTAL HOOK

   ### public/index.html (dashboard link)
   <!-- BEGIN RESELLER PORTAL HOOK -->
   <a href="/reseller-portal.html" class="nav-link">Reseller Portal</a>
   <!-- END RESELLER PORTAL HOOK -->


   ### .env.example (placeholders, no real secrets)
   # BEGIN RESELLER PORTAL HOOK
   RESELLER_PORTAL_ENABLED=true
   RESELLER_PORTAL_DRY_RUN=true
   RESELLER_PORTAL_STORE_PATH=data/reseller-portal.json
   RESELLER_PORTAL_REFERRALS_PATH=data/reseller-referrals.json
   RESELLER_PORTAL_HISTORY_PATH=data/reseller-portal-history.json
   RESELLER_PORTAL_ALLOW_WHITE_LABEL=false
   RESELLER_PORTAL_ALLOW_CUSTOM_DOMAIN=false
   RESELLER_PORTAL_ALLOW_REAL_PAYOUTS=false
   RESELLER_PORTAL_ALLOW_LIVE_MESSAGES=false
   RESELLER_PORTAL_REQUIRE_CONSENT=true
   RESELLER_PORTAL_DEFAULT_LANGUAGE=roman_urdu
   RESELLER_PORTAL_STRICT=false
   # END RESELLER PORTAL HOOK

   ### package.json (scripts)
   "reseller-portal:check": "node scripts/reseller-portal-check.js",
   "reseller-portal:smoke": "node tests/smoke/resellerPortalSmoke.js"


   ### .gitignore
   artifacts/
   data/reseller-portal*.json
   data/reseller-referrals.json

   ### When Public SaaS Funnel exists (tiny link)
   <!-- BEGIN RESELLER PORTAL HOOK -->
   <a href="/partners.html" class="nav-link">Partners</a>
   <!-- END RESELLER PORTAL HOOK -->

   ### Local validation
   node --check routes/resellerPortalRoutes.js
   for f in lib/resellerPortal/*.js; do node --check "$f"; done
   for f in lib/resellerPortal/adapters/*.js; do node --check "$f"; done
   node --check scripts/reseller-portal-check.js
   node --check tests/smoke/resellerPortalSmoke.js
   npm run reseller-portal:check
   npm run reseller-portal:smoke



Don't commit artifacts/* , data/reseller-portal*.json , or data/reseller-referrals.json .
