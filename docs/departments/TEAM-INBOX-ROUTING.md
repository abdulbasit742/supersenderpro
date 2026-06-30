# Feature #44 — Team Inbox Routing & Assignment

When a conversation needs a human, decide **which** human, automatically. Register agents with
skills, capacity, and online status; auto-assign incoming tickets/chats by round-robin,
least-load, or skill-match; queue when everyone's full; and move an agent's conversations out when
they go offline.

## Why
The support inbox (#3) can hold a ticket and the AI responder (#14) can hand off to a human, but
nothing decided *who* gets it. Without routing, everything lands in one pile and the fastest or
unluckiest person grabs it. This adds fair, capacity-aware distribution — the operations backbone
for a team handling volume.

## What it does
- **Agents:** `upsert({ name, skills, capacity, online, workingHours })`. Capacity = max concurrent
  open conversations; working hours gate assignment by local hour.
- **Strategies:** `round_robin` (even spread), `least_load` (lowest utilization = load/capacity),
  `skill_match` (prefer an agent with the requested skill, else least-loaded).
- **assign(conversationId, { skill, strategy }):** picks an eligible agent (active, online if
  required, within hours, has spare capacity, skill-matched), records the assignment, bumps load.
  **Sticky** — re-assigning an open conversation returns the same agent.
- **Queue:** if nobody's eligible, the conversation is queued (default) and **drains automatically**
  as capacity frees on `release()`. Or force least-loaded (`TEAM_ROUTING_QUEUE_WHEN_FULL=false`).
- **release(conversationId):** closes an assignment, frees capacity, drains the queue.
- **Offline handling:** taking an agent offline reassigns their open conversations back to the pool.

## Files
- `lib/teamRouting/config.js` — env posture (strategy, capacity, online-only, queue behavior)
- `lib/teamRouting/store.js` — atomic JSON store (`data/team-routing.json`)
- `lib/teamRouting/agentStore.js` — agents + load tracking
- `lib/teamRouting/strategies.js` — round-robin / least-load / skill-match (+ working hours)
- `lib/teamRouting/router.js` — assign/release/reassign/queue core
- `lib/teamRouting/doctor.js` — offline self-check + posture
- `lib/teamRouting/index.js` — barrel
- `routes/teamRoutingRoutes.js` — REST surface (`/api/team-routing`)
- `scripts/team-routing-check.js`, `tests/smoke/teamRoutingSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const teamRoutingRoutes = require('./routes/teamRoutingRoutes');
app.use('/api/team-routing', teamRoutingRoutes);
```
Assign when a ticket opens (#3) or the AI hands off (#14); release when it resolves:
```js
const tr = require('./lib/teamRouting');
const a = tr.assign(ticket.id, { skill: ticket.category });  // a.agentId handles it
// on resolve:
tr.release(ticket.id);
```
Alert when the queue backs up (#28): `if (tr.router.queue().length > N) emit('queue.backed_up', ...)`.

## Endpoints (`/api/team-routing`)
- `GET /status`, `GET /doctor`, `GET /overview`
- `POST /agents` `{ name, skills, capacity, online, workingHours }`, `GET /agents`, `GET /agents/:id`
- `POST /agents/:id/online` `{ online }` (offline auto-reassigns their conversations)
- `POST /assign` `{ conversationId, skill?, strategy? }`, `POST /release` `{ conversationId }`,
  `POST /reassign` `{ conversationId, skill?, strategy? }`
- `GET /assignment/:conversationId`, `GET /queue`

## Safety
JSON-backed; this module **decides who handles a conversation, it never sends**. Conservative
defaults (online-only, capacity-aware). Agents deactivated, never hard-deleted. Queue prevents
overload. 100% additive; no existing module/route/data changed, no new dependency.

## Env
```
TEAM_ROUTING_ENABLED=true
TEAM_ROUTING_DEFAULT_STRATEGY=least_load     # round_robin | least_load | skill_match
TEAM_ROUTING_DEFAULT_CAPACITY=8
TEAM_ROUTING_REQUIRE_ONLINE=true
TEAM_ROUTING_QUEUE_WHEN_FULL=true
```

## Verify
```bash
for f in lib/teamRouting/*.js; do node --check "$f"; done
node --check routes/teamRoutingRoutes.js
npm run team-routing:check
npm run team-routing:smoke
```

Feature #44 done. Agle number ka intezaar.
