 # Reseller Portal QA

 A read-only QA/readiness layer on top of the EXISTING White Label + Reseller Partner Portal. It verifies onboarding
 readiness, branding safety, referral link safety, commission preview safety, tenant/client privacy isolation, public
 partner page safety, and partner asset safety, then rolls everything into a readiness doctor score + launch status. It
 rebuilds nothing.

 ## Purpose
 Make the reseller portal safe to demo, preview, pilot, and eventually launch, without enabling payouts, live messages,
 custom domains, or tenant writes.

 ## API
 `/status`, `/onboarding` + `/onboarding/run`, `/branding` + `/branding/run`, `/referrals` + `/referrals/run`,
 `/commissions` + `/commissions/run`, `/privacy` + `/privacy/run`, `/public-page` + `/public-page/run`, `/assets` +
 `/assets/run`, `/doctor` + `/doctor/run`, `/report` + `/report/generate`.

 ## How to test

node scripts/reseller-portal-readiness.js
node tests/smoke/resellerPortalQASmoke.js
npm run reseller-portal:readiness
npm run reseller-portal:qa
 ## What not to commit
 `artifacts/reseller_portal_readiness.*`, `artifacts/reseller_portal_qa_smoke.*`.
