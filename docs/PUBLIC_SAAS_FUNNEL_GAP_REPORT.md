# Public SaaS Funnel — Gap Report

**Scanned:** repo `abdulbasit742/supersenderpro`, branch `main`.
**Scope:** `server.js`, `public/`, `routes/`, `lib/`, `docs/`, `integrations/`, `.env.example`, `package.json`.

## Summary

No public launch funnel existed. A grep for `public-funnel`/`publicSaasFunnel` returned **no results**,
and `public/` had **no** landing/pricing/lead/demo/onboarding pages. This is therefore a **clean additive
build** — nothing was rebuilt.

## Existing systems found (NOT rebuilt — wrapped with safe adapters)

| System | Location | Decision |
|---|---|---|
| SaaS Billing | `lib/subscriptionPlans.js` | Read plan registry via `saasBillingAdapter`; drafts/preview only |
| Business Setup Wizard | `lib/unifiedSetup/` | Preset preview via `businessSetupAdapter`; no live setup change |
| Customer 360 / CRM | `lib/storeCRM.js`, `lib/kommoCRM.js` | Draft profiles/tasks via `customer360Adapter`; no live write |
| Compliance Center | `lib/complianceCenter/` | Consent/policy guard via `complianceAdapter` |
| Owner Command / Briefing | `lib/ownerBriefing/` | Funnel KPIs via `kpiCommandAdapter` |
| Growth Campaign | `routes/growth.js` | Opted-in audience **draft** via `growthCampaignAdapter` |
| Marketplace Intel / Channel Automation / Voice AI | `lib/*` | **No change** |

### Duplicate risk handled

- `lib/leadScoring.js` already exists (scores **WhatsApp bot** leads). The funnel's
  `lib/publicSaasFunnel/leadScoring.js` is **namespaced separately** for public-funnel leads (different
  inputs/grades). The existing file is untouched.

## Gaps filled (all were `missing`)

Landing, features, pricing, use-cases pages; self-serve onboarding wizard; admin Lead Command Center;
lead capture + scoring + masking; demo requests; trial requests + tenant/onboarding previews; follow-up
draft generator (multi-language); API routes at `/api/public-funnel`; env placeholders; docs; doctor +
smoke; package scripts; safe server.js + dashboard nav hooks.

## Risk marks & mitigations

| Mark | Where | Mitigation |
|---|---|---|
| `privacy_risk` | lead capture, admin page | PII masked on intake; redacted public views; leak scan on every response |
| `lead_data_risk` | lead store | Only masked data persisted to gitignored `data/*.json`; no raw PII export |
| `live_action_risk` | demo, trial, tenant | Dry-run default; drafts/previews only; payment & license never allowed |
| `needs_route` | all APIs | Single router mounted via additive hook; no existing route changed |
| `needs_wiring` | pricing, APIs | Read existing plan registry safely; graceful fallback |

## Result

20→21/21 doctor checks; 19/19 smoke checks. Safe to extend, document, test and push.
