'use strict';
/**
 * onboardingWizard.js — Onboarding Feature #1: guided first-run setup per tenant.
 *
 * A new tenant who connects WhatsApp, picks a plan, imports contacts, and sends their first
 * broadcast is FAR more likely to stick (activation = retention). This tracks that setup journey:
 * an ordered checklist, per-step completion, overall progress, and the single next step to nudge.
 *
 * Steps can auto-complete: pass `checkers` (a map of stepKey -> () => boolean) and the wizard marks
 * steps done by inspecting real state (e.g. "has the WA client connected?"), so the user doesn't
 * tick boxes manually.
 *
 * Storage: JSON (data/onboarding.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'onboarding.json');

// Default journey. Each step: key, title, description, optional.
const DEFAULT_STEPS = [
  { key: 'connect_whatsapp', title: 'Connect WhatsApp', description: 'Scan the QR to link your WhatsApp number.' },
  { key: 'choose_plan',      title: 'Choose a plan',     description: 'Pick a plan that fits your volume.' },
  { key: 'import_contacts',  title: 'Import contacts',   description: 'Bring in your customer list.' },
  { key: 'create_segment',   title: 'Create a segment',  description: 'Group contacts to target them.' },
  { key: 'first_template',   title: 'Save a template',   description: 'Create a reusable message.' },
  { key: 'first_broadcast',  title: 'Send first broadcast', description: 'Reach your audience with one click.' },
  { key: 'invite_team',      title: 'Invite your team',  description: 'Add teammates to help.', optional: true }
];

let checkers = {}; // { stepKey: (tenantId) => boolean }
function setCheckers(map = {}) { checkers = map || {}; return Object.keys(checkers); }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { tenants: {} }; }
  catch { return { tenants: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();

function ensure(data, tenantId) {
  if (!data.tenants[tenantId]) {
    data.tenants[tenantId] = { tenantId, completed: {}, startedAt: nowIso() };
  }
  return data.tenants[tenantId];
}

function markComplete(tenantId, stepKey, done = true) {
  const data = load();
  const t = ensure(data, String(tenantId));
  t.completed[stepKey] = done ? nowIso() : null;
  if (!done) delete t.completed[stepKey];
  save(data);
  return getStatus(tenantId);
}

/** Run auto-checkers to mark steps that are already satisfied by real state. */
function refresh(tenantId) {
  const data = load();
  const t = ensure(data, String(tenantId));
  for (const step of DEFAULT_STEPS) {
    const fn = checkers[step.key];
    if (fn && !t.completed[step.key]) {
      try { if (fn(String(tenantId))) t.completed[step.key] = nowIso(); } catch { /* ignore */ }
    }
  }
  save(data);
  return getStatus(tenantId);
}

function getStatus(tenantId) {
  const data = load();
  const t = ensure(data, String(tenantId));
  const steps = DEFAULT_STEPS.map(s => ({ ...s, done: !!t.completed[s.key], completedAt: t.completed[s.key] || null }));
  const required = steps.filter(s => !s.optional);
  const doneRequired = required.filter(s => s.done).length;
  const progressPct = required.length ? Math.round((doneRequired / required.length) * 100) : 100;
  const next = steps.find(s => !s.done && !s.optional) || steps.find(s => !s.done) || null;
  return {
    tenantId: String(tenantId),
    steps,
    progressPct,
    complete: doneRequired === required.length,
    nextStep: next ? { key: next.key, title: next.title, description: next.description } : null
  };
}

module.exports = { DEFAULT_STEPS, setCheckers, markComplete, refresh, getStatus };
