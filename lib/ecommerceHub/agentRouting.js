'use strict';

/**
 * Ecommerce Hub — agent round-robin assignment.
 * Distributes live-agent/ticket load across AGENT_NUMBERS in rotation, so no
 * single agent is overloaded. Persistent pointer. Returns the assigned agent.
 */

const fs = require('fs');
const path = require('path');
function storePath() { const p = process.env.ECOMMERCE_HUB_AGENTRR_PATH || 'data/ecommerce-agentrr.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function read() { try { return JSON.parse(fs.readFileSync(storePath(), 'utf8')); } catch (_e) { return { version: 1, idx: 0, assigned: {} }; } }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function write(s) { try { ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }
function agents() { return String(process.env.AGENT_NUMBERS || process.env.ORDER_NOTIFY_ADMIN_NUMBERS || '').split(',').map(normNum).filter(Boolean); }
function assign(buyerPhone) { const a = agents(); if (!a.length) return null; const s = read(); const agent = a[s.idx % a.length]; s.idx = (s.idx + 1) % a.length; if (buyerPhone) s.assigned[normNum(buyerPhone)] = agent; write(s); return agent; }
function agentFor(buyerPhone) { return read().assigned[normNum(buyerPhone)] || null; }
module.exports = { assign, agentFor, agents };
