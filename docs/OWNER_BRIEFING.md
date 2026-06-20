# Owner Briefing & Daily Autopilot

A safe, **read-only** coordination layer that aggregates KPIs, alerts and action items from your
existing modules into a single owner briefing (morning briefing + evening summary). It does **not**
rebuild any module and never sends anything by default.

## What it does
- Reads existing runtime data (voice conversations/queue, onboarding tasks, commerce records,
  setup readiness) **defensively** — missing files simply return zeros.
- Computes a **KPI snapshot**, derives prioritized **alerts**, and turns them into **action items**.
- Builds an Urdu/English **briefing text** (morning or evening).
- Produces a **dry-run delivery packet** for an existing sender to handle after approval.
- Stores safe, redacted briefing previews in history.

## Safety
- `OWNER_BRIEFING_DRY_RUN=true` by default. Delivery never calls an external API here.
- All text is **redacted** (phones, emails, tokens, payment refs masked).
- It imports no other platform module — only reads JSON files that may exist.

## API (`/api/owner-briefing`)
`GET /status · GET /kpis · GET /alerts · POST /generate {kind} · GET /briefing/:kind ·
POST /deliver {kind,channel} · GET /schedule · GET /history`

## Scripts
- `npm run owner-briefing:check`
- `npm run owner-briefing:smoke`

## What not to commit
`.env`, real credentials, `data/*.json` runtime files, logs, uploads, node_modules.
