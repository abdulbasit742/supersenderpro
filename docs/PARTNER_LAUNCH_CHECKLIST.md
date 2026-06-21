# Partner Launch Checklist


Readiness statuses (from the doctor): blocked, internal_demo_ready, partner_preview_ready, pilot_partner_ready,
public_partner_launch_ready_with_caution.

## Gates
- internal_demo_ready: score >= 50, no blockers.
- partner_preview_ready: score >= 65, privacy safe.
- pilot_partner_ready: score >= 80, no blockers, payouts disabled.
- public_partner_launch_ready_with_caution: score >= 90, no blockers, isolation verified, payouts disabled, custom domain
off.


## Hard safety (always)
Payouts disabled, live messages disabled, custom domains off unless explicitly enabled, full PII masked, secrets not
exposed. Bind QA + admin endpoints to existing auth/RBAC before any partner-facing launch.


## What not to commit
`artifacts/reseller_portal_readiness.*`, `artifacts/reseller_portal_qa_smoke.*`.

HOOKS — server.js / public/index.html / .env.example /
package.json (append-only)

EXISTING-FILE HOOKS (append-only, clearly marked). Run git status --short --branch first and confirm none of
these files have staged changes you'd overwrite. Add only the marked blocks. No commit / push / reset / rebase
/ checkout.



1) server.js — route mount
  // BEGIN RESELLER QA HOOK
  try {
    const resellerPortalQARoutes = require('./routes/resellerPortalQARoutes');
    app.use('/api/reseller-portal-qa', resellerPortalQARoutes);
    app.get('/reseller-portal-qa', (req, res) => res.sendFile(require('path').join(__dirname, 'public', 'reseller-portal-
  qa.html')));
    console.log('[reseller-portal-qa] mounted at /api/reseller-portal-qa (read-only/dry-run)');
  } catch (e) {
    console.error('[reseller-portal-qa] mount skipped:', e && e.message);
  }
  // END RESELLER QA HOOK




2) public/index.html — nav link
  <!-- BEGIN RESELLER QA HOOK -->
  <a href="/reseller-portal-qa" class="nav-link" title="Reseller Portal QA (read-only)">Reseller QA <span style="font-
  size:11px;color:#3fb950">QA</span></a>
  <!-- END RESELLER QA HOOK -->




3) .env.example — placeholders only (never real secrets)
Append this block. Add each line only if not already present.


  # BEGIN RESELLER QA HOOK
  RESELLER_PORTAL_QA_ENABLED=true
  RESELLER_PORTAL_QA_DRY_RUN=true
  RESELLER_PORTAL_QA_STRICT=false
  RESELLER_PORTAL_REQUIRE_PRIVACY_CHECK=true
  RESELLER_PORTAL_REQUIRE_PAYOUT_DISABLED=true
  RESELLER_PORTAL_REQUIRE_LIVE_MESSAGES_DISABLED=true
  RESELLER_PORTAL_REQUIRE_CONSENT=true
  # END RESELLER QA HOOK




4) package.json — scripts (add only, remove nothing)

  "reseller-portal:qa": "node tests/smoke/resellerPortalQASmoke.js",
  "reseller-portal:readiness": "node scripts/reseller-portal-readiness.js"




5) .gitignore — recommended (append-only)
  # Reseller Portal QA reports
