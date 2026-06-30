// lib/audienceSegments/evaluator.js — Evaluate a segment against the live contact source and
// resolve it to a recipient list. READ-ONLY over contacts. Previews mask PII; resolve returns
// raw contacts (capped) for downstream sends (broadcast / drip enrollment).

const { config } = require('./config');
const contactSource = require('./contactSource');
const ruleEngine = require('./ruleEngine');
const segmentStore = require('./segmentStore');
const { maskContact } = require('./privacy');

async function _matchingContacts(segment, refNow = Date.now()) {
 const contacts = await contactSource.fetchContacts();
 return contacts.filter((c) => ruleEngine.matches(segment, c, refNow));
}

// Count + masked sample (for the UI). Never returns raw phone numbers.
async function preview(segmentOrId, { sample = 10 } = {}) {
 const segment = (typeof segmentOrId === 'string') ? segmentStore.get(segmentOrId) : segmentOrId;
 if (!segment) throw new Error('segment not found');
 const scanned = (await contactSource.fetchContacts()).length;
 const matched = await _matchingContacts(segment);
 return {
 segmentId: segment.id || null,
 name: segment.name || null,
 scanned,
 matchCount: matched.length,
 sample: matched.slice(0, sample).map((c) => ({ contactMasked: maskContact(c.contact), name: c.name || null, tags: c.tags || [] })),
 source: contactSource.sourceInfo(),
 };
}

// Resolve to an actual recipient list (capped). Used by broadcast + drip. Returns raw contacts.
async function resolve(segmentOrId, { limit } = {}) {
 const segment = (typeof segmentOrId === 'string') ? segmentStore.get(segmentOrId) : segmentOrId;
 if (!segment) throw new Error('segment not found');
 const cap = Math.min(Number(limit) || config.maxResolveSize, config.maxResolveSize);
 const matched = await _matchingContacts(segment);
 const recipients = matched.slice(0, cap).map((c) => ({ contact: c.contact, name: c.name || '' }));
 return { segmentId: segment.id || null, total: matched.length, returned: recipients.length, capped: matched.length > cap, recipients };
}

// Test an ad-hoc (unsaved) rule set without persisting it.
async function test({ match = 'all', conditions = [] } = {}, opts = {}) {
 ruleEngine.validateConditions(conditions);
 return preview({ match, conditions }, opts);
}

module.exports = { preview, resolve, test };
