// lib/publicSaasFunnel/demoRequests.js
// Demo request workflow. Creates an admin follow-up DRAFT only. No live calendar event by default.

const { config, load, save, newId, appendHistory } = require('./store');
const scheduler = require('./demoScheduler');
const followups = require('./leadFollowupDrafts');
const leadStore = require('./leadStore');

const STATUSES = ['requested', 'pending_admin_review', 'scheduled_draft', 'completed', 'cancelled', 'archived'];
const FILE = () => config.paths.demoRequests;

function _all() { return load(FILE(), []); }
function _persist(l) { return save(FILE(), l); }

function clamp(v, n = 280) { return v == null ? '' : String(v).replace(/\s+/g, ' ').trim().slice(0, n); }

function create(raw = {}) {
  const leadId = clamp(raw.leadId, 60) || null;
  const lead = leadId ? leadStore.get(leadId) : null;

  const demo = {
    id: newId('demo'),
    leadId,
    businessType: clamp(raw.businessType || (lead && lead.businessType) || 'custom', 60),
    preferredDate: clamp(raw.preferredDate, 40),
    preferredTime: clamp(raw.preferredTime, 40),
    timezone: clamp(raw.timezone || 'Asia/Karachi', 60),
    requestedModules: Array.isArray(raw.requestedModules) ? raw.requestedModules.slice(0, 30).map((m) => clamp(m, 60)) : [],
    notesSafe: clamp(raw.notes || raw.notesSafe, 300),
    status: 'pending_admin_review',
    adminFollowupDraft: null,
    schedulePacket: null,
    createdAt: new Date().toISOString(),
  };

  demo.schedulePacket = scheduler.buildPacket(demo, lead);
  demo.adminFollowupDraft = followups.generate(lead || { businessType: demo.businessType, consentContact: true, consentMarketing: !!(lead && lead.consentMarketing) }, 'demo', { language: config.defaultLanguage });

  const list = _all();
  list.push(demo);
  _persist(list);

  // Mark the lead as demo_requested and re-score with the signal.
  if (lead) {
    leadStore.update(lead.id, { status: 'demo_requested' });
    leadStore.rescore(lead.id, { demoRequested: true });
  }
  appendHistory({ type: 'demo_requested', ref: demo.id, note: demo.businessType });
  return { ok: true, demoRequest: demo };
}

function get(id) { return _all().find((d) => d.id === id) || null; }
function list({ status, limit = 200 } = {}) {
  let items = _all();
  if (status) items = items.filter((d) => d.status === status);
  return items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, limit);
}
function followupDraft(id, opts = {}) {
  const demo = get(id);
  if (!demo) return { ok: false, errors: ['not_found'] };
  const lead = demo.leadId ? leadStore.get(demo.leadId) : { businessType: demo.businessType, consentContact: true };
  return { ok: true, draft: followups.generate(lead, 'demo', opts) };
}
function counts() {
  const items = _all();
  const byStatus = {};
  for (const d of items) byStatus[d.status] = (byStatus[d.status] || 0) + 1;
  return { total: items.length, byStatus };
}

module.exports = { create, get, list, followupDraft, counts, STATUSES, _all };
