# Compliance & Consent Center

A consent-first coordination layer that unifies consent and opt-outs across channels (WhatsApp,
voice, marketing, email, SMS) and decides whether outreach is allowed. It **reads** the existing
Voice AI consent store so the voice channel reflects current opt-in, and adds a cross-channel
registry. It never sends messages and never exposes raw contact details.

## What it does
- **Consent registry** across channels (stores masked subjects; merges Voice AI consent read-only).
- **Opt-out manager** — one opt-out clears all channels and is always honored.
- **Policy checker** — `canContact(subject, channel)` returns allow/deny with a reason; fails safe.
- **Quiet hours** — denies contact during configured quiet hours (overnight-aware).
- **Compliance summary** + **audit log** (redacted, subject ids masked).

## Safety
- Consent-first by default (`COMPLIANCE_CONSENT_FIRST=true`).
- No sending, no external API calls. Decisions only.
- Subject ids are masked in all responses, registry, and audit.

## API (`/api/compliance`)
`GET /status · GET /summary · GET /rules · GET /registry · GET /consent/:id ·
POST /consent/:id {channels} · POST /opt-out/:id · POST /check {subjectId,channel} · GET /audit`

## Scripts
- `npm run compliance:check`
- `npm run compliance:smoke`

## What not to commit
`.env`, `data/*.json` runtime files, logs, node_modules.
