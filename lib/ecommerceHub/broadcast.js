'use strict';

/**
 * Ecommerce Hub — opt-out-aware broadcast to past buyers.
 * Sends a message to all known contacts (optionally filtered by platform),
 * skipping anyone who opted out. Throttled. Dry-run safe via orderNotify.send.
 */

const notify = require('./orderNotify');
const contacts = require('./optOutStore');

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function send(message, opts) {
  opts = opts || {};
  if (!message || !String(message).trim()) return { ok: false, error: 'message_required' };
  const list = contacts.listContacts(opts.platform ? { platform: opts.platform } : null);
  const perMinute = Number(process.env.BROADCAST_PER_MINUTE || 30);
  const gap = Math.max(0, Math.floor(60000 / Math.max(1, perMinute)));
  const footer = '\n\nMarketing band karne ke liye STOP likhein.';
  const results = { ok: true, total: list.length, sent: 0, skippedOptOut: 0, details: [] };
  for (const c of list) {
    if (contacts.isOptedOut(c.phone)) { results.skippedOptOut++; continue; }
    const r = await notify.send(c.phone, String(message) + footer);
    results.sent++;
    results.details.push({ phone: c.phone, notified: r });
    if (gap) await sleep(gap);
  }
  return results;
}

module.exports = { send };
