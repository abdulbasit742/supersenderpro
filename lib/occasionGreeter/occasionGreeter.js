// AI Customer Birthday & Occasion Greeter
// Deterministic core: store per-contact occasion dates, compute who is due
// today / upcoming, build a warm greeting (optional discount code).
// Optional Ollama enrichment for the message text, with safe template fallback.
// Zero new deps. Tenant/store-scoped. File-backed storage under data/.

const fs = require('fs');
const path = require('path');

let aiBrain = null;
try { aiBrain = require('../../ai/aiBrain'); } catch (_) { aiBrain = null; }

const DATA_DIR = path.join(process.cwd(), 'data', 'occasionGreeter');

const OCCASIONS = ['birthday', 'anniversary', 'eid', 'newyear', 'custom'];

function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
}

function storeFile(tenantId) {
  if (!tenantId) throw new Error('tenantId required');
  ensureDir(DATA_DIR);
  return path.join(DATA_DIR, String(tenantId) + '.json');
}

function loadStore(tenantId) {
  const f = storeFile(tenantId);
  try {
    const raw = fs.readFileSync(f, 'utf8');
    const j = JSON.parse(raw);
    if (j && Array.isArray(j.contacts)) return j;
  } catch (_) {}
  return { contacts: [] };
}

function saveStore(tenantId, store) {
  const f = storeFile(tenantId);
  ensureDir(DATA_DIR);
  fs.writeFileSync(f, JSON.stringify(store, null, 2), 'utf8');
  return store;
}

// Accepts 'YYYY-MM-DD' or 'MM-DD' or 'DD/MM'. Returns {month, day} 1-based.
function parseMonthDay(value) {
  if (!value || typeof value !== 'string') return null;
  const v = value.trim();
  let m, d;
  let match = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) { m = +match[2]; d = +match[3]; }
  if (!match) {
    match = v.match(/^(\d{1,2})-(\d{1,2})$/);
    if (match) { m = +match[1]; d = +match[2]; }
  }
  if (!match) {
    match = v.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (match) { d = +match[1]; m = +match[2]; }
  }
  if (!m || !d) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { month: m, day: d };
}

function upsertContact(tenantId, contact) {
  if (!contact || !contact.phone) throw new Error('contact.phone required');
  const store = loadStore(tenantId);
  const occ = (contact.occasions || []).map(function (o) {
    const md = parseMonthDay(o.date);
    return {
      type: OCCASIONS.indexOf(o.type) >= 0 ? o.type : 'custom',
      label: o.label || o.type || 'occasion',
      date: o.date,
      month: md ? md.month : null,
      day: md ? md.day : null,
      discountCode: o.discountCode || null
    };
  }).filter(function (o) { return o.month && o.day; });
  const idx = store.contacts.findIndex(function (c) { return c.phone === contact.phone; });
  const rec = {
    phone: contact.phone,
    name: contact.name || '',
    occasions: occ
  };
  if (idx >= 0) store.contacts[idx] = rec; else store.contacts.push(rec);
  saveStore(tenantId, store);
  return rec;
}

function daysUntil(month, day, today) {
  const now = today ? new Date(today) : new Date();
  const y = now.getFullYear();
  let target = new Date(y, month - 1, day);
  const startOfToday = new Date(y, now.getMonth(), now.getDate());
  if (target < startOfToday) target = new Date(y + 1, month - 1, day);
  const diff = Math.round((target - startOfToday) / 86400000);
  return diff;
}

// Returns contacts with an occasion due within `windowDays` (0 = today only).
function dueOccasions(tenantId, windowDays, today) {
  const w = typeof windowDays === 'number' ? windowDays : 0;
  const store = loadStore(tenantId);
  const out = [];
  store.contacts.forEach(function (c) {
    c.occasions.forEach(function (o) {
      const d = daysUntil(o.month, o.day, today);
      if (d <= w) {
        out.push({
          phone: c.phone,
          name: c.name,
          type: o.type,
          label: o.label,
          discountCode: o.discountCode,
          daysUntil: d,
          dueToday: d === 0
        });
      }
    });
  });
  out.sort(function (a, b) { return a.daysUntil - b.daysUntil; });
  return out;
}

function templateGreeting(item) {
  const name = item.name || 'there';
  const occ = item.label || item.type || 'special day';
  let msg;
  if (item.type === 'birthday') msg = 'Happy Birthday ' + name + '! Wishing you a wonderful year ahead.';
  else if (item.type === 'anniversary') msg = 'Happy Anniversary ' + name + '! Thanks for being with us.';
  else if (item.type === 'eid') msg = 'Eid Mubarak ' + name + '! Wishing you joy and blessings.';
  else if (item.type === 'newyear') msg = 'Happy New Year ' + name + '! Here is to a great year.';
  else msg = 'Happy ' + occ + ' ' + name + '! Thinking of you today.';
  if (item.discountCode) {
    msg += ' As a gift, use code ' + item.discountCode + ' for a special discount.';
  }
  return msg;
}

async function composeGreeting(item) {
  const fallback = templateGreeting(item);
  if (!aiBrain || typeof aiBrain.processPrompt !== 'function') {
    return { text: fallback, source: 'template' };
  }
  try {
    const prompt = 'Write a short, warm WhatsApp greeting for a customer.\n' +
      'Customer name: ' + (item.name || 'customer') + '\n' +
      'Occasion: ' + (item.label || item.type) + '\n' +
      (item.discountCode ? 'Include this discount code naturally: ' + item.discountCode + '\n' : '') +
      'Keep it under 2 sentences, friendly, no emojis spam. Plain text only.';
    const res = await aiBrain.processPrompt(prompt, { maxTokens: 120 });
    const text = (res && (res.text || res.output || res.content)) || '';
    if (text && text.trim().length > 0) return { text: text.trim(), source: 'ollama' };
  } catch (_) {}
  return { text: fallback, source: 'template' };
}

async function buildGreetings(tenantId, windowDays, today) {
  const due = dueOccasions(tenantId, windowDays, today);
  const out = [];
  for (let i = 0; i < due.length; i++) {
    const g = await composeGreeting(due[i]);
    out.push(Object.assign({}, due[i], { message: g.text, source: g.source }));
  }
  return out;
}

function listContacts(tenantId) {
  return loadStore(tenantId).contacts;
}

function removeContact(tenantId, phone) {
  const store = loadStore(tenantId);
  const before = store.contacts.length;
  store.contacts = store.contacts.filter(function (c) { return c.phone !== phone; });
  saveStore(tenantId, store);
  return before !== store.contacts.length;
}

module.exports = {
  OCCASIONS: OCCASIONS,
  parseMonthDay: parseMonthDay,
  daysUntil: daysUntil,
  upsertContact: upsertContact,
  dueOccasions: dueOccasions,
  templateGreeting: templateGreeting,
  composeGreeting: composeGreeting,
  buildGreetings: buildGreetings,
  listContacts: listContacts,
  removeContact: removeContact
};
