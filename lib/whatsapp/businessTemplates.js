'use strict';
/**
 * businessTemplates.js — WhatsApp Feature #1: official Business (HSM) template registry.
 *
 * The official Cloud API can only send pre-approved "message templates" (HSM) to start a
 * conversation outside the 24h window. This tracks those templates: name, language, category,
 * body with {{1}} {{2}} params, and Meta's approval status. Only APPROVED templates are sendable,
 * and buildPayload() fills the params into the exact structure the Cloud API expects.
 *
 * (The actual submit-to-Meta + status sync is done by the deploy's Cloud API client; this is the
 * local registry + payload builder.) Storage: JSON (data/wa_templates.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'wa_templates.json');
const CATEGORIES = ['MARKETING', 'UTILITY', 'AUTHENTICATION'];
const STATUSES = ['pending', 'approved', 'rejected', 'paused'];

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { templates: [] }; }
  catch { return { templates: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();

function countParams(body) {
  const set = new Set();
  const re = /\{\{\s*(\d+)\s*\}\}/g; let m;
  while ((m = re.exec(String(body || '')))) set.add(Number(m[1]));
  return set.size;
}

/**
 * Register a template.
 * @param {Object} opts { name, language?, category, body, headerText?, footerText? }
 */
function createTemplate(opts = {}) {
  if (!opts.name || !/^[a-z0-9_]+$/.test(opts.name)) throw new Error('name required (lowercase letters/numbers/underscore)');
  if (!CATEGORIES.includes(opts.category)) throw new Error(`category must be one of: ${CATEGORIES.join(', ')}`);
  if (!opts.body) throw new Error('body required');
  const data = load();
  if (data.templates.some(t => t.name === opts.name && t.language === (opts.language || 'en'))) {
    throw new Error('template with this name+language already exists');
  }
  const tpl = {
    id: `WAT-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    name: opts.name,
    language: opts.language || 'en',
    category: opts.category,
    body: opts.body,
    headerText: opts.headerText || null,
    footerText: opts.footerText || null,
    paramCount: countParams(opts.body),
    status: 'pending',
    createdAt: nowIso()
  };
  data.templates.push(tpl);
  save(data);
  return tpl;
}

function listTemplates(filter = {}) {
  let rows = load().templates;
  if (filter.status) rows = rows.filter(t => t.status === filter.status);
  if (filter.category) rows = rows.filter(t => t.category === filter.category);
  return rows;
}
function getTemplate(id) { return load().templates.find(t => t.id === id) || null; }

/** Set approval status (synced from Meta in production). */
function setStatus(id, status, reason) {
  if (!STATUSES.includes(status)) throw new Error(`status must be one of: ${STATUSES.join(', ')}`);
  const data = load();
  const t = data.templates.find(x => x.id === id);
  if (!t) return null;
  t.status = status;
  if (status === 'rejected') t.rejectionReason = reason || 'rejected';
  t.updatedAt = nowIso();
  save(data);
  return t;
}

/**
 * Build a Cloud API send payload for an APPROVED template, filling body params.
 * @param {string} id
 * @param {string} toPhone
 * @param {Array<string>} params  values for {{1}}, {{2}}, ...
 */
function buildPayload(id, toPhone, params = []) {
  const t = getTemplate(id);
  if (!t) throw new Error('template not found');
  if (t.status !== 'approved') throw new Error(`template not approved (status: ${t.status})`);
  if (params.length < t.paramCount) throw new Error(`template needs ${t.paramCount} params, got ${params.length}`);
  const components = [];
  if (t.paramCount > 0) {
    components.push({
      type: 'body',
      parameters: params.slice(0, t.paramCount).map(v => ({ type: 'text', text: String(v) }))
    });
  }
  return {
    messaging_product: 'whatsapp',
    to: String(toPhone).replace(/[^\d]/g, ''),
    type: 'template',
    template: { name: t.name, language: { code: t.language }, components }
  };
}

module.exports = { CATEGORIES, STATUSES, createTemplate, listTemplates, getTemplate, setStatus, buildPayload };
