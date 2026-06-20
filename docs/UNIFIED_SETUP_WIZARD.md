# Unified Setup Wizard

The Unified Setup Wizard + Tenant Onboarding Autopilot guides any new business/tenant to configure
SuperSender Pro from zero to pilot-ready. It is a **coordination layer** — it inspects and connects
the modules you already have; it does **not** rebuild WhatsApp, ecommerce, payments, social, AI,
Voice AI, Channel Automation, Marketplace Intelligence, Customer 360, etc.

## What it does
- Captures a normalized **business profile** (owner phone/email stored **masked only**).
- Tracks **26 setup steps** with live status pulled from safe module connectors.
- Generates a **business-type autopilot plan** (recommended setup path + priorities).
- Produces a **credential checklist** (env-var names + set/missing — never values).
- Computes a **launch readiness score** (config / security / credentials / module / dry-run).
- Generates and tracks **onboarding tasks** from missing setup.
- Exports a **setup report** (JSON/markdown) to `artifacts/`.

## Safety / dry-run behavior
- `UNIFIED_SETUP_DRY_RUN=true` by default. Setup verification is **local only**.
- Connectors **never import or run** a module — they only check for the presence of code files,
  routes, pages, and env-var **names**.
- No secret value is ever returned, logged, or stored. No external API is called.
- No live module data (customers/orders/payments/social) is ever written.

## Setup steps (status values)
`not_started · configured · partially_configured · missing_config · blocked · skipped · verified`

## Key files
- `lib/unifiedSetup/` — store, profile, presets, step engine, connectors, checklist, planner, readiness, tasks.
- `routes/unifiedSetupRoutes.js` — mounted at `/api/unified-setup`.
- `public/unified-setup.html` (+ js/css) — dashboard.
- `scripts/unified-setup-check.js` — `npm run unified-setup:check`.
- `tests/smoke/unifiedSetupSmoke.js` — `npm run unified-setup:smoke`.

## Export a setup report
`POST /api/unified-setup/export-report` → writes `artifacts/unified_setup_report.json`.

## What not to commit
`.env`, real credentials, `data/*.json` runtime files, logs, uploads, session/auth folders, node_modules.
