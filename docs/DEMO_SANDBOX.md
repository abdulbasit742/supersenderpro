# Demo Sandbox & Guided Product Tour

A safe **coordination layer** that lets clients, leads, resellers and investors experience SuperSender Pro
without connecting real accounts or exposing private data.

> This layer does **not** rebuild any business module. It only coordinates demo data, scenarios and tours
> on top of the existing modules (Owner Command, Customer 360, Voice AI, Channel Automation, Marketplace,
> Growth Campaigns, KPI Command, SaaS Billing, Public Funnel).

## What it does
- Provides a fake demo business profile, customers, orders, payments, WhatsApp chats, channel posts,
  ecommerce products, Voice AI transcripts, marketplace offers, KPIs and SaaS billing data.
- Offers a **Scenario Launcher** (10 scenarios) and a **Guided Product Tour** engine (10 tours).
- Exposes a demo dashboard at `/demo-sandbox.html`.
- Blocks every live/destructive action by default (dry-run).

## Defaults (safe by design)
| Flag | Default |
|---|---|
| `enabled` | `true` |
| `dryRun` | `true` |
| `blockLiveActions` | `true` |
| `showDemoBadges` | `true` |
| `allowRealData` | `false` (cannot be loosened via API) |
| `allowExternalCalls` | `false` (cannot be loosened via API) |
| `demoCountry` | `PK` · `demoCurrency` `PKR` · `demoLanguage` `roman_urdu` |

## Files
```
lib/demoSandbox/                 # config, guard, data factory, scenarios, tours, reset, adapters
routes/demoSandboxRoutes.js      # /api/demo-sandbox/* (mounted via hook in server.js)
public/demo-sandbox.html         # dashboard page
public/js/demo-sandbox.js        # dashboard controller
public/css/demo-sandbox.css      # dashboard styles
public/js/demo-tour.js           # guided tour engine (reusable on any page)
public/css/demo-tour.css         # tour overlay styles
scripts/demo-sandbox-check.js    # install + sample-run validator
tests/smoke/demoSandboxSmoke.js  # offline smoke test
```

## API (all demo-only, no live calls)
```
GET  /api/demo-sandbox/status
GET  /api/demo-sandbox/config
POST /api/demo-sandbox/config
GET  /api/demo-sandbox/scenarios
POST /api/demo-sandbox/scenarios/:id/start
POST /api/demo-sandbox/reset
GET  /api/demo-sandbox/data
GET  /api/demo-sandbox/data/:moduleId
GET  /api/demo-sandbox/tours
GET  /api/demo-sandbox/tours/:id
POST /api/demo-sandbox/tours/:id/start
POST /api/demo-sandbox/tours/:id/step
POST /api/demo-sandbox/tours/:id/finish
GET  /api/demo-sandbox/history
GET  /api/demo-sandbox/doctor
```

## How to test
```bash
npm run demo-sandbox:check    # node scripts/demo-sandbox-check.js
npm run demo-sandbox:smoke    # node tests/smoke/demoSandboxSmoke.js
```

## What NOT to commit
- `data/demo-sandbox.json` and `data/demo-sandbox-history.json` (runtime demo state — already covered by `data/` ignore rules).
- Generated `artifacts/demo_sandbox_*.json|md` if your repo policy excludes artifacts.
