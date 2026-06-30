# Workflow Builder — Feature #1: Internal Engine

The "if this, then that" engine that glues every department together. This is the **missing
executor**: `automations/.. / automationWorkflows.js` could only SAVE a workflow, never RUN one.
This runs them in-process — no external n8n needed. (`integrations/n8nBridge.js` still handles
outbound integrations; this is the local brain.)

## What shipped

| File | Purpose |
|------|---------|
| `lib/workflowEngine.js` | Define + run workflows. `emit(event, ctx)` fires matching workflows. Pluggable actions via `registerAction`. |
| `routes/workflowRoutes.js` | CRUD, `/actions` (what's wired), `/runs` (history), `/emit` (manual test-fire). |

## The model

```
Workflow = trigger + conditions[] + actions[]
```

- **trigger** — an event name: `order_created`, `contact_created`, `payment_received`, `cart_abandoned`, ...
- **conditions** — all must pass. Operators `eq/neq/gt/gte/lt/lte/contains/exists` over dotted paths
  (`order.total`, `contact.city`), plus a special `in_segment` condition that reuses the segment
  engine from Marketing #1.
- **actions** — ordered steps. Each `{ type, config }`. Unknown types are skipped (logged), so a
  half-wired workflow degrades gracefully instead of crashing.

## Actions are pluggable

The engine ships safe built-ins (`wait`, `log`). The real side-effects live in `server.js`, which has
the WhatsApp client, CRM, and broadcast hub. Register them once at boot:

```js
const wf = require('./lib/workflowEngine');

wf.registerAction('send_message', async (cfg, ctx) =>
  waClient.sendMessage(ctx.contact.phone, cfg.text));

wf.registerAction('add_tag', async (cfg, ctx) =>
  crm.addTag(ctx.contact.id, cfg.tag));

wf.registerAction('broadcast', async (cfg) =>
  broadcastHub.sendToAll({ message: cfg.message, targets: cfg.targets }));

wf.registerAction('trigger_n8n', async (cfg, ctx) =>
  n8nBridge.triggerWorkflow(cfg.kind, ctx));   // hand off to external n8n when you want it

app.use('/api/workflows', require('./routes/workflowRoutes'));
```

Then fire events wherever business logic happens:

```js
wf.emit('order_created', { contact, order });
wf.emit('payment_received', { contact, payment });
```

## Example workflow (welcome + tag new buyers)

```json
{
  "name": "Welcome new buyers",
  "trigger": "order_created",
  "conditions": [ { "field": "order.total", "op": "gt", "value": 0 } ],
  "actions": [
    { "type": "send_message", "config": { "text": "Thanks for your order! \ud83d\ude4f" } },
    { "type": "add_tag", "config": { "tag": "customer" } },
    { "type": "wait", "config": { "seconds": 5 } },
    { "type": "trigger_n8n", "config": { "kind": "order_created" } }
  ]
}
```

Test it without real data:
```
POST /api/workflows/emit { "event": "order_created", "context": { "contact": {"phone":"..."}, "order": {"total": 1500} } }
```

## Why this is the "glue"

Every department becomes a trigger or an action:
- Ecommerce emits `order_created`, `cart_abandoned`.
- Payments emits `payment_received`.
- Marketing's segments power `in_segment` conditions and `broadcast` actions.
- CRM exposes `add_tag`, `move_stage` actions.

One engine, and the whole system starts reacting to itself. That's the automated system.

## Follow-ups (next numbered features)

- **Durable long waits**: inline `wait` is capped at 60s. Real "wait 3 days" needs a scheduler
  (persist the resume time, tick via cron) — pairs with the Drip Campaigns feature.
- **Trigger taps**: wire `wf.emit(...)` into the actual order/payment/contact code paths.
- **Visual builder UI** in lovable-app on top of these endpoints.
- Move `data/workflows.json` + `workflow_runs.json` to Postgres in the SaaS migration.
