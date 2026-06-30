'use strict';

/**
 * Ecommerce Hub — support ticketing.
 * open(): create a ticket from a buyer message; admin gets a ping. reply()/
 * close() move it. Distinct from liveAgent (this persists a thread + status).
 * Persistent JSON. Dry-run safe via orderNotify.send.
 */

const fs = require('fs');
const path = require('path');
const notify = require('./orderNotify');

function storePath() { const p = process.env.ECOMMERCE_HUB_TICKETS_PATH || 'data/ecommerce-tickets.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, tickets: {}, seq: 100, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.tickets) s.tickets = {}; if (!s.seq) s.seq = 100; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }
function adminNumbers() { return String(process.env.ORDER_NOTIFY_ADMIN_NUMBERS || process.env.DARAZ_ADMIN_NUMBERS || '').split(',').map(normNum).filter(Boolean); }

async function open(phone, message) {
  const k = normNum(phone); if (!k) return { ok: false, error: 'phone_required' };
  const s = read(); const id = 'TKT-' + (++s.seq);
  s.tickets[id] = { id: id, phone: k, status: 'open', messages: [{ from: 'buyer', text: String(message || ''), at: Date.now() }], at: Date.now() };
  write(s);
  for (const a of adminNumbers()) await notify.send(a, '\ud83c\udfab *New ticket* ' + id + '\nFrom: ' + k + '\n' + String(message || '').slice(0, 200) + '\nReply: !ticket ' + id + ' <jawab>');
  return { ok: true, id: id, buyerMessage: 'Aapka sawaal ' + id + ' ke tor par note ho gaya. Team jald jawab degi.' };
}
async function reply(id, text, from) {
  const s = read(); const tk = s.tickets[id]; if (!tk) return { ok: false, error: 'not_found' };
  tk.messages.push({ from: from || 'agent', text: String(text || ''), at: Date.now() }); tk.status = 'answered'; write(s);
  if (from !== 'buyer' && tk.phone) await notify.send(tk.phone, '\ud83c\udfab ' + id + ' ka jawab:\n' + String(text || ''));
  return { ok: true, ticket: tk };
}
function close(id) { const s = read(); const tk = s.tickets[id]; if (!tk) return false; tk.status = 'closed'; write(s); return true; }
function list(status) { const t = read().tickets; return Object.keys(t).map(function (k) { return t[k]; }).filter(function (x) { return !status || x.status === status; }); }

module.exports = { open, reply, close, list };
