# Smart Send-Time Optimizer

Learns **when each contact actually engages** (replies/opens) and recommends the best hour to message them, so broadcasts land when people are awake and responsive instead of at 3am. Also spreads a large broadcast across time slots to respect your **anti-ban throttle**. Runs locally; the deterministic core needs no model at all.

## Why

Send-time is one of the biggest, cheapest levers on open/reply rates, and blasting everyone at once is exactly what trips WhatsApp's spam detection. This fixes both: right time per person + throttled spread.

## How it works

```
every reply/open → logEngagement(phone, ts) → per-contact hour/day histogram
bestTime(phone) → argmax hour (within business window) + confidence + next slot
scheduleBroadcast(phones) → assign each their best hour, then throttle to maxPerSlot
```

- **Deterministic core:** a per-contact engagement histogram (hour + weekday) with timezone awareness (`Asia/Karachi` by default). No model required.
- **Optional AI rationale:** the AI Brain Bridge (Ollama) phrases a one-line "why this time" for the dashboard. Skipped cleanly if offline.
- Falls back to a safe default window (late morning, inside 9am-9pm) when a contact has little history.
- **Zero new npm dependencies.**

## Files

- `lib/sendTime/sendTimeOptimizer.js` — log / bestTime / nextSlot / scheduleBroadcast.
- `routes/sendTimeRoutes.js` — self-mountable router.
- `tests/smoke/sendTimeSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/send-time', require('./routes/sendTimeRoutes'));
```

## Environment

```
SEND_TIME_TZ=Asia/Karachi
SEND_TIME_MODEL=qwen2.5:32b   # optional, only for the rationale sentence
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/send-time/engagement` | Record a reply/open. Body: `{ phone, ts?, weight? }` |
| GET | `/api/send-time/best?phone=` | Best hour + next slot + rationale |
| POST | `/api/send-time/schedule` | Plan a broadcast. Body: `{ phones:[], maxPerSlot? }` |
| GET | `/api/send-time/health` | Brain status + timezone |

### Example

```bash
curl -X POST http://localhost:3000/api/send-time/schedule \
  -H 'Content-Type: application/json' \
  -d '{"phones":["+9230011","+9230022"],"maxPerSlot":20}'
# -> { count:2, plan:[{phone,whenISO,hour}, ...] }
```

## Wiring into broadcasts

1. Whenever a contact replies (inbound handler) or opens/clicks, call `logEngagement({ phone })`. Over time each contact builds a profile.
2. Before sending a campaign (`routes/wati.js` `sendCampaignBroadcast`), call `scheduleBroadcast({ phones })` to get a per-recipient send time.
3. Enqueue each message for its `whenISO` (BullMQ delay, already wired in `lib/queueManager.js`). The `maxPerSlot` spread doubles as anti-ban pacing.

## Tests

```bash
node tests/smoke/sendTimeSmoke.js
```
