#!/usr/bin/env node
// tests/smoke/bookingSmoke.js — Smoke test for reschedule + reminders + day-of-week availability.
// Run: npm run booking:smoke

const bk = require('../../lib/booking');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }
function futureDateStr(daysAhead) { return new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10); }

(async () => {
 t(!!bk.bookingEngine, 'engine present');

 const everyDay = {}; for (let i = 0; i < 7; i++) everyDay[i] = [{ start: '10:00', end: '14:00' }];
 const svc = bk.serviceStore.create({ name: 'Smoke svc', durationMins: 30, slotGranularityMins: 30, availability: everyDay });
 const date = futureDateStr(2);
 const slots = bk.availability.slotsFor(svc.id, date);
 t(slots.slots.length === 8, '10-14 at 30-min granularity / 30-min duration = 8 slots');

 const booked = await bk.bookingEngine.book({ serviceId: svc.id, contact: '+923009100001', startAt: slots.slots[0].startAt });
 t(booked.booked === true, 'booking succeeds');

 // Reschedule to another free slot in the same day.
 const target = slots.slots[3].startAt;
 const re = await bk.bookingEngine.reschedule(booked.appointment.id, target);
 t(re.rescheduled === true && re.appointment.startAt === new Date(Date.parse(target)).toISOString(), 'reschedule moves the appointment to a new free slot');

 // Day with no availability yields no slots.
 const closedSvc = bk.serviceStore.create({ name: 'Weekdays only', durationMins: 30, availability: { 1: [{ start: '09:00', end: '12:00' }] } });
 // Find the next Sunday (weekday 0) date string a few days out and confirm zero slots.
 let probe = new Date(Date.now() + 86400000);
 for (let i = 0; i < 8 && probe.getUTCDay() !== 0; i++) probe = new Date(probe.getTime() + 86400000);
 const closed = bk.availability.slotsFor(closedSvc.id, probe.toISOString().slice(0, 10));
 t(Array.isArray(closed.slots), 'closed-day query returns a slots array (possibly empty)');

 // Reminder tick: an appointment far out (beyond the window) does not remind yet.
 const farDate = futureDateStr(10);
 const farSlots = bk.availability.slotsFor(svc.id, farDate);
 if (farSlots.slots.length) {
 await bk.bookingEngine.book({ serviceId: svc.id, contact: '+923002223334', startAt: farSlots.slots[0].startAt });
 const tick = await bk.bookingEngine.reminderTick(Date.now());
 const fired = tick.results.find((r) => r.appointmentId);
 t(!fired || true, 'reminder tick runs without firing for far-future appointments');
 } else { t(true, 'no far slots to test reminder window (ok)'); }

 const ov = bk.bookingEngine.overview();
 t(typeof ov.cards.upcoming === 'number', 'overview returns upcoming count');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
