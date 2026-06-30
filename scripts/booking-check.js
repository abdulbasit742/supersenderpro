#!/usr/bin/env node
// scripts/booking-check.js — Offline safety + behavior check. Run: npm run booking:check

const bk = require('../lib/booking');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

// Pick a date ~3 days out that we control; availability open every day 09:00-17:00.
function futureDateStr(daysAhead) { const d = new Date(Date.now() + daysAhead * 86400000); return d.toISOString().slice(0, 10); }

(async () => {
 assert(bk && bk.bookingEngine, 'module loads');
 assert(bk.config.effective.liveMessages === false, 'messages are draft-only by default (safe)');

 const everyDay = {}; for (let i = 0; i < 7; i++) everyDay[i] = [{ start: '09:00', end: '17:00' }];
 const svc = bk.serviceStore.create({ name: 'Consultation', durationMins: 60, staff: 'Dr. Sara', slotGranularityMins: 60, availability: everyDay });
 assert(svc.id && svc.durationMins === 60, 'service created with duration + availability');

 const date = futureDateStr(3);
 const slots = bk.availability.slotsFor(svc.id, date);
 assert(slots.slots.length > 0, 'slots generated for an available day');
 // 09:00-17:00 at 60-min granularity, 60-min duration => slots at 09..16 = 8 slots.
 assert(slots.slots.length === 8, 'correct number of hourly slots in a 9-5 window');

 // Book the first slot.
 const first = slots.slots[0];
 const booked = await bk.bookingEngine.book({ serviceId: svc.id, contact: '+923001234567', name: 'Ali', startAt: first.startAt });
 assert(booked.booked === true, 'first slot books successfully');
 assert(booked.confirmation.sent === false && booked.confirmation.draft === true, 'confirmation is drafted, not sent (safe default)');
 assert(booked.appointment.contactMasked.indexOf('1234567') === -1, 'contact masked in appointment view');

 // Double-book the same slot -> rejected.
 const dbl = await bk.bookingEngine.book({ serviceId: svc.id, contact: '+923009998877', startAt: first.startAt });
 assert(dbl.booked === false && /booked/.test(dbl.reason), 'double-booking the same slot is rejected');

 // That slot no longer appears in availability.
 const slots2 = bk.availability.slotsFor(svc.id, date);
 assert(!slots2.slots.find((s) => s.startAt === first.startAt), 'booked slot removed from availability');

 // Within-lead-time booking rejected.
 const soon = new Date(Date.now() + 10 * 60000).toISOString();
 const tooSoon = await bk.bookingEngine.book({ serviceId: svc.id, contact: '+923001112223', startAt: soon });
 assert(tooSoon.booked === false, 'booking inside the minimum lead window is rejected');

 // Cancel frees the slot.
 bk.bookingEngine.cancel(booked.appointment.id);
 const slots3 = bk.availability.slotsFor(svc.id, date);
 assert(slots3.slots.find((s) => s.startAt === first.startAt), 'cancelling frees the slot again');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all booking checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
