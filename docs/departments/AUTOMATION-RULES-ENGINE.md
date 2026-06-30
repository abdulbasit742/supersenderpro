# Feature #48 — Automation Rules Engine

If-this-then-that for the whole product. A rule listens for an **event**, checks a **condition**,
and runs an ordered list of **actions** that call the other departments — so "when a payment
succeeds, tag the contact VIP and enroll them in onboarding" or "when NPS is a detractor, alert
me and assign a human" becomes config, not code.

## Why
The departments now exist (tags #12, consent #38, drip #6, routing #44, alerts #28, templates #36,
scheduler #17, webhooks #20, analytics #9, 360 #46) but wiring them together meant editing
server.js every time. This engine is the glue: events in, actions out, all configurable, all safe.

## What it does
- **Rules:** `{ event, condition?, actions:[{ type, ...spec }], throttleMinutes }`.
- **Events (listen):** `message.received`, `payment.succeeded`, `ticket.created/resolved`,
  `sla.breach`, `nps.detractor/promoter`, `link.clicked`, `opt_in/opt_out`, `survey.response`,
  `contact.created`, `campaign.completed`, `custom`.
- **Conditions:** a SAFE JSON rule tree (`all`/`any` of leaf comparisons over the event payload,
  dotted paths, ops eq/neq/contains/exists/gt/lt/gte/lte/in). **No eval, no code execution.**
- **Actions (do) — each delegates to another dept:** `add_tag` (#12), `set_consent` (#38),
  `enroll_drip` (#6), `assign_agent` (#44), `raise_alert` (#28), `track_event` (#9 + #46),
  `send_template` (#36, rendered + queued via #17), `schedule_message` (#17), `webhook_emit` (#20).
  Action values can be literals (`{ tag: 'vip' }`) or pulled from the event
  (`{ contactFrom: 'contact' }`).
- **Throttle:** per-rule + per-contact window prevents action storms.
- **Dry-run:** `AUTOMATION_RULES_DRY_RUN=true` plans + logs actions without executing them.

## Safety model
This engine performs **no direct sends**. Every action calls a department that is already
draft/advisory-safe: sends go through the scheduler whose path honors consent (#38) and
sender-health (#30); alerts are owner-draft-only; drip is local enrollment. Missing target depts
degrade to `skipped` instead of throwing. So even a misconfigured rule can't blast customers.

## Files
- `lib/automationRules/config.js` — env posture (dry-run, throttle, max actions) + event/action catalogs
- `lib/automationRules/store.js` — atomic JSON store (`data/automation-rules.json`)
- `lib/automationRules/conditionMatcher.js` — safe JSON condition evaluation (no eval)
- `lib/automationRules/actions.js` — action executors that delegate to other departments
- `lib/automationRules/ruleStore.js` — rule CRUD + action validation
- `lib/automationRules/engine.js` — emit → match → throttle → run pipeline + run log
- `lib/automationRules/doctor.js` — offline self-check + which target depts are wired
- `lib/automationRules/index.js` — barrel
- `routes/automationRulesRoutes.js` — REST surface (`/api/automation-rules`)
- `scripts/automation-rules-check.js`, `tests/smoke/automationRulesSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const automationRulesRoutes = require('./routes/automationRulesRoutes');
app.use('/api/automation-rules', automationRulesRoutes);
```
Emit events where they happen (the same spots you'd emit alerts #28):
```js
const ar = require('./lib/automationRules');
await ar.emit('payment.succeeded', { contact, amount, plan });
await ar.emit('nps.detractor', { contact, score });
await ar.emit('ticket.created', { conversationId: ticket.id, category: ticket.category });
```
Example rule (VIP on big payment + welcome journey):
```json
{ "name": "VIP onboarding", "event": "payment.succeeded",
  "condition": { "all": [{ "field": "amount", "op": "gte", "value": 5000 }] },
  "actions": [ { "type": "add_tag", "tag": "vip", "contactFrom": "contact" },
               { "type": "enroll_drip", "journeyId": "jny-welcome", "contactFrom": "contact" } ] }
```

## Endpoints (`/api/automation-rules`)
- `GET /status`, `GET /doctor`, `GET /overview`, `GET /catalog` (events + action types)
- `POST /rules` `{ event, condition?, actions:[...] }`, `GET /rules`, `GET /rules/:id` (+runs)
- `POST /rules/:id/active`, `DELETE /rules/:id`
- `POST /emit` `{ event, payload }`, `GET /runs`

## Safety
JSON-backed; conditions are JSON (no eval); engine **never sends directly** (delegates to
draft/advisory-safe depts). Dry-run plans without executing. Per-rule throttle prevents storms.
Missing depts degrade to skipped. 100% additive; no existing module/route/data changed, no new
dependency.

## Env
```
AUTOMATION_RULES_ENABLED=true
AUTOMATION_RULES_DRY_RUN=false               # true => plan + log actions, don't execute
AUTOMATION_RULES_THROTTLE_MINUTES=5
AUTOMATION_RULES_MAX_ACTIONS=10
```

## Verify
```bash
for f in lib/automationRules/*.js; do node --check "$f"; done
node --check routes/automationRulesRoutes.js
npm run automation-rules:check
npm run automation-rules:smoke
```

Feature #48 done. Agle number ka intezaar.
