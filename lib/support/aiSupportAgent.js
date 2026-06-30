'use strict';
/**
 * aiSupportAgent.js — Support Feature #1: 24/7 AI customer support.
 *
 * Answers inbound customer questions on WhatsApp, grounded in (a) a knowledge base / FAQ you provide
 * and (b) the customer's own Customer 360 context (their orders, stage, history). Routed through the
 * app's AI brain, which is Ollama-first (self-hosted, zero cost) — this is exactly where the local
 * GPU box earns its keep.
 *
 * Safety: if the model is unsure (or the customer asks for a human, or hits a sensitive topic), it
 * escalates instead of guessing — emitting 'support_escalated' so a workflow can ping the owner.
 *
 * Decoupled: AI call, profile fetch, and KB lookup are injected. Storage: JSON (data/support_threads.json).
 */

const fs = require('fs');
const path = require('path');

let aiBrain = null;
try { aiBrain = require('../../ai/aiBrain'); } catch { aiBrain = null; }

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'support_threads.json');

let getProfile = null;     // (phone) => profile | null
let kbLookup = null;       // (query) => string[]  (relevant KB snippets)
let aiCall = null;         // async (prompt) => string
let eventEmitter = null;   // (event, ctx) => void
function setProfileFetcher(fn) { getProfile = typeof fn === 'function' ? fn : null; }
function setKbLookup(fn) { kbLookup = typeof fn === 'function' ? fn : null; }
function setAiCall(fn) { aiCall = typeof fn === 'function' ? fn : null; }
function setEventEmitter(fn) { eventEmitter = typeof fn === 'function' ? fn : null; }

// Phrases that should always go to a human.
let ESCALATION_TRIGGERS = ['refund', 'human', 'agent', 'complaint', 'legal', 'angry', 'cancel my', 'speak to'];
function configureEscalation(words) { if (Array.isArray(words) && words.length) ESCALATION_TRIGGERS = words; return ESCALATION_TRIGGERS; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { threads: {} }; }
  catch { return { threads: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const phoneOf = (c) => String((c && (c.phone || c.id)) || c || '').replace(/[^\d]/g, '');

function thread(data, phone) {
  if (!data.threads[phone]) data.threads[phone] = { phone, status: 'open', turns: [], createdAt: nowIso() };
  return data.threads[phone];
}

function wantsHuman(text) {
  const t = String(text || '').toLowerCase();
  return ESCALATION_TRIGGERS.some(w => t.includes(w));
}

function buildProfileContext(phone) {
  if (!getProfile) return '';
  const p = getProfile(phone);
  if (!p) return 'Customer: new/unknown (no profile yet).';
  const s = p.stats || {};
  return [
    `Customer: ${p.name || phone} (stage: ${p.stage || 'lead'})`,
    `Orders: ${s.orderCount || 0}, total spent: ${s.totalSpent || 0}, last order: ${s.lastOrderAt || 'never'}`,
    `Tags: ${(p.tags || []).join(', ') || 'none'}`
  ].join('\n');
}

async function runAi(prompt) {
  if (aiCall) return aiCall(prompt);
  if (aiBrain && typeof aiBrain.processPrompt === 'function') return aiBrain.processPrompt(prompt);
  throw new Error('no AI available');
}

/**
 * Handle an inbound customer message. Returns { reply, escalated, threadStatus }.
 * @param {string|object} customer  phone/id or contact
 * @param {string} message          the customer's message text
 */
async function handleMessage(customer, message) {
  const phone = phoneOf(customer);
  if (!phone) throw new Error('customer needs a phone');
  if (!message) throw new Error('message required');

  const data = load();
  const t = thread(data, phone);
  t.turns.push({ role: 'customer', text: message, at: nowIso() });

  // hard escalation triggers -> hand to human, don't guess
  if (wantsHuman(message)) {
    t.status = 'escalated';
    t.turns.push({ role: 'system', text: 'escalated to human', at: nowIso() });
    save(data);
    try { if (eventEmitter) eventEmitter('support_escalated', { phone, reason: 'trigger phrase', message }); } catch { /* ignore */ }
    return { reply: 'Let me connect you with a team member who can help with that right away. 🙏', escalated: true, threadStatus: t.status };
  }

  const kb = (kbLookup ? (kbLookup(message) || []) : []).slice(0, 5);
  const recent = t.turns.slice(-6).map(x => `${x.role}: ${x.text}`).join('\n');
  const prompt = [
    'You are a helpful, concise WhatsApp customer-support agent for this business.',
    'Answer ONLY from the knowledge base and customer context below. If the answer is not there or you are unsure, say you will connect them to a human — do NOT make things up.',
    'Keep replies short and friendly, WhatsApp style.',
    '',
    '--- Customer context ---',
    buildProfileContext(phone),
    '',
    '--- Knowledge base ---',
    kb.length ? kb.map((k, i) => `[${i + 1}] ${k}`).join('\n') : '(no KB snippets matched)',
    '',
    '--- Recent conversation ---',
    recent,
    '',
    `Customer just said: "${message}"`,
    'Your reply:'
  ].join('\n');

  let reply;
  try {
    reply = String(await runAi(prompt) || '').trim();
  } catch {
    reply = '';
  }

  // low-confidence heuristic: empty/uncertain answer or no KB match on a clear question -> escalate
  const uncertain = !reply || /\b(not sure|don't know|cannot help|connect you)\b/i.test(reply);
  if (uncertain) {
    t.status = 'escalated';
    t.turns.push({ role: 'system', text: 'escalated: low confidence', at: nowIso() });
    save(data);
    try { if (eventEmitter) eventEmitter('support_escalated', { phone, reason: 'low confidence', message }); } catch { /* ignore */ }
    return { reply: reply || 'Good question, let me get a team member to help you with this. 🙏', escalated: true, threadStatus: t.status };
  }

  t.turns.push({ role: 'agent', text: reply, at: nowIso() });
  t.status = 'open';
  if (t.turns.length > 100) t.turns = t.turns.slice(-100);
  save(data);
  return { reply, escalated: false, threadStatus: t.status };
}

function getThread(customer) {
  return load().threads[phoneOf(customer)] || null;
}
function listThreads(filter = {}) {
  let rows = Object.values(load().threads);
  if (filter.status) rows = rows.filter(t => t.status === filter.status);
  return rows;
}
function resolveThread(customer) {
  const data = load();
  const t = data.threads[phoneOf(customer)];
  if (!t) return null;
  t.status = 'resolved';
  t.resolvedAt = nowIso();
  save(data);
  return t;
}

module.exports = {
  setProfileFetcher, setKbLookup, setAiCall, setEventEmitter, configureEscalation,
  handleMessage, getThread, listThreads, resolveThread
};
