# Feature #56 — Appointment Booking

Let customers book a time over WhatsApp without double-booking. Define services with durations and
weekly availability, generate conflict-free slots for any date, book/cancel/reschedule atomically,
and send (draft-safe) confirmations + reminders.

## Why
A huge slice of WhatsApp businesses are appointment-driven: clinics, salons, tutors, consultants.
They need "what times are free Thursday?" and "book me at 3pm" without two people grabbing the same
slot. Nothing in the product did scheduling. This adds it, timezone-aware and conflict-free.

## What it does
- **Services:** `create({ name, durationMins, staff?, slotGranularityMins?, availability })` where
  `availability` maps weekday (0=Sun..6=Sat) to working windows `{ start:'HH:MM', end:'HH:MM' }`.
- **Slots:** `slotsFor(serviceId, 'YYYY-MM-DD')` walks each working window at the service's
  granularity, keeps slots that fully fit the duration, and **drops** slots that are within the
  minimum lead time or overlap an existing booking. Timezone-aware (built-in Intl, no dependency).
- **Book conflict-free:** `book({ serviceId, contact, startAt })` re-checks availability and clash
  **atomically right before writing**, so two requests can't double-book. Fires a draft confirmation.
- **Cancel / reschedule / status:** cancel frees the slot; reschedule re-validates the new time
  (allowing the appointment's own slot); status → `completed` / `no_show`.
- **Reminders:** `reminderTick()` sends a one-time reminder N hours before each booked appointment.
- **Integrations:** outbound gated by consent #38; a booking records a customer-360 #46 event.

## Files
- `lib/booking/config.js` — env posture (draft messages, tz, granularity, lead, reminder window)
- `lib/booking/store.js` — atomic JSON store (`data/booking.json`)
- `lib/booking/privacy.js` — contact masking
- `lib/booking/timezone.js` — Intl-based tz helpers (no dependency)
- `lib/booking/serviceStore.js` — services + weekly availability
- `lib/booking/availability.js` — conflict-free slot generation + isBookable
- `lib/booking/notify.js` — single outbound hook (`setNotifier`), consent-gated
- `lib/booking/bookingEngine.js` — book/cancel/reschedule + reminderTick core
- `lib/booking/doctor.js` — offline self-check + posture
- `lib/booking/index.js` — barrel
- `routes/bookingRoutes.js` — REST surface (`/api/booking`)
- `scripts/booking-check.js`, `tests/smoke/bookingSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const bookingRoutes = require('./routes/bookingRoutes');
app.use('/api/booking', bookingRoutes);
// optional confirmations/reminders: require('./lib/booking').setNotifier(async (to,msg)=>waClient.sendMessage(to,msg));
```
Fire reminders on a schedule (node-cron already a dep):
```js
require('node-cron').schedule('*/15 * * * *', () => require('./lib/booking').bookingEngine.reminderTick());
```
Typical flow (e.g. from the WhatsApp bot): list slots, then book.
```js
const bk = require('./lib/booking');
const { slots } = bk.availability.slotsFor(serviceId, '2026-07-03');
const r = await bk.bookingEngine.book({ serviceId, contact: from, name, startAt: slots[0].startAt });
```

## Endpoints (`/api/booking`)
- `GET /status`, `GET /doctor`, `GET /overview`
- `POST /services`, `GET /services`, `PUT /services/:id`
- `GET /services/:id/slots?date=YYYY-MM-DD`
- `POST /appointments` `{ serviceId, contact, name?, startAt }`, `GET /appointments` (`?serviceId=&contact=&status=`)
- `GET /appointments/:id`, `POST /appointments/:id/cancel`, `POST /appointments/:id/reschedule` `{ startAt }`, `POST /appointments/:id/status` `{ status }`
- `POST /reminders/tick`

## Safety
JSON-backed; slot math + booking are local + deterministic + **conflict-free** (atomic re-check
before write). Outbound confirmations/reminders are **draft-only** until `BOOKING_LIVE_MESSAGES=true`
+ a notifier, and **consent-gated** (#38). Contacts masked in views. Appointments cancelled/
completed, never hard-deleted. 100% additive; no existing module/route/data changed, no new
dependency (timezone via stdlib Intl).

## Env
```
BOOKING_ENABLED=true
BOOKING_LIVE_MESSAGES=false                   # true + notifier => confirmations/reminders actually send
BOOKING_TIMEZONE=Asia/Karachi
BOOKING_SLOT_GRANULARITY_MINS=30
BOOKING_MIN_LEAD_MINS=60
BOOKING_REMINDER_HOURS_BEFORE=24
BOOKING_RESPECT_CONSENT=true
```

## Verify
```bash
for f in lib/booking/*.js; do node --check "$f"; done
node --check routes/bookingRoutes.js
npm run booking:check
npm run booking:smoke
```

Feature #56 done. Agle number ka intezaar.
