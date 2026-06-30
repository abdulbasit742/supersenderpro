// lib/messageScheduler/timezone.js — Minimal timezone helpers using the built-in Intl API
// (no dependency). Get the local hour for an IANA timezone, and the UTC offset in minutes, so
// quiet-hours + cron evaluation can run in the job's timezone.

function _partsInTz(date, timeZone) {
 try {
 const fmt = new Intl.DateTimeFormat('en-US', { timeZone, hour12: false, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short' });
 const parts = {};
 for (const p of fmt.formatToParts(date)) parts[p.type] = p.value;
 return parts;
 } catch (_e) { return null; }
}

// Returns { year, month(1-12), day, hour(0-23), minute, weekday(0=Sun..6=Sat) } in the tz.
function localParts(date, timeZone) {
 const p = _partsInTz(date, timeZone) || _partsInTz(date, 'UTC');
 const wkMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
 let hour = parseInt(p.hour, 10);
 if (hour === 24) hour = 0; // some environments emit 24 for midnight
 return {
 year: parseInt(p.year, 10), month: parseInt(p.month, 10), day: parseInt(p.day, 10),
 hour, minute: parseInt(p.minute, 10), weekday: wkMap[p.weekday] === undefined ? new Date(date).getUTCDay() : wkMap[p.weekday],
 };
}

function localHour(date, timeZone) { return localParts(date, timeZone).hour; }

module.exports = { localParts, localHour };
