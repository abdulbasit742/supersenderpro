# Feature #30 — Sender Health & Anti-Ban Governor

A central **send-rate governor** for WhatsApp numbers so SuperSender doesn't get numbers banned.
Every outbound send asks `gate(number)` first; the governor enforces warmup ramps, daily/hourly
caps, human-like spacing, and a health score driven by blocks/complaints.

## Why
The whole product is about sending at scale — which is exactly what gets WhatsApp numbers banned.
Broadcast (#36-style) and drip (#6) and scheduler (#17) all push messages, but nothing governed
the *rate* per number or tracked number health. This is the safety valve that protects the asset
the business runs on.

## What it does
- **Warmup ramp:** a fresh number starts at `warmupStartCap`/day and grows `warmupGrowthPerDay`
  each day up to `dailyCapMax` — mimicking organic ramp-up so new numbers aren't flagged.
- **Daily + hourly caps:** hard ceilings per number per day and per hour.
- **Human-like jitter:** `gate()` returns a recommended delay in `[minDelayMs, maxDelayMs]` and
  enforces minimum spacing since the last send.
- **Health score (0-100):** blocks + complaints subtract; clean sends slowly recover. Below
  `denyBelowScore`, `gate()` **denies** so the number can rest/be reviewed.
- **Spintax:** `{hi|hello|hey} {there|friend}` expands to a random variation per send to avoid
  identical-message footprints; `count()` reports total variations.
- **gate() decision:** `allow` (+ delay), `hold` (+ retryAfterMs), or `deny` (+ reason).

## Advisory by design
This module **never sends**. It's a governor: your real WhatsApp sender calls `gate(number)`,
obeys the decision, and on a successful send calls `recordSend(number)` (and
`recordBlock`/`recordComplaint` when those signals arrive) so state stays accurate. No message
bodies are ever stored; numbers are masked in all views.

## Files
- `lib/senderHealth/config.js` — env posture (warmup, caps, jitter, penalties)
- `lib/senderHealth/store.js` — atomic JSON store (`data/sender-health.json`)
- `lib/senderHealth/numberRegistry.js` — per-number counters, score, block/complaint tallies
- `lib/senderHealth/healthScore.js` — derived 0-100 rating + label
- `lib/senderHealth/spintax.js` — message variation (spin + count)
- `lib/senderHealth/governor.js` — the gate()/gateAndRecord() decision core + overview
- `lib/senderHealth/doctor.js` — offline self-check + posture
- `lib/senderHealth/index.js` — barrel
- `routes/senderHealthRoutes.js` — REST surface (`/api/sender-health`)
- `scripts/sender-health-check.js`, `tests/smoke/senderHealthSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const senderHealthRoutes = require('./routes/senderHealthRoutes');
app.use('/api/sender-health', senderHealthRoutes);
```
In your send path (broadcast/drip/scheduler), gate every send:
```js
const sh = require('./lib/senderHealth');
const g = sh.gate(fromNumber);
if (g.decision !== 'allow') { /* hold or skip per g.reason / g.retryAfterMs */ return; }
await new Promise(r => setTimeout(r, g.delayMs));      // human-like spacing
await waClient.sendMessage(to, sh.spin(messageTemplate)); // spintax variation
sh.numberRegistry.recordSend(fromNumber);
// on webhook signals: sh.numberRegistry.recordBlock(fromNumber) / recordComplaint(fromNumber)
```

## Endpoints (`/api/sender-health`)
- `GET /status`, `GET /doctor`, `GET /overview`
- `GET /gate?number=` — advisory allow/hold/deny
- `POST /sent` `{ number }`, `POST /block` `{ number }`, `POST /complaint` `{ number }`
- `POST /status-set` `{ number, status }`
- `POST /spin/preview` `{ text }` — expand + count spintax variations

## Safety
JSON-backed; **advisory only** (never sends). Numbers masked in every view; no message bodies
stored. Caps + warmup + scoring are conservative defaults you can tune via env. 100% additive;
no existing module/route/data changed, no new dependency.

## Env
```
SENDER_HEALTH_ENABLED=true
SENDER_HEALTH_WARMUP_START_CAP=20
SENDER_HEALTH_WARMUP_GROWTH_PER_DAY=20
SENDER_HEALTH_DAILY_CAP_MAX=1000
SENDER_HEALTH_HOURLY_CAP=120
SENDER_HEALTH_MIN_DELAY_MS=3000
SENDER_HEALTH_MAX_DELAY_MS=12000
SENDER_HEALTH_DENY_BELOW_SCORE=40
```

## Verify
```bash
for f in lib/senderHealth/*.js; do node --check "$f"; done
node --check routes/senderHealthRoutes.js
npm run sender-health:check
npm run sender-health:smoke
```

Feature #30 done. Agle number ka intezaar.
