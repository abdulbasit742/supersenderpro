# Feature #3 — Customer Support: Shared Inbox + Tickets + SLA

Every WhatsApp/contact message that needs a human becomes a **trackable ticket** instead of
getting lost in a chat thread. This is the support department: shared inbox, ticket lifecycle,
assignment, priority, tags, auto-triage, SLA tracking, and canned replies.

## Why
SuperSender could receive and send messages, but there was no concept of a *ticket* — no
status, no owner, no SLA, no "who's handling this and is it overdue". For anything you charge
money for, support has to be tracked. This department adds that, self-contained.

## What it does
- **Open from inbound:** `openFromMessage({contact,name,text,channel})` creates a ticket (or
  appends to the contact's existing open ticket — no duplicates).
- **Auto-triage:** deterministic keyword rules infer category + priority (billing/bug/urgent/
  sales/account/general). No external calls.
- **Lifecycle:** open → pending → resolved → closed, with reopen. Assign to an agent,
  set priority, add tags.
- **SLA:** first-response + resolution targets, scaled by priority (urgent 0.25x, high 0.5x,
  normal 1x, low 2x). Breach detection + an overview card count.
- **Canned replies:** reusable snippets with `{{name}}` / `{{ticket}}` / `{{agent}}` merge
  fields (4 seeded defaults).
- **Replies are draft-only** until live replies + a notifier are enabled.

## Files
- `lib/supportInbox/config.js` — env posture (draft-only default, SLA minutes)
- `lib/supportInbox/store.js` — atomic JSON store (`data/support-inbox.json`) + ticket numbering
- `lib/supportInbox/privacy.js` — contact/name masking for views
- `lib/supportInbox/ticketStore.js` — ticket persistence
- `lib/supportInbox/autoTriage.js` — keyword category + priority
- `lib/supportInbox/slaPolicy.js` — SLA targets + breach detection
- `lib/supportInbox/cannedReplies.js` — snippets + merge-field rendering
- `lib/supportInbox/notify.js` — single outbound hook (`setNotifier`), masks targets
- `lib/supportInbox/ticketEngine.js` — the lifecycle core
- `lib/supportInbox/doctor.js` — offline self-check + posture
- `lib/supportInbox/index.js` — barrel
- `routes/supportInboxRoutes.js` — REST surface (`/api/support-inbox`)
- `scripts/support-inbox-check.js`, `tests/smoke/supportInboxSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const supportInboxRoutes = require('./routes/supportInboxRoutes');
app.use('/api/support-inbox', supportInboxRoutes);
// optional: require('./lib/supportInbox').setNotifier(async (to,msg)=>waClient.sendMessage(to,msg));
```
In your WhatsApp inbound handler, call once per incoming message:
```js
require('./lib/supportInbox').ticketEngine.openFromMessage({ contact: from, name: pushName, text: body });
```

## Endpoints (`/api/support-inbox`)
- `GET /status`, `GET /doctor`, `GET /overview`
- `POST /inbound` `{ contact, name, text, channel }` → open/append ticket
- `GET /tickets` (filter `?status=&assignee=&priority=&limit=`), `GET /tickets/:id`
- `POST /tickets/:id/assign|priority|tag|reply|resolve|reopen|close`
- `GET /canned`, `POST /canned`
- `GET /sla/breaches`

## Safety
JSON-backed; contact + name masked in every view. Replies are **draft-only** until
`SUPPORT_INBOX_LIVE_REPLIES=true` and a notifier is wired. Tickets are never hard-deleted
(status → closed). 100% additive; no existing module/route/data changed; no new dependency.

## Env
```
SUPPORT_INBOX_ENABLED=true
SUPPORT_INBOX_LIVE_REPLIES=false           # true + notifier wired => replies actually send
SUPPORT_INBOX_FIRST_RESPONSE_SLA_MINS=60
SUPPORT_INBOX_RESOLUTION_SLA_MINS=1440
SUPPORT_INBOX_DEFAULT_PRIORITY=normal
```

## Verify
```bash
for f in lib/supportInbox/*.js; do node --check "$f"; done
node --check routes/supportInboxRoutes.js
npm run support-inbox:check
npm run support-inbox:smoke
```

Feature #3 done. Agle number ka intezaar.
