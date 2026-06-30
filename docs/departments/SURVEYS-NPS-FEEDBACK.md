# Feature #42 — Surveys & NPS/CSAT Feedback

Ask customers how you're doing, over WhatsApp, and turn their replies into a number. Define an
NPS / CSAT / poll / open-text survey, send it (draft-safe), capture the reply against the open
ask, and score it (NPS, CSAT%, poll breakdown).

## Why
Support (#3) closes tickets and analytics (#9) counts events, but nothing asked the customer
"how did we do?" and turned it into a trackable metric. NPS/CSAT is the standard pulse of
customer happiness — and a great trigger for follow-up (a detractor → alert #28 → a human reaches
out). This adds it as a self-contained dept that respects consent (#38).

## What it does
- **Survey types:** `nps` (0-10), `csat` (1-5), `poll` (pick an option), `text` (open feedback).
- **Send (draft-safe):** `send(surveyId, contact)` renders the prompt (polls list numbered
  options) and opens a **reply window** for that contact. Respects consent #38 (won't survey an
  opted-out contact) when present.
- **Capture replies:** `capture({ contact, text })` matches the contact's open ask, **validates**
  the reply by type (NPS 0-10, CSAT 1-5, poll option, non-empty text), records it, and closes the
  ask. Out-of-range / unparseable replies are rejected with a reason (no guessing).
- **Scoring:** NPS = %promoters(9-10) - %detractors(0-6); CSAT = % satisfied(4-5) + average;
  poll = counts/percent per option; all with a day time series.
- **Window expiry:** replies after `responseWindowHours` don't count.

## Files
- `lib/surveys/config.js` — env posture (draft send, response window, consent respect)
- `lib/surveys/store.js` — atomic JSON store (`data/surveys.json`)
- `lib/surveys/privacy.js` — contact masking
- `lib/surveys/responseParser.js` — type-aware reply interpretation
- `lib/surveys/scoring.js` — NPS / CSAT / poll scoring
- `lib/surveys/notify.js` — single outbound hook (`setNotifier`)
- `lib/surveys/surveyEngine.js` — define/send/capture/score core
- `lib/surveys/doctor.js` — offline self-check + posture
- `lib/surveys/index.js` — barrel
- `routes/surveysRoutes.js` — REST surface (`/api/surveys`)
- `scripts/surveys-check.js`, `tests/smoke/surveysSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const surveysRoutes = require('./routes/surveysRoutes');
app.use('/api/surveys', surveysRoutes);
// optional send: require('./lib/surveys').setNotifier(async (to,msg)=>waClient.sendMessage(to,msg));
```
In the WhatsApp inbound handler, give surveys a chance to capture the reply first:
```js
const cap = require('./lib/surveys').capture({ contact: from, text: body });
if (cap.matched) { /* it was a survey reply; optionally thank them */ }
```
Send after a resolved ticket (#3), a delivered order, etc.:
```js
await require('./lib/surveys').surveyEngine.send(npsSurveyId, contact);
```

## Endpoints (`/api/surveys`)
- `GET /status`, `GET /doctor`, `GET /overview`
- `POST /surveys` `{ name, type, question?, options? }`, `GET /surveys`, `GET /surveys/:id` (+results)
- `GET /surveys/:id/results`, `GET /surveys/:id/responses`
- `POST /surveys/:id/send` `{ contact }`
- `POST /capture` `{ contact, text }`

## Safety
JSON-backed; contacts masked in views. Prompt send **draft-only** until `SURVEYS_LIVE_SEND=true`
+ a notifier. Consent respected on send. Out-of-range replies rejected, not guessed. 100%
additive; no existing module/route/data changed, no new dependency.

## Env
```
SURVEYS_ENABLED=true
SURVEYS_LIVE_SEND=false                       # true + notifier => survey prompts actually send
SURVEYS_RESPONSE_WINDOW_HOURS=72
SURVEYS_RESPECT_CONSENT=true
```

## Verify
```bash
for f in lib/surveys/*.js; do node --check "$f"; done
node --check routes/surveysRoutes.js
npm run surveys:check
npm run surveys:smoke
```

Feature #42 done. Agle number ka intezaar.
