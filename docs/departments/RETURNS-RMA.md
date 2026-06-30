# Returns & Refunds (RMA) - Department #69

Self-contained module that manages the full **Return Merchandise Authorization**
lifecycle and proposes refunds. It is additive, JSON-backed, tenant-isolated, and
safe by default: it **never charges or credits a card** and **never auto-messages**
customers unless explicitly enabled.

## Lifecycle

```
requested -> approved -> received -> refunded
         \-> rejected
```

Illegal transitions are rejected (e.g. you cannot refund before receiving).

## Files

| File | Purpose |
|------|---------|
| `lib/returns/config.js` | Env-driven config (window, restock fee, toggles). |
| `lib/returns/store.js` | JSON persistence (`data/returns.json`). |
| `lib/returns/returnStore.js` | RMA CRUD + lifecycle transitions. |
| `lib/returns/refundCalc.js` | Pure refund math (gross, restock fee, net). |
| `lib/returns/notify.js` | Customer updates (DRAFT-ONLY by default). |
| `lib/returns/returnEngine.js` | Orchestration + optional sibling wiring. |
| `lib/returns/doctor.js` | Self-diagnostic. |
| `lib/returns/index.js` | Public surface. |
| `routes/returnsRoutes.js` | REST API under `/api/returns`. |
| `scripts/returns-check.js` | `npm run returns:check`. |
| `tests/smoke/returnsSmoke.js` | `npm run returns:smoke`. |

## Wiring (server.js, 2-3 lines)

```js
const returnsRoutes = require('./routes/returnsRoutes');
app.use('/api/returns', returnsRoutes);
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/returns` | List RMAs (filter `?status=`, `?orderId=`). |
| GET | `/api/returns/:id` | Get one RMA. |
| POST | `/api/returns` | Create a return request. |
| POST | `/api/returns/:id/approve` | Approve. |
| POST | `/api/returns/:id/reject` | Reject. |
| POST | `/api/returns/:id/receive` | Mark received (optionally restocks). |
| POST | `/api/returns/:id/refund` | Propose + record refund (no charge). |
| GET | `/api/returns/_/doctor` | Health check. |

## Sibling integrations (all optional)

- **Inventory (#66)** - on `receive`, restocks returned line items via
  `inventory.adjustStock(...)`. Degrades to no-op when absent.
- **Customer 360 (#46)** - on `refund`, records a `return.refunded` event.
- **Alert Center (#28)** - sends customer updates; draft-only unless
  `RETURNS_NOTIFY_ENABLED=true`.
- **Payments (#1)** - owns money movement. Returns emits `return.refunded`
  with a proposed net amount; Payments settles it. This module never charges.

## Env

| Var | Default | Meaning |
|-----|---------|---------|
| `RETURNS_ENABLED` | `true` | Master toggle. |
| `RETURNS_WINDOW_DAYS` | `30` | Return window after delivery. |
| `RETURNS_RESTOCK_FEE_PCT` | `0` | Restocking fee fraction (0..1). |
| `RETURNS_RESTOCK_ON_RECEIVE` | `true` | Restock via inventory on receive. |
| `RETURNS_NOTIFY_ENABLED` | `false` | Allow real customer sends. |
| `RETURNS_MASK_PII` | `true` | Mask PII in responses/logs. |
| `RETURNS_DATA_FILE` | `data/returns.json` | Store path. |

---

Feature #69 done. Agle number ka intezaar.
