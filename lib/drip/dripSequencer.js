// lib/drip/dripSequencer.js
// ────────────────────────────────────────────────────────────────────
// AI Drip & Nurture Sequencer. One-off broadcasts are blunt; the money is in
// automated JOURNEYS — a welcome series after signup, a nurture after first
// order, a re-engage track, etc. This defines multi-step sequences (each step =
// a delay + a message), enrolls contacts on an event, and advances them step by
// step, honoring per-step delays, the send-time optimizer (#21), opt-out, and
// de-duplication (a contact is never in the same sequence twice).
//
// The AI Brain Bridge (self-hosted Ollama) can auto-write step copy from a plain
// goal; deterministic templates are the fallback. Sending is delegated to your
// queue (this PLANS due steps). File-backed. Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[drip] aiBrain unavailable:', e.message); processPrompt = null; }

let sendTime = null;
try { sendTime = require('../sendTime/sendTimeOptimizer'); } catch { /* optional */ }

const MODEL = () => process.env.DRIP_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'drip');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const seqFile = (storeId) => path.join(DATA_DIR, `${storeId}_sequences.json`);
const enrollFile = (storeId) => path.join(DATA_DIR, `${storeId}_enrollments.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[drip] write failed:', e.message); } }

function readSeqs(storeId) { return readJSON(seqFile(storeId), {}); }
function writeSeqs(storeId, d) { writeJSON(seqFile(storeId), d); }
function readEnroll(storeId) { return readJSON(enrollFile(storeId), {}); }
function writeEnroll(storeId, d) { writeJSON(enrollFile(storeId), d); }

// ── Define a sequence ────────────────────────────────────────────
// step: { delayHours, text }  (text may include {{name}})
function defineSequence({ storeId = 'default_store', id, name, trigger = 'manual', steps = [] } = {}) {
  if (!id) throw new Error('id is required');
  if (!Array.isArray(steps) || !steps.length) throw new Error('steps (non-empty) required');
  const clean = steps.map((s, i) => ({ step: i, delayHours: Number(s.delayHours) || 0, text: String(s.text || '').trim() })).filter(s => s.text);
  if (!clean.length) throw new Error('steps need text');
  const seqs = readSeqs(storeId);
  seqs[id] = { id, name: name || id, trigger, steps: clean, updatedAt: Date.now() };
  writeSeqs(storeId, seqs);
  return seqs[id];
}

function listSequences({ storeId = 'default_store' } = {}) { return Object.values(readSeqs(storeId)); }
function getSequence({ storeId = 'default_store', id } = {}) { return readSeqs(storeId)[id] || null; }
function deleteSequence({ storeId = 'default_store', id } = {}) { const s = readSeqs(storeId); const had = Boolean(s[id]); delete s[id]; writeSeqs(storeId, s); return { deleted: had }; }

// ── AI step authoring ──────────────────────────────────────────
function templateSteps(goal, stepCount, cadenceHours) {
  const g = goal || 'stay in touch';
  const base = [
    `Hi {{name}}! \ud83d\udc4b Thanks for connecting with us. ${g}.`,
    `{{name}}, just checking in \u2014 here\'s something you might like as part of ${g}. Reply anytime!`,
    `Last note from us, {{name}}: we\'re here whenever you need. ${g}. Reply STOP to opt out.`
  ];
  const n = stepCount || 3;
  return Array.from({ length: n }, (_, i) => ({ delayHours: cadenceHours ? cadenceHours[i] || (i * 24) : i * 24, text: base[Math.min(i, base.length - 1)] }));
}

/**
 * Auto-write a sequence from a plain goal via the AI Brain Bridge.
 * @returns {Promise<{ steps, source }>}
 */
async function authorSteps({ goal, stepCount = 3, cadenceHours } = {}) {
  if (!goal) throw new Error('goal is required');
  if (!processPrompt) return { steps: templateSteps(goal, stepCount, cadenceHours), source: 'fallback' };
  const prompt = [
    `Write a ${stepCount}-message WhatsApp nurture sequence for this goal: "${goal}".`,
    'Each message: 1-2 short lines, warm, includes {{name}}, not spammy. The final message should include "Reply STOP to opt out".',
    'Return each message on its own line, prefixed with its number (1., 2., ...). Nothing else.'
  ].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return { steps: templateSteps(goal, stepCount, cadenceHours), source: 'fallback' };
    const lines = String(raw).split('\n').map(l => l.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean).slice(0, stepCount);
    if (!lines.length) return { steps: templateSteps(goal, stepCount, cadenceHours), source: 'fallback' };
    const steps = lines.map((text, i) => ({ delayHours: cadenceHours ? (cadenceHours[i] || i * 24) : i * 24, text }));
    return { steps, source: 'ollama' };
  } catch { return { steps: templateSteps(goal, stepCount, cadenceHours), source: 'fallback' }; }
}

// ── Enroll ──────────────────────────────────────────────────
function enrollKey(phone, sequenceId) { return `${phone}::${sequenceId}`; }

function whenForStep(storeId, phone, delayHours, from = Date.now()) {
  const base = from + delayHours * 3600 * 1000;
  if (sendTime && typeof sendTime.nextSlot === 'function') {
    try { return sendTime.nextSlot({ storeId, phone, from: base }).whenISO; } catch { /* fall through */ }
  }
  return new Date(base).toISOString();
}

/**
 * Enroll a contact into a sequence (idempotent: won\'t double-enroll an active one).
 * Schedules the first step\'s due time.
 */
function enroll({ storeId = 'default_store', phone, sequenceId } = {}) {
  if (!phone || !sequenceId) throw new Error('phone and sequenceId are required');
  const seq = getSequence({ storeId, id: sequenceId });
  if (!seq) return { ok: false, error: 'unknown sequence' };
  const enroll = readEnroll(storeId);
  const key = enrollKey(phone, sequenceId);
  if (enroll[key] && enroll[key].status === 'active') return { ok: false, error: 'already enrolled' };
  const rec = { id: crypto.randomUUID().slice(0, 12), phone, sequenceId, step: 0, status: 'active', enrolledAt: Date.now(), nextDueISO: whenForStep(storeId, phone, seq.steps[0].delayHours) };
  enroll[key] = rec; writeEnroll(storeId, enroll);
  return { ok: true, enrollment: rec };
}

/** Enroll everyone matching a trigger event (caller supplies the phone list). */
function enrollMany({ storeId = 'default_store', sequenceId, phones = [] } = {}) {
  const out = { enrolled: 0, skipped: 0 };
  for (const phone of phones) { const r = enroll({ storeId, phone, sequenceId }); if (r.ok) out.enrolled++; else out.skipped++; }
  return out;
}

/** Fire-by-trigger: enroll a contact into every sequence whose trigger matches. */
function onEvent({ storeId = 'default_store', phone, event } = {}) {
  if (!phone || !event) throw new Error('phone and event are required');
  const seqs = listSequences({ storeId }).filter(s => s.trigger === event);
  const enrolled = [];
  for (const s of seqs) { const r = enroll({ storeId, phone, sequenceId: s.id }); if (r.ok) enrolled.push(s.id); }
  return { event, enrolled };
}

// ── Advance ───────────────────────────────────────────────
function fill(text, ctx) { return String(text).replace(/\{\{\s*name\s*\}\}/g, (ctx && ctx.name) || 'there'); }

/**
 * Steps due to send now (whose nextDueISO <= now and status active).
 * Returns [{ key, phone, sequenceId, step, text }]. The queue worker sends them
 * and then calls markStepSent (which schedules the next step or completes).
 */
function due({ storeId = 'default_store', now = Date.now(), nameByPhone = {} } = {}) {
  const enroll = readEnroll(storeId);
  const seqs = readSeqs(storeId);
  const out = [];
  for (const key of Object.keys(enroll)) {
    const e = enroll[key];
    if (e.status !== 'active') continue;
    if (new Date(e.nextDueISO).getTime() > now) continue;
    const seq = seqs[e.sequenceId]; if (!seq) continue;
    const step = seq.steps[e.step]; if (!step) continue;
    out.push({ key, phone: e.phone, sequenceId: e.sequenceId, step: e.step, text: fill(step.text, { name: nameByPhone[e.phone] }) });
  }
  return out;
}

/** Mark the current step sent: schedule the next step, or complete the sequence. */
function markStepSent({ storeId = 'default_store', phone, sequenceId } = {}) {
  const enroll = readEnroll(storeId);
  const key = enrollKey(phone, sequenceId);
  const e = enroll[key];
  if (!e || e.status !== 'active') return { ok: false, error: 'no active enrollment' };
  const seq = getSequence({ storeId, id: sequenceId });
  e.step += 1;
  if (!seq || e.step >= seq.steps.length) { e.status = 'completed'; e.completedAt = Date.now(); e.nextDueISO = null; }
  else { e.nextDueISO = whenForStep(storeId, phone, seq.steps[e.step].delayHours); }
  enroll[key] = e; writeEnroll(storeId, enroll);
  return { ok: true, status: e.status, step: e.step, nextDueISO: e.nextDueISO };
}

/** Stop a contact\'s sequence (e.g. they replied / opted out / converted). */
function stop({ storeId = 'default_store', phone, sequenceId } = {}) {
  const enroll = readEnroll(storeId);
  // stop one or all sequences for the phone
  let stopped = 0;
  for (const key of Object.keys(enroll)) {
    const e = enroll[key];
    if (e.phone !== phone) continue;
    if (sequenceId && e.sequenceId !== sequenceId) continue;
    if (e.status === 'active') { e.status = 'stopped'; e.stoppedAt = Date.now(); e.nextDueISO = null; stopped++; }
  }
  writeEnroll(storeId, enroll);
  return { ok: true, stopped };
}

function listEnrollments({ storeId = 'default_store', status, sequenceId } = {}) {
  let list = Object.values(readEnroll(storeId));
  if (status) list = list.filter(e => e.status === status);
  if (sequenceId) list = list.filter(e => e.sequenceId === sequenceId);
  return list;
}

function health() { return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), sendTimeWired: Boolean(sendTime && sendTime.nextSlot) }; }

module.exports = {
  defineSequence, authorSteps, listSequences, getSequence, deleteSequence,
  enroll, enrollMany, onEvent, due, markStepSent, stop, listEnrollments, health,
  _internal: { templateSteps, fill, enrollKey }
};
