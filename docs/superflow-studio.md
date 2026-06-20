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
