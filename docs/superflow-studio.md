# SuperFlow Studio — AI Automation Builder

SuperFlow Studio is an original, SuperSender-style no-code automation builder built into
SuperSender Pro. It lets you visually compose **Triggers → AI → Logic → Data → Actions**
into flows that run in a safe dry-run mode by default and can be promoted to live execution.

It is inspired by no-code AI workflow canvas concepts but uses SuperSender's own branding,
UI, JSON data helpers, queue manager, n8n bridge, Google Sheets/reporting connector,
WhatsApp bot, ecommerce/social/channel modules, CRM, products, orders and analytics.

## What it does

- Build automation flows from a library of 60+ node types across 5 categories.
- Save flows to JSON storage, validate them, and run them as **dry runs** (safe) or **live**.
- Pause execution for **human approval** when an approval node is reached.
- Install from 12 prebuilt templates and edit them.
- Track runs, failures, queue depth and integration readiness in a dashboard section.

## Supported nodes

| Category | Examples |
|---|---|
| **Triggers** | WhatsApp message, WhatsApp channel post, new order, new customer, payment received, stock low, new Google Sheet row, n8n webhook, schedule/cron, manual button, website change, social comment/DM |
| **AI** | classify intent, generate reply, summarize, extract data, translate Urdu/English, generate caption, score lead, detect scam/fraud, recommend product, generate offer, human approval, agent router |
| **Actions** | send WhatsApp message/media, send channel post, admin alert, add/update customer, create/update order, add/sync product, post to FB/IG/LinkedIn, trigger n8n, append Google Sheet row, create task, send email, add queue job |
| **Logic** | if/else, switch by intent, delay, wait for reply, loop over contacts, split by segment, rate limit, stop if opted out, human approval gate, error fallback |
| **Data** | read customer/stock/dealer rate/order/catalog/messages/sheet/API, save variable, transform JSON |

Get the live machine-readable list from `GET /api/flow-studio/node-types`.

## API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/flow-studio/status` | Counts + integration readiness |
| GET | `/api/flow-studio/doctor` | Launch-readiness score, invalid flows, missing integrations and next actions |
| GET | `/api/flow-studio/node-types` | All node definitions |
| GET | `/api/flow-studio/flows` | List flows |
| GET | `/api/flow-studio/flows/:id` | Get one flow |
| POST | `/api/flow-studio/flows` | Create flow |
| PUT | `/api/flow-studio/flows/:id` | Update flow |
| DELETE | `/api/flow-studio/flows/:id` | Delete flow |
| POST | `/api/flow-studio/flows/:id/activate` | Activate (validates first) |
| POST | `/api/flow-studio/flows/:id/pause` | Pause |
| POST | `/api/flow-studio/flows/:id/run-test` | Dry run (never sends) |
| POST | `/api/flow-studio/flows/:id/run` | Live run (only if active + `{ "live": true }`) |
| POST | `/api/flow-studio/trigger/:triggerType` | Trigger all active flows matching a trigger type; dry-run by default |
| POST | `/api/flow-studio/trigger` | Same as above, with `triggerType` in the body |
| GET | `/api/flow-studio/runs` | Execution logs (`?flowId=&limit=`) |
| GET | `/api/flow-studio/templates` | Prebuilt templates |
| POST | `/api/flow-studio/templates/:id/install` | Install template as editable flow |

## Flow object schema

```json
{
  "id": "flow_...",
  "name": "My flow",
  "description": "",
  "status": "draft | active | paused",
  "triggerType": "trigger.whatsapp_message",
  "nodes": [{ "id": "n1", "type": "trigger.whatsapp_message", "label": "...", "position": { "x": 0, "y": 0 }, "config": {}, "next": ["n2"] }],
  "edges": [{ "id": "e1", "from": "n1", "to": "n2", "condition": "" }],
  "variables": {},
  "createdAt": "ISO", "updatedAt": "ISO", "lastRunAt": "ISO|null"
}
```

A sample flow is in [`docs/flow-studio-sample-flow.json`](./flow-studio-sample-flow.json).

## How to create a flow

1. Open the dashboard → sidebar → **Flow Studio**.
2. Click **New Flow**, give it a name.
3. Click nodes in the left **Node Library** to append them; they auto-link in sequence.
4. Select a node to edit its **label** and **config JSON** in the right Inspector.
5. Click **Save**, then **Run Test (Dry run)** to simulate — nothing is sent.
6. Click **Activate** to enable live execution; live runs require `status === "active"` **and** `{ "live": true }`.

## External triggers

Use the dashboard **External Trigger Tester** card or call:

```bash
curl -X POST http://localhost:3001/api/flow-studio/trigger/whatsapp_message \
  -H "Content-Type: application/json" \
  -d "{\"input\":{\"message\":\"test\"},\"source\":\"n8n\"}"
```

Trigger names can be sent as `whatsapp_message`, `new_order`, `payment_received`,
`website_change`, `social_message`, etc. The server normalizes them to
`trigger.whatsapp_message` style and runs every **active** flow whose trigger
matches.

External triggers are **dry-run by default**. To allow live execution, set
`FLOW_STUDIO_TRIGGER_SECRET` and send:

```bash
curl -X POST "http://localhost:3001/api/flow-studio/trigger/new_order?live=true" \
  -H "Content-Type: application/json" \
  -H "x-flow-studio-secret: YOUR_SECRET" \
  -d "{\"input\":{\"orderId\":\"ORD-1\"},\"source\":\"shopify\"}"
```

Without the secret, live trigger requests return HTTP 403. This lets n8n,
Google Sheets, website scrapers, ecommerce connectors, WhatsApp handlers and
social webhooks safely test flows before real sends/posting are enabled.

## Launch Doctor

Use the dashboard **Launch Doctor** button or call `GET /api/flow-studio/doctor`.
It checks active flows, invalid flow validation errors, missing integrations,
recent failed runs, paused approval packets and practical next actions before
launch. API responses are also normalized through the project text-repair path
so common UTF-8 mojibake in labels, icons and logs is cleaned before the
dashboard renders it.

## How to connect n8n / Sheets / social / ecommerce

Action nodes auto-wire to existing SuperSender helpers when run live (all guarded):

- **WhatsApp** → `sendWhatsAppCloudText()` (config: `number`, `message`/`template`).
- **n8n** → `n8nBridge.triggerWorkflow()` (config: `workflow`).
- **Google Sheets** → `reportingConnectors.syncGoogleSheets()` (config: `sheet`).
- **Admin alert** → `createSystemAlert()`.
- **Social** → `publishSocialPayloadToPlatform()` (set `draft: true` to stage only).
- **Queue / delays** → `queueManager.addJob()`.

If a helper isn't available the node logs a skip instead of failing the run.

## Safety rules

- **Dry run is the default.** Live actions only fire when the flow is `active` and the caller passes `{ "live": true }`.
- **No spam by default.** Promotional broadcast nodes should set `optInSegment`, `maxFrequencyPerDay`, and `requireApproval: true`.
- **Human approval** nodes pause execution and emit an approval packet.
- **Social posting supports `draft: true`** to stage without publishing.
- **Channel forwarding** should keep branding + blacklist checks.
- **Secrets are masked** in all logs/responses; tokens are never exposed to the frontend.
- A **max node-execution limit** prevents infinite loops; failures can route to an `error_fallback` node.

## Next improvements

- Drag-and-drop canvas with free node positioning and visual edge drawing.
- Branch/condition editor UI for `if/else` and `switch` nodes.
- Real-time run streaming via the existing Socket.IO channel.
- Per-node retry/backoff config and scheduled (cron) trigger registration.
- Approval inbox UI to resolve paused runs.

---

## v2 additions (shipped)

These items from the roadmap are now implemented:

### Drag-and-drop visual canvas
The builder has two canvas modes — **List view** (sequential cards) and **Visual canvas**
(draggable, absolutely-positioned node cards with SVG connector lines and arrowheads).
Toggle with the **🔲 Visual canvas / 📋 List view** button; **↳ Auto layout** re-grids nodes.
Node positions are saved on the flow (`node.position`).

### Approval inbox
Human-approval / approval-gate nodes pause a run and create an **approval packet**
(persisted to `data/flow_studio_approvals.json`). The **✅ Approval Inbox** card lists
pending packets; **Approve & resume** continues the flow from the approved node,
**Reject** stops it.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/flow-studio/approvals` | List approvals (`?status=pending\|approved\|rejected`) |
| POST | `/api/flow-studio/approvals/:id/resolve` | Body `{ decision: "approve"\|"reject", note?, live? }` |

### Per-node retry / backoff
Any node can set `config.retries` and `config.retryDelayMs`. On failure the engine retries
up to `retries` times (backoff capped at 5s) before routing to the `error_fallback` path.

### Cron scheduler
A lightweight scheduler ticks every 30s and runs **active** flows whose `trigger.schedule`
node `config.cron` (standard 5-field cron: `min hour dom mon dow`, supports `*`, `*/n`,
ranges and lists) matches the current minute. **Scheduled runs are dry-run by default**;
set `flow.variables.scheduleLive = true` to allow live execution.

### Other routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/flow-studio/flows/:id/duplicate` | Clone a flow as a new draft |
| GET | `/api/flow-studio/runs/:id` | Single run detail with full logs |

### Reliability
Flow Studio JSON writes are now **synchronous**, removing the create→run race that the
shared debounced writer could cause. `status` now also reports `scheduledFlows` and
`pendingApprovals`.

---

## v3 additions (shipped)

### Open & manage saved flows
The **📂 My Flows** card lists every saved flow (status-colored) — click to open one into the
builder, or delete it. The toolbar **📂 Open** button jumps to the list. Closes the gap where
saved flows could previously only be reached via template install or JSON import.

### Branching engine (if/else + switch)
The execution engine is now **branch-aware** (`flowStudioNextNodes`):
- **`logic.if_else`** evaluates `config.condition` and follows edges labeled `true`/`false`
  (or, without labels, the first vs. second `next`).
- **`logic.switch_intent`** routes on `config.var` (default `intent`) by matching each edge's
  `condition` value, falling back to a `default` edge.
- Conditions use a **safe, no-`eval`** evaluator supporting `var`, `==`, `!=`, `>`, `<`, `>=`,
  `<=`, and `includes`, with variables resolved from the run input then flow variables.

### Connection / branch editor
The Inspector now has a **Connections (next steps)** editor: check the nodes a step should flow
into and set a per-edge **condition** (e.g. `true`/`false` for if/else, an intent value for
switch). If/else and switch nodes also expose their condition / switch-variable fields.

### Variables & schedule editor
A collapsible **⚙ Variables & schedule** panel edits `flow.variables` (JSON) and, for scheduled
flows, toggles **Allow LIVE scheduled runs** (`variables.scheduleLive`).

### Live run streaming
Runs stream to the dashboard log panel in real time over Socket.IO
(`flow-studio:run-start`, `flow-studio:node`, `flow-studio:run-end`).

### Per-flow analytics
`GET /api/flow-studio/flows/:id/analytics` returns success rate, total/completed/failed/paused
counts, average duration and the last 10 runs. Shown in the **📊 Flow Analytics** card.

### Node library search
A search box filters the node library by label/type.

---

## v4 additions (shipped)

### Inbound webhook triggers
Any flow can be fired by an external system (n8n, ecommerce, forms, cron services):

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/flow-studio/hooks/:flowId` | Get the hook URL + whether it's protected |
| POST | `/api/flow-studio/hooks/:flowId` | Fire the flow — the JSON body becomes the run input |

The POST body is used as the flow input. Runs are **dry-run** unless the flow is active and
`?live=true` is sent. Optional security: set `flow.variables.webhookSecret` and pass it via the
`x-flow-secret` header or `?secret=` (missing/incorrect → 401). The **🔌 Webhook** card shows
the URL (copyable) and a secret field.

### Manual live run
The **▶▶ Live Run** button runs an active flow live on demand (with a confirm dialog).

### Save flow as a custom template
`POST /api/flow-studio/flows/:id/save-as-template` (or the **🧱 Save as Template** button) turns
the current flow into a reusable template shown in the gallery (`custom: true`).

### Backup — export / import all
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/flow-studio/export-all` | Download all flows + custom templates as JSON |
| POST | `/api/flow-studio/import-all` | Import flows (`mode: "merge"\|"replace"`); new IDs assigned |

Toolbar buttons **🗄 Export All** / **📥 Import All** drive these.

### Studio metrics
`GET /api/flow-studio/metrics?days=14` returns runs-by-day, status totals and the top flows.
The **📈 Studio Metrics** card renders a 14-day mini bar chart.

### Single-node test
`POST /api/flow-studio/test-node` dry-runs one node in isolation (`{ node, input }`). The
**🧪 Test Node** button tests the currently selected node and prints the result to the log panel.
