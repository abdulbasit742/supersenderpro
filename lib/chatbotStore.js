'use strict';

/**
 * chatbotStore.js  (WATI-style no-code chatbot / keyword auto-replies)
 * Persists bot settings + keyword rules under data/chatbot.json.
 *
 * Settings:
 *   enabled            - master on/off
 *   defaultReply       - fallback when no rule matches (optional)
 *   officeHours        - { enabled, start "HH:MM", end "HH:MM", days [0-6], outsideMessage }
 *
 * Rule:
 *   { id, name, enabled, priority,
 *     match:   { type: 'contains'|'equals'|'starts'|'regex', keywords:[], caseSensitive },
 *     response:{ type: 'text'|'template'|'quickReply', text, templateId, quickReplyId } }
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.CAMPAIGN_DATA_DIR || path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'chatbot.json');

const DEFAULTS = {
  enabled: true,
  defaultReply: '',
  officeHours: {
    enabled: false,
    start: '09:00',
    end: '18:00',
    days: [1, 2, 3, 4, 5], // Mon-Fri
    outsideMessage: 'Thanks for your message! Our team is offline right now and will reply during business hours.',
  },
  rules: [],
};

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) fs.writeFileSync(STORE_FILE, JSON.stringify(DEFAULTS, null, 2));
}
function readAll() {
  ensureStore();
  try {
    const d = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8') || '{}');
    return {
      ...DEFAULTS,
      ...d,
      officeHours: { ...DEFAULTS.officeHours, ...(d.officeHours || {}) },
      rules: Array.isArray(d.rules) ? d.rules : [],
    };
  } catch { return JSON.parse(JSON.stringify(DEFAULTS)); }
}
function writeAll(d) {
  ensureStore();
  const tmp = STORE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, STORE_FILE);
}
function newId() { return 'rule_' + crypto.randomBytes(6).toString('hex'); }

function getSettings() {
  const d = readAll();
  return { enabled: d.enabled, defaultReply: d.defaultReply, officeHours: d.officeHours };
}
function updateSettings(patch = {}) {
  const d = readAll();
  if (patch.enabled != null) d.enabled = !!patch.enabled;
  if (patch.defaultReply != null) d.defaultReply = String(patch.defaultReply);
  if (patch.officeHours) d.officeHours = { ...d.officeHours, ...patch.officeHours };
  writeAll(d);
  return getSettings();
}

function listRules() { return readAll().rules; }
function getRule(id) { return readAll().rules.find((r) => r.id === id) || null; }

function createRule(input = {}) {
  const d = readAll();
  const rule = {
    id: newId(),
    name: String(input.name || 'Untitled rule').slice(0, 160),
    enabled: input.enabled !== false,
    priority: Number.isFinite(input.priority) ? input.priority : (d.rules.length + 1) * 10,
    match: {
      type: ['contains', 'equals', 'starts', 'regex'].includes(input.match && input.match.type) ? input.match.type : 'contains',
      keywords: Array.isArray(input.match && input.match.keywords) ? input.match.keywords.map(String) : [],
      caseSensitive: !!(input.match && input.match.caseSensitive),
    },
    response: {
      type: ['text', 'template', 'quickReply'].includes(input.response && input.response.type) ? input.response.type : 'text',
      text: String((input.response && input.response.text) || ''),
      templateId: (input.response && input.response.templateId) || null,
      quickReplyId: (input.response && input.response.quickReplyId) || null,
    },
  };
  d.rules.push(rule);
  writeAll(d);
  return rule;
}
function updateRule(id, patch = {}) {
  const d = readAll();
  const i = d.rules.findIndex((r) => r.id === id);
  if (i === -1) return null;
  const cur = d.rules[i];
  d.rules[i] = {
    ...cur, ...patch,
    match: { ...cur.match, ...(patch.match || {}) },
    response: { ...cur.response, ...(patch.response || {}) },
  };
  writeAll(d);
  return d.rules[i];
}
function deleteRule(id) {
  const d = readAll();
  const n = d.rules.length;
  d.rules = d.rules.filter((r) => r.id !== id);
  writeAll(d);
  return d.rules.length < n;
}

module.exports = {
  STORE_FILE, DEFAULTS, getSettings, updateSettings,
  listRules, getRule, createRule, updateRule, deleteRule,
};
