# SaaS Payment Adapters

`lib/saasBilling/paymentAdapters/` — a safe adapter layer around payments. **The existing
payment system is NOT rebuilt.**

## Adapters
| id | Purpose |
|---|---|
| `manual` | Default. Always requires manual admin review. |
| `existing` | Detects `backend/src/payment/*` + related modules; billing defers to them for review. |
| `stripe`, `paypal`, `jazzcash`, `easypaisa`, `bank_transfer` | **Placeholders.** Report config status from env only. |

## Provider statuses
`configured · missing_config · placeholder_only · existing_module_detected · manual_review_required`

## Rules
- **No payment APIs are called by default.** Placeholders never make network calls.
- **No payment secrets are stored.** Adapters only read env presence to report status.
- An invoice is **not** auto-marked paid unless `SAAS_BILLING_AUTO_VERIFY_PAYMENTS=true` **and**
  an existing verifier confirms. Otherwise "mark paid" → `pending_manual_review`.
- Payment references are stored **masked** only.

## Wiring the existing verifier (later, opt-in)
`existingPaymentAdapter` intentionally does not import the verifier (to avoid prisma/side
effects). To enable auto-verify: confirm a verifier in `backend/src/payment/verifier.js`,
set `SAAS_BILLING_AUTO_VERIFY_PAYMENTS=true`, and pass `verifierConfirmed: true` to
`invoiceBuilder.markPaidForReview()` from your reviewed integration point.
