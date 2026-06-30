'use strict';
/**
 * dripEngine.js — Marketing Automation Feature #2: drip campaigns (sequences).
 *
 * A *drip* is an ordered list of steps that run per enrolled contact:
 *   - { type: 'message', text, mediaPath? }  -> send a WhatsApp message
 *   - { type: 'wait', minutes | hours | days } -> pause before the next step
 *
 * You enroll contacts (usually a whole segment from Feature #1). A periodic `tick()` walks every
 * active enrollment, runs any step that is due, schedules the next, and marks the enrollment complete
 * at the end. This is the executor `automationWorkflows.js` never had — that file only *saved*
 * workflows and never ran them.
 *
 * Design:
 *   - Sending is injected (`setSender`) so this module doesn't hard-depend on the WA client. The
 *     sender signature is `async (contact, { text, mediaPath }) => void`.
 *   - State is durable JSON (data/marketing_drips.json), matching the rest of the app. tick() is
 *     idempotent per due step (a step won't double-send) and safe to call on an interval/cron.
 *   - One failing contact never blocks the others; failures are recorded on the enrollment.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'marketing_drips.json');

function load() {
  try {
    return fs.existsSync(DATA_FILE)
      ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
      : { campaigns: [], enrollments: [] };
  } catch {
    return { campaigns: [], enrollments: [] };
  }
}
function save(d) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
  } catch { /* best-effort */ }
}

// Injected sender: async (contact, { text, mediaPath }) => void
let sender = null;
function setSender(fn) { sender = typeof fn === 'function' ? fn : null; }

const now = () => Date.now();
const iso = (ms) => new Date(ms).toISOString();

function waitMs(step) {
  const m = Number(step.minutes || 0) * 60000;
  const h = Number(step.hours || 0) * 3600000;
  const d = Number(step.days || 0) * 86400000;
  const total = m + h + d;
  return total > 0 ? total : 0;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
function validateSteps(steps) {
  if (!Array.isArray(steps) || !steps.length) throw new Error('a drip needs at least one step');
  for (const s of steps) {
    if (s.type === 'message') {
      if (!s.text && !s.mediaPath) throw new Error('message step needs text or mediaPath');
    } else if (s.type === 'wait') {
      if (waitMs(s) <= 0) throw new Error('wait step needs minutes/hours/days > 0');
    } else {
      throw new Error(`unknown step type "${s.type}" (use 'message' or 'wait')`);
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Campaign CRUD
// ---------------------------------------------------------------------------
function createCampaign(storeId, name, steps, opts = {}) {
  if (!name) throw new Error('campaign name is required');
  validateSteps(steps);
  const data = load();
  const camp = {
    id: `DRIP-${Date.now()}`,
    storeId: storeId || null,
    name,
    steps,
    segmentId: opts.segmentId || null,
    status: 'active', // active | paused
    createdAt: iso(now()),
    updatedAt: iso(now())
  };
  data.campaigns.push(camp);
  save(data);
  return camp;
}

function listCampaigns(storeId) {
  const data = load();
  return storeId ? data.campaigns.filter(c => c.storeId === storeId) : data.campaigns;
}
function getCampaign(id) { return load().campaigns.find(c => c.id === id) || null; }
function setCampaignStatus(id, status) {
  const data = load();
  const c = data.campaigns.find(x => x.id === id);
  if (!c) return null;
  c.status = status === 'paused' ? 'paused' : 'active';
  c.updatedAt = iso(now());
  save(data);
  return c;
}

// ---------------------------------------------------------------------------
// Enrollment
// ---------------------------------------------------------------------------
// A contact must have a stable key. We use contact.phone (or contact.id) as the identity.
function contactKey(contact) {
  return String(contact.phone || contact.id || '').trim();
}

function firstStepRunAt(steps) {
  // If the sequence starts with a wait, the first message is delayed accordingly.
  let delay = 0;
  for (const s of steps) {
    if (s.type === 'wait') delay += waitMs(s);
    else break;
  }
  return now() + delay;
}

/** Enroll one contact into a campaign (no double-enroll while active). */
function enrollContact(campaignId, contact) {
  const data = load();
  const camp = data.campaigns.find(c => c.id === campaignId);
  if (!camp) return { ok: false, error: 'campaign not found' };
  const key = contactKey(contact);
  if (!key) return { ok: false, error: 'contact needs a phone or id' };

  const dup = data.enrollments.find(e => e.campaignId === campaignId && e.key === key && e.status === 'active');
  if (dup) return { ok: false, error: 'already enrolled', enrollment: dup };

  const enrollment = {
    id: `ENR-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    campaignId,
    key,
    contact,
    stepIndex: 0,
    status: 'active', // active | completed | failed | cancelled
    nextRunAt: firstStepRunAt(camp.steps),
    history: [],
    createdAt: iso(now()),
    updatedAt: iso(now())
  };
  data.enrollments.push(enrollment);
  save(data);
  return { ok: true, enrollment };
}

/** Enroll many contacts (e.g. a resolved segment). Returns counts. */
function enrollMany(campaignId, contacts = []) {
  let enrolled = 0, skipped = 0;
  for (const c of contacts) {
    const r = enrollContact(campaignId, c);
    if (r.ok) enrolled++; else skipped++;
  }
  return { enrolled, skipped, total: contacts.length };
}

function cancelEnrollment(enrollmentId) {
  const data = load();
  const e = data.enrollments.find(x => x.id === enrollmentId);
  if (!e) return null;
  e.status = 'cancelled';
  e.updatedAt = iso(now());
  save(data);
  return e;
}

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------
// Advance a single enrollment as far as it can go right now (run due message steps, collapse waits).
async function runEnrollment(camp, e) {
  // Walk steps starting at stepIndex until we hit a wait that's in the future or the end.
  while (e.stepIndex < camp.steps.length) {
    const step = camp.steps[e.stepIndex];

    if (step.type === 'wait') {
      // Schedule the wait once: set nextRunAt and stop until it's due.
      const due = (e._waitSetForIndex === e.stepIndex) ? e.nextRunAt : now() + waitMs(step);
      e._waitSetForIndex = e.stepIndex;
      if (now() < due) { e.nextRunAt = due; return; }
      // wait satisfied
      e.stepIndex++;
      delete e._waitSetForIndex;
      continue;
    }

    // message step — send now
    try {
      if (!sender) throw new Error('no sender wired (call setSender)');
      await sender(e.contact, { text: step.text || '', mediaPath: step.mediaPath || null });
      e.history.push({ stepIndex: e.stepIndex, type: 'message', status: 'sent', at: iso(now()) });
    } catch (err) {
      e.history.push({ stepIndex: e.stepIndex, type: 'message', status: 'failed', error: err.message, at: iso(now()) });
      e.status = 'failed';
      e.updatedAt = iso(now());
      return;
    }
    e.stepIndex++;
  }
  // reached the end
  e.status = 'completed';
  e.nextRunAt = null;
  e.updatedAt = iso(now());
}

/**
 * Process all due enrollments. Call this on an interval (e.g. every minute via node-cron).
 * Returns a summary of what happened this tick.
 */
async function tick() {
  const data = load();
  const tNow = now();
  let processed = 0, sent = 0, completed = 0, failed = 0;

  for (const e of data.enrollments) {
    if (e.status !== 'active') continue;
    if (e.nextRunAt && tNow < e.nextRunAt) continue; // not due yet

    const camp = data.campaigns.find(c => c.id === e.campaignId);
    if (!camp || camp.status !== 'active') continue;

    const before = e.history.length;
    await runEnrollment(camp, e);
    processed++;
    sent += e.history.slice(before).filter(h => h.status === 'sent').length;
    if (e.status === 'completed') completed++;
    if (e.status === 'failed') failed++;
  }

  save(data);
  return { processed, sent, completed, failed, at: iso(tNow) };
}

function listEnrollments(campaignId) {
  const data = load();
  return data.enrollments.filter(e => e.campaignId === campaignId);
}

function getStats(campaignId) {
  const rows = listEnrollments(campaignId);
  const by = (s) => rows.filter(e => e.status === s).length;
  return {
    total: rows.length,
    active: by('active'),
    completed: by('completed'),
    failed: by('failed'),
    cancelled: by('cancelled')
  };
}

module.exports = {
  setSender,
  // campaigns
  createCampaign,
  listCampaigns,
  getCampaign,
  setCampaignStatus,
  // enrollment
  enrollContact,
  enrollMany,
  cancelEnrollment,
  listEnrollments,
  // executor
  tick,
  getStats
};
