# Template Marketplace Safety

## Dry-run / no-live-install
- Install actions are **preview-only** and **approval-required** by default.
- `install()` is blocked unless `ALLOW_INSTALL=true` AND `ALLOW_LIVE_ACTIONS=true`.
- Recipes are draft-only; no live send/payment/tenant/automation by default.

## Privacy / secrets
- `privacyGuard.hasLeak()` scans every route response; a detected leak returns `response_blocked_pii_leak`.
- `privacyGuard.redact()` masks emails/long digits and strips secret-like keys (token/secret/password/etc.).
- Default templates/recipes contain no real phones, emails, payment refs, or API keys.

## No external calls
- Draft generator uses a **rule-based fallback**; no external AI call unless `AI_LIVE=true`.
- Adapters never call external APIs and never mutate their source module by default.

## What not to commit
`.env`, `.env.*`, `data/*.json`, logs, uploads, WhatsApp auth/session, token/credential files, raw
customer/order/payment/lead data, node_modules, private backups.
