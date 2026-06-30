// lib/messageScheduler/cron.js — Dependency-free 5-field cron parser + next-run computation.
// Fields: minute hour day-of-month month day-of-week. Supports *, lists (a,b), ranges (a-b),
// and steps (*/n, a-b/n). Evaluated in a given IANA timezone. Good enough for scheduling sends
// (minute resolution); not a full cron clone.

const tz = require('./timezone');

function _expand(field, min, max) {
 if (field === '*' || field === '?') { const out = []; for (let i = min; i <= max; i++) out.push(i); return out; }
 const set = new Set();
 for (const part of String(field).split(',')) {
 let step = 1; let range = part;
 const slash = part.split('/');
 if (slash.length === 2) { range = slash[0]; step = parseInt(slash[1], 10) || 1; }
 let lo = min, hi = max;
 if (range === '*' ) { lo = min; hi = max; }
 else if (range.includes('-')) { const [a, b] = range.split('-'); lo = parseInt(a, 10); hi = parseInt(b, 10); }
 else { lo = hi = parseInt(range, 10); }
 if (Number.isNaN(lo)) continue;
 for (let i = lo; i <= hi; i += step) if (i >= min && i <= max) set.add(i);
 }
 return [...set];
}

function parse(expr) {
 const f = String(expr || '').trim().split(/\s+/);
 if (f.length !== 5) throw new Error('cron must have 5 fields: minute hour dom month dow');
 return {
 minute: new Set(_expand(f[0], 0, 59)),
 hour: new Set(_expand(f[1], 0, 23)),
 dom: new Set(_expand(f[2], 1, 31)),
 month: new Set(_expand(f[3], 1, 12)),
 dow: new Set(_expand(f[4], 0, 6)), // 0=Sun..6=Sat
 domStar: f[2] === '*' || f[2] === '?',
 dowStar: f[4] === '*' || f[4] === '?',
 };
}

function _matches(parsed, p) {
 const domOk = parsed.dom.has(p.day);
 const dowOk = parsed.dow.has(p.weekday);
 // Standard cron: if both dom and dow are restricted, match if EITHER matches.
 const dayOk = (parsed.domStar && parsed.dowStar) ? true
 : (parsed.domStar ? dowOk : (parsed.dowStar ? domOk : (domOk || dowOk)));
 return parsed.minute.has(p.minute) && parsed.hour.has(p.hour) && parsed.month.has(p.month) && dayOk;
}

// Next run strictly after `fromMs`, evaluated in timeZone. Scans minute-by-minute up to ~366 days.
function nextRun(expr, fromMs, timeZone) {
 const parsed = parse(expr);
 const MIN = 60 * 1000;
 let t = Math.floor(fromMs / MIN) * MIN + MIN; // start at next whole minute
 const limit = fromMs + 366 * 24 * 60 * MIN;
 for (; t <= limit; t += MIN) {
 const p = tz.localParts(new Date(t), timeZone);
 if (_matches(parsed, p)) return new Date(t).toISOString();
 }
 return null;
}

function isValid(expr) { try { parse(expr); return true; } catch (_e) { return false; } }

module.exports = { parse, nextRun, isValid };
