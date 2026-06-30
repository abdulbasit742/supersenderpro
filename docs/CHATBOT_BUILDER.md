# Chatbot Flow Builder (no-code)

Wati-parity visual chatbot for WhatsApp. Build flows from nodes, run them per-contact, route AI
nodes through the self-hosted **llmHub** (Ollama-first) with a deterministic fallback so flows
keep working offline / in dry-run.

> **Safe by default.** `CHATBOT_BUILDER_DRY_RUN=true` (default) means replies are *prepared, not sent*.
> `/simulate` always forces dry-run. Flip to live only after review.

## Wire it up

```bash
node scripts/wire-chatbot-builder.js   # mounts /api/chatbot-builder in server.js (idempotent)
node scripts/chatbot-builder-check.js  # smoke test (exit 0 = pass)
```

`scripts/wire-all.js` also runs the wire step.

## Node types

| type | purpose | key fields |
|------|---------|-----------|
| `message`   | send text | `text`, `next` |
| `question`  | ask + capture a free-text answer | `text`, `saveAs`, `next` |
| `choice`    | numbered options | `text`, `options:[{label,value,next}]`, `saveAs`, `fallbackNext` |
| `condition` | branch on a variable | `variable`, `op` (eq/neq/contains/gt/lt/exists), `value`, `ifTrue`, `ifFalse` |
| `ai`        | LLM-generated reply (self-hosted) | `prompt`, `fallback`, `saveAs`, `next` |
| `action`    | set a var or tag the contact | `action` (set/tag), `key`, `value`, `next` |
| `handoff`   | hand to a human agent (terminal) | `text` |
| `end`       | finish the flow (terminal) | `text` |

Text fields support `{{var}}` interpolation from captured variables (e.g. `{{name}}`).

## API (`/api/chatbot-builder`)

- `GET  /status` · `GET /doctor` · `GET /node-types`
- `GET  /flows` · `POST /flows` · `GET/PUT/DELETE /flows/:id` · `POST /flows/:id/status` · `POST /flows/validate`
- `POST /seed-example` - load a ready-made lead-capture flow
- `POST /simulate` - run a flow in forced dry-run (safe testing, no sends)
- `POST /inbound` - real webhook entry (respects dry-run flag); point your WhatsApp webhook here
- `GET  /sessions` · `GET /sessions/:phone` · `POST /sessions/:phone/reset` · `POST /cleanup`

Writes require `x-admin-secret` matching `CHATBOT_BUILDER_ADMIN_SECRET` (or `ADMIN_TOKEN`) when set.

## Quick test

```bash
curl -X POST localhost:3000/api/chatbot-builder/seed-example
curl -X POST localhost:3000/api/chatbot-builder/simulate -H 'content-type: application/json' -d '{"text":"hi"}'
```

## Env

| var | default | meaning |
|-----|---------|---------|
| `CHATBOT_BUILDER_ENABLED` | `true` | master switch |
| `CHATBOT_BUILDER_DRY_RUN` | `true` | prepare replies without sending |
| `CHATBOT_BUILDER_USE_AI` | `true` | use llmHub for `ai` nodes (else fallback text) |
| `CHATBOT_BUILDER_REQUIRE_ADMIN` | `true` | guard write endpoints |
| `CHATBOT_BUILDER_MAX_STEPS` | `25` | per-turn loop guard |
| `CHATBOT_BUILDER_SESSION_TTL_HOURS` | `24` | when active sessions expire |

Live sending uses the repo's `global.sendWhatsApp(phone, message, opts)` when `DRY_RUN=false`.
