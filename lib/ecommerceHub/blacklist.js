'use strict';

/**
 * Ecommerce Hub — buyer blacklist (block known fraud/abusive numbers).
 * add()/remove()/isBlocked(). Checked by waCommands before processing. Persistent JSON.
 */

const fs = require('fs');
const path = require('path');

function storePath() { const p = process.env.ECOMMERCE_HUB_BLACKLIST_PATH || 'data/ecommerce-blacklist.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, blocked: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.blocked) s.blocked = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }

function add(phone, reason) { const k = normNum(phone); if (!k) return false; const s = read(); s.blocked[k] = { reason: reason || null, at: Date.now() }; return write(s); }
function remove(phone) { const k = normNum(phone); const s = read(); if (s.blocked[k]) { delete s.blocked[k]; write(s); return true; } return false; }
function isBlocked(phone) { const k = normNum(phone); return k ? !!read().blocked[k] : false; }
function list() { const b = read().blocked; return Object.keys(b).map(function (k) { return Object.assign({ phone: k }, b[k]); }); }

module.exports = { add, remove, isBlocked, list };
