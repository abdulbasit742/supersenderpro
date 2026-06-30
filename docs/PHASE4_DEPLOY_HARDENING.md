# Phase 4 - Deploy Hardening (env validation + deploy doctor)

Pre-flight safety so a deploy fails *before* it boots broken, not after. Additive - no `server.js` changes.

## What's here
| File | Role |
|---|---|
| `lib/deploy/envSchema.js` | declarative env contract: required/optional per subsystem, safe defaults, cross-field rules |
| `scripts/deploy-doctor.js` | go/no-go check: validates env, confirms wiring hooks in server.js, runs subsystem doctors |
| `.env.production.example` | complete production env template |

## Philosophy
Almost everything has a **safe default** (dry-run / json / memory), so the app boots on a bare env. `required` is reserved for things genuinely unsafe at their dev default - currently `SESSION_SECRET` and `AUTH_JWT_SECRET`. Cross-field rules catch foot-guns: `DB_DRIVER=postgres` without `DATABASE_URL`, Stripe key without webhook secret, `BILLING_ENFORCE=block` without Stripe.

## Use on deploy
```bash
cp .env.production.example .env   # then fill secrets
node scripts/wire-all.js          # ensure hooks present
node scripts/deploy-doctor.js     # GO / NO-GO
node scripts/ci-smoke.js          # functional smoke
```
Non-zero exit on blockers makes this CI/CD-gate friendly.

## Roadmap
- [x] Phase 1, 2, 5; graceful shutdown; rate limits
- [x] **Phase 4: env validation + deploy doctor (this)**
- [ ] Container/orchestrator rollout config + managed PG/Redis wiring
- [ ] Split 2.1MB server.js (Phase 3) - do with review
