// lib/booking/bookingEngine.js
// ────────────────────────────────────────────────────────────────────
// AI Appointment Booking over WhatsApp. Many shops/services book via chat:
// salons, clinics, tutors, repair, consults. This parses a free-text request
// ("can I come tomorrow evening?", "koi slot kal shaam?"), checks availability
// against configurable business hours + existing bookings, offers the nearest
// free slots, and handles hold -> confirm -> remind -> cancel.
//
// The AI Brain Bridge (self-hosted Ollama) extracts the desired date/time into
// strict JSON; a deterministic parser (today/tomorrow/weekday + clock) is the
// fallback so it works with no model. Timezone-aware (Asia/Karachi default).
// File-backed. Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[booking] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.BOOKING_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';
const TZ = () => process.env.BOOKING_TZ || 'Asia/Karachi';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'bookings');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const bookingsFile = (storeId) => path.join(DATA_DIR, `${storeId}_bookings.json`);
const configFile = (storeId) => path.join(DATA_DIR, `${storeId}_config.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[booking] write failed:', e.message); } }

const DEFAULT_CONFIG = {
  timezone: 'Asia/Karachi',
  slotMinutes: 30,
  capacityPerSlot: 1,
  // 0=Sun..6=Sat; null = closed
  weekly: { 0: null, 1: { open: '10:00', close: '18:00' }, 2: { open: '10:00', close: '18:00' }, 3: { open: '10:00', close: '18:00' }, 4: { open: '10:00', close: '18:00' }, 5: { open: '10:00', close: '18:00' }, 6: { open: '11:00', close: '16:00' } },
  holidays: []
};

function getConfig(storeId) { return readJSON(configFile(storeId), { ...DEFAULT_CONFIG, timezone: TZ() }); }
function setConfig(storeId, updates = {}) {
  const cur = getConfig(storeId);
  const merged = { ...cur, ...updates };
  if (updates.weekly) merged.weekly = { ...cur.weekly, ...updates.weekly };
  writeJSON(configFile(storeId), merged);
  return merged;
}

function readBookings(storeId) { return readJSON(bookingsFile(storeId), []); }
function writeBookings(storeId, d) { writeJSON(bookingsFile(storeId), d); }

// ── TZ helpers ────────────────────────────────────────────────
function localParts(ts, tz) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' });
  const p = fmt.formatToParts(new Date(ts)).reduce((a, x) => { a[x.type] = x.value; return a; }, {});
  const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[p.weekday];
  let hour = parseInt(p.hour, 10); if (hour === 24) hour = 0;
  return { weekday: wd, hour, minute: parseInt(p.minute, 10), isoDate: `${p.year}-${p.month}-${p.day}` };
}
function hhmm(h, m) { return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }

// ── Deterministic date/time parse (fallback) ──────────────────────────
const WD = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
function parseFallback(text, tz) {
  const t = String(text).toLowerCase();
  const now = Date.now();
  const today = localParts(now, tz);
  let dayOffset = null;
  if (/\btoday\b|\baaj\b/.test(t)) dayOffset = 0;
  else if (/\btomorrow\b|\bkal\b/.test(t)) dayOffset = 1;
  else if (/day after|parso/.test(t)) dayOffset = 2;
  else {
    for (const [name, wd] of Object.entries(WD)) {
      if (new RegExp(`\\b${name}\\b`).test(t)) { dayOffset = (wd - today.weekday + 7) % 7 || 7; break; }
    }
  }
  // time of day
  let hour = null;
  const clock = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (clock) {
    hour = parseInt(clock[1], 10);
    const ap = clock[3];
    if (ap === 'pm' && hour < 12) hour += 12;
    if (ap === 'am' && hour === 12) hour = 0;
    if (!ap && hour <= 7) hour += 12; // "at 5" likely evening for bookings
  } else if (/morning|subah/.test(t)) hour = 10;
  else if (/afternoon|dopahar/.test(t)) hour = 14;
  else if (/evening|shaam/.test(t)) hour = 17;
  else if (/night|raat/.test(t)) hour = 19;

  if (dayOffset == null && hour == null) return null;
  return { dayOffset: dayOffset == null ? 0 : dayOffset, hour: hour == null ? null : hour };
}

async function parseAI(text, tz) {
  if (!processPrompt) return null;
  const today = localParts(Date.now(), tz);
  const prompt = [
    `Today is ${today.isoDate} (timezone ${tz}). Extract the requested appointment time from the message.`,
    'Output STRICT JSON only: {"date":"YYYY-MM-DD"|null, "time":"HH:MM"(24h)|null}. Use null if not stated. Do not invent.',
    '',
    `Message: "${text}"`,
    'JSON:'
  ].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return null;
    const m = String(raw).match(/\{[\s\S]*\}/); if (!m) return null;
    const j = JSON.parse(m[0]);
    return { date: j.date || null, time: j.time || null };
  } catch { return null; }
}

// ── Slot generation + availability ────────────────────────────────
function toUTCfromLocal(isoDate, hour, minute, tz) {
  // approximate: build a Date at the local wall-clock by adjusting for the tz offset
  const guess = new Date(`${isoDate}T${hhmm(hour, minute)}:00`);
  const asLocal = localParts(guess.getTime(), tz);
  // correct drift between intended and what tz shows
  let ts = guess.getTime();
  const driftH = hour - asLocal.hour; const driftM = minute - asLocal.minute;
  ts += (driftH * 60 + driftM) * 60000;
  return ts;
}

function slotsForDate(storeId, isoDate, cfg) {
  // determine weekday of isoDate in tz
  const probe = localParts(new Date(`${isoDate}T12:00:00Z`).getTime(), cfg.timezone);
  const wd = probe.weekday;
  if (Array.isArray(cfg.holidays) && cfg.holidays.includes(isoDate)) return [];
  const day = cfg.weekly[wd];
  if (!day || !day.open || !day.close) return [];
  const [oh, om] = day.open.split(':').map(Number);
  const [ch, cm] = day.close.split(':').map(Number);
  const slots = [];
  let h = oh, m = om;
  while (h * 60 + m + cfg.slotMinutes <= ch * 60 + cm) {
    slots.push({ isoDate, time: hhmm(h, m), ts: toUTCfromLocal(isoDate, h, m, cfg.timezone) });
    m += cfg.slotMinutes; if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
  }
  return slots;
}

function isFree(storeId, slot, cfg, bookings) {
  const taken = bookings.filter(b => b.status === 'confirmed' || b.status === 'held').filter(b => b.ts === slot.ts).length;
  return taken < (cfg.capacityPerSlot || 1) && slot.ts > Date.now();
}

/**
 * Offer the nearest free slots around a desired date/time (or just the next
 * available ones if nothing specific was asked). Returns up to `count` slots.
 */
function findSlots({ storeId = 'default_store', date, time, count = 3, searchDays = 7 } = {}) {
  const cfg = getConfig(storeId);
  const bookings = readBookings(storeId);
  const startIso = date || localParts(Date.now(), cfg.timezone).isoDate;
  const startDate = new Date(`${startIso}T00:00:00Z`);
  const all = [];
  for (let d = 0; d < searchDays; d++) {
    const iso = new Date(startDate.getTime() + d * 86400000).toISOString().slice(0, 10);
    for (const s of slotsForDate(storeId, iso, cfg)) {
      if (isFree(storeId, s, cfg, bookings)) all.push(s);
    }
  }
  if (!all.length) return [];
  // if a time was requested, sort by closeness to it on the requested day
  if (time) {
    const [th, tm] = time.split(':').map(Number); const target = th * 60 + tm;
    all.sort((a, b) => {
      const am = parseInt(a.time.split(':')[0]) * 60 + parseInt(a.time.split(':')[1]);
      const bm = parseInt(b.time.split(':')[0]) * 60 + parseInt(b.time.split(':')[1]);
      const ad = (a.isoDate === (date || a.isoDate) ? 0 : 100000) + Math.abs(am - target);
      const bd = (b.isoDate === (date || b.isoDate) ? 0 : 100000) + Math.abs(bm - target);
      return ad - bd;
    });
  } else {
    all.sort((a, b) => a.ts - b.ts);
  }
  return all.slice(0, count);
}

// ── Public flow ─────────────────────────────────────────────
function fmtSlot(s, tz) {
  const p = localParts(s.ts, tz);
  const dt = new Date(s.ts).toLocaleDateString('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' });
  return `${dt} at ${s.time}`;
}

/**
 * Handle a natural-language booking request: parse -> find slots -> return an
 * offer message. Does not book yet (customer picks a slot, then confirmSlot()).
 */
async function requestBooking({ storeId = 'default_store', phone, text, count = 3 } = {}) {
  if (!text) throw new Error('text is required');
  const cfg = getConfig(storeId);
  const ai = await parseAI(text, cfg.timezone);
  let date = ai && ai.date, time = ai && ai.time;
  if (!date && !time) {
    const fb = parseFallback(text, cfg.timezone);
    if (fb) {
      const base = new Date(Date.now() + fb.dayOffset * 86400000);
      date = localParts(base.getTime(), cfg.timezone).isoDate;
      time = fb.hour != null ? hhmm(fb.hour, 0) : null;
    }
  }
  const slots = findSlots({ storeId, date, time, count });
  if (!slots.length) {
    return { phone, parsed: { date, time }, slots: [], message: 'Sorry, no free slots in the next few days. Could you suggest another time?' };
  }
  const list = slots.map((s, i) => `${i + 1}. ${fmtSlot(s, cfg.timezone)}`).join('\n');
  return {
    phone, parsed: { date, time },
    slots: slots.map(s => ({ ts: s.ts, isoDate: s.isoDate, time: s.time, label: fmtSlot(s, cfg.timezone) })),
    message: `Here are the nearest available times:\n${list}\n\nReply with the number to confirm.`
  };
}

/** Hold or confirm a slot for a contact. */
function confirmSlot({ storeId = 'default_store', phone, ts, name, service, hold = false } = {}) {
  if (!phone || !ts) throw new Error('phone and ts are required');
  const cfg = getConfig(storeId);
  const bookings = readBookings(storeId);
  const slot = { ts: Number(ts) };
  if (!isFree(storeId, slot, cfg, bookings)) return { ok: false, error: 'that slot is no longer available' };
  const id = crypto.randomUUID().slice(0, 12);
  const rec = { id, storeId, phone, ts: Number(ts), label: fmtSlot({ ts: Number(ts), time: localParts(Number(ts), cfg.timezone).hour + ':' + String(localParts(Number(ts), cfg.timezone).minute).padStart(2, '0') }, cfg.timezone), name: name || null, service: service || null, status: hold ? 'held' : 'confirmed', createdAt: Date.now() };
  bookings.push(rec); writeBookings(storeId, bookings);
  return { ok: true, booking: rec, message: `\u2705 You\'re booked for ${rec.label}. We\'ll send a reminder. Reply CANCEL to cancel.` };
}

function cancelBooking({ storeId = 'default_store', phone, id } = {}) {
  const bookings = readBookings(storeId);
  const rec = bookings.find(b => (id ? b.id === id : b.phone === phone) && (b.status === 'confirmed' || b.status === 'held'));
  if (!rec) return { ok: false, error: 'no active booking found' };
  rec.status = 'cancelled'; rec.cancelledAt = Date.now();
  writeBookings(storeId, bookings);
  return { ok: true, id: rec.id };
}

/** Bookings needing a reminder within the lookahead window (queue worker sends them). */
function dueReminders({ storeId = 'default_store', withinHours = 24 } = {}) {
  const cfg = getConfig(storeId);
  const now = Date.now();
  const horizon = now + withinHours * 3600 * 1000;
  return readBookings(storeId)
    .filter(b => b.status === 'confirmed' && !b.reminded && b.ts > now && b.ts <= horizon)
    .map(b => ({ id: b.id, phone: b.phone, ts: b.ts, label: b.label, message: `\u23f0 Reminder: your appointment is ${b.label}. Reply CANCEL if you can\'t make it.` }));
}
function markReminded({ storeId = 'default_store', id } = {}) {
  const bookings = readBookings(storeId);
  const rec = bookings.find(b => b.id === id);
  if (rec) { rec.reminded = true; writeBookings(storeId, bookings); }
  return { ok: Boolean(rec) };
}

function listBookings({ storeId = 'default_store', status, upcomingOnly = false } = {}) {
  let list = readBookings(storeId).slice().sort((a, b) => a.ts - b.ts);
  if (status) list = list.filter(b => b.status === status);
  if (upcomingOnly) list = list.filter(b => b.ts > Date.now());
  return list;
}

function health() {
  return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), timezone: TZ() };
}

module.exports = {
  requestBooking, findSlots, confirmSlot, cancelBooking, dueReminders, markReminded,
  listBookings, getConfig, setConfig, health,
  _internal: { parseFallback, slotsForDate, localParts, DEFAULT_CONFIG }
};
