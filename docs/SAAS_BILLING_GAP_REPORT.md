# SaaS Billing — Gap Report

Generated during the "scan first, no duplicate build" pass on `abdulbasit742/supersenderpro`.

## 1. Existing systems found (reused, NOT rebuilt)
| System | Location | Verdict |
|---|---|---|
| Subscription plans (starter/pro/unlimited, phone-keyed) | `lib/subscriptionPlans.js` | **Keep** — adapted via `tenantPlans` legacy mapping |
| Reseller network (phone-keyed, 15% discount) | `lib/resellerNetwork.js` | **Keep** — surfaced read-only |
| Payment verifier (prisma, fraud, masking, audit) | `backend/src/payment/verifier.js` | **Keep** — detected + deferred to for review |
| Payment gateways | `backend/src/payment/{jazzcash,easypaisa,emailParser}.js` | **Keep** — placeholders only added |
| Payment routes | `backend/src/routes/payments.js` | **Keep** — untouched |
| Auth / RBAC (JWT, requireRole) | `backend/src/middleware/auth.js` | **Keep** — untouched |
| Invoice generator (orders) | `wa-sales-bot/utils/invoiceGen.js` | **Keep** — separate concern from subscription invoices |
| Owner Briefing / Command | `lib/ownerBriefing/` | **Keep** — adapter only |
| Unified / Business Setup | `lib/unifiedSetup/` | **Keep** — adapter only |

## 2. Duplicate-build risks avoided
- Did **not** create a second payment system — added a detection adapter + placeholders.
- Did **not** rebuild plans — mapped legacy `starter/pro/unlimited` → new `starter/pro/enterprise`.
- Did **not** rebuild resellers, auth, ecommerce, WhatsApp, AI, Voice AI, Channel Automation,
  Marketplace, Customer 360, Owner Command, Business Setup, or Playbook systems.
- Did **not** create a duplicate admin bot — `adminCommands.js` exposes `register()`/`handle()`
  as an integration point for the existing admin command system.

## 3. Missing coordination layer (built here)
Tenant plan model, tenant license engine, usage metering + rollups, quota checker, feature gate
(warn-only), billing status, invoice drafts, payment adapter layer, reseller/commission controls,
plan upgrade/downgrade flow, API routes, dashboard UI, Flow Studio nodes, Owner Command /
Business Setup adapters, doctor, reports, env placeholders, docs, check + smoke tests.

## 4. Risk flags
| Flag | Where | Mitigation |
|---|---|---|
| `payment_risk` | invoices, adapters | No capture; manual review default; refs masked |
| `live_action_risk` | feature gate, plan change | Warn-only/dry-run; preview + approval gates |
| `privacy_risk` | resellers, usage | PII masked; no bodies/secrets stored; `hasLeak()` guard |

## 5. Integration points left for explicit operator decision
- Wiring `existingPaymentAdapter` to the real `verifier.js` for auto-verify (kept disabled).
- Registering `flowNodes` with the live Flow Studio registry (if/when present).
- Registering `adminCommands` with the live admin WhatsApp command router.
- Replacing the local JSON `licenseStore`/`usageStore` with the production DB/tenant store.
- Turning on live enforcement (see `SAAS_BILLING_SAFETY.md`).
