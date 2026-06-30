# Internal Event Bus

One `emit()` so a domain event reaches everything that cares - instead of each call site re-wiring webhooks + audit + metrics by hand.

## Emit
```js
const bus = require('../lib/events/bus');
await bus.emit(tenantId, 'deal.won', { dealId, value });
await bus.emit(tenantId, 'invoice.created', { number, total });
```
Each `emit` does, best-effort and non-blocking:
1. **Local subscribers** - `bus.on('deal.won', fn)` (and `'*'`) for same-process reactions.
2. **Webhook fan-out** - to the tenant's subscribed endpoints (#343 -> signed #298 + logged #336 + breaker #325).
3. **Audit entry** - `event.<name>` (#296).
4. **Metric** - bumps `domain_events_total{event}` (#312).

No sink can break the caller (all wrapped). Disable a sink per-emit with `{ webhook:false }` / `{ audit:false }`.

## Suggested events
`deal.won`, `deal.lost`, `invoice.created`, `invoice.paid`, `customer.created`, `subscription.changed`, `cart.recovered`.

## Wiring it in (next step, low-risk)
Call `bus.emit(tenantId, 'deal.won', ...)` from `salesPipeline.moveStage` when a deal hits WON, and `'invoice.created'` from `quotes.createInvoice`. One line each; the bus handles the rest. (Left as a follow-up so this PR stays purely additive.)

## Verify
```bash
node tests/smoke/eventBusSmoke.js
```
