// lib/booking/timezone.js — Minimal IANA timezone helpers via the built-in Intl API (no dependency).
// Gives the local date parts (incl. weekday + minutes-since-midnight) for slot/working-hour math.

function localParts(date, timeZone) {
 let p;
 try {
 const fmt = new Intl.DateTimeFormat('en-US', { timeZone, hour12: false, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short' });
 p = {}; for (const part of fmt.formatToParts(date)) p[part.type] = part.value;
 } catch (_e) { return localParts(date, 'UTC'); }
 const wk = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
 let hour = parseInt(p.hour, 10); if (hour === 24) hour = 0;
 const minute = parseInt(p.minute, 10);
 return { year: +p.year, month: +p.month, day: +p.day, hour, minute, weekday: wk[p.weekday] === undefined ? new Date(date).getUTCDay() : wk[p.weekday], minutesSinceMidnight: hour * 60 + minute };
}

module.exports = { localParts };
