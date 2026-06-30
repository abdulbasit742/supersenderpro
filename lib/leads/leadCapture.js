'use strict';
/**
 * leadCapture.js — Lead Capture Feature #1: the top of the funnel.
 *
 * Everything downstream (CRM, marketing, sales, payments) needs leads to exist first. This captures
 * them from any source — landing-page forms, click-to-WhatsApp, QR codes, manual entry, or API —
 * normalises them, dedupes by phone/email, and pushes each new lead into Customer 360 (#1) while
 * emitting a 'lead_captured' event the Workflow Builder can react to (auto-tag, welcome drip, etc).
 *
 * Decoupled via injected hooks:
 *   setProfileSink((contact, ev) => ...)   // usually customer360.recordEvent / upsertProfile
 *   setEventEmitter((event, ctx) => ...)   // usually workflowEngine.emit
 *
 * Storage: JSON (data/leads.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'leads.json');
const SOURCES = ['form', 'click_to_whatsapp', 'qr', 'manual', 'api', 'import'];

let profileSink = null;   // (phone, { type:'note'|..., text, meta }) => void
let profileUpsert = null; // (phone, fields) => void
let eventEmitter = null;  // (event, ctx) => void
function setProfileSink(fn) { profileSink = typeof fn === 'function' ? fn : null; }
function setProfileUpsert(fn) { profileUpsert = typeof fn === 'function' ? fn : null; }
function setEventEmitter(fn) { eventEmitter = typeof fn === 'function' ? fn : null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { forms: [], leads: [] }; }
  catch { return { forms: [], leads: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------
/**
 * Create a capture form.
 * @param {Object} opts { name, fields:[{key,label,required?,type?}], source?, tags?, redirectUrl? }
 */
function createForm(opts = {}) {
  if (!opts.name) throw new Error('form needs a name');
  const fields = Array.isArray(opts.fields) && opts.fields.length
    ? opts.fields
    : [{ key: 'name', label: 'Name', required: true }, { key: 'phone', label: 'Phone', required: true }];
  const data = load();
  const form = {
    id: `FORM-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    name: opts.name,
    fields,
    source: SOURCES.includes(opts.source) ? opts.source : 'form',
    tags: Array.isArray(opts.tags) ? opts.tags : [],
    redirectUrl: opts.redirectUrl || null,
    submissions: 0,
    createdAt: nowIso()
  };
  data.forms.push(form);
  save(data);
  return form;
}
function listForms() { return load().forms; }
function getForm(id) { return load().forms.find(f => f.id === id) || null; }

// ---------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------
function findExisting(data, phone, email) {
  return data.leads.find(l =>
    (phone && l.phone === phone) ||
    (email && l.email && l.email.toLowerCase() === String(email).toLowerCase())
  );
}

/**
 * Capture a lead from any source. Dedupes by phone/email (updates the existing lead instead of
 * creating a duplicate). Pushes to Customer 360 and emits 'lead_captured' for new leads.
 * @param {Object} payload { name?, phone?, email?, source?, formId?, fields?, utm?, tags? }
 */
function capture(payload = {}) {
  const phone = normPhone(payload.phone);
  const email = payload.email ? String(payload.email).trim() : '';
  if (!phone && !email) throw new Error('a lead needs at least a phone or email');

  const data = load();
  const source = SOURCES.includes(payload.source) ? payload.source : 'api';
  let lead = findExisting(data, phone, email);
  let isNew = false;

  if (lead) {
    // enrich existing lead, don't duplicate
    lead.name = lead.name || payload.name || '';
    lead.email = lead.email || email;
    lead.phone = lead.phone || phone;
    lead.touches = (lead.touches || 1) + 1;
    lead.lastSource = source;
    lead.updatedAt = nowIso();
    if (Array.isArray(payload.tags)) lead.tags = Array.from(new Set([...(lead.tags || []), ...payload.tags]));
  } else {
    isNew = true;
    lead = {
      id: `LEAD-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
      name: payload.name || '',
      phone, email,
      source, lastSource: source,
      formId: payload.formId || null,
      fields: payload.fields || {},
      utm: payload.utm || {},
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      status: 'new',           // new | contacted | qualified | converted | lost
      touches: 1,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    data.leads.push(lead);
  }

  if (payload.formId) {
    const form = data.forms.find(f => f.id === payload.formId);
    if (form) form.submissions = (form.submissions || 0) + 1;
  }
  save(data);

  // push into Customer 360 + emit event (best-effort, never blocks capture)
  const contactKey = phone || email;
  try {
    if (profileUpsert) profileUpsert(contactKey, { name: lead.name, email: lead.email, tags: lead.tags, stage: 'lead' });
    if (profileSink) profileSink(contactKey, { type: 'note', text: `Lead captured via ${source}`, meta: { utm: lead.utm } });
  } catch { /* ignore */ }
  if (isNew) {
    try { if (eventEmitter) eventEmitter('lead_captured', { phone, email, name: lead.name, source, utm: lead.utm, tags: lead.tags }); } catch { /* ignore */ }
  }

  return { lead, isNew };
}

/** Submit a form: validates required fields, then captures. */
function submitForm(formId, values = {}) {
  const form = getForm(formId);
  if (!form) throw new Error('form not found');
  for (const f of form.fields) {
    if (f.required && !values[f.key]) throw new Error(`missing required field: ${f.label || f.key}`);
  }
  return capture({
    name: values.name,
    phone: values.phone,
    email: values.email,
    source: form.source,
    formId,
    fields: values,
    utm: values.utm || {},
    tags: form.tags
  });
}

function listLeads(filter = {}) {
  let rows = load().leads;
  if (filter.status) rows = rows.filter(l => l.status === filter.status);
  if (filter.source) rows = rows.filter(l => l.source === filter.source);
  return rows.reverse();
}
function setLeadStatus(leadId, status) {
  const allowed = ['new', 'contacted', 'qualified', 'converted', 'lost'];
  if (!allowed.includes(status)) throw new Error(`invalid status. use: ${allowed.join(', ')}`);
  const data = load();
  const lead = data.leads.find(l => l.id === leadId);
  if (!lead) return null;
  lead.status = status;
  lead.updatedAt = nowIso();
  save(data);
  return lead;
}

/** Funnel stats by source + status (for a lead-gen dashboard). */
function stats() {
  const rows = load().leads;
  const bySource = {};
  const byStatus = { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 };
  for (const l of rows) {
    bySource[l.source] = (bySource[l.source] || 0) + 1;
    byStatus[l.status] = (byStatus[l.status] || 0) + 1;
  }
  const converted = byStatus.converted || 0;
  return { total: rows.length, bySource, byStatus, conversionRatePct: rows.length ? Math.round((converted / rows.length) * 1000) / 10 : 0 };
}

module.exports = {
  SOURCES,
  setProfileSink, setProfileUpsert, setEventEmitter,
  createForm, listForms, getForm,
  capture, submitForm,
  listLeads, setLeadStatus, stats
};
