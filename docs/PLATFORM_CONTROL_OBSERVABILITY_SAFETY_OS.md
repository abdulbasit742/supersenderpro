# Advanced Platform Control + Observability + Safety OS

> Read-only, preview-only control center for SuperSender Pro. **Additive and non-invasive** — it does not
> modify, rename, or remove any existing module, route, page, or data.

## What Platform Control does

Platform Control is an admin-style **command center** that scans the current repository/runtime state and
reports readiness, health, risk, and recommended next actions before a release. It answers:

- What modules, API routes, dashboard pages and feature flags exist?
- Is the environment ready? Which required keys are missing? (presence only — values are never read)
- Are WhatsApp (local + Cloud), AI providers, RAG/vector, queue/worker, DB and storage ready?
- Are there duplicate routes/links, broken references, or possible PII/secret leaks in public assets?
- What is the **release readiness score** and **risk score**, and what should I do next?

## How it is read-only

Every scanner only **reads** files and checks **presence** of env keys. There are:

- **No live actions** (`liveActionsEnabled: false`)
- **No external/network calls** (`externalCallsEnabled: false`)
- **No WhatsApp / email / SMS sends**, **no payments**, **no live AI calls**
- **No database connection required** to run any check
- **No writes** to business data, sessions, or configuration

All check/smoke "run" endpoints return a **preview plan** only — they never execute scripts.

## API routes

Mounted at `/api/platform-control` (safe namespace, added only if not already present).

**Core:** `/status` `/summary` `/architecture` `/safety`
**Registry:** `/modules` `/routes` `/dashboard-pages` `/feature-flags` `/package-scripts`
**Readiness:** `/readiness` `/readiness/env` `/readiness/secrets` `/readiness/whatsapp`
`/readiness/whatsapp-cloud` `/readiness/ai` `/readiness/rag` `/readiness/queue` `/readiness/database`
`/readiness/storage` `/readiness/integrations` `/readiness/webhooks` `/readiness/campaigns`
`/readiness/rate-limits` `/readiness/backup` `/readiness/deployment`
**Safety / quality:** `/safety/pii-leak-preview` `/safety/duplicate-routes`
`/safety/duplicate-dashboard-links` `/safety/broken-references` `/safety/route-mounts`
`/safety/public-pages` `/safety/log-preview` `/safety/audit-preview` `/safety/guard-report`
**Scoring:** `/score/release-readiness` `/score/risk` `/recommendations`
**Smoke / check (preview-only):** `/checks` `POST /checks/run-preview` `/smoke-tests`
`POST /smoke-tests/run-preview`

## Dashboard page

`public/platform-control.html` (+ `public/js/platform-control.js`, `public/css/platform-control.css`).
Served at `/platform-control.html` and linked from the main dashboard navigation under **Platform Control**.
All buttons are **Preview / Scan / Refresh** only — there are no destructive actions.

## Safety flags

Every API response carries canonical safety flags:

```json
{ "ok": true, "dryRun": true, "readOnly": true, "liveActionsEnabled": false,
  "externalCallsEnabled": false, "piiMasked": true, "secretsExposed": false }
```

A final `hasLeak()` guard inspects each response and blocks it (HTTP 500, no data) if it detects a raw
private key, an `sk-...` style secret, or a serialized stack trace.

## Redaction behavior

`lib/platformControl/redactor.js` masks all potentially sensitive values:

- `maskPhone('+923001234567')` → `+92******4567`
- `maskEmail('user@example.com')` → `us***@example.com`
- `maskToken` / `maskSecret` → `value_****` (only on labels, never on real secret values)
- `maskName`, `maskRef`, `maskPath`, `maskMessage`, `safeText`
- `redactEnvMap` → returns only `configured` / `not_configured`, never values
- `redactLog`, `redactError` → strip stack traces and mask PII inside messages

## Readiness scanners

Each scanner checks **existence and safe status, not live connectivity**:

- **WhatsApp** — Baileys / whatsapp-web.js / Cloud files, webhook & template routes, env key presence
- **AI** — OpenAI/Anthropic/Gemini/OpenRouter/Groq/Ollama/Tavily key presence, AI modules, RAG modules
- **Queue** — Redis/BullMQ/queue + scheduler/worker files, in-memory fallback
- **Database/Storage** — data folders, JSON stores, adapters, migrations (no connection required)
- **Safety guard** — duplicate route hooks/links, missing mounts, broken assets, public-asset PII/secret scan,
  package-script inventory

## Smoke / check scripts

- `npm run platform-control:check` → `node scripts/platform-control-check.js`
- `npm run platform-control:smoke` → `node tests/smoke/platformControlSmoke.js`

Both run **offline** (no server, no network) and write artifacts to `artifacts/`.

## How to use it before release

1. `npm run platform-control:check` — verifies install + safe behaviour.
2. `npm run platform-control:smoke` — verifies every preview function is safe and leak-free.
3. Open `/platform-control.html` and click **Refresh Status Preview** → **Scan Readiness Preview**.
4. Review the **Release Readiness Score**, **Risk Score**, and **Recommended Next Actions**.
5. Resolve any blockers (e.g. missing required env keys), then re-scan.

## How it avoids breaking the existing build

- 100% **additive**: new files under `lib/platformControl/`, one new route file, one new page, one check, one
  smoke test, one docs file.
- New code is mounted inside a `try/catch` server hook, so a failure is **non-fatal** and never stops the app.
- No existing route, page, nav link, module, or data is modified or removed.
- No new runtime dependency is introduced (uses only `express`, already in the repo).
- All operations are read-only previews — the live system behaviour is unchanged.

## Additional scanners

- **Architecture preview** (`/architecture`) — detects backend, dashboard, storage, WhatsApp, AI, queue and
  integrations from the repo layout (`detected_preview` / `not_detected_preview`).
- **Template readiness** (`/readiness/templates`) — WhatsApp/message template modules + default template/lang
  presence; live sync disabled.
- **Security posture** (`/readiness/security`) — public-secret risk, raw-log risk, missing auth keys,
  security-header hint; never exposes secrets or PII.
- **Public page safety scanner** (`/safety/public-pages`) — flags public pages containing secret-like strings
  and missing JS/CSS/asset references.
- **Check command inventory** (`/check-commands`) — lists check/test/lint/smoke scripts and flags dangerous
  command patterns (no execution).
- **Error pattern preview** (`/safety/error-patterns`) — redaction-safe catalogue of common error patterns;
  no real logs or stack traces.

## How to interpret the readiness score

`/score/release-readiness` returns `scorePreview` (0–100), a letter `gradePreview` (A–F) and `passPreview`
(true only when score ≥ 75 and there are no blockers). The score starts at 100 and is reduced by missing
required env keys, missing core modules, pending deployment-checklist items, and a fraction of the risk score.
Resolve `blockers` first, then re-scan.

## How to interpret the risk score

`/score/risk` returns `riskScorePreview` (0 best … 100 worst) and `riskLevelPreview` (`low` < 30,
`medium` 30–59, `high` ≥ 60). Signals include missing required env, broken references, duplicate route mounts,
duplicate dashboard links, public-asset PII/secret findings, and dangerous package scripts.

## Recommended production next steps

1. Configure all required env keys (`/readiness/env`) and confirm secret presence (`/readiness/secrets`).
2. Clear safety signals from `/safety/guard-report` (duplicates, broken references, unsafe public pages).
3. Drive the release readiness score to grade B+ with zero blockers.
4. Wire `npm run platform-control:check` and `:smoke` into CI as a pre-release gate.
