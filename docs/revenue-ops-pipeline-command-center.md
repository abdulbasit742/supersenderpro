# Revenue Operations + Sales Pipeline Command Center

> Additive, **read-only, dry-run, preview-only** RevOps command center for SuperSender Pro. Deterministic local
> heuristics only — it does not mutate data or call any external/live service.

## What this module does

Provides a safe owner/admin command center that previews: leads, opportunities, pipeline health, sales forecast,
deal scores, close probability, follow-up readiness, WhatsApp sales readiness, rep performance, conversion
analytics, revenue risk, opportunity comparison, and a masked audit trail.

## Safety guarantees

Every successful API response includes the shared safety object:

```json
{ "ok": true, "dryRun": true, "previewOnly": true, "readOnly": true,
  "liveActionsEnabled": false, "externalCallsEnabled": false, "liveSend": false, "liveAiCall": false,
  "liveDbMutation": false, "leadMutationEnabled": false, "opportunityMutationEnabled": false,
  "pipelineMutationEnabled": false, "repAssignmentEnabled": false, "invoiceMutationEnabled": false,
  "paymentMutationEnabled": false, "piiMasked": true, "secretsExposed": false }
```

Errors return a safe shape with no stack traces. A `hasLeak()` guard blocks any response containing a raw
phone, email, private key, secret token, or stack trace.

## Endpoints (mounted at `/api/revenue-ops`)

- `GET /status`, `GET /dashboard-data`
- `GET /leads`, `GET /opportunities`, `GET /opportunities/:id/preview`
- `POST /analyze`, `POST /deal-score`, `POST /pipeline-health`, `POST /forecast`,
  `POST /followup-readiness`, `POST /conversion-analytics`, `POST /rep-performance`,
  `POST /revenue-risk`, `POST /recommendations`, `POST /opportunities/compare-preview`
- `GET /audit-preview`

All POST bodies are optional; when omitted, the deterministic sample dataset is used.

## Dashboard page

`public/revenue-ops.html` (+ `public/js/revenue-ops.js`, `public/css/revenue-ops.css`), served at
`/revenue-ops.html` and linked from the main dashboard nav as **Revenue Ops**. All buttons are Preview/Scan only.

## Scoring logic (deterministic)

- **Deal score (0–100)**: stage weight + contact recency + reply engagement + value band + payment status,
  minus complaint-risk penalty → `Hot / Warm / Neutral / Cold / Needs Review`. Close probability blends stage
  probability with the deal score.
- **Pipeline health (0–100)**: won/lost ratios and stuck-deal penalties → `Strong / Stable / Needs Review / Critical`.
- **Forecast**: banded value mid-points × close probability → banded amount + confidence (exact amounts never returned).
- **Follow-up readiness**: contact age + consent + complaint risk → `Ready / Wait / Needs Review / Suppressed Preview`.
- **Conversion analytics**: stage-distribution-derived rates, stuck/drop-off stages, best/worst source.
- **Rep performance**: aggregated per masked owner (counts, conversion, response speed, value band).
- **Revenue risk (0–100)**: high-value stuck + payment-pending + complaint + dormant → `Low / Medium / High / Critical`.

No randomness, no AI calls, no Meta calls, no external scoring APIs.

## Redaction / PII masking

`lib/revenueOps/redactor.js` masks phone, email, name, company, address, refs, tokens/secrets, and **bands**
revenue amounts. It never returns raw env values or stack traces.

## What it does NOT do

- Does not mutate real CRM/deal/customer/order data
- Does not assign reps
- Does not create invoices or payments, or mutate payments
- Does not send WhatsApp/email/SMS messages
- Does not call Meta APIs or live AI APIs
- Does not expose secrets, full PII, or stack traces

## Local test commands

```bash
node --check routes/revenueOpsRoutes.js
node --check lib/revenueOps/index.js
npm run check:revenue-ops
node tests/smoke/revenueOpsSmoke.js
```

## Future production upgrades

- Replace the sample dataset with a read-only adapter over the real pipeline store (still preview-only).
- Add opt-in consent-aware follow-up scheduling behind an explicit, audited live-action flag.
- Persist masked audit events to the existing compliance/audit store.
