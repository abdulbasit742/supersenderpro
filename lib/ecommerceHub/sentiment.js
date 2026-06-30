'use strict';

/**
 * Ecommerce Hub — lightweight sentiment tag (rule-based, no deps).
 * classify(text) -> positive | negative | neutral, using small PK/EN lexicons.
 * Used to tag conversations + prioritize negative ones.
 */

const POS = ['shukriya', 'thanks', 'thank you', 'acha', 'achha', 'zabardast', 'best', 'great', 'love', 'pasand', 'mashallah', 'perfect', 'good'];
const NEG = ['bura', 'bakwas', 'ghatiya', 'worst', 'bekar', 'kharab', 'late', 'der', 'fraud', 'cheat', 'refund', 'complaint', 'shikayat', 'angry', 'naraz'];
function classify(text) {
  const t = String(text || '').toLowerCase();
  let p = 0, n = 0;
  POS.forEach(function (w) { if (t.indexOf(w) !== -1) p++; });
  NEG.forEach(function (w) { if (t.indexOf(w) !== -1) n++; });
  if (n > p) return 'negative';
  if (p > n) return 'positive';
  return 'neutral';
}
module.exports = { classify };
