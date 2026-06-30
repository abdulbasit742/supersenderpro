'use strict';
/**
 * occasionCampaigns.js — Marketing Feature #7: birthday / anniversary auto-greetings.
 *
 * A "Happy Birthday, here's 15% off" message lands like nothing else — it feels personal and drives
 * repeat sales. This stores per-contact dates (birthday, anniversary, or custom occasions) and a
 * daily sweep() finds whose occasion is TODAY, then sends a templated greeting (optionally with a
 * discount code) via the guarded sender. Dedupes so each occasion fires at most once per year.
 *
 * Decoupled: sender + (optional) discount creator injected. Storage: JSON (data/occasions.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'occasions.json');

let sender = null; // async (phone, text) => any
function setSender(fn) { sender = typeof fn === 'function' ? fn : null; }

let CONFIG = {
  birthday: { message: 'Happy Birthday, {{name}}! 🎉 Enjoy a special treat from us today.' },
  anniversary: { message: 'Happy anniversary with us, {{name}}! 🎊 Thank you for being with us.' }
};
function configure(opts = {}) { CONFIG = { ...CONFIG, ...opts }; return CONFIG; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { dates: [] }; }
  catch { return { dates: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');
function mmdd(dateStr) { const d = new Date(dateStr); return Number.isNaN(d.getTime()) ? null : `${d.getMonth()+1}-${d.getDate()}`; }
function todayMMDD() { const d = new Date(); return `${d.getMonth()+1}-${d.getDate()}`; }

/**
 * Set an occasion date for a contact.
 * @param {Object} opts { phone, name?, type:'birthday'|'anniversary'|custom, date (ISO/any parseable) }
 */
function setDate(opts = {}) {
  const phone = normPhone(opts.phone);
  if (!phone) throw new Error('phone required');
  if (!opts.type) throw new Error('type required');
  if (!mmdd(opts.date)) throw new Error('valid date required');
  const data = load();
  let rec = data.dates.find(d => d.phone === phone && d.type === opts.type);
  if (!rec) { rec = { phone, type: opts.type, name: opts.name || '', date: opts.date, lastFiredYear: null }; data.dates.push(rec); }
  else { rec.date = opts.date; if (opts.name) rec.name = opts.name; }
  save(data);
  return rec;
}

function listDates(phone) {
  const data = load();
  return phone ? data.dates.filter(d => d.phone === normPhone(phone)) : data.dates;
}

function render(tpl, vars) { return String(tpl || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : '')); }

/**
 * Daily sweep: send greetings for everyone whose occasion is today (once per year).
 * @returns {Promise<{ sent, matched }>}
 */
async function sweep() {
  const data = load();
  const today = todayMMDD();
  const year = new Date().getFullYear();
  let sent = 0, matched = 0;

  for (const rec of data.dates) {
    if (mmdd(rec.date) !== today) continue;
    if (rec.lastFiredYear === year) continue; // already greeted this year
    matched++;
    const cfg = CONFIG[rec.type] || { message: `Happy {{type}}, {{name}}!` };
    const text = render(cfg.message, { name: rec.name || 'there', type: rec.type });
    if (sender) {
      try {
        const to = rec.phone.includes('@') ? rec.phone : `${rec.phone}@c.us`;
        await sender(to, text);
        rec.lastFiredYear = year;
        rec.lastFiredAt = nowIso();
        sent++;
      } catch { /* skip */ }
    }
  }
  save(data);
  return { sent, matched, date: today };
}

module.exports = { configure, setSender, setDate, listDates, sweep };
