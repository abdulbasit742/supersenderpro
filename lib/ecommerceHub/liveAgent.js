'use strict';

/**
 * Ecommerce Hub — live agent handoff.
 * Buyer types !agent (or "baat karni hai") -> queued for a human; admins get a
 * ping with the buyer's number. Admin resolves with !resolve <phone>. While a
 * buyer is in the queue, the bot stays quiet for them (handled by waCommands).
 * Persistent JSON queue. Dry-run safe via orderNotify.send.
 */

const fs = require('fs');
const path = require('path');
const notify = require('./orderNotify');
const cod = require('./codStore');

function storePath() { const p = process.env.ECOMMERCE_HUB_AGENT_PATH || 'data/ecommerce-agent.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, queue: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.queue) s.queue = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }
function adminNumbers() { return String(process.env.ORDER_NOTIFY_ADMIN_NUMBERS || process.env.DARAZ_ADMIN_NUMBERS || '').split(',').map(normNum).filter(Boolean); }

function isWaiting(phone) { const k = normNum(phone); return !!(k && read().queue[k] && read().queue[k].status === 'waiting'); }

async function request(phone, lastText) {
  const k = normNum(phone); if (!k) return 'Number nahi mila.';
  const s = read();
  s.queue[k] = { phone: k, status: 'waiting', lastText: lastText || null, at: Date.now() };
  write(s);
  for (const a of adminNumbers()) await notify.send(a, '\ud83d\ude4b *Live agent request*\nBuyer: ' + k + (lastText ? ('\nMsg: ' + lastText) : '') + '\nReply: !resolve ' + k);
  return 'Aapki request mil gayi. Hamari team thodi der mein aap se rabta karegi. Shukriya!';
}

function resolve(phone) { const k = normNum(phone); const s = read(); if (s.queue[k]) { s.queue[k].status = 'resolved'; s.queue[k].resolvedAt = Date.now(); write(s); return true; } return false; }
function listWaiting() { const q = read().queue; return Object.keys(q).filter(function (k) { return q[k].status === 'waiting'; }).map(function (k) { return q[k]; }); }

module.exports = { request, resolve, isWaiting, listWaiting };
