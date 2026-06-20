// lib/publicSaasFunnel/leadStore.js
// Persistent (file-backed) lead store. Stores ONLY masked contact data.
// Raw email/phone are never persisted. Public reads are heavily redacted.

const { config, load, save, newId, appendHistory } = require('./store');
const normalizer = require('./leadNormalizer');
const scoring = require('./leadScoring');
const privacy = require('./privacyGuard');

const STATUSES = ['new', 'qualified', 'demo_requested', 'trial_requested', 'contacted', 'waiting_reply', 'converted', 'rejected', 'archived'];

function _all() { return load(config.paths.leads, []); }
function _persist(list) { return save(config.paths.leads, list); }

// Create a masked, scored lead from a raw public payload.
function create(raw = {}, sourcePage = 'unknown', signals = {}) {
  const v = normalizer.validate(raw);
  if (!v.valid) return { ok: false, errors: v.errors };

  const masked = normalizer.normalize(raw, sourcePage);
  const sc = scoring.score(masked, signals);

  const now = new Date().toISOString();
  const lead = {
    id: newId('lead'),
    ...masked,
    status: 'new',
    score: sc.score,
    grade: sc.grade,
    scoreReasons: sc.reasons,
    nextAction: sc.nextAction,
    assignedTo: null,
    followupDraft: null,
    createdAt: now,
    updatedAt: now,
  };

  // Defensive: never store a record that contains a raw PII leak.
  if (privacy.hasLeak({ nameSafe: lead.nameSafe, emailMasked: lead.emailMasked, phoneMasked: lead.phoneMasked, messagePreview: lead.messagePreview, businessName: lead.businessName })) {
    return { ok: false, errors: ['pii_leak_detected_blocked'] };
  }

  const list = _all();
  list.push(lead);
  _persist(list);
  appendHistory({ type: 'lead_created', ref: lead.id, note: `${lead.businessType}/${lead.sourcePage}` });
  return { ok: true, lead };
}

function get(id) { return _all().find((l) => l.id === id) || null; }

function list({ status, grade, limit = 200 } = {}) {
  let items = _all();
  if (status) items = items.filter((l) => l.status === status);
  if (grade) items = items.filter((l) => l.grade === grade);
  return items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, limit);
}

function update(id, patch = {}) {
  const list = _all();
  const idx = list.findIndex((l) => l.id === id);
  if (idx === -1) return { ok: false, errors: ['not_found'] };
  const lead = list[idx];
  const allowed = ['status', 'assignedTo', 'interestedPlan', 'followupDraft', 'nameSafe'];
  for (const k of allowed) if (patch[k] !== undefined) lead[k] = patch[k];
  if (patch.status && !STATUSES.includes(patch.status)) return { ok: false, errors: ['invalid_status'] };
  lead.updatedAt = new Date().toISOString();
  list[idx] = lead;
  _persist(list);
  appendHistory({ type: 'lead_updated', ref: id, note: patch.status || 'patch' });
  return { ok: true, lead };
}

// Re-score a lead given new signals.
function rescore(id, signals = {}) {
  const lead = get(id);
  if (!lead) return { ok: false, errors: ['not_found'] };
  const sc = scoring.score(lead, signals);
  return update(id, {}) && Object.assign(lead, { score: sc.score, grade: sc.grade, scoreReasons: sc.reasons, nextAction: sc.nextAction })
    ? (_saveScored(lead), { ok: true, scoring: sc, lead })
    : { ok: false, errors: ['rescore_failed'] };
}
function _saveScored(lead) {
  const list = _all();
  const idx = list.findIndex((l) => l.id === lead.id);
  if (idx !== -1) { list[idx] = lead; _persist(list); }
}

// Redacted export (NO raw PII). Markdown or array of admin views.
function exportRedacted(format = 'json') {
  const items = _all().map((l) => privacy.adminLeadView(l));
  if (format === 'markdown') {
    const lines = ['# Public Funnel Leads (Redacted)', '', `Generated: ${new Date().toISOString()}`, `Total: ${items.length}`, '', '| Name | Type | Plan | Source | Score | Grade | Status |', '|---|---|---|---|---|---|---|'];
    for (const l of items) lines.push(`| ${l.nameSafe || ''} | ${l.businessType || ''} | ${l.interestedPlan || ''} | ${l.sourcePage || ''} | ${l.score} | ${l.grade || ''} | ${l.status || ''} |`);
    return lines.join('\n');
  }
  return items;
}

function counts() {
  const items = _all();
  const byStatus = {};
  let hot = 0, qualified = 0;
  for (const l of items) {
    byStatus[l.status] = (byStatus[l.status] || 0) + 1;
    if (l.grade === 'hot' || l.grade === 'priority') hot += 1;
    if (l.status === 'qualified') qualified += 1;
  }
  return { total: items.length, byStatus, highScoreLeads: hot, qualifiedLeads: qualified };
}

module.exports = { create, get, list, update, rescore, exportRedacted, counts, STATUSES, _all };
