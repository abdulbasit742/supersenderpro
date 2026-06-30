'use strict';
/**
 * onboarding.js — Onboarding Feature #1: the guided setup wizard.
 *
 * Activation is everything: a signup that never connects WhatsApp or sends a campaign churns. This
 * walks a new tenant through the few steps that turn them into an active customer, tracks progress,
 * and can auto-complete a step when the real action happens (via injected verifiers).
 *
 * Default steps (configurable):
 *   connect_whatsapp -> choose_plan -> import_contacts -> first_segment -> first_campaign -> invite_team
 *
 * Storage: JSON (data/onboarding.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'onboarding.json');

const DEFAULT_STEPS = [
  { key: 'connect_whatsapp', label: 'Connect your WhatsApp number', required: true },
  { key: 'choose_plan',      label: 'Choose a plan',               required: false },
  { key: 'import_contacts',  label: 'Import your contacts',        required: false },
  { key: 'first_segment',    label: 'Create your first segment',   required: false },
  { key: 'first_campaign',   label: 'Send your first campaign',    required: true },
  { key: 'invite_team',      label: 'Invite a teammate',           required: false }
];

// Optional verifiers: key -> (tenantId) => boolean (true = step is actually done)
const verifiers = {};
function setVerifier(key, fn) { if (typeof fn === 'function') verifiers[key] = fn; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { tenants: {} }; }
  catch { return { tenants: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();

function ensureTenant(data, tenantId) {
  if (!data.tenants[tenantId]) {
    data.tenants[tenantId] = {
      tenantId,
      steps: DEFAULT_STEPS.map(s => ({ ...s, status: 'pending' })),  // pending | done | skipped
      startedAt: nowIso(),
      completedAt: null
    };
  }
  return data.tenants[tenantId];
}

function recompute(t) {
  const required = t.steps.filter(s => s.required);
  const requiredDone = required.every(s => s.status === 'done');
  const allResolved = t.steps.every(s => s.status !== 'pending');
  t.completedAt = (requiredDone && (allResolved || required.length)) && !t.completedAt && requiredDone
    ? nowIso() : t.completedAt;
  return t;
}

/** Run verifiers to auto-mark steps done when the real action has happened. */
function refresh(tenantId) {
  const data = load();
  const t = ensureTenant(data, String(tenantId));
  for (const step of t.steps) {
    if (step.status === 'pending' && verifiers[step.key]) {
      try { if (verifiers[step.key](String(tenantId))) { step.status = 'done'; step.doneAt = nowIso(); } } catch { /* ignore */ }
    }
  }
  recompute(t);
  save(data);
  return view(t);
}

function markStep(tenantId, key, status = 'done') {
  const data = load();
  const t = ensureTenant(data, String(tenantId));
  const step = t.steps.find(s => s.key === key);
  if (!step) return null;
  step.status = status === 'skipped' ? 'skipped' : 'done';
  step[status === 'skipped' ? 'skippedAt' : 'doneAt'] = nowIso();
  recompute(t);
  save(data);
  return view(t);
}

function view(t) {
  const total = t.steps.length;
  const done = t.steps.filter(s => s.status === 'done').length;
  const next = t.steps.find(s => s.status === 'pending') || null;
  return {
    tenantId: t.tenantId,
    steps: t.steps,
    progressPct: Math.round((done / total) * 100),
    nextStep: next ? { key: next.key, label: next.label } : null,
    completed: !!t.completedAt,
    completedAt: t.completedAt
  };
}

function getStatus(tenantId) {
  const data = load();
  return view(ensureTenant(data, String(tenantId)));
}

module.exports = { DEFAULT_STEPS, setVerifier, refresh, markStep, getStatus };
