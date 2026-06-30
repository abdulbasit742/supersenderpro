'use strict';
/**
 * segmentBroadcast.js — Marketing Automation Feature #3: broadcast to a SEGMENT.
 *
 * Ties together Feature #1 (segments) and the one-click broadcast hub (lib/broadcastHub.js):
 * pick a segment, write one message, and it goes to exactly the contacts that match that segment
 * right now — not a stale list.
 *
 * This module is deliberately thin and storage-agnostic:
 *   - `setContactLoader(fn)`  : how to fetch the CRM contacts for a store -> array of contacts
 *   - sending is delegated to broadcastHub (which owns the WA client, throttle, and logging)
 *
 * A "contact" must expose a phone we can message. We normalise to wa-style ids (<digits>@c.us).
 */

const segmentEngine = require('./segmentEngine');

let broadcastHub = null;
try { broadcastHub = require('../broadcastHub'); } catch { broadcastHub = null; }

// Injected: (storeId) => Contact[]
let contactLoader = null;
function setContactLoader(fn) { contactLoader = typeof fn === 'function' ? fn : null; }

// Allow overriding the hub (e.g. tests) but default to the real one-click broadcast hub.
function setBroadcastHub(hub) { broadcastHub = hub || broadcastHub; }

function toWaId(contact) {
  const raw = String(contact.phone || contact.id || '').trim();
  if (!raw) return null;
  if (raw.includes('@')) return raw;            // already a wa id
  const digits = raw.replace(/[^\d]/g, '');
  return digits ? `${digits}@c.us` : null;
}

/**
 * Resolve a segment to the list of WhatsApp recipient ids it currently matches.
 * Returns { segment, ids, contacts }.
 */
function resolveRecipients(segmentId, storeId) {
  const segment = segmentEngine.getSegment(segmentId);
  if (!segment) return { segment: null, ids: [], contacts: [] };
  if (!contactLoader) throw new Error('no contact loader wired (call setContactLoader)');

  const all = contactLoader(storeId != null ? storeId : segment.storeId) || [];
  const matched = segmentEngine.filterContacts(all, segment);

  const seen = new Set();
  const ids = [];
  for (const c of matched) {
    const id = toWaId(c);
    if (id && !seen.has(id)) { seen.add(id); ids.push(id); }
  }
  return { segment, ids, contacts: matched };
}

/**
 * Broadcast one message to everyone in a segment.
 * @param {Object} opts
 * @param {string} opts.segmentId   which segment to target
 * @param {string} opts.message     text body / caption
 * @param {string} [opts.mediaPath] optional local path or http(s) url
 * @param {string|number} [opts.storeId]
 * @param {number} [opts.delayMs]   per-recipient throttle (defaults to hub's)
 */
async function broadcastToSegment(opts = {}) {
  const { segmentId, message = '', mediaPath = null, storeId, delayMs } = opts;
  if (!segmentId) throw new Error('segmentId is required');
  if (!message && !mediaPath) throw new Error('message or mediaPath is required');
  if (!broadcastHub) throw new Error('broadcast hub not available');

  const { segment, ids } = resolveRecipients(segmentId, storeId);
  if (!segment) throw new Error('segment not found');
  if (!ids.length) return { ok: true, segmentId, total: 0, sent: 0, failed: 0, note: 'segment matched no contacts' };

  // Hand the explicit, segment-resolved ids straight to the hub's fan-out.
  const result = await broadcastHub.sendToAll({ message, mediaPath, targets: { ids }, delayMs });
  return { ok: true, segmentId, segmentName: segment.name, ...result };
}

/** Preview only: how many / who would receive, without sending. */
function previewSegmentBroadcast(segmentId, storeId, limit = 100) {
  const { segment, ids, contacts } = resolveRecipients(segmentId, storeId);
  if (!segment) return { segment: null, count: 0, sample: [] };
  return {
    segment: { id: segment.id, name: segment.name },
    count: ids.length,
    sample: contacts.slice(0, Math.min(Number(limit) || 100, 500))
  };
}

module.exports = {
  setContactLoader,
  setBroadcastHub,
  resolveRecipients,
  broadcastToSegment,
  previewSegmentBroadcast
};
