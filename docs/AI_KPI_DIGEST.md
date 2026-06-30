# AI KPI Digest & CSV Exporter (Feature #116)

Scheduled, cron-style rollup of your store KPIs into a one-line headline + downloadable CSV. Built for the self-hosted GPU edge: deterministic math first, self-hosted Ollama only writes the headline sentence, cloud is fallback only. Works fully with **no model** and adds **zero npm deps**. `server.js` is never touched.

## What it does
- Pulls KPIs from existing feature stores under `data/` (orders, leads, carts, support conversations). Every source is optional; missing stores contribute zero.
- Computes: revenue, orders, AOV, open carts, new leads, conversations handled, escalations, deflection rate.
- Emits a JSON digest + CSV, and writes both under `data/kpiDigest/<tenantId>/`.
- A lightweight in-process scheduler (`setInterval`, unref'd) fires the digest on an interval (default 24h) and can call your `onDigest` hook to push to WhatsApp.

## Mounting (no server.js edits)
```js
const kpiDigest = require('./routes/kpiDigestRoutes');
kpiDigest.mount(app); // or app.use(kpiDigest.router)
```

## API
| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/ai/kpi-digest/run` | Build + persist a digest now |
| GET  | `/api/ai/kpi-digest/preview?windowHours=24` | Build without persisting |
| GET  | `/api/ai/kpi-digest/export.csv` | Download CSV |
| POST | `/api/ai/kpi-digest/schedule` | Start recurring digest (`everyMs`, `runNow`) |
| DELETE | `/api/ai/kpi-digest/schedule` | Stop recurring digest |

Tenant is read from `x-tenant-id` header, `?tenantId`, or body. Missing tenant throws.

## Programmatic
```js
const d = require('./lib/kpiDigest/kpiDigest');
const digest = await d.buildDigest('t_123', { windowHours: 24 });
console.log(digest.headline);
console.log(digest.csv);

// recurring, push to WhatsApp via your sender
d.scheduleDigest('t_123', {
  everyMs: 24 * 3600 * 1000,
  runNow: true,
  onDigest: async (digest, files) => { /* send digest.headline + attach files.csvFile */ }
});
```

## Self-hosted AI
Headline narration calls `ai/aiBrain.processPrompt` (Ollama `qwen2.5:32b`, cloud fallback). If the model is unreachable, it returns the deterministic headline unchanged, numbers intact.

## Tests
```
node tests/smoke/kpiDigestSmoke.js
```
Forces the AI host unreachable and asserts the deterministic KPIs, CSV, persistence, and scheduler all work offline.

## Distinct from #29 (Daily Owner Briefing)
#29 generates a one-shot narrative briefing. #116 is the **recurring scheduler + structured CSV export** layer: it produces machine-readable exports on an interval and exposes a push hook, so the briefing/digest can run unattended 24/7.
