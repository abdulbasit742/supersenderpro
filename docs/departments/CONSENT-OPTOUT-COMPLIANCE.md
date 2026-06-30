# Feature #38 — Consent & Opt-Out Compliance

The legal/ethical guardrail for a messaging business: detect when someone says **STOP**, never
message them again, and prove it. Every send passes a `canSend()` gate; inbound STOP/START
keywords flip consent automatically; opted-out contacts go on a suppression list.

## Why
Messaging at scale without honoring opt-outs gets numbers banned (ties into #30) AND is a legal
/ WhatsApp-policy problem. There was no single place that owned "who said stop" or a gate that
guaranteed they're never messaged again. This adds that as a self-contained compliance dept and
syncs it with the contact book (#12) so the whole product respects one source of truth.

## What it does
- **Keyword detection:** inbound `STOP / UNSUBSCRIBE / cancel / band karo / rok do / mat bhejo`
  → opt-out; `START / resume / shuru` → opt-in. Whole-message match (so "non-stop service"
  does NOT opt out). English + Roman-Urdu out of the box, fully configurable.
- **processInbound():** call it on every incoming message; if it's a command it flips consent
  and returns the **confirmation text** for your sender to deliver back.
- **canSend(contact) gate:** the single check every send must pass. Opted-out → blocked, always.
  Opted-in → allowed. Unknown → allowed under the default opt-out model, or blocked under a
  strict opt-in model (`CONSENT_ALLOW_UNKNOWN=false`).
- **filterSendable(contacts):** split a broadcast list into allowed vs blocked in one call.
- **Suppression list + audit log:** every consent change recorded (masked contact, from→to,
  source, timestamp).
- **Contacts sync:** consent changes propagate to lib/contacts (#12) when present, so segments
  exclude opted-out contacts everywhere.

## Files
- `lib/consentCenter/config.js` — env posture (model, keyword sets, confirmations)
- `lib/consentCenter/store.js` — atomic JSON store (`data/consent-center.json`)
- `lib/consentCenter/privacy.js` — contact masking
- `lib/consentCenter/keywords.js` — STOP/START classification (EN + Roman-Urdu)
- `lib/consentCenter/consentEngine.js` — consent state + gate + inbound processing + log
- `lib/consentCenter/doctor.js` — offline self-check + posture
- `lib/consentCenter/index.js` — barrel
- `routes/consentCenterRoutes.js` — REST surface (`/api/consent`)
- `scripts/consent-center-check.js`, `tests/smoke/consentCenterSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const consentCenterRoutes = require('./routes/consentCenterRoutes');
app.use('/api/consent', consentCenterRoutes);
```
In the WhatsApp inbound handler, FIRST thing per message:
```js
const cc = require('./lib/consentCenter');
const r = cc.processInbound({ contact: from, text: body });
if (r.intent) { await waClient.sendMessage(from, r.reply); return; }   // STOP/START handled
```
Gate EVERY outbound send (broadcast/drip #6/scheduler #17/auto-reply #14):
```js
if (!cc.canSend(to).allowed) return;       // single send
const { allowed } = cc.filterSendable(recipientList);   // broadcast batch
```
Pairs with #30 sender-health (don't burn numbers) and #12 contacts (shared consent).

## Endpoints (`/api/consent`)
- `GET /status`, `GET /doctor`, `GET /overview`
- `GET /can-send?contact=` — the gate; `POST /filter` `{ contacts:[...] }` — batch
- `POST /inbound` `{ contact, text }` — classify + flip on STOP/START
- `POST /set` `{ contact, status, source }`, `GET /lookup?contact=`
- `GET /suppression-list`, `GET /log`

## Safety
Compliance guardrail; **never sends**. Opt-out always wins. Default opt-out model (unknown
allowed) or strict opt-in model via env. Contacts masked in logs/views. Consent syncs to #12.
100% additive; no existing module/route/data changed, no new dependency.

## Env
```
CONSENT_CENTER_ENABLED=true
CONSENT_ALLOW_UNKNOWN=true                   # false => strict opt-in (only opted-in can be messaged)
CONSENT_STOP_KEYWORDS=stop,unsubscribe,cancel,band karo,rok do,mat bhejo,...
CONSENT_START_KEYWORDS=start,subscribe,resume,shuru,...
CONSENT_OPTOUT_CONFIRMATION=You have been unsubscribed...
CONSENT_OPTIN_CONFIRMATION=You are subscribed again...
```

## Verify
```bash
for f in lib/consentCenter/*.js; do node --check "$f"; done
node --check routes/consentCenterRoutes.js
npm run consent-center:check
npm run consent-center:smoke
```

Feature #38 done. Agle number ka intezaar.
