'use strict';
/**
 * broadcastPreview.js — Sending Feature #3: dry-run a broadcast before you send it.
 *
 * Blasting hundreds of people is irreversible. This previews a broadcast WITHOUT sending: how many
 * will actually receive it (after removing opted-out/suppressed), how long it'll take given the
 * send-guard throttle, a few sample personalised messages, and warnings (e.g. exceeds today's
 * number capacity). The 'measure twice, cut once' step before any blast.
 *
 * Everything is injected (audience resolver, consent check, render, throttle), so it reflects the
 * REAL pipeline. Sends nothing.
 */

let resolveAudience = null; // (target) => [{ phone, name, ... }]
let canSend = null;         // (phone) => boolean (consent ledger)
let renderMessage = null;   // (template, contact) => text
let capacity = null;        // (tenantId) => { capacityToday:number }
function configure(h = {}) {
  if (typeof h.resolveAudience === 'function') resolveAudience = h.resolveAudience;
  if (typeof h.canSend === 'function') canSend = h.canSend;
  if (typeof h.renderMessage === 'function') renderMessage = h.renderMessage;
  if (typeof h.capacity === 'function') capacity = h.capacity;
}

const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');

/**
 * Preview a broadcast.
 * @param {Object} opts { target, message, tenantId?, delaySec?=4 }
 * @returns {Object} preview report
 */
function preview(opts = {}) {
  const { target, message = '', tenantId, delaySec = 4 } = opts;
  const audience = (resolveAudience ? resolveAudience(target) : []) || [];

  const seen = new Set();
  let reachable = 0, suppressed = 0, invalid = 0, duplicates = 0;
  const samples = [];

  for (const c of audience) {
    const phone = normPhone(c.phone || c.id);
    if (!phone) { invalid++; continue; }
    if (seen.has(phone)) { duplicates++; continue; }
    seen.add(phone);
    if (canSend && !canSend(phone)) { suppressed++; continue; }
    reachable++;
    if (samples.length < 3) {
      const text = renderMessage ? renderMessage(message, c) : message;
      samples.push({ phone, text });
    }
  }

  const etaSeconds = reachable * Number(delaySec || 4);
  const warnings = [];
  if (capacity && tenantId) {
    const cap = (capacity(tenantId) || {}).capacityToday;
    if (typeof cap === 'number' && reachable > cap) {
      warnings.push(`Reach (${reachable}) exceeds today's number capacity (${cap}). Some sends will defer or need another number.`);
    }
  }
  if (!message) warnings.push('Message is empty.');
  if (reachable === 0) warnings.push('No reachable recipients after removing suppressed/invalid.');
  if (reachable > 1000) warnings.push(`Large blast (${reachable}). Consider splitting across days/numbers to protect deliverability.`);

  return {
    audienceTotal: audience.length,
    reachable,
    removed: { suppressed, invalid, duplicates },
    etaSeconds,
    etaHuman: humanizeSeconds(etaSeconds),
    samples,
    warnings,
    willSend: false
  };
}

function humanizeSeconds(s) {
  s = Math.round(s);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  const h = Math.floor(s / 3600); const m = Math.round((s % 3600) / 60);
  return `${h}h ${m}m`;
}

module.exports = { configure, preview };
