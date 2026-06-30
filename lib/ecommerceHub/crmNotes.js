'use strict';

/**
 * Ecommerce Hub — lightweight CRM: notes + tags per buyer.
 * addNote()/addTag()/get() keyed by phone. Lets agents leave context ("prefers
 * COD", "VIP", "complained about delay"). Persistent JSON. Read-only to platforms.
 */

const fs = require('fs');
const path = require('path');

function storePath() { const p = process.env.ECOMMERCE_HUB_CRM_PATH || 'data/ecommerce-crm.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, people: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.people) s.people = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }
function ensure(s, k) { if (!s.people[k]) s.people[k] = { phone: k, notes: [], tags: [] }; return s.people[k]; }

function addNote(phone, note) { const k = normNum(phone); if (!k || !note) return false; const s = read(); ensure(s, k).notes.push({ note: String(note), at: Date.now() }); return write(s); }
function addTag(phone, tag) { const k = normNum(phone); if (!k || !tag) return false; const s = read(); const p = ensure(s, k); const t = String(tag).toLowerCase(); if (p.tags.indexOf(t) === -1) p.tags.push(t); return write(s); }
function removeTag(phone, tag) { const k = normNum(phone); const s = read(); const p = s.people[k]; if (!p) return false; p.tags = (p.tags || []).filter(function (x) { return x !== String(tag).toLowerCase(); }); return write(s); }
function get(phone) { const k = normNum(phone); return read().people[k] || { phone: k, notes: [], tags: [] }; }
function byTag(tag) { const t = String(tag || '').toLowerCase(); const ppl = read().people; return Object.keys(ppl).filter(function (k) { return (ppl[k].tags || []).indexOf(t) !== -1; }).map(function (k) { return ppl[k]; }); }

module.exports = { addNote, addTag, removeTag, get, byTag };
