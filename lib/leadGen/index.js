'use strict';
/**
 * lib/leadGen/index.js — Lead Generation & Capture (top of funnel).
 *
 * The job of this module: turn strangers into leads from EVERY source, then drop them straight into
 * the CRM automatically. Sources supported:
 *   - landing page form submissions
 *   - click-to-WhatsApp ads / links
 *   - QR code scans
 *   - lead magnets (free PDF/checklist/etc in exchange for contact)
 *   - manual / API
 *
 * Design:
 *   - Everything is JSON-file backed (same pattern as the rest of the app today). When the Postgres
 *     migration lands, swap the store functions below — the public API stays the same.
 *   - captureLead() is the ONE entry point. It normalises, dedupes, tags with source+UTM, persists,
 *     and best-effort pushes into the store CRM. A CRM failure never loses the lead.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.LEADGEN_DATA_DIR || path.join(__dirname, '..', '..', 'data', 'leadgen');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const FORMS_FILE = path.join(DATA_DIR, 'forms.json');
const MAGNETS_FILE = path.join(DATA_DIR, 'magnets.json');

const SOURCES = ['form', 'landing', 'qr', 'ad', 'whatsapp', 'lead_magnet', 'manual', 'api'];

// Optional CRM hook. We require lazily so leadGen works even if the CRM module isn't present.
let storeCRM = null;
function getCRM() {
  if (storeCRM === null) {
    try { storeCRM = require('../storeCRM'); } catch { storeCRM = false; }
  }
  return storeCRM || null;
}

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8').trim();
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function writeJSON(file, value) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value, null, 2));
  } catch { /* best-effort */ }
}

function newId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

// ---------------------------------------------------------------------------
// Phone / contact normalisation (so dedupe actually works)
// ---------------------------------------------------------------------------
function normalizePhone(raw) {
  if (!raw) return '';
  let p = String(raw).replace(/[^\d+]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  // Pakistan convenience: 03xxxxxxxxx -> +923xxxxxxxxx
  if (/^0\d{10}$/.test(p)) p = '+92' + p.slice(1);
  if (!p.startsWith('+') && /^\d{10,15}$/.test(p)) p = '+' + p;
  return p;
}
function normalizeEmail(raw) {
  return String(raw || '').trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------
function listLeads(filter = {}) {
  let leads = readJSON(LEADS_FILE, []);
  if (filter.source) leads = leads.filter(l => l.source === filter.source);
  if (filter.formId) leads = leads.filter(l => l.formId === filter.formId);
  if (filter.since) leads = leads.filter(l => l.createdAt >= filter.since);
  leads.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const limit = Number(filter.limit || 0);
  return limit > 0 ? leads.slice(0, limit) : leads;
}

function findExistingLead(leads, phone, email) {
  return leads.find(l =>
    (phone && l.phone && l.phone === phone) ||
    (email && l.email && l.email === email)
  );
}

/**
 * THE entry point. Capture (or merge) a lead from any source.
 * @param {Object} input
 * @param {string} [input.name]
 * @param {string} [input.phone]
 * @param {string} [input.email]
 * @param {string} [input.source]   one of SOURCES (default 'api')
 * @param {string} [input.formId]   if it came from a specific form
 * @param {string} [input.magnetId] if a lead magnet converted them
 * @param {Object} [input.utm]      { source, medium, campaign, term, content }
 * @param {Object} [input.meta]     anything else (message, page, referrer, ...)
 * @returns {{lead: object, isNew: boolean}}
 */
function captureLead(input = {}) {
  if (!input.phone && !input.email) {
    throw new Error('A phone or email is required to capture a lead');
  }
  const source = SOURCES.includes(input.source) ? input.source : 'api';
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);

  const leads = readJSON(LEADS_FILE, []);
  const now = new Date().toISOString();
  const existing = findExistingLead(leads, phone, email);

  let lead;
  let isNew;
  if (existing) {
    // Merge: keep first-touch source, record latest touch + any new fields.
    isNew = false;
    existing.name = input.name || existing.name;
    existing.phone = phone || existing.phone;
    existing.email = email || existing.email;
    existing.lastSource = source;
    existing.lastSeenAt = now;
    existing.touches = (existing.touches || 1) + 1;
    if (input.utm) existing.utm = { ...(existing.utm || {}), ...input.utm };
    if (input.meta) existing.meta = { ...(existing.meta || {}), ...input.meta };
    if (input.magnetId) existing.magnetId = input.magnetId;
    lead = existing;
  } else {
    isNew = true;
    lead = {
      id: newId('lead'),
      name: input.name || '',
      phone,
      email,
      source,            // first-touch source
      lastSource: source,
      formId: input.formId || null,
      magnetId: input.magnetId || null,
      utm: input.utm || {},
      meta: input.meta || {},
      status: 'new',
      touches: 1,
      createdAt: now,
      lastSeenAt: now
    };
    leads.unshift(lead);
  }
  writeJSON(LEADS_FILE, leads.slice(0, 50000));

  // Best-effort: push into CRM. Never let a CRM hiccup lose the lead.
  try {
    const crm = getCRM();
    if (crm && typeof crm.upsertContact === 'function') {
      crm.upsertContact({ name: lead.name, phone: lead.phone, email: lead.email, source: lead.source, tags: ['lead', source] });
    } else if (crm && typeof crm.addCustomer === 'function') {
      crm.addCustomer({ name: lead.name, phone: lead.phone, email: lead.email, source: lead.source });
    }
  } catch (e) {
    console.warn('[leadGen] CRM push failed (lead still saved):', e.message);
  }

  return { lead, isNew };
}

function updateLeadStatus(id, status) {
  const leads = readJSON(LEADS_FILE, []);
  const lead = leads.find(l => l.id === id);
  if (!lead) return null;
  lead.status = status;
  lead.lastSeenAt = new Date().toISOString();
  writeJSON(LEADS_FILE, leads);
  return lead;
}

// ---------------------------------------------------------------------------
// Click-to-WhatsApp + QR helpers
// ---------------------------------------------------------------------------
/**
 * Build a click-to-WhatsApp link. Scanning/clicking opens a chat with a prefilled message, and the
 * campaign tag is appended so the inbound handler can attribute the lead source.
 */
function buildClickToWhatsApp({ phone, message = '', campaign = '' }) {
  const num = normalizePhone(phone).replace(/^\+/, '');
  const text = campaign ? `${message}`.trim() + `\n\n[ref:${campaign}]` : message;
  const url = `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
  return { url, phone: '+' + num, campaign };
}

/**
 * QR payload helper. Returns the string to encode in a QR (usually a click-to-WA link or a landing
 * URL). Actual image rendering is done by the route using the app's existing `qrcode` dependency.
 */
function buildQrPayload({ type = 'whatsapp', phone, message, campaign, url }) {
  if (type === 'whatsapp') return buildClickToWhatsApp({ phone, message, campaign }).url;
  if (type === 'url') return String(url || '');
  return String(url || '');
}

// ---------------------------------------------------------------------------
// Forms / landing pages
// ---------------------------------------------------------------------------
function createForm({ name, fields = ['name', 'phone'], landingUrl = '', redirectUrl = '', magnetId = null }) {
  const forms = readJSON(FORMS_FILE, []);
  const form = {
    id: newId('form'),
    name: name || 'Untitled form',
    fields,
    landingUrl,
    redirectUrl,
    magnetId,
    submissions: 0,
    createdAt: new Date().toISOString()
  };
  forms.unshift(form);
  writeJSON(FORMS_FILE, forms);
  return form;
}
function listForms() { return readJSON(FORMS_FILE, []); }
function getForm(id) { return readJSON(FORMS_FILE, []).find(f => f.id === id) || null; }

/** Handle a public form submission: capture the lead and bump the form's submission count. */
function submitForm(formId, payload = {}) {
  const forms = readJSON(FORMS_FILE, []);
  const form = forms.find(f => f.id === formId);
  if (!form) throw new Error('Form not found');
  const { lead, isNew } = captureLead({
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    source: 'form',
    formId,
    magnetId: form.magnetId || null,
    utm: payload.utm,
    meta: { ...payload.meta, landingUrl: form.landingUrl }
  });
  form.submissions = (form.submissions || 0) + 1;
  writeJSON(FORMS_FILE, forms);
  return { lead, isNew, redirectUrl: form.redirectUrl || null };
}

// ---------------------------------------------------------------------------
// Lead magnets
// ---------------------------------------------------------------------------
function createMagnet({ title, assetUrl, type = 'pdf', description = '' }) {
  const magnets = readJSON(MAGNETS_FILE, []);
  const magnet = {
    id: newId('magnet'),
    title: title || 'Untitled magnet',
    type,
    assetUrl: assetUrl || '',
    description,
    downloads: 0,
    createdAt: new Date().toISOString()
  };
  magnets.unshift(magnet);
  writeJSON(MAGNETS_FILE, magnets);
  return magnet;
}
function listMagnets() { return readJSON(MAGNETS_FILE, []); }

/** Deliver a lead magnet: capture the lead, then return the asset url to hand over. */
function claimMagnet(magnetId, contact = {}) {
  const magnets = readJSON(MAGNETS_FILE, []);
  const magnet = magnets.find(m => m.id === magnetId);
  if (!magnet) throw new Error('Lead magnet not found');
  const { lead, isNew } = captureLead({
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    source: 'lead_magnet',
    magnetId,
    utm: contact.utm,
    meta: { magnetTitle: magnet.title }
  });
  magnet.downloads = (magnet.downloads || 0) + 1;
  writeJSON(MAGNETS_FILE, magnets);
  return { lead, isNew, assetUrl: magnet.assetUrl };
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
function getStats() {
  const leads = readJSON(LEADS_FILE, []);
  const bySource = {};
  for (const l of leads) bySource[l.source] = (bySource[l.source] || 0) + 1;
  return {
    totalLeads: leads.length,
    bySource,
    forms: readJSON(FORMS_FILE, []).length,
    magnets: readJSON(MAGNETS_FILE, []).length
  };
}

module.exports = {
  SOURCES,
  captureLead,
  listLeads,
  updateLeadStatus,
  buildClickToWhatsApp,
  buildQrPayload,
  createForm,
  listForms,
  getForm,
  submitForm,
  createMagnet,
  listMagnets,
  claimMagnet,
  getStats,
  normalizePhone,
  normalizeEmail
};
