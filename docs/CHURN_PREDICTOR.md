# AI Churn Predictor

Predicts which WhatsApp customers are about to go quiet, so you can win them back before they're gone. Runs on your own GPU box (self-hosted Ollama) for the optional human note; the risk scoring itself needs no model at all.

## What it does
- Scores every contact 0-100 on churn risk using a deterministic, explainable RFM + engagement model:
  - **Recency** (45%): din se khamosh? recency hurts most.
  - **Frequency** (25%): repeat buyers are safer.
  - **Monetary** (15%): high lifetime value = lower risk.
  - **Engagement** (15%): recent replies = lower risk.
- Buckets into `healthy` / `watch` / `high` / `critical`.
- For at-risk contacts, drafts a friendly Roman-Urdu win-back message. If your local Ollama (`qwen2.5:32b`) is reachable it writes a tailored note; otherwise a safe template is used. **Never sends anything (dry-run).**

## House rules honored
- Deterministic core works with **no model**. Ollama only enriches the note.
- **Zero new npm dependencies** (Node built-ins + existing express).
- `server.js` untouched — router is self-mountable via `lib/bootstrap/registerSubsystems.js`.
- Tenant-scoped JSON storage under `data/churnPredictor/<tenantId>.json` with mtime read-cache. Missing `tenantId` throws.
- Phone numbers masked in all output. Writes guarded by `x-admin-secret` / `ADMIN_TOKEN`.

## API (base `/api/churn`)
- `GET /health` — subsystem self-check (no network/model).
- `POST /contacts` (admin) — upsert contact RFM features. Body: array of `{ phone, lastOrderAt, orderCount, lifetimeValue, recentReplies }`.
- `GET /predict?enrich=true&persist=false` — returns `{ summary, flagged }`. `enrich=false` skips the model; `persist=true` saves the flag snapshot.

Headers: `x-tenant-id` (required), `x-admin-secret` (for writes).

## Env
| var | default | meaning |
| --- | --- | --- |
| `CHURN_RECENCY_DAYS` | 30 | silence window before recency bites |
| `CHURN_RISK_THRESHOLD` | 60 | score at/above = at-risk |
| `CHURN_W_RECENCY/FREQUENCY/MONETARY/ENGAGEMENT` | 45/25/15/15 | score weights |
| `CHURN_USE_MODEL` | true | use Ollama for the win-back note |

## Test
```
node tests/smoke/churnPredictorSmoke.js
```
Forces an unreachable Ollama host so the deterministic path + template fallback are verified offline. Auto-run by `scripts/ci-smoke.js`.
