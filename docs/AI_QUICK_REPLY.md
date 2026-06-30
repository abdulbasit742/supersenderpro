# AI Quick-Reply / Canned Response Manager (#118)

Saved canned replies with shortcuts, trigger phrases, variable substitution, usage analytics, and optional AI-personalized suggestions. Self-hosted-first: AI runs through your Ollama brain and falls back to deterministic templates when the model is offline.

## Why
Support agents (human or the 24/7 AI agent) re-type the same answers all day. This gives one source of truth for canned replies, fast shortcut insertion (`/thanks`), and data on which replies actually get used.

## Design
- **Zero new dependencies.** Node built-ins + existing `express` only.
- **Deterministic core.** Works with NO model: shortcut lookup, keyword + trigger scoring, variable rendering.
- **AI optional.** `aiSuggest()` calls `ai/aiBrain.processPrompt()` (your self-hosted Ollama `qwen2.5:32b`) to pick + personalize the best reply, and gracefully falls back to deterministic candidates if Ollama is unreachable.
- **Tenant-scoped.** Every call requires `tenantId`; missing tenant throws. Data isolated per tenant under `data/quickReply/<tenant>.json`.
- **Self-mountable.** Does not touch `server.js`.

## Mount
```js
const { mount } = require('./routes/quickReplyRoutes');
mount(app); // defaults to base /api/ai
```

## API
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/ai/quick-replies` | List all canned replies |
| POST | `/api/ai/quick-replies` | Create `{ title, body, shortcut, triggers[], tags[] }` |
| GET | `/api/ai/quick-replies/:id` | Get one |
| PUT | `/api/ai/quick-replies/:id` | Update |
| DELETE | `/api/ai/quick-replies/:id` | Delete |
| POST | `/api/ai/quick-replies/resolve` | `{ shortcut, vars }` -> rendered text (marks used) |
| POST | `/api/ai/quick-replies/suggest` | `{ text, limit }` -> deterministic ranked candidates |
| POST | `/api/ai/quick-replies/ai-suggest` | `{ text, limit, useAI }` -> AI-personalized reply, deterministic fallback |
| POST | `/api/ai/quick-replies/:id/used` | Increment usage counter |
| GET | `/api/ai/quick-replies/analytics` | Totals + top 5 most-used |

Tenant resolved from `req.tenantId`, `x-tenant-id` header, or body/query `tenantId`.

## Variables
Reply bodies support `{{name}}` style tokens, substituted at resolve time from `vars`. Unknown tokens render blank.

## Smoke test
```bash
node tests/smoke/quickReplySmoke.js
```
Runs fully offline (forces Ollama unreachable), uses a temp data dir, asserts CRUD, shortcut lookup, trigger ranking, variable rendering, analytics, tenant isolation, and AI fallback.
