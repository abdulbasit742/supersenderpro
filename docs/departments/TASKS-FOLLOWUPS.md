# Feature #54 — Tasks & Follow-ups

Actionable to-dos for the team, tied to a contact or ticket: "call back about the refund by 5pm",
assigned to an agent, with a due date and a reminder when it's overdue. The thing that stops
follow-ups from falling through the cracks.

## Why
Support (#3) tracks conversations and routing (#44) decides who handles them, but a lot of work is
"do X later" — a callback, a quote to send, a contract to chase. Without tasks those live in
people's heads and get dropped. This adds a simple, linked task list with due dates, assignment,
and overdue reminders that plug into alerts (#28) and automation (#48).

## What it does
- **Create tasks:** `create({ title, notes, contact?, ticketId?, assignee?, priority, dueAt })`.
  Link to a contact (360 #46) and/or a ticket (#3); assign to an agent (#44).
- **Lifecycle:** `open -> in_progress -> done` (+ `cancelled`), with a completion timestamp.
- **Due tracking:** `overdue()` and `dueSoon()` (within a configurable window) computed live.
- **Reminders on a tick:** `tick()` fires a (draft-only) reminder to the assignee for overdue
  tasks (and due-soon high/urgent ones), **once per task** until it's rescheduled. Editing the
  due date re-arms the reminder.
- **Fan overdue:** an overdue task emits `task.overdue` into alerts #28 + automation #48 (so you
  can, e.g., alert a manager or auto-reassign). Best-effort + non-fatal.
- **List + filter + sort:** by status/assignee/priority/contact/ticket, sorted soonest-due first.

## Files
- `lib/tasks/config.js` — env posture (draft reminders, due-soon window, overdue fan-out)
- `lib/tasks/store.js` — atomic JSON store (`data/tasks.json`)
- `lib/tasks/privacy.js` — contact masking
- `lib/tasks/taskStore.js` — task CRUD + lifecycle + list/sort
- `lib/tasks/notify.js` — single reminder hook (`setNotifier`) to the assignee
- `lib/tasks/reminders.js` — overdue/due-soon detection + tick + fan-out
- `lib/tasks/doctor.js` — offline self-check + posture
- `lib/tasks/index.js` — barrel
- `routes/tasksRoutes.js` — REST surface (`/api/tasks`)
- `scripts/tasks-check.js`, `tests/smoke/tasksSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const tasksRoutes = require('./routes/tasksRoutes');
app.use('/api/tasks', tasksRoutes);
// optional reminder delivery to agents: require('./lib/tasks').setNotifier(async (assignee,msg)=>{ /* notify the agent */ });
```
Drive reminders on a schedule (node-cron already a dep):
```js
require('node-cron').schedule('*/5 * * * *', () => require('./lib/tasks').reminders.tick());
```
Create a follow-up when a ticket needs one (#3), or from an automation rule (#48):
```js
require('./lib/tasks').taskStore.create({ title: 'Call back', contact, ticketId, assignee, priority: 'high', dueAt });
```

## Endpoints (`/api/tasks`)
- `GET /status`, `GET /doctor`, `GET /overview`
- `POST /tasks` `{ title, notes, contact?, ticketId?, assignee?, priority?, dueAt? }`
- `GET /tasks` (`?status=&assignee=&priority=&contact=&ticketId=&limit=`), `GET /tasks/:id`
- `PUT /tasks/:id`, `POST /tasks/:id/status` `{ status }`, `POST /tasks/:id/assign` `{ assignee }`
- `GET /overdue`, `GET /due-soon`, `POST /reminders/tick`

## Safety
JSON-backed; **internal team tool — never messages customers**. Reminder dispatch (to the
assignee) is **draft-only** until `TASKS_LIVE_REMINDERS=true` + a notifier. Reminders fire once
per task (re-armed on reschedule). Contacts masked in views. Tasks cancelled/done, never
hard-deleted. Fan-out best-effort + non-fatal. 100% additive; no existing module/route/data
changed, no new dependency.

## Env
```
TASKS_ENABLED=true
TASKS_LIVE_REMINDERS=false                    # true + notifier => assignee reminders actually send
TASKS_DUE_SOON_HOURS=24
TASKS_FAN_OVERDUE=true                         # emit task.overdue into alerts #28 / automation #48
```

## Verify
```bash
for f in lib/tasks/*.js; do node --check "$f"; done
node --check routes/tasksRoutes.js
npm run tasks:check
npm run tasks:smoke
```

Feature #54 done. Agle number ka intezaar.
