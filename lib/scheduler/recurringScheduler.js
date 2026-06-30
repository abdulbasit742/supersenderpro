// lib/scheduler/recurringScheduler.js
// ────────────────────────────────────────────────────────────────────
// Recurring Campaign Scheduler. The drip sequencer (#62) runs per-contact
// journeys; the send-time optimizer (#21) picks the best hour. This is the other
// axis: TIME-BASED repeating broadcasts — \"every Friday 6pm\", \"1st of the
// month\", \"daily at 10am\" — to a segment. It computes the next run
// deterministically (timezone-aware), lists due schedules for the queue worker,
// and advances after each run. Pause/resume + run cap supported.
//
// Targeting can use the NL segment builder (#42); the recipient list is gated
// through consent (#80) at dispatch. If a schedule is set to auto-generate fresh
// copy each run, the AI Brain Bridge (Ollama) writes it; otherwise a fixed
// template is used. File-backed. Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[scheduler] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.SCHEDULER_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';
const TZ = () => process.env.SCHEDULER_TZ || 'Asia/Karachi';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'scheduler');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const schedFile = (storeId) => path.join(DATA_DIR, `${storeId}_schedules.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[scheduler] write failed:', e.message); } }
function readSched(storeId) { return readJSON(schedFile(storeId), {}); }
function writeSched(storeId, d) { writeJSON(schedFile(storeId), d); }

const WD = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

// local parts of a timestamp in a tz
function localParts(ts, tz) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' });
  const p = f.formatToParts(new Date(ts)).reduce((a, x) => { a[x.type] = x.value; return a; }, {});
  let hour = parseInt(p.hour, 10); if (hour === 24) hour = 0;
  return { weekday: { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[p.weekday], hour, minute: parseInt(p.minute, 10), day: parseInt(p.day, 10), month: parseInt(p.month, 10), year: parseInt(p.year, 10) };
}
// build a UTC ts for a given local Y-M-D HH:MM in tz (approx, corrects drift)
function tsForLocal(y, m, d, hh, mm, tz) {
  let guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  for (let i = 0; i < 3; i++) { const lp = localParts(guess, tz); const driftMin = (hh - lp.hour) * 60 + (mm - lp.minute); if (driftMin === 0) break; guess += driftMin * 60000; }
  return guess;
}

/**
 * Compute the next run timestamp (ms) at or after `from` for a schedule.
 * freq: once | daily | weekly | monthly. time: \"HH:MM\". days:[0-6] for weekly.
 * dayOfMonth:1-31 for monthly. onceAtISO for once.
 */
function nextRun(schedule, from = Date.now()) {
  const tz = schedule.timezone || TZ();
  const [hh, mm] = (schedule.time || '10:00').split(':').map(Number);
  if (schedule.freq === 'once') { const t = schedule.onceAtISO ? new Date(schedule.onceAtISO).getTime() : from; return t > from ? t : null; }

  // candidate today, then walk forward up to ~370 days
  const startLp = localParts(from, tz);
  for (let add = 0; add <= 370; add++) {
    const probe = new Date(from + add * 86400000);
    const lp = localParts(probe.getTime(), tz);
    const candidate = tsForLocal(lp.year, lp.month, lp.day, hh, mm, tz);
    if (candidate <= from) continue;
    if (schedule.freq === 'daily') return candidate;
    if (schedule.freq === 'weekly') { const days = (schedule.days && schedule.days.length) ? schedule.days : [startLp.weekday]; if (days.includes(lp.weekday)) return candidate; }
    if (schedule.freq === 'monthly') { const dom = schedule.dayOfMonth || 1; if (lp.day === dom) return candidate; }
  }
  return null;
}

// ── CRUD ────────────────────────────────────────────────────
function normalizeDays(days) {
  if (!days) return null;
  return days.map(d => typeof d === 'number' ? d : WD[String(d).toLowerCase()]).filter(d => d != null && d >= 0 && d <= 6);
}

function create({ storeId = 'default_store', id, name, freq = 'weekly', time = '10:00', days, dayOfMonth, onceAtISO, timezone, message, segment, autoGenerateGoal, maxRuns } = {}) {
  if (!id) throw new Error('id is required');
  if (!['once', 'daily', 'weekly', 'monthly'].includes(freq)) throw new Error('invalid freq');
  if (!message && !autoGenerateGoal) throw new Error('message or autoGenerateGoal is required');
  const sched = readSched(storeId);
  const rec = {
    id, name: name || id, freq, time, days: normalizeDays(days), dayOfMonth: dayOfMonth || null, onceAtISO: onceAtISO || null,
    timezone: timezone || TZ(), message: message || null, segment: segment || null, autoGenerateGoal: autoGenerateGoal || null,
    maxRuns: maxRuns || null, runCount: 0, status: 'active', createdAt: Date.now()
  };
  rec.nextRunISO = (() => { const t = nextRun(rec); return t ? new Date(t).toISOString() : null; })();
  sched[id] = rec; writeSched(storeId, sched);
  return rec;
}

function listSchedules({ storeId = 'default_store', status } = {}) {
  let list = Object.values(readSched(storeId)).sort((a, b) => (a.nextRunISO ? new Date(a.nextRunISO) : Infinity) - (b.nextRunISO ? new Date(b.nextRunISO) : Infinity));
  if (status) list = list.filter(s => s.status === status);
  return list;
}
function getSchedule({ storeId = 'default_store', id } = {}) { return readSched(storeId)[id] || null; }
function deleteSchedule({ storeId = 'default_store', id } = {}) { const s = readSched(storeId); const had = Boolean(s[id]); delete s[id]; writeSched(storeId, s); return { deleted: had }; }
function pause({ storeId = 'default_store', id } = {}) { const s = readSched(storeId); if (!s[id]) return { ok: false }; s[id].status = 'paused'; writeSched(storeId, s); return { ok: true, status: 'paused' }; }
function resume({ storeId = 'default_store', id } = {}) { const s = readSched(storeId); if (!s[id]) return { ok: false }; s[id].status = 'active'; const t = nextRun(s[id]); s[id].nextRunISO = t ? new Date(t).toISOString() : null; writeSched(storeId, s); return { ok: true, status: 'active', nextRunISO: s[id].nextRunISO }; }

// ── Due + advance ───────────────────────────────────────────
function due({ storeId = 'default_store', now = Date.now() } = {}) {
  const sched = readSched(storeId);
  const out = [];
  for (const id of Object.keys(sched)) {
    const s = sched[id];
    if (s.status !== 'active' || !s.nextRunISO) continue;
    if (new Date(s.nextRunISO).getTime() <= now) out.push({ id: s.id, name: s.name, segment: s.segment, message: s.message, autoGenerateGoal: s.autoGenerateGoal, dueISO: s.nextRunISO });
  }
  return out;
}

/** Optionally auto-generate fresh copy for a run (if the schedule asked for it). */
async function resolveMessage(schedule) {
  if (schedule.message) return { message: schedule.message, source: 'fixed' };
  if (!schedule.autoGenerateGoal) return { message: '', source: 'none' };
  if (!processPrompt) return { message: `Hi {{name}}! ${schedule.autoGenerateGoal}.`, source: 'fallback' };
  try {
    const raw = await processPrompt(['Write ONE short WhatsApp broadcast message for this recurring campaign goal: \"' + schedule.autoGenerateGoal + '\". Include {{name}}, keep it non-spammy, add \"Reply STOP to opt out\". Return ONLY the message.'].join('\n'), { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return { message: `Hi {{name}}! ${schedule.autoGenerateGoal}.`, source: 'fallback' };
    return { message: String(raw).trim().replace(/^"|"$/g, ''), source: 'ollama' };
  } catch { return { message: `Hi {{name}}! ${schedule.autoGenerateGoal}.`, source: 'fallback' }; }
}

/**
 * Mark a schedule as run: increments runCount, computes the next run (or
 * completes a `once`/maxRuns-reached schedule). Returns the resolved message to
 * dispatch + the new nextRunISO.
 */
async function markRan({ storeId = 'default_store', id, now = Date.now() } = {}) {
  const sched = readSched(storeId); const s = sched[id];
  if (!s) return { ok: false, error: 'unknown schedule' };
  const resolved = await resolveMessage(s);
  s.runCount = (s.runCount || 0) + 1; s.lastRunISO = new Date(now).toISOString();
  if (s.freq === 'once' || (s.maxRuns && s.runCount >= s.maxRuns)) { s.status = 'completed'; s.nextRunISO = null; }
  else { const t = nextRun(s, now + 60000); s.nextRunISO = t ? new Date(t).toISOString() : null; }
  sched[id] = s; writeSched(storeId, sched);
  return { ok: true, id, message: resolved.message, source: resolved.source, runCount: s.runCount, status: s.status, nextRunISO: s.nextRunISO };
}

/** Preview the next few run times for a schedule (does not persist). */
function preview({ storeId = 'default_store', id, count = 5 } = {}) {
  const s = getSchedule({ storeId, id }); if (!s) return { ok: false, error: 'unknown schedule' };
  const runs = []; let cursor = Date.now();
  for (let i = 0; i < count; i++) { const t = nextRun(s, cursor); if (!t) break; runs.push(new Date(t).toISOString()); cursor = t + 60000; if (s.freq === 'once') break; }
  return { ok: true, id, runs };
}

function health() { return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), timezone: TZ() }; }

module.exports = { create, listSchedules, getSchedule, deleteSchedule, pause, resume, due, markRan, preview, health, _internal: { nextRun, localParts, normalizeDays } };
