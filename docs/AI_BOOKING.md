# AI Appointment Booking (over WhatsApp)

Many businesses book through chat — salons, clinics, tutors, repair, consults. This lets a customer say *"can I come tomorrow evening?"* (or *"koi slot kal shaam 6 baje?"*) and get back real open times to pick from, then handles **hold → confirm → reminder → cancel**. Availability is computed from your configurable business hours + existing bookings, timezone-aware. Runs on self-hosted Ollama; zero cloud cost.

## Why

Booking by chat is huge in this market, but doing it manually means double-bookings, missed messages, and no-shows. This automates the whole loop: parse the request, offer real slots, lock it in, and remind, so the calendar fills itself without you touching it.

## How it works

```
"tomorrow evening?" → AI parse to {date,time} (Ollama, strict JSON)  [deterministic fallback]
   → generate slots from business hours − existing bookings (TZ-aware)
   → offer nearest free slots → customer picks → confirmSlot (capacity-checked)
   → dueReminders() feeds your queue → reminder sent → CANCEL frees the slot
```

- **AI + fallback:** the model extracts the date/time; offline, a deterministic parser handles today/tomorrow/weekday + clock (incl. Roman Urdu: aaj/kal/shaam).
- **Capacity-aware:** configurable slot length + capacity per slot; double-booking is refused.
- **Timezone-aware** (`Asia/Karachi` default).
- **Zero new npm dependencies.**

## Files

- `lib/booking/bookingEngine.js` — parse / findSlots / confirm / cancel / reminders + config.
- `routes/bookingRoutes.js` — self-mountable router.
- `tests/smoke/bookingSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/booking', require('./routes/bookingRoutes'));
```

## Environment

```
BOOKING_MODEL=qwen2.5:32b      # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
BOOKING_TZ=Asia/Karachi
OLLAMA_HOST=http://127.0.0.1:11434
```

Configure business hours via `PUT /api/booking/config` (slotMinutes, capacityPerSlot, weekly open/close, holidays).

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/booking/request` | NL request → offered slots. Body: `{ phone?, text, count? }` |
| GET | `/api/booking/slots` | Raw free slots. Query: `date?, time?, count?` |
| POST | `/api/booking/confirm` | Book a slot. Body: `{ phone, ts, name?, service?, hold? }` |
| POST | `/api/booking/cancel` | Cancel. Body: `{ phone? , id? }` |
| GET | `/api/booking/list` | List bookings. Query: `status?, upcomingOnly?` |
| GET | `/api/booking/reminders` | Bookings due a reminder |
| POST | `/api/booking/reminded` | Mark a reminder sent. Body: `{ id }` |
| GET/PUT | `/api/booking/config` | Read / update business hours |
| GET | `/api/booking/health` | Brain + timezone |

### Example

```bash
curl -X POST http://localhost:3000/api/booking/request \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+92300xxxxxxx","text":"can I come tomorrow evening?"}'
# -> { slots:[{ts,label:"Wed 1 Jul at 17:00"},...], message:"Here are the nearest available times:\n1. ..." }
```

## Wiring into live WhatsApp

1. When the support agent (#1) detects a booking intent, call `requestBooking({ phone, text })` and send `message`.
2. When the customer replies with a number, map it to the offered slot\'s `ts` and call `confirmSlot({ phone, ts })`.
3. Run a periodic job: `dueReminders()` → send each via the WhatsApp engine → `markReminded({ id })`. (BullMQ in `lib/queueManager.js`.)
4. On "CANCEL", call `cancelBooking({ phone })`.

## Tests

```bash
node tests/smoke/bookingSmoke.js
```
