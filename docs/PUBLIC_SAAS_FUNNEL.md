# Public SaaS Launch Funnel + Self-Serve Onboarding + Demo/Lead Command Center

A production-ready, **safe-by-default** public funnel that lets SuperSender Pro be sold to real
businesses — landing → features → pricing → use cases → self-serve onboarding → demo/trial request →
admin lead command center — wired safely around the existing platform modules.

> **Most important rule:** this layer only **adds** the missing public funnel. It does not rebuild
> SaaS Billing, Tenant Portal, Business Setup Wizard, Customer 360, Growth Campaign, Compliance,
> KPI Command, Owner Command, Playbooks, ecommerce, WhatsApp, social, Voice AI, Channel Automation,
> AI Agent Deployment, Marketplace, Backup/Restore or Incident Command. It wraps them with safe adapters.

## Purpose

Give SuperSender Pro a complete public-facing sales funnel and a self-serve onboarding experience that
captures leads, demo requests and trial requests **without** performing any risky live action
(no payments, no live tenant creation, no auto-sent messages, no raw PII exposure).

## Architecture

```
public/                         routes/                          lib/publicSaasFunnel/
  landing.html  + js/css          publicSaasFunnelRoutes.js        store.js (env + JSON store)
  features.html + js/css            (mounted at /api/public-funnel)  funnelConfig.js
  pricing.html  + js/css                                            pageRegistry.js (features/use-cases)
  use-cases.html+ js/css                                            safetyGuard.js  privacyGuard.js
  start.html    + js/css   <-- self-serve onboarding wizard         leadStore.js leadNormalizer.js
  leads.html    + js/css   <-- admin Lead Command Center            leadScoring.js leadFollowupDrafts.js
                                                                    demoRequests.js demoScheduler.js
                                                                    trialRequests.js onboardingPreview.js
                                                                    tenantProvisionPreview.js
                                                                    complianceAdapter.js flowNodes.js
                                                                    adminCommands.js doctor.js index.js
                                                                    adapters/{saasBilling,businessSetup,
                                                                      customer360,growthCampaign,kpiCommand}
```

All runtime data is stored as JSON under `data/` (gitignored). **Only masked contact data is stored.**

## Pages

| Page | Path | Purpose |
|---|---|---|
| Landing | `/landing.html` | Hero, pain points, modules, how it works, safety, CTAs |
| Features | `/features.html` | Each module: what / who / example / safety / CTA |
| Pricing | `/pricing.html` | Plan cards from SaaS Billing (or safe fallback). Request a plan = lead only |
| Use Cases | `/use-cases.html` | Industry use cases → setup preset preview |
| Start Setup | `/start.html` | Self-serve onboarding wizard → preview → demo/trial request |
| Lead Command Center | `/leads.html` | Admin dashboard (redacted by default, masked with admin secret) |

## API (mounted at `/api/public-funnel`)

Status/config: `GET /status`, `GET /config`, `GET /features`, `GET /use-cases`, `GET /plans`
Leads: `POST /leads`, `GET /leads`, `GET /leads/:id`, `PUT /leads/:id`, `POST /leads/:id/score`, `POST /leads/:id/followup-draft`
Demo: `POST /demo-request`, `GET /demo-requests`, `POST /demo-requests/:id/followup-draft`
Trial/onboarding: `POST /trial-request`, `GET /trial-requests`, `POST /onboarding/preview`, `POST /tenant/preview`
Reports: `GET /kpis`, `POST /report/generate`, `GET /history`, `GET /doctor`

See `docs/LEAD_CAPTURE_AND_DEMOS.md` and `docs/SELF_SERVE_ONBOARDING.md` for behavior detail.

## Safe adapters (no rebuilds)

| Adapter | Wraps | Behavior |
|---|---|---|
| `saasBillingAdapter` | `lib/subscriptionPlans.js` | Read plan registry; create trial-request **drafts** + invoice **preview**. No payment, no subscription. |
| `businessSetupAdapter` | `lib/unifiedSetup/*` | Industry preset **preview** + readiness checklist. No live setup modified. |
| `customer360Adapter` | `lib/storeCRM.js`, `lib/kommoCRM.js` | Local lead preview + profile/task **drafts**. No live CRM write, no sends. |
| `complianceAdapter` | `lib/complianceCenter/*` | Consent + suppression check (falls back to local logic). |
| `growthCampaignAdapter` | `routes/growth.js` | Audience **draft** for opted-in leads only. No live campaigns. |
| `kpiCommandAdapter` | `lib/ownerBriefing` | Funnel KPIs (aggregate only). |

If a module is absent, the adapter degrades gracefully to a safe fallback.

## How to test

```bash
npm run public-funnel:check    # runs doctor, writes artifacts/public_funnel_check.{json,md}
npm run public-funnel:smoke    # end-to-end smoke, writes artifacts/public_funnel_smoke.{json,md}
node --check server.js
```

## What NOT to commit

`.env`, `.env.*`, `data/*.json` (leads/demo/trial/history), logs, uploads, tokens, credentials,
raw customer/payment data. These are already covered by `.gitignore`.

See also: `PUBLIC_LANDING_PAGES.md`, `PUBLIC_PRICING_PAGE.md`, `LEAD_CAPTURE_AND_DEMOS.md`,
`SELF_SERVE_ONBOARDING.md`, `PUBLIC_FUNNEL_PRIVACY.md`, `PUBLIC_FUNNEL_ADMIN_COMMANDS.md`.
