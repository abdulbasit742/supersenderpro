# Shared Team Inbox + Smart Assignment

Once you have more than one human agent, escalated chats need to be **routed, owned, and answered in time** — without two agents replying to the same customer. This adds a shared-inbox layer: agent registry + presence, smart assignment (by skill, least-busy, or round-robin), a collision lock (one active assignee per chat), SLA timers (first-response + resolution) with breach detection, and AI-phrased internal handoff notes.

## Why

The support agent (#1) handles the easy 80% and escalates the rest. The moment a second human joins, you need real inbox discipline or you get double-replies, dropped chats, and blown response times. This is that discipline: every escalation lands with the right person, exactly once, on a timer.

## How it works

```
escalation (#1 shouldEscalate) -> assign(phone, skill)  [skill from intent router #17]
   strategy: skill_then_load (default) | least_busy | round_robin
   -> picks an ONLINE agent under their max-open cap, balances load
   -> collision lock: claim()/release(); one active assignee, no stealing
   -> SLA timers: first-response + resolution; slaBreaches() lists overdue
   -> resolve() frees the agent\'s slot
```

- **Deterministic assignment + SLA**; the model only writes the optional handoff note.
- **Idempotent:** re-assigning an active chat returns the current owner (never steals).
- **Zero new npm dependencies.**

## Files

- `lib/teamInbox/teamInbox.js` — agents / assign / claim / SLA / resolve / handoff note.
- `routes/teamInboxRoutes.js` — self-mountable router.
- `tests/smoke/teamInboxSmoke.js` — offline smoke test + collision/SLA/balance checks.

## Wiring it up (one line in server.js)

```js
app.use('/api/team-inbox', require('./routes/teamInboxRoutes'));
```

## Environment / config

```
TEAM_INBOX_MODEL=qwen2.5:32b   # only for handoff notes; defaults to SUPPORT_AGENT_MODEL
OLLAMA_HOST=http://127.0.0.1:11434
```

Tune via `PUT /api/team-inbox/config` (`strategy`, `firstResponseSlaMins`, `resolutionSlaMins`, `maxOpenPerAgent`).

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/team-inbox/agent` | Add/update an agent. Body: `{ id, name?, skills?, status? }` |
| POST | `/api/team-inbox/presence` | Set online/away. Body: `{ id, status }` |
| GET | `/api/team-inbox/agents` | List agents + load |
| POST | `/api/team-inbox/assign` | Route a chat. Body: `{ phone, skill?, priority? }` |
| POST | `/api/team-inbox/claim` | Agent claims a chat (collision lock). Body: `{ phone, agentId }` |
| POST | `/api/team-inbox/first-response` | Stop the first-response SLA. Body: `{ phone }` |
| POST | `/api/team-inbox/resolve` | Resolve + free the slot. Body: `{ phone }` |
| POST | `/api/team-inbox/release` | Send back to queue. Body: `{ phone }` |
| GET | `/api/team-inbox/queue` | Conversations (filter status/assignee) |
| GET | `/api/team-inbox/sla-breaches` | Overdue first-response / resolution |
| POST | `/api/team-inbox/handoff-note` | AI internal handoff note. Body: `{ phone, context? }` |
| GET/PUT | `/api/team-inbox/config` | Read / tune strategy + SLAs |
| GET | `/api/team-inbox/health` | Brain status |

### Example

```bash
curl -X POST localhost:3000/api/team-inbox/agent -d '{"id":"sara","skills":["sales"]}' -H 'Content-Type: application/json'
curl -X POST localhost:3000/api/team-inbox/assign -d '{"phone":"+92300xxxxxxx","skill":"sales","priority":"high"}' -H 'Content-Type: application/json'
# -> { ok:true, assignee:"sara", reason:"assigned" }
```

## Wiring into escalation

1. When the support agent (#1) sets `shouldEscalate`, call `assign({ phone, skill: routing.team })` using the intent router\'s (#17) routing target as the skill.
2. In the agent UI, an agent `claim`s the chat (collision-safe), sees the Customer 360 (#48) summary, and uses the agent copilot (#9) to draft a reply; call `first-response` on their first message.
3. On done, `resolve` to free their slot. A periodic check of `sla-breaches` surfaces overdue chats (and the daily owner briefing #29).

## Tests

```bash
node tests/smoke/teamInboxSmoke.js
```
