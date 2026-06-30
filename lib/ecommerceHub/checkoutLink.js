'use strict';

/**
 * Ecommerce Hub — abandoned-checkout recovery link builder.
 * Builds a resume-checkout URL from CHECKOUT_LINK_TEMPLATE (with {cartId}{ref})
 * to drop into abandoned-cart nudges. Display-only; pairs with abandonedCart.js.
 */

function template() { return process.env.CHECKOUT_LINK_TEMPLATE || ''; }
function build(opts) { const o = opts || {}; const tmpl = template(); if (!tmpl) return { ok: false, error: 'CHECKOUT_LINK_TEMPLATE_not_set' }; const url = tmpl.replace('{cartId}', encodeURIComponent(o.cartId || '')).replace('{ref}', encodeURIComponent(o.ref || o.phone || '')); return { ok: true, url: url }; }
module.exports = { build };
