# AI Drip & Nurture Sequencer

One-off broadcasts are blunt; the money is in automated **journeys** — a welcome series after signup, a nurture after first order, a re-engage track. This defines multi-step sequences (each step = a delay + a message), enrolls contacts on an event, and advances them step by step, honoring per-step delays, the send-time optimizer (#21), opt-out, and de-duplication. The AI can auto-write the step copy from a plain goal. Self-hosted Ollama; zero cloud cost.

## Why

A single message is a moment; a sequence is a relationship. Automated nurture (welcome → value → offer) converts far better than a lone blast, and once defined it runs itself for every new contact, no manual effort per person.

## How it works

```
define sequence: steps = [{ delayHours, text }], trigger = signup | first_order | manual | ...
event fires → onEvent(phone, event) enrolls into matching sequences (idempotent)
drip-tick (cron) → due() lists steps whose time has come (send-time aware via #21)
queue worker sends → POST /sent → next step scheduled, or sequence completes
reply / convert / opt-out → stop() halts the journey
```

- **AI step authoring:** `author({ goal })` drafts a sequence from a one-line goal (Ollama); deterministic templates fallback.
- **Send-time aware:** each step\'s due time aligns to the contact\'s best hour when #21 is present.
- **Idempotent + safe:** a contact is never double-enrolled in an active sequence; the final step carries an opt-out.
- **Zero new npm dependencies.**

## Files

- `lib/drip/dripSequencer.js` — define / author / enroll / due / advance / stop.
- `routes/dripRoutes.js` — self-mountable router.
- `scripts/drip-tick.js` — periodic tick (cron-ready).
- `tests/smoke/dripSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/drip', require('./routes/dripRoutes'));
```

## Tick cron (PC #1)

```bash
*/15 * * * *  cd /path/to/supersenderpro && node scripts/drip-tick.js >> data/drip/tick.log 2>&1
```

A worker takes due steps, sends each via the WhatsApp engine (BullMQ, `lib/queueManager.js`), then `POST /api/drip/sent`.

## Environment

```
DRIP_MODEL=qwen2.5:32b      # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/drip/define` | Define a sequence. Body: `{ id, name?, trigger?, steps:[{delayHours,text}] }` |
| POST | `/api/drip/author` | AI-write steps from a goal. Body: `{ goal, stepCount?, cadenceHours? }` |
| GET | `/api/drip/sequences` | List sequences |
| POST | `/api/drip/enroll` | Enroll a contact. Body: `{ phone, sequenceId }` |
| POST | `/api/drip/event` | Enroll by trigger event. Body: `{ phone, event }` |
| GET | `/api/drip/due` | Steps due to send now |
| POST | `/api/drip/sent` | Mark a step sent (advances). Body: `{ phone, sequenceId }` |
| POST | `/api/drip/stop` | Stop a contact\'s journey. Body: `{ phone, sequenceId? }` |
| GET | `/api/drip/enrollments` | List enrollments |
| GET | `/api/drip/health` | Brain + send-time wiring |

### Example

```bash
# AI-write a welcome series, then save + enroll on signup
curl -X POST localhost:3000/api/drip/author -d '{"goal":"welcome new customers and introduce our best products","stepCount":3}' -H 'Content-Type: application/json'
curl -X POST localhost:3000/api/drip/define -d '{"id":"welcome","trigger":"signup","steps":[{"delayHours":0,"text":"Hi {{name}}, welcome!"},{"delayHours":24,"text":"Our top picks for you {{name}}"},{"delayHours":72,"text":"Here is 10% off {{name}}. Reply STOP to opt out."}]}' -H 'Content-Type: application/json'
curl -X POST localhost:3000/api/drip/event -d '{"phone":"+92300xxxxxxx","event":"signup"}' -H 'Content-Type: application/json'
```

## Wiring into the flow

- **Triggers:** call `onEvent({ phone, event })` from your hooks, e.g. `signup` on first contact (support agent #1), `first_order` on order confirm (#25), `abandoned` from cart recovery (#31).
- **Targeted enroll:** use the NL segment builder (#42) to get a phone list, then `enrollMany`.
- **Stop conditions:** on a reply/convert, call `stop({ phone })` so you never nurture someone who already acted.

## Tests

```bash
node tests/smoke/dripSmoke.js
```
