# SaaS Billing + Tenant License + Usage Metering Command Center

A safe coordination layer that lets **SuperSender Pro** be sold to businesses, agencies,
resellers and tenants with plans, limits, subscriptions, renewals, feature gates, usage
counters, invoices and admin controls — **without rebuilding any existing system**.

> **Default posture: warn-only / dry-run.** Nothing is charged, no live messages are sent,
> and no tenant is suspended unless an operator explicitly opts in via environment flags.

## What it does
- **Plans & tiers** — registry of plans (`free_trial → enterprise/lifetime/custom`) with feature gates + usage limits.
- **Tenant licenses** — issue / renew / track license status (trial, active, grace, etc.) with masked keys.
- **Usage metering** — record metered events and roll them up daily / weekly / monthly / per billing cycle.
- **Feature gates** — answer "can this tenant use this feature/action?" — warn-only by default.
- **Invoices** — build invoice *drafts*; "mark paid" only enters a manual review state.
- **Payment adapters** — detect existing payment modules + placeholders; never capture payments by default.
- **Reseller / agency** — assign tenants, track commissions (draft), export reports. No real payouts.
- **Plan change** — preview / request / apply (approval-gated) upgrades & downgrades.
- **Reports & doctor** — MRR draft, trials ending, past due, usage over limits + a health/safety check.

## Existing systems it reuses (NOT rebuilt)
| Concern | Existing module | How billing uses it |
|---|---|---|
| Subscriptions/plans | `lib/subscriptionPlans.js` | Read legacy tiers via `tenantPlans` adapter (starter/pro/unlimited → starter/pro/enterprise) |
| Resellers | `lib/resellerNetwork.js` | Surfaced read-only; new resellers stored separately |
| Payments | `backend/src/payment/*` (verifier, jazzcash, easypaisa, emailParser) | Detected by `existingPaymentAdapter`; deferred to for review, never re-implemented |
| Auth / RBAC | `backend/src/middleware/auth.js` | Route writes guarded by admin secret; existing auth untouched |
| Owner Command / Briefing | `lib/ownerBriefing` | `ownerCommandAdapter` provides a read-only billing summary |
| Unified / Business Setup | `lib/unifiedSetup` | `businessSetupAdapter` provides a plan-selection card + checklist |

## Architecture
```
lib/saasBilling/
  config.js            env + safe paths            store.js         atomic JSON store
  privacy.js           masking + leak detection    safetyGuard.js   enforcement posture
  featureCatalog.js    features / limits / metrics
  planRegistry.js  tenantPlans.js                  (plans + tenant mapping)
  licenseStore/Engine/Validator/Keys.js            (license engine)
  usageStore/Meter/Rollups.js  quotaChecker.js     (usage metering)
  featureGate.js  routeGuard.js  limitGuard.js     (gating)
  billingStatus.js  invoiceStore/Builder.js  renewalEngine.js
  paymentAdapters/*    (manual + existing + placeholders)
  resellerStore/Manager.js  commissionTracker.js
  planChange.js  upgradeAdvisor.js
  flowNodes.js  adminCommands.js  adapters/*       (integrations)
  reportBuilder.js  doctor.js  index.js
routes/saasBillingRoutes.js     public/saas-billing.html (+ js/css)
scripts/saas-billing-check.js   tests/smoke/saasBillingSmoke.js
```

## API
Mounted at `/api/saas-billing` (see the `SAAS BILLING HOOK` block in `server.js`). See the other
docs for plans, licenses, usage, reseller and safety details. Read endpoints are open; write
endpoints require an admin secret when one is configured.

## Run the checks
```bash
npm run saas-billing:check    # install + functional validation → artifacts/saas_billing_check.*
npm run saas-billing:smoke    # offline smoke test            → artifacts/saas_billing_smoke.*
```

## Dashboard
Open **`/saas-billing.html`** (linked from the main nav). Tabs: Overview, Plans, Tenants &
Licenses, Usage, Invoices, Feature Gate tester, Resellers, Doctor.

See also: `SAAS_PLANS_AND_LIMITS.md`, `SAAS_LICENSE_ENGINE.md`, `SAAS_USAGE_METERING.md`,
`SAAS_RESELLER_PORTAL.md`, `SAAS_PAYMENT_ADAPTERS.md`, `SAAS_BILLING_SAFETY.md`.
