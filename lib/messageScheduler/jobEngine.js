// lib/messageScheduler/jobEngine.js — Schedule one-off or recurring (cron) message jobs and run
// the due ones. Timezone-aware; quiet-hours deferral; retry/backoff on send failure; pause/resume/
// cancel. Recurring jobs reschedule their nextRunAt after each fire. One-off jobs complete.
//
// A recipient is either a single { contact } or a saved { segmentId } resolved via lib/contacts
// (consent-safe) when present. Sends are DRAFT-ONLY unless live sends + a notifier are enabled.

const store = require('./store');
const { config } = require('./config');
const cron = require('./cron');
const tz = require('./timezone');
const notify = require('./notify');
const { maskContact } = require('./privacy');

const MIN = 60 * 1000;
let contactsLib = null; try { contactsLib = require('../contacts'); } catch (_e) { contactsLib = null; }

function publicView(j) {
 if (!j) return null;
 return {
 id: j.id, name: j.name, type: j.type, status: j.status,
 contactMasked: j.contact ? maskContact(j.contact) : null, segmentId: j.segmentId || null,
 timezone: j.timezone, cron: j.cron || null, runAt: j.runAt || null,
 nextRunAt: j.nextRunAt, lastRunAt: j.lastRunAt || null, runCount: j.runCount || 0,
 retries: j.retries || 0, createdAt: j.createdAt, updatedAt: j.updatedAt,
 };
}

function _computeFirstRun(input, fromMs) {
 const timezone = input.timezone || config.defaultTimezone;
 if (input.type === 'recurring') {
 if (!cron.isValid(input.cron)) throw new Error('invalid cron expression');
 return cron.nextRun(input.cron, fromMs, timezone);
 }
 // one-off: explicit runAt (ISO) or now.
 const at = input.runAt ? Date.parse(input.runAt) : fromMs;
 if (Number.isNaN(at)) throw new Error('invalid runAt');
 return new Date(at).toISOString();
}

function schedule(input = {}) {
 if (!input.message) throw new Error('message is required');
 if (!input.contact && !input.segmentId) throw new Error('contact or segmentId is required');
 const type = input.type === 'recurring' ? 'recurring' : 'one_off';
 const timezone = input.timezone || config.defaultTimezone;
 const now = Date.now();
 const job = {
 id: store.genId('job'), name: input.name || 'Scheduled message', type,
 contact: input.contact ? String(input.contact) : null, segmentId: input.segmentId || null,
 message: String(input.message), timezone,
 cron: type === 'recurring' ? String(input.cron) : null,
 runAt: type === 'one_off' ? (input.runAt || new Date(now).toISOString()) : null,
 nextRunAt: _computeFirstRun({ ...input, type, timezone }, now),
 status: 'scheduled', runCount: 0, retries: 0,
 createdAt: store.nowIso(), updatedAt: store.nowIso(),
 };
 const d = store.load(); d.jobs.push(job); store.save(d);
 return publicView(job);
}

function _setStatus(id, status) {
 const d = store.load(); const j = d.jobs.find((x) => x.id === id);
 if (!j) throw new Error('job not found');
 j.status = status; j.updatedAt = store.nowIso(); store.save(d); return publicView(j);
}
function pause(id) { return _setStatus(id, 'paused'); }
function resume(id) {
 const d = store.load(); const j = d.jobs.find((x) => x.id === id);
 if (!j) throw new Error('job not found');
 j.status = 'scheduled';
 if (j.type === 'recurring') j.nextRunAt = cron.nextRun(j.cron, Date.now(), j.timezone);
 j.updatedAt = store.nowIso(); store.save(d); return publicView(j);
}
function cancel(id) { return _setStatus(id, 'cancelled'); }

function _inQuietHours(date, timeZone) {
 const h = tz.localHour(date, timeZone);
 const { quietStartHour: s, quietEndHour: e } = config;
 if (s === e) return false;
 return s < e ? (h >= s && h < e) : (h >= s || h < e);
}
function _recipients(job) {
 if (job.contact) return [{ contact: job.contact }];
 if (job.segmentId && contactsLib) {
 try { return contactsLib.segmentEngine.resolveRecipients(job.segmentId).map((r) => ({ contact: r.phone || r.email })); }
 catch (_e) { return []; }
 }
 return [];
}

// Run all due jobs (nextRunAt <= now, status scheduled). Returns what was processed.
async function tick(refNow = Date.now()) {
 const d = store.load();
 const processed = [];
 for (const j of d.jobs) {
 if (j.status !== 'scheduled') continue;
 if (!j.nextRunAt || Date.parse(j.nextRunAt) > refNow) continue;

 // Quiet hours: defer one hour at a time until out of the window.
 if (_inQuietHours(new Date(refNow), j.timezone)) {
 j.nextRunAt = new Date(refNow + 60 * MIN).toISOString(); j.updatedAt = store.nowIso();
 continue;
 }

 const recipients = _recipients(j);
 let anyFail = false; let sent = 0; let drafted = 0;
 for (const r of recipients) {
 const res = await notify.dispatch(r.contact, j.message, { kind: 'scheduled', jobId: j.id });
 if (res.sent) sent += 1; else if (res.draft) drafted += 1; else anyFail = true;
 }
 d.runs.push({ id: store.genId('run'), jobId: j.id, at: store.nowIso(), recipients: recipients.length, sent, drafted, failed: anyFail });

 // Retry/backoff if a live send failed (not applicable to draft mode).
 if (anyFail && (j.retries || 0) < config.maxRetries) {
 j.retries = (j.retries || 0) + 1;
 j.nextRunAt = new Date(refNow + config.retryBackoffMinutes * MIN).toISOString();
 j.updatedAt = store.nowIso();
 processed.push({ jobId: j.id, outcome: 'retry_scheduled', retries: j.retries });
 continue;
 }

 j.retries = 0;
 j.lastRunAt = store.nowIso();
 j.runCount = (j.runCount || 0) + 1;
 if (j.type === 'recurring') {
 j.nextRunAt = cron.nextRun(j.cron, refNow, j.timezone);
 } else {
 j.status = 'completed'; j.nextRunAt = null;
 }
 j.updatedAt = store.nowIso();
 processed.push({ jobId: j.id, outcome: j.type === 'recurring' ? 'fired_recurring' : 'fired_one_off', recipients: recipients.length, sent, drafted });
 }
 store.save(d);
 return { processed: processed.length, results: processed };
}

function list({ status, type, limit = 100 } = {}) {
 let items = store.load().jobs;
 if (status) items = items.filter((j) => j.status === status);
 if (type) items = items.filter((j) => j.type === type);
 return items.sort((a, b) => (Date.parse(a.nextRunAt || 0) - Date.parse(b.nextRunAt || 0))).slice(0, limit).map(publicView);
}
function get(id) { return publicView(store.load().jobs.find((j) => j.id === id)); }
function runsFor(id, limit = 50) { return store.load().runs.filter((r) => r.jobId === id).slice(-limit).reverse(); }

function overview() {
 const d = store.load();
 const by = (s) => d.jobs.filter((j) => j.status === s).length;
 return {
 generatedAt: store.nowIso(),
 liveSends: config.effective.liveSends,
 contactsLibAvailable: !!contactsLib,
 cards: {
 total: d.jobs.length, scheduled: by('scheduled'), paused: by('paused'),
 completed: by('completed'), cancelled: by('cancelled'),
 recurring: d.jobs.filter((j) => j.type === 'recurring').length,
 runs: d.runs.length,
 },
 };
}

module.exports = { schedule, pause, resume, cancel, tick, list, get, runsFor, overview, publicView };
