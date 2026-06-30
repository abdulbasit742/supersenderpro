'use strict';

/**
 * Ecommerce Hub — tax/GST calculation.
 * Computes tax on a subtotal using TAX_RATE_PCT (default 0) and supports
 * inclusive or exclusive pricing via TAX_INCLUSIVE. Pure math, configurable.
 */

function ratePct() { return Number(process.env.TAX_RATE_PCT || 0); }
function inclusive() { return String(process.env.TAX_INCLUSIVE || 'false').toLowerCase() === 'true'; }

// compute(subtotal) -> { taxRate, tax, net, gross }
function compute(subtotal) {
  const amt = Number(subtotal || 0);
  const rate = ratePct() / 100;
  if (rate <= 0) return { taxRate: 0, tax: 0, net: amt, gross: amt };
  if (inclusive()) {
    const net = amt / (1 + rate);
    return { taxRate: ratePct(), tax: round(amt - net), net: round(net), gross: round(amt) };
  }
  const tax = amt * rate;
  return { taxRate: ratePct(), tax: round(tax), net: round(amt), gross: round(amt + tax) };
}
function round(v) { return Math.round(Number(v || 0) * 100) / 100; }

module.exports = { compute, ratePct, inclusive };
