'use strict';

/**
 * Ecommerce Hub — payment link generator (display-only).
 * Builds a prepaid payment link from a configurable template (PAY_LINK_TEMPLATE,
 * e.g. a JazzCash/Easypaisa/Stripe checkout base with {amount}{ref}). Does NOT
 * capture payment itself (keeps the no-payment guarantee); it just formats a URL
 * your existing gateway issues.
 */

function template() { return process.env.PAY_LINK_TEMPLATE || ''; }

function build(opts) {
  const o = opts || {};
  const amount = Number(o.amount || 0);
  const ref = encodeURIComponent(o.ref || o.orderId || ('ORD' + Date.now()));
  const tmpl = template();
  if (!tmpl) return { ok: false, error: 'PAY_LINK_TEMPLATE_not_set' };
  const url = tmpl.replace('{amount}', String(amount)).replace('{ref}', ref).replace('{currency}', o.currency || 'PKR');
  return { ok: true, url: url, amount: amount, ref: o.ref || o.orderId };
}
function reply(opts) { const r = build(opts); if (!r.ok) return 'Payment link abhi configure nahi (PAY_LINK_TEMPLATE set karein).'; return '\ud83d\udcb3 Payment link:\n' + r.url; }

module.exports = { build, reply };
