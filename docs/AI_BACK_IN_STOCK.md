# #94 Back-in-Stock Waitlist & Notifier

Customers ask for an out-of-stock product on WhatsApp -> they're added to a
waitlist -> the moment it restocks they're auto-notified (consent-gated,
throttled). Pairs with **#66 Inventory Forecaster** (fires the restock event),
**#90 Broadcast Throttle** (paces the notify burst), and **#80 Consent** (only
messages people who allow marketing).

## Why
Out-of-stock = lost sale + a customer you never hear from again. This captures
demand while you're empty and converts it the instant you restock, with zero
manual chasing.

## Design
- **Deterministic core.** add / list / stats / remove / notify are pure logic.
  Works with **no model**. The LLM (local Ollama `qwen2.5:32b`) only phrases the
  friendly "it's back!" line; a template fallback always exists (and is used in
  dry-run / when the model is down).
- **Gated, safe by default.** Consent (#80) and Throttle (#90) modules are
  loaded best-effort. Opted-out contacts are skipped; throttled contacts stay
  `waiting` for the next pass. No external module present -> template send.
- **File-backed**, tenant-scoped: `data/waitlist/<tenantId>.json`. Missing
  tenantId throws.
- **Zero new npm deps.** Node built-ins + global `fetch` + express.
- **server.js untouched.** Self-mountable router.

## Mount (one line)
```js
app.use(require('./routes/waitlistRoutes'));
```

## API
| Method | Path | Body / Query |
| --- | --- | --- |
| GET  | `/api/waitlist/health` | - |
| POST | `/api/waitlist/join`   | `{ productId, productName?, contact, name?, locale? }` |
| GET  | `/api/waitlist/list`   | `?productId=&status=` |
| GET  | `/api/waitlist/stats`  | - |
| POST | `/api/waitlist/remove` | `{ productId, contact }` |
| POST | `/api/waitlist/notify` | `{ productId, productName? }`  (restock event) |

Tenant via `x-tenant-id` header (or `tenantId` in body/query).

## Programmatic restock hook
Wire the notifier into the Inventory Forecaster restock event:
```js
const wl = require('./lib/waitlist/waitlistEngine');
// when stock goes 0 -> >0 for a product:
await wl.notifyRestock(tenantId, {
  productId,
  productName,
  sink: async (contact, message) => sendWhatsApp(contact, message)
});
```
Without a `sink`, entries are marked `ready` with the computed message (safe
dry path, no sends).

## Env
| Var | Default | Use |
| --- | --- | --- |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | local inference |
| `SUPPORT_AGENT_MODEL` | `qwen2.5:32b` | phrasing model |
| `OLLAMA_KEEP_ALIVE` | `-1` | keep model warm |
| `LLM_HUB_DRY_RUN` | `false` | `true` = template only, no model call |
| `AGENT_LANGUAGE` | `en` | default locale |

## Test
```bash
node tests/smoke/waitlistSmoke.js   # offline, no model
```
