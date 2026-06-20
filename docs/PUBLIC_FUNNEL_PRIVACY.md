# Public Funnel — Privacy & Consent

## Masking

- Email → `al***@e***.com`, Phone → `****567`, Name → initial + asterisks (`privacyGuard`).
- Raw email/phone/name are **never persisted**; only masked values are stored.
- Prefers the existing Compliance Center privacy helpers when available.

## Consent (Compliance integration)

- `complianceAdapter` uses the Compliance Center consent/policy guard when present, else a local
  fallback.
- `PUBLIC_FUNNEL_REQUIRE_CONSENT=true` (default): marketing follow-up drafts are **blocked** without
  marketing consent — only an admin-review note is produced.
- Suppression list / opt-out is honored when Compliance Center is present.
- **No cold outreach automation. No unsolicited bulk messaging. External AI disabled by default.**

## Response safety

- Public endpoints return redacted views only (`publicLeadView`).
- Admin endpoints require `x-admin-secret` (or `?secret=`); without a valid secret they return redacted
  data — never an error that leaks data.
- Every API response passes a defensive leak scan (`privacyGuard.hasLeak`); a detected leak returns
  `500 response_blocked_pii_leak` instead of the body.

## Export

- `POST /api/public-funnel/report/generate` exports **redacted** data only.
- `PUBLIC_FUNNEL_EXPORT_RAW_LEADS=false` by default; even when enabled, only masked data exists to
  export — there is no raw PII to leak.

## Dry-run protections

- `PUBLIC_FUNNEL_DRY_RUN=true` forces every potentially-live action to draft/preview.
- Payment capture and license activation are **never** allowed from the funnel.
