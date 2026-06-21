# Reseller Portal QA — Gap Report (scan-first)


QA/readiness layer on top of the EXISTING Reseller Portal. Nothing rebuilt.

## Legend
exists | partially_exists | missing | duplicate_risk | safe_to_extend | needs_route | needs_ui | needs_docs | needs_test
| needs_wiring | needs_privacy_check | needs_commission_check | needs_branding_check | tenant_isolation_risk |
payout_risk | live_action_risk


## Existing Reseller Portal (reuse read-only)
Full portal present: registry, white-label, referrals, commission preview, client preview, assets, adapters, routes,
dashboard, partners page, 7 docs, check + smoke. See [Reseller Portal doc]
(https://app.clickup.com/90182109779/docs/2kzmbjjk-7618). QA does NOT modify it.

## QA layer (to build)
All `lib/resellerPortal/qa/*`, `routes/resellerPortalQARoutes.js`, `public/reseller-portal-qa.*`, 7 QA docs, readiness
script, QA smoke = missing -> create. Classified safe_to_extend, needs_route, needs_ui, needs_docs, needs_test.

## Risk review (existing portal already mitigates; QA verifies)
- payout_risk: portal sets `RESELLER_PORTAL_ALLOW_REAL_PAYOUTS=false`; QA asserts payouts disabled + manual review.
- tenant_isolation_risk: portal does business-name-level previews; QA asserts no cross-reseller leak + no raw client PII.
- live_action_risk: white-label/custom-domain/live-messages env-gated off; QA asserts each is off by default.
- branding/commission/privacy checks: QA modules added.


## needs_wiring follow-ups
- Bind QA dashboard + admin endpoints to existing auth/RBAC when available.
- Confirm SaaS Billing reseller-invoice + Tenant Portal entry points when present.


## Verdict
safe_to_extend. Build QA layer as new isolated files + tiny append-only hooks.


lib/resellerPortal/qa/qaGuard.js +
partnerOnboardingChecklist.js +
partnerReadinessScoring.js + onboardingDoctor.js
