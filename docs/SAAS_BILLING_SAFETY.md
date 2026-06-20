# SaaS Billing — Safety & Enforcement

This layer is designed to be **safe by default**. All risky behavior is gated behind explicit
environment flags and routed through `lib/saasBilling/safetyGuard.js`.

## Default posture
| Flag | Default | Effect |
|---|---|---|
| `SAAS_BILLING_ENABLED` | true | Layer active |
| `SAAS_BILLING_DRY_RUN` | true | Decisions are advisory |
| `SAAS_BILLING_WARN_ONLY` | true | Never blocks, only warns |
| `SAAS_BILLING_ENFORCE_LIMITS` | false | No hard blocking |
| `SAAS_BILLING_REQUIRE_ADMIN` | true | Write endpoints need admin secret |
| `SAAS_BILLING_AUTO_VERIFY_PAYMENTS` | false | No auto payment verification |
| `SAAS_BILLING_ALLOW_LIVE_SUSPENSION` | false | Never auto-suspends tenants |
| `SAAS_BILLING_ALLOW_PLAN_WRITE` | false | Plan create/edit/delete disabled |

**Live enforcement** only happens when `ENFORCE_LIMITS=true` AND `DRY_RUN=false` AND
`WARN_ONLY=false`.

## Protected actions (never blocked, even when enforcing)
login, logout, auth, billing, invoice, export, support, admin, safety, doctor, health,
saas-billing. See `safetyGuard.isProtectedAction()`.

## How to enable enforcement later (carefully)
1. Confirm `SAAS_BILLING_REQUIRE_ADMIN=true` and an admin secret is set.
2. Test with `POST /api/saas-billing/feature/preview-enforcement` to see what *would* block.
3. Flip `SAAS_BILLING_WARN_ONLY=false` and `SAAS_BILLING_DRY_RUN=false`, then
   `SAAS_BILLING_ENFORCE_LIMITS=true`.
4. Verify protected routes still pass and only non-critical actions are gated.

## What must NOT be committed
`.env`, `.env.*`, API keys, payment/gateway secrets, WhatsApp auth/session folders,
`data/*.json` runtime data, logs, uploads, `node_modules`, browser cache, private backups,
token/credential files. (These are already covered by `.gitignore`.)

## Privacy
`lib/saasBilling/privacy.js` masks emails/phones/refs/keys, sanitizes outbound payloads, and
provides `hasLeak()` — used by the doctor and smoke test to assert no secrets escape.
