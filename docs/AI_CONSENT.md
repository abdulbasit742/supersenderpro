# Consent & Compliance Manager

Sending marketing to people who didn\'t opt in (or who said STOP) is how numbers get banned **and** how you land in legal trouble. This is the **source of truth for who you\'re allowed to message**: a per-contact consent ledger (opt-in / opt-out with timestamp + source proof), automatic opt-out keyword detection (STOP / UNSUBSCRIBE / \"band karo\"), a quiet-hours window, and ONE gate — `canSendMarketing()` — every broadcast must pass before sending. Self-hosted Ollama; zero cloud cost.

## Why

This is the legal + deliverability backbone of broadcasting. Honouring opt-outs is non-negotiable (and protects your number health #68), quiet hours stop you messaging people at 2am, and the append-only audit trail is your proof of consent if anyone ever asks. One gate enforces all of it consistently, instead of hoping each send path remembers.

## What it does

- **Consent ledger:** opt-in / opt-out per contact, each with a timestamp + source (signup, keyword, manual, import).
- **Keyword detection:** an inbound STOP / UNSUBSCRIBE / \"band karo\" auto-opts-out and returns a confirmation to send; START / \"chalu karo\" opts back in.
- **Quiet hours:** a timezone-aware window (default 9pm-9am PKT) during which marketing is blocked.
- **The gate:** `canSendMarketing(phone)` → allowed/blocked + reason. Strict by default (must opt in).
- **Audit export:** the full consent history for a contact, for compliance.

The ledger + gate are fully deterministic; the model only phrases the opt-out confirmation. **Zero new npm dependencies.**

## Files

- `lib/consent/consentManager.js` — ledger / keywords / quiet-hours / gate / audit.
- `routes/consentRoutes.js` — self-mountable router.
- `tests/smoke/consentSmoke.js` — offline smoke test + gate/quiet-hours checks.

## Wiring it up (one line in server.js)

```js
app.use('/api/consent', require('./routes/consentRoutes'));
```

## Environment / config

```
CONSENT_MODEL=qwen2.5:32b   # only for the opt-out confirmation; defaults to SUPPORT_AGENT_MODEL
OLLAMA_HOST=http://127.0.0.1:11434
```

Tune via `PUT /api/consent/config` (`timezone`, `quietStart`, `quietEnd`, `defaultOptedIn`, `optOutKeywords`, `optInKeywords`).

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/consent/opt-in` | Record opt-in. Body: `{ phone, source? }` |
| POST | `/api/consent/opt-out` | Record opt-out. Body: `{ phone, source? }` |
| POST | `/api/consent/inbound` | Detect STOP/START in a message. Body: `{ phone, text }` |
| GET | `/api/consent/can-send?phone=` | The send gate (allowed + reason) |
| POST | `/api/consent/filter` | Split a phone list into sendable/blocked. Body: `{ phones:[] }` |
| GET | `/api/consent/status?phone=` | Current consent status |
| GET | `/api/consent/audit?phone=` | Full consent history (compliance proof) |
| GET | `/api/consent/stats` | Opted-in / opted-out counts |
| GET/PUT | `/api/consent/config` | Read / tune quiet hours + keywords |
| GET | `/api/consent/health` | Brain status |

### Example

```bash
# before a broadcast, filter the list:
curl -X POST localhost:3000/api/consent/filter -H 'Content-Type: application/json' -d '{"phones":["+92300","+92301"]}'
# -> { allowed:["+92300"], blocked:[{phone:"+92301",reason:"contact opted out"}], allowedCount:1, blockedCount:1 }
```

## Wiring into the flow (make it the gate)

1. On EVERY inbound message, call `processInbound({ phone, text })` first; if it returns an opt-out/opt-in action, send the `confirm` and skip normal handling.
2. Before ANY marketing/broadcast send, run the recipient list through `filterSendable({ phones })` (or `canSendMarketing` per contact). Only send to `allowed`.
3. Record opt-ins at the moment of consent (signup, first order) via `optIn({ phone, source })`.
4. Pair with number health (#68): consent + quiet hours + warmup caps together are your full anti-ban / compliance layer. Opt-out events also feed the broadcast analyzer (#44) opt-out rate.

## Tests

```bash
node tests/smoke/consentSmoke.js
```
