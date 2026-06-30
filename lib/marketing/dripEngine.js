'use strict';
/**
 * dripEngine.js — Marketing Automation Feature #2: drip campaigns (sequences).
 *
 * A *drip* is an ordered list of steps that run per enrolled contact:
 *   - { type: 'message', text, mediaPath? }   send a WhatsApp message (text/media)
 *   - { type: 'wait', minutes|hours|days }     pause before the next step
 *
 * This is the runtime `automationWorkflows.js` never had: it didn't just *store* a workflow, it has a
 * real executor. You enroll contacts (usually a whole segment from Feature #1), then a scheduler
 * calls `tick()` on an interval. Each tick advances every enrollment whose next step is due, sending
 * messages through an injected sender so this module stays decoupled from the WhatsApp client.
 *
 * State is persisted to data/marketing_drips.json (campaigns) and data/marketing_drip_runs.json
 * (per-contact enrollments). When Postgres lands, move these two; the API stays the same.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const CAMP_FILE = path.join(DATA_DIR, 'marketing_drips.json');
const RUN_FILE = path.join(DATA_DIR, 'marketing_drip_runs.json');

function loadJSON(file, fallback) {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback; }
  catch { return fallback; }
}
function saveJSON(file, value) {
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2)); }
  catch { /* best-effort */ }
}

// ---------------------------------------------------------------------------
// Injected sender: keeps this module decoupled from whatsapp-web.js.
// server.js wires: dripEngine.setSender(async (contact, { text, mediaPath }) => { ... })
// A sensible default routes through the broadcast hub if present.
// ---------------------------------------------------------------------------
let sender = null;
function setSender(fn) { sender = typeof fn === 'function' ? fn : null; }

async function deliver(contact, message) {
  if (!sender) throw new Error('No drip sender wired (call dripEngine.setSender)');
  return sender(contact, message);
}

// ---------------------------------------------------------------------------
// Step helpers
// ---------------------------------------------------------------------------
function waitMs(step) {
  const m = Number(step.minutes || 0) + Number(step.hours || 0) * 60 + Number(step.days || 0) * 1440;
  return Math.max(0, m) * 60 * 1000;
}

function validateSteps(steps) {
  if (!Array.isArray(steps) || !steps.length) throw new Error('a drip needs at least one step');
  for (const s of steps) {
    if (s.type === 'message') {
      if (!s.text && !s.mediaPath) throw new Error('message step needs text or mediaPath');
    } else if (s.type === 'wait') {
      if (!(s.minutes || s.hours || s.days)) throw new Error('wait step needs minutes/hours/days');
    } else {
      throw new Error(`invalid step type "${s.type}" (use 'message' or 'wait')`);
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Campaign CRUD
// ---------------------------------------------------------------------------
function createDrip(storeId, name, steps, opts = {}) {
  if (!name) throw new Error('drip name is required');
  validateSteps(steps);
  const data = loadJSON(CAMP_FILE, { drips: [] });
  const drip = {
    id: `DRIP-${Date.now()}`,
    storeId: storeId || null,
    name,
    steps,
    segmentId: opts.segmentId || null,
    status: opts.status === 'active' ? 'active' : 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.drips.push(drip);
  saveJSON(CAMP_FILE, data);
  return drip;
}

function listDrips(storeId) {
  const data = loadJSON(CAMP_FILE, { drips: [] });
  return storeId ? data.drips.filter(d => d.storeId === storeId) : data.drips;
}
function getDrip(id) {
  return loadJSON(CAMP_FILE, { drips: [] }).drips.find(d => d.id === id) || null;
}
function setDripStatus(id, status) {
  const data = loadJSON(CAMP_FILE, { drips: [] });
  const drip = data.drips.find(d => d.id === id);
  if (!drip) return null;
  drip.status = (status === 'active') ? 'active' : (status === 'paused' ? 'paused' : 'draft');
  drip.updatedAt = new Date().toISOString();
  saveJSON(CAMP_FILE, data);
  return drip;
}

// ---------------------------------------------------------------------------
// Enrollment
// ---------------------------------------------------------------------------
// A run = one contact moving through one drip.
function _loadRuns() { return loadJSON(RUN_FILE, { runs: [] }); }
function _saveRuns(d) { saveJSON(RUN_FILE, d); }

function enroll(dripId, contacts) {
  const drip = getDrip(dripId);
  if (!drip) throw new Error('drip not found');
  const list = Array.isArray(contacts) ? contacts : [contacts];
  const data = _loadRuns();
  const now = Date.now();
  let added = 0;
  for (const contact of list) {
    const phone = contact && (contact.phone || contact.id);
    if (!phone) continue;
    // Don't double-enroll an active contact in the same drip.
    const existing = data.runs.find(r => r.dripId === dripId && r.phone === phone && r.status === 'active');
    if (existing) continue;
    data.runs.push({
      id: `RUN-${now}-${Math.random().toString(16).slice(2, 8)}`,
      dripId,
      phone,
      contact,
      stepIndex: 0,
      status: 'active',          // active | completed | stopped
      nextRunAt: now,            // first step is due immediately
      enrolledAt: new Date().toISOString(),
      history: []
    });
    added++;
  }
  _saveRuns(data);
  return { enrolled: added, total: list.length };
}

/** Stop a contact's enrollment (e.g. on unsubscribe or conversion). */
function stopContact(dripId, phone) {
  const data = _loadRuns();
  let stopped = 0;
  for (const r of data.runs) {
    if (r.dripId === dripId && r.phone === phone && r.status === 'active') { r.status = 'stopped'; stopped++; }
  }
  _saveRuns(data);
  return { stopped };
}

// ---------------------------------------------------------------------------
// The executor — call on an interval (e.g. every minute from node-cron in server.js)
// ---------------------------------------------------------------------------
/**
 * Advance every active enrollment whose next step is due. Message steps send immediately; wait steps
 * schedule the following step. Safe to call repeatedly (idempotent per due-time). Never throws on a
 * single send failure — it records the error on the run and moves that contact forward.
 */
async function tick(now = Date.now()) {
  const data = _loadRuns();
  let processed = 0, sent = 0, failed = 0, completed = 0;

  for (const run of data.runs) {
    if (run.status !== 'active') continue;
    if ((run.nextRunAt || 0) > now) continue; // not due yet

    const drip = getDrip(run.dripId);
    if (!drip || drip.status !== 'active') continue; // paused/draft drips don't run

    // Advance through consecutive steps until we hit a wait (which schedules the future) or the end.
    let guard = 0;
    while (run.status === 'active' && run.stepIndex < drip.steps.length && guard++ < 50) {
      const step = drip.steps[run.stepIndex];
      if (step.type === 'wait') {
        run.nextRunAt = now + waitMs(step);
        run.stepIndex++;
        run.history.push({ at: new Date(now).toISOString(), step: 'wait', ms: waitMs(step) });
        break; // come back later
      }
      // message step
      try {
        await deliver(run.contact, { text: step.text, mediaPath: step.mediaPath });
        sent++;
        run.history.push({ at: new Date(now).toISOString(), step: 'message', ok: true });
      } catch (err) {
        failed++;
        run.history.push({ at: new Date(now).toISOString(), step: 'message', ok: false, error: err.message });
      }
      run.stepIndex++;
      processed++;
    }

    if (run.stepIndex >= drip.steps.length) {
      run.status = 'completed';
      run.completedAt = new Date(now).toISOString();
      completed++;
    }
  }

  _saveRuns(data);
  return { processed, sent, failed, completed };
}

function getRuns(dripId) {
  const data = _loadRuns();
  return dripId ? data.runs.filter(r => r.dripId === dripId) : data.runs;
}

function getStats(dripId) {
  const runs = getRuns(dripId);
  return {
    total: runs.length,
    active: runs.filter(r => r.status === 'active').length,
    completed: runs.filter(r => r.status === 'completed').length,
    stopped: runs.filter(r => r.status === 'stopped').length
  };
}

module.exports = {
  setSender,
  createDrip,
  listDrips,
  getDrip,
  setDripStatus,
  enroll,
  stopContact,
  tick,
  getRuns,
  getStats
};
