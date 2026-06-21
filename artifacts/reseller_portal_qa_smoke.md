Validation (run locally, do not fake)
  node --check routes/resellerPortalQARoutes.js
  node --check lib/resellerPortal/qa/qaGuard.js
  node --check lib/resellerPortal/qa/partnerOnboardingChecklist.js
  node --check lib/resellerPortal/qa/partnerReadinessScoring.js
  node --check lib/resellerPortal/qa/onboardingDoctor.js
  node --check lib/resellerPortal/qa/brandingQA.js
  node --check lib/resellerPortal/qa/domainQA.js
  node --check lib/resellerPortal/qa/referralQA.js
  node --check lib/resellerPortal/qa/referralCodeValidator.js
  node --check lib/resellerPortal/qa/commissionQA.js
  node --check lib/resellerPortal/qa/payoutSafetyCheck.js
  node --check lib/resellerPortal/qa/tenantPrivacyQA.js
  node --check lib/resellerPortal/qa/clientPreviewQA.js
  node --check lib/resellerPortal/qa/publicPartnerPageQA.js
  node --check lib/resellerPortal/qa/assetQA.js
  node --check lib/resellerPortal/qa/resellerReadinessDoctor.js
  node --check scripts/reseller-portal-readiness.js
  node --check tests/smoke/resellerPortalQASmoke.js
  npm run reseller-portal:readiness
  npm run reseller-portal:qa



Note: QA modules depend only on express (already in your stack) + Node built-ins ( fs , path ). No new
dependencies. Every QA module defensively loads the existing reseller-portal modules and returns unavailable
instead of crashing if one is missing. QA is strictly read-only: it never enables payouts, live messages, custom
domains, or tenant writes.
