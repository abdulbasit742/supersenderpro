// lib/consentCenter/consentEngine.js — The core. Maintains per-contact consent state
// (opted_in / opted_out / unknown), an auditable change log, and a pre-send gate canSend().
// processInbound() classifies an incoming message and, on a STOP/START keyword, flips consent and
// returns the confirmation text the caller should send back. Consent changes sync to lib/contacts
// when that dept is present so segments/sends everywhere respect the same source of truth.

const store = require('./store');
const { config } = require('./config');
const keywords = require('./keywords');
const { maskContact } = require('./privacy');

let contactsLib = null; try { contactsLib = require('../contacts'); } catch (_e) { contactsLib = null; }

function _token(contact) { return String(contact); }

function _log(d, contact, from, to, source) {
 d.log.push({ id: store.genId('cl'), contactMasked: maskContact(contact), from, to, source, at: store.nowIso() });
 if (d.log.length > 20000) d.log = d.log.slice(-20000);
}

function _syncContacts(contact, status) {
 if (!contactsLib) return;
 try {
 const consent = status === 'opted_out' ? 'opted_out' : (status === 'opted_in' ? 'opted_in' : 'unknown');
 // Upsert ensures the contact exists, then set consent on the matching record.
 const up = contactsLib.contactStore.upsert({ phone: contact, source: 'consent-center' });
 if (up && up.contact && up.contact.id) contactsLib.contactStore.setConsent(up.contact.id, consent);
 } catch (_e) { /* non-fatal: consent center remains source of truth regardless */ }
}

function getStatus(contact) {
 const rec = store.load().consent[_token(contact)];
 return rec ? rec.status : 'unknown';
}

function setStatus(contact, status, source = 'manual') {
 if (!['opted_in', 'opted_out', 'unknown'].includes(status)) throw new Error('invalid status');
 const d = store.load();
 const token = _token(contact);
 const prev = d.consent[token] ? d.consent[token].status : 'unknown';
 d.consent[token] = { status, updatedAt: store.nowIso(), source };
 if (prev !== status) _log(d, contact, prev, status, source);
 store.save(d);
 _syncContacts(contact, status);
 return { contact: maskContact(contact), status, previous: prev };
}

// Classify an inbound message; if it's a STOP/START command, flip consent + return a confirmation.
function processInbound({ contact, text } = {}) {
 if (!contact) throw new Error('contact is required');
 const intent = keywords.classify(text);
 if (intent === 'opt_out') {
 const r = setStatus(contact, 'opted_out', 'inbound_keyword');
 return { intent, changed: r.previous !== 'opted_out', status: 'opted_out', reply: config.optOutConfirmation };
 }
 if (intent === 'opt_in') {
 const r = setStatus(contact, 'opted_in', 'inbound_keyword');
 return { intent, changed: r.previous !== 'opted_in', status: 'opted_in', reply: config.optInConfirmation };
 }
 return { intent: null, changed: false, status: getStatus(contact), reply: null };
}

// THE GATE every send must pass. Returns { allowed, reason, status }.
function canSend(contact) {
 if (!config.enabled) return { allowed: true, reason: 'consent center disabled', status: 'unknown' };
 const status = getStatus(contact);
 if (status === 'opted_out') return { allowed: false, reason: 'contact opted out', status };
 if (status === 'opted_in') return { allowed: true, reason: 'opted in', status };
 // unknown
 return { allowed: !!config.allowUnknownConsent, reason: config.allowUnknownConsent ? 'unknown allowed (opt-out model)' : 'unknown blocked (opt-in model)', status };
}

// Filter a list of contacts down to those allowed to receive a send (for broadcasts).
function filterSendable(contacts = []) {
 const allowed = []; const blocked = [];
 for (const c of contacts) { (canSend(c).allowed ? allowed : blocked).push(c); }
 return { allowed, blocked, allowedCount: allowed.length, blockedCount: blocked.length };
}

function isSuppressed(contact) { return getStatus(contact) === 'opted_out'; }
function suppressionList(limit = 1000) {
 const d = store.load();
 return Object.entries(d.consent).filter(([, v]) => v.status === 'opted_out').slice(0, limit).map(([token, v]) => ({ contactMasked: maskContact(token), since: v.updatedAt, source: v.source }));
}
function log(limit = 200) { return store.load().log.slice(-limit).reverse(); }

function overview() {
 const d = store.load();
 const vals = Object.values(d.consent);
 return {
 generatedAt: store.nowIso(),
 model: config.allowUnknownConsent ? 'opt-out (unknown allowed)' : 'opt-in (unknown blocked)',
 contactsLibSynced: !!contactsLib,
 cards: {
 tracked: vals.length,
 optedOut: vals.filter((v) => v.status === 'opted_out').length,
 optedIn: vals.filter((v) => v.status === 'opted_in').length,
 changes: d.log.length,
 },
 };
}

module.exports = { getStatus, setStatus, processInbound, canSend, filterSendable, isSuppressed, suppressionList, log, overview };
