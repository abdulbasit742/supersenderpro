'use strict';
/**
 * normalizer.js — privacy-safe normalization helpers for Marketplace Intelligence.
 *
 * Hard rules (see docs/MARKETPLACE_INTELLIGENCE_SAFETY.md):
 *  - Never store full phone numbers, emails, tokens or transaction references.
 *  - Never store full raw messages — only short, masked, derived signals.
 */

const crypto = require('crypto');

const PHONE_RE = /\+?\d[\d\s().-]{6,}\d/g;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const TOKEN_RE = /\b(?:sk|pk|ghp|gho|xox[baprs]|AIza|EAACEdEose)[A-Za-z0-9_\-]{8,}\b/g;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;
const LONG_NUM_RE = /\b\d{9,}\b/g; // refs, long ids

/** Stable, non-reversible short id for masking identities. */
function maskId(value, prefix = 'id') {
  const v = String(value || '').trim();
  if (!v) return `${prefix}_unknown`;
  const h = crypto.createHash('sha1').update(v.toLowerCase()).digest('hex').slice(0, 10);
  return `${prefix}_${h}`;
}

/** Mask a person/seller/buyer name to a safe short label (keeps a first token only). */
function maskName(name) {
  const n = String(name || '').trim();
  if (!n) return 'Unknown';
  const first = n.split(/\s+/)[0].slice(0, 18);
  return first.replace(PHONE_RE, '').replace(EMAIL_RE, '') || 'User';
}

/** Strip PII / tokens / URLs and clamp length. Returns a SHORT safe snippet only. */
function safeText(text, maxLen = 160) {
  let out = String(text || '');
  out = out.replace(TOKEN_RE, '[token]')
           .replace(EMAIL_RE, '[email]')
           .replace(URL_RE, '[link]')
           .replace(PHONE_RE, '[phone]')
           .replace(LONG_NUM_RE, '[ref]')
           .replace(/\s{2,}/g, ' ')
           .trim();
  return out.slice(0, maxLen);
}

/** Detect intent: is this an offer (selling) or a demand (buying)? */
function detectIntent(text) {
  const t = String(text || '').toLowerCase();
  const sell = /(for sale|available|sell|selling|stock|rate|price|dealer|wholesale|in stock|brand new|delivery|deal|offer|qeemat|farokht|dastiyab)/;
  const buy = /(want to buy|looking for|need|required|wanted|buyer|dm me|i need|chahiye|darkar|talab|kahan milega|where can i (get|buy))/;
  const isBuy = buy.test(t);
  const isSell = sell.test(t);
  if (isBuy && !isSell) return 'demand';
  if (isSell && !isBuy) return 'offer';
  if (isBuy && isSell) return 'demand'; // mixed → treat the explicit buy verb as demand
  return 'unknown';
}

/** Units that, when attached to a number, mean it is NOT a price (e.g. 128GB, 6.1inch). */
const UNIT_AFTER = /^\s*(gb|tb|mb|kb|kg|g|gram|ml|l|mah|mp|hz|ghz|w|watt|inch|in|"|cm|mm|m|ft|pcs|pc|piece|pieces|%|year|yr|month|day|gen|core)/i;

/** Extract a price number + currency hint from text (PKR-friendly, unit-aware). */
function extractPrice(text) {
  const t = String(text || '');
  // Prefer numbers anchored by a currency/price keyword.
  const anchored = /(?:rs\.?|pkr|₨|\$|usd|price|rate|qeemat|qemat|demand|only|\bfor\b)\s*([0-9][0-9,]{2,})/i;
  const generic = /([0-9][0-9,]{3,})(?:\s*(?:rs|pkr|\/-|rupees))?/i;
  const re = anchored.test(t) ? anchored : generic;
  let m, best = null;
  const scan = new RegExp(re.source, 'gi');
  while ((m = scan.exec(t)) !== null) {
    const after = t.slice(m.index + m[0].length);
    if (UNIT_AFTER.test(after)) continue;           // skip 128GB, 6inch, 5000mah, etc.
    const num = Number(m[1].replace(/,/g, ''));
    if (!Number.isFinite(num) || num < 500) continue; // ignore tiny numbers (model nums, qty)
    best = num; break;
  }
  if (best == null) return null;
  const currency = /\$|usd/i.test(t) ? 'USD' : 'PKR';
  return { value: best, currency };
}

/** Stock signal from text: available | low | out | null. */
function extractStockSignal(text) {
  const t = String(text || '').toLowerCase();
  if (/(out of stock|sold out|khatam|stock out|no stock)/.test(t)) return 'out';
  if (/(few left|limited|last piece|low stock|hurry|jaldi|kam stock|2 left|1 left)/.test(t)) return 'low';
  if (/(in stock|available|dastiyab|ready stock|fresh stock|plenty)/.test(t)) return 'available';
  return null;
}

/** Quantity / budget extraction for buyer requests. */
function extractQuantity(text) {
  const m = String(text || '').match(/\b(\d{1,4})\s*(pcs|pieces|units|qty|adad|nos)\b/i);
  return m ? Number(m[1]) : null;
}

/** Heuristic risk flags on a safe snippet (no raw message stored). */
function riskFlags(text) {
  const t = String(text || '').toLowerCase();
  const flags = [];
  if (/(advance only|100% advance|no cod|send money first|easypaisa only|jazzcash only)/.test(t)) flags.push('advance_only');
  if (/(too cheap|half price|90% off|free free|guaranteed profit)/.test(t)) flags.push('too_good_to_be_true');
  if (/(replica|first copy|master copy|fake|duplicate)/.test(t)) flags.push('counterfeit_signal');
  if (/(dm me|inbox|whatsapp only|no questions)/.test(t)) flags.push('off_platform_push');
  return flags;
}

module.exports = { maskId, maskName, safeText, detectIntent, extractPrice, extractStockSignal, extractQuantity, riskFlags, PHONE_RE, EMAIL_RE, TOKEN_RE };
