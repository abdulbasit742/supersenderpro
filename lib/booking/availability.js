// lib/booking/availability.js — Generate bookable slots for a service on a given date (YYYY-MM-DD,
// in the service/booking timezone). Walks each working window for that weekday at the service's
// slot granularity, keeps slots that fully fit the service duration, drops slots that overlap an
// existing (non-cancelled) appointment or fall inside the min-lead window. Pure over store reads.

const { config } = require('./config');
const tz = require('./timezone');
const serviceStore = require('./serviceStore');
const store = require('./store');

// Build a UTC Date for a given local Y-M-D + minutesSinceMidnight in timeZone (approx via offset probe).
function _localToUtc(year, month, day, minutes, timeZone) {
 // Construct a guess in UTC then correct using the tz offset at that instant.
 const guess = Date.UTC(year, month - 1, day, Math.floor(minutes / 60), minutes % 60, 0);
 const parts = tz.localParts(new Date(guess), timeZone);
 const localGuessMins = parts.hour * 60 + parts.minute;
 const drift = localGuessMins - minutes; // how far the local clock is from target
 return new Date(guess - drift * 60000);
}

function _overlaps(aStart, aEnd, bStart, bEnd) { return aStart < bEnd && bStart < aEnd; }

function slotsFor(serviceId, dateStr, refNow = Date.now()) {
 const svc = serviceStore.raw(serviceId);
 if (!svc || svc.active === false) return { service: serviceId, date: dateStr, slots: [] };
 const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if (!m) throw new Error('date must be YYYY-MM-DD');
 const [year, month, day] = [+m[1], +m[2], +m[3]];
 // Determine the weekday for that date in the booking timezone (probe midday to avoid DST edges).
 const probe = _localToUtc(year, month, day, 12 * 60, config.timezone);
 const weekday = tz.localParts(probe, config.timezone).weekday;
 const windows = (svc.availability && svc.availability[weekday]) || [];
 const gran = svc.slotGranularityMins || config.slotGranularityMins;
 const dur = svc.durationMins;

 const existing = store.load().appointments.filter((a) => a.serviceId === serviceId && a.status === 'booked').map((a) => ({ start: Date.parse(a.startAt), end: Date.parse(a.endAt) }));
 const minBookableMs = refNow + config.minLeadMins * 60000;

 const slots = [];
 for (const w of windows) {
 const startMins = serviceStore._hhmmToMins(w.start);
 const endMins = serviceStore._hhmmToMins(w.end);
 for (let t = startMins; t + dur <= endMins; t += gran) {
 const slotStart = _localToUtc(year, month, day, t, config.timezone);
 const slotEnd = new Date(slotStart.getTime() + dur * 60000);
 if (slotStart.getTime() < minBookableMs) continue; // too soon / in the past
 const clash = existing.some((e) => _overlaps(slotStart.getTime(), slotEnd.getTime(), e.start, e.end));
 if (clash) continue;
 slots.push({ startAt: slotStart.toISOString(), endAt: slotEnd.toISOString() });
 }
 }
 return { service: serviceId, date: dateStr, durationMins: dur, timezone: config.timezone, slots };
}

// Is a specific start time still bookable (fits a window, no clash, within lead)? Used by booking.
function isBookable(serviceId, startAtIso, refNow = Date.now()) {
 const svc = serviceStore.raw(serviceId);
 if (!svc || svc.active === false) return { ok: false, reason: 'service unavailable' };
 const start = Date.parse(startAtIso);
 if (Number.isNaN(start)) return { ok: false, reason: 'invalid startAt' };
 if (start < refNow + config.minLeadMins * 60000) return { ok: false, reason: 'within minimum lead time' };
 const end = start + svc.durationMins * 60000;
 const parts = tz.localParts(new Date(start), config.timezone);
 const windows = (svc.availability && svc.availability[parts.weekday]) || [];
 const startMins = parts.minutesSinceMidnight;
 const fits = windows.some((w) => startMins >= serviceStore._hhmmToMins(w.start) && (startMins + svc.durationMins) <= serviceStore._hhmmToMins(w.end));
 if (!fits) return { ok: false, reason: 'outside working hours' };
 const clash = store.load().appointments.some((a) => a.serviceId === serviceId && a.status === 'booked' && _overlaps(start, end, Date.parse(a.startAt), Date.parse(a.endAt)));
 if (clash) return { ok: false, reason: 'slot already booked' };
 return { ok: true, endAt: new Date(end).toISOString(), durationMins: svc.durationMins };
}

module.exports = { slotsFor, isBookable };
