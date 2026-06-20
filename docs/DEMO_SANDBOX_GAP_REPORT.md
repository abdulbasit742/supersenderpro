# Demo Sandbox — Gap Report

Generated: 2026-06-20T09:28:24.006995+00:00

## Scan result
Searched the repo for existing demo / sandbox / seed / tour systems **before building**.

| Found | Path | Decision |
|---|---|---|
| React frontend demo fixtures | `frontend/lib/demoData.js` | left untouched (separate app) |
| Agent runtime dry-run demo | `agent-runtime/demo.js` | left untouched |
| Agent action sandbox | `agent-runtime/sandbox.js` | left untouched |
| DB seed | `backend/src/db/seed.js` | left untouched |
| Prisma seed | `backend/src/prisma/seed.js` | left untouched |

**Conclusion:** No Demo Sandbox + Guided Product Tour *command center* existed. None of the above is a
client-facing demo experience, so there is **no duplicate risk**. The layer was added as additive,
non-destructive coordination only.

## Area status
| Area | Status |
|---|---|
| Demo mode config | missing → created |
| Demo data factory | missing → created |
| Scenario launcher (10) | missing → created |
| Guided tours (10) | missing → created |
| Demo API routes | missing → created |
| Demo dashboard page | missing → created |
| Public funnel demo CTA | safe_to_extend → adapter + documented hook |
| Module demo adapters (8) | missing → created |
| Server route mount | needs_wiring → marked hook added |
| Dashboard nav link | needs_ui → marked hook added |
| Env placeholders | missing → added |
| Docs (5) | missing → created |
| Check script + smoke test | missing → created |

## Business modules (scanned, NOT rebuilt)
Public SaaS Funnel · Business Setup Wizard (unifiedSetup) · Customer 360 · Owner Command (ownerBriefing) ·
Voice AI · Channel Automation · Marketplace Intelligence · Growth Campaigns · KPI Command · Compliance Center ·
SaaS Billing (subscriptionPlans). All marked **exists / not rebuilt**.
