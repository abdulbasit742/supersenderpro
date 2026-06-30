'use strict';

/**
 * Ecommerce Hub — multi-currency display helper.
 * Static/admin-set rates relative to base (PKR). convert() + format(). No live
 * FX call by default (keeps it offline + free); rates come from CURRENCY_RATES
 * env JSON like {"USD":0.0036,"AED":0.0132} meaning 1 PKR = x foreign.
 */

function base() { return String(process.env.CURRENCY_BASE || 'PKR'); }
function rates() { try { return JSON.parse(process.env.CURRENCY_RATES || '{}'); } catch (_e) { return {}; } }

function convert(amountPkr, to) {
  const r = rates();
  const t = String(to || base()).toUpperCase();
  if (t === base()) return Number(amountPkr || 0);
  if (r[t] == null) return null;
  return Number(amountPkr || 0) * Number(r[t]);
}
function format(amountPkr, to) {
  const v = convert(amountPkr, to);
  if (v == null) return base() + ' ' + Math.round(Number(amountPkr || 0));
  return String(to).toUpperCase() + ' ' + (Math.round(v * 100) / 100);
}
function supported() { return [base()].concat(Object.keys(rates())); }

module.exports = { convert, format, supported, base, rates };
