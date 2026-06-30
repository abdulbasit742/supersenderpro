// lib/customer360/profile.js — Roll a contact's timeline into a profile: first/last seen, counts
// by event type, recency/frequency, derived consent (from opt_in/opt_out events seen here), and
// the engagement score. Enriches with lib/contacts (#12) + consent center (#38) when present.
// Read-only; PII masked.

const timeline = require('./timeline');
const engagement = require('./engagement');
const { maskContact } = require('./privacy');

let contactsLib = null; try { contactsLib = require('../contacts'); } catch (_e) { contactsLib = null; }
let consentLib = null; try { consentLib = require('../consentCenter'); } catch (_e) { consentLib = null; }

function _countsByType(events) {
 const m = {};
 for (const e of events) m[e.type] = (m[e.type] || 0) + 1;
 return m;
}

function build(contact, refNow = Date.now()) {
 const events = timeline.rawEvents(contact);
 const counts = _countsByType(events);
 const times = events.map((e) => Date.parse(e.at)).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
 const firstSeen = times.length ? new Date(times[0]).toISOString() : null;
 const lastSeen = times.length ? new Date(times[times.length - 1]).toISOString() : null;
 const recencyDays = times.length ? Math.floor((refNow - times[times.length - 1]) / 86400000) : null;
 const eng = engagement.score(events, refNow);

 // Best-effort consent: prefer the consent center, else infer from events.
 let consent = 'unknown';
 if (consentLib) { try { consent = consentLib.consentEngine.getStatus(contact); } catch (_e) { /* ignore */ } }
 if (consent === 'unknown') {
 const lastConsentEv = events.filter((e) => e.type === 'opt_in' || e.type === 'opt_out').sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
 if (lastConsentEv) consent = lastConsentEv.type === 'opt_out' ? 'opted_out' : 'opted_in';
 }

 // Optional enrichment from the contact book (name/tags) — masked.
 let tags = []; let nameKnown = false;
 if (contactsLib) {
 try {
 const all = contactsLib.contactStore.all();
 const match = all.find((c) => c.phoneMasked === maskContact(contact) || c.emailMasked === maskContact(contact));
 if (match) { tags = match.tags || []; nameKnown = !!match.nameMasked; }
 } catch (_e) { /* ignore */ }
 }

 return {
 contactMasked: maskContact(contact),
 firstSeen, lastSeen, recencyDays,
 totalEvents: events.length, countsByType: counts,
 payments: counts.payment || 0, clicks: counts.click || 0,
 ticketsOpened: counts.ticket_opened || 0, surveyResponses: counts.survey_response || 0,
 consent, tags, nameKnown,
 engagement: eng,
 };
}

module.exports = { build };
