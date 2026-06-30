# Feature #92 - Visual Chatbot Flow Builder

Build node-based conversation flows (welcome -> questions -> conditions ->
actions -> end) and run WhatsApp contacts through them step-by-step. The
engine is fully deterministic: it works with **no model**. Ollama (via
`ai/aiBrain.js`) is used **only** to optionally rephrase outgoing text, and
falls back to the raw text on any error.

## Node types
- `message`  - sends text, advances to `next`.
- `question` - sends text, saves the contact's reply into `vars[field]`.
- `condition`- routes via `branches[].equals` on a saved `field`, else `next`.
- `action`   - `handoff` (flag for human takeover) or `tag` (label the contact).
- `end`      - terminal; optional closing `text`.

## API
- `GET  /api/chatbot-flow/health`
- `POST /api/chatbot-flow/flows`        define a flow (body = flow definition)
- `GET  /api/chatbot-flow/flows`        list flows
- `GET  /api/chatbot-flow/flows/:id`    get one flow
- `DELETE /api/chatbot-flow/flows/:id`  delete a flow
- `POST /api/chatbot-flow/run`          start/advance: `{ flowId, contact, reply?, aiPhrasing? }`
- `POST /api/chatbot-flow/reset`        reset a contact's session

Tenant is read from `x-tenant-id` header (or `tenantId` in body/query). A
missing tenant throws; flows are isolated per tenant.

## Mounting (one line)
```js
app.use(require('./routes/chatbotFlowRoutes'));
```
Or it auto-mounts through the AI Suite (#52) `mountAll(app)`.

## Storage
File-backed JSON under `data/chatbotFlow/` (`flows.json`, `sessions.json`).
No database, no new npm dependencies.

## Test (offline)
```bash
node tests/smoke/chatbotFlowSmoke.js
```
Runs with no model and no network.
