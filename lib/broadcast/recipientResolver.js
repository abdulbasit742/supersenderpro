// lib/broadcast/recipientResolver.js — resolve a segment/list into recipients
// Best-effort integration with Contacts & Segmentation (#12). Degrades to the
// explicit recipient array passed in when that dept is absent.
'use strict';

const { config } = require('./config');

// Try to pull contacts from the Contacts dept by segment id. Never throws —
// returns null if the dept isn't available so the caller can fall back.
function fromSegment(tenantId, segmentId) {
  if (!segmentId) return null;
  try {
    // Lazy require so a missing sibling dept never breaks broadcast.
    // eslint-disable-next-line global-require
    const contacts = require('../contacts');
    if (contacts && typeof contacts.listBySegment === 'function') {
      const rows = contacts.listBySegment(tenantId, segmentId) || [];
      return rows.map(c => ({ contactId: c.id, phone: c.phone, name: c.name }));
    }
  } catch (_) { /* contacts dept absent — fall back */ }
  return null;
}

// Resolve final recipient list from either an explicit array or a segment id.
// Dedupes by phone, caps at config.maxRecipients.
function resolve(tenantId, { recipients, segmentId } = {}) {
  let list = [];
  const fromSeg = fromSegment(tenantId, segmentId);
  if (Array.isArray(fromSeg)) list = fromSeg;
  else if (Array.isArray(recipients)) list = recipients.slice();

  // normalize + dedupe by phone
  const seen = new Set();
  const out = [];
  for (const r of list) {
    const phone = r && r.phone ? String(r.phone).trim() : '';
    if (!phone || seen.has(phone)) continue;
    seen.add(phone);
    out.push({ contactId: r.contactId || null, phone, name: r.name || null });
    if (out.length >= config.maxRecipients) break;
  }
  return out;
}

module.exports = { resolve, fromSegment };
