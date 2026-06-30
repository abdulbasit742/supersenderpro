// lib/audienceSegments/contactSource.js — Pluggable, READ-ONLY contact source. By default it
// auto-detects the existing lib/storeCRM; a custom source can be injected via setSource(fn).
// A contact is normalized to: { contact, name, tags[], attributes{}, lastActiveAt, totalSpend, createdAt }.
// Nothing here writes to any contact store.

const { config } = require('./config');

let _customSource = null; // async/sync () => rawContacts[]
function setSource(fn) { _customSource = (typeof fn === 'function') ? fn : null; return !!_customSource; }

let _legacy = null;
try { _legacy = require('../storeCRM'); } catch (_e) { _legacy = null; }

function _coerceArray(x) {
 if (!x) return [];
 if (Array.isArray(x)) return x;
 if (typeof x === 'object') {
 for (const k of ['customers', 'contacts', 'records', 'items', 'profiles']) {
 if (Array.isArray(x[k])) return x[k];
 }
 return Object.values(x).filter((v) => v && typeof v === 'object');
 }
 return [];
}

function _normalize(raw) {
 if (!raw || typeof raw !== 'object') return null;
 const contact = raw.contact || raw.phone || raw.number || raw.wa || raw.email || raw.id || null;
 if (!contact) return null;
 const tags = Array.isArray(raw.tags) ? raw.tags : (typeof raw.tags === 'string' ? raw.tags.split(',').map((s) => s.trim()).filter(Boolean) : []);
 return {
 contact: String(contact),
 name: raw.name || raw.fullName || raw.displayName || '',
 tags,
 attributes: raw.attributes || raw.attrs || raw.custom || {},
 lastActiveAt: raw.lastActiveAt || raw.lastSeen || raw.updatedAt || null,
 totalSpend: Number(raw.totalSpend || raw.spend || raw.ltv || 0) || 0,
 createdAt: raw.createdAt || raw.created || null,
 raw,
 };
}

async function fetchContacts() {
 let rawList = [];
 try {
 if (_customSource) rawList = await _customSource();
 else if (_legacy) {
 if (typeof _legacy.listCustomers === 'function') rawList = await _legacy.listCustomers();
 else if (typeof _legacy.all === 'function') rawList = await _legacy.all();
 else if (typeof _legacy.getAll === 'function') rawList = await _legacy.getAll();
 else if (typeof _legacy.list === 'function') rawList = await _legacy.list();
 }
 } catch (_e) { rawList = []; }
 const arr = _coerceArray(rawList).slice(0, config.maxScan);
 return arr.map(_normalize).filter(Boolean);
}

function sourceInfo() {
 return {
 custom: !!_customSource,
 legacyStoreCRM: !!_legacy,
 usingFallback: !_customSource && !_legacy,
 };
}

module.exports = { setSource, fetchContacts, sourceInfo, _normalize };
