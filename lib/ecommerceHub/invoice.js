'use strict';

/**
 * Ecommerce Hub — invoice builder (read-only).
 * Builds a plain-text WhatsApp invoice and an HTML invoice for an order object.
 * No platform writes; you feed it the order (from order-event) + line items.
 */

function money(cur, v) { return (cur || 'PKR') + ' ' + (v == null ? '0' : v); }

function compute(order) {
  const o = order || {};
  const items = o.items || [];
  let subtotal = o.subtotal;
  if (subtotal == null) subtotal = items.reduce(function (n, it) { return n + (Number(it.price || 0) * Number(it.qty || 1)); }, 0);
  const shipping = Number(o.shipping || 0);
  const discount = Number(o.discount || 0);
  const total = o.total != null ? Number(o.total) : (subtotal + shipping - discount);
  return { subtotal: subtotal, shipping: shipping, discount: discount, total: total, currency: o.currency || 'PKR' };
}

function textInvoice(order) {
  const o = order || {};
  const c = compute(o);
  const lines = ['\ud83e\uddfe *Invoice \u2014 Order ' + (o.orderId || '') + '*'];
  if (o.buyerName) lines.push('Buyer: ' + o.buyerName);
  (o.items || []).forEach(function (it) { lines.push('\u2022 ' + (it.qty || 1) + 'x ' + (it.title || it.name || 'item') + ' \u2014 ' + money(c.currency, (it.price || 0) * (it.qty || 1))); });
  lines.push('\nSubtotal: ' + money(c.currency, c.subtotal));
  if (c.shipping) lines.push('Shipping: ' + money(c.currency, c.shipping));
  if (c.discount) lines.push('Discount: -' + money(c.currency, c.discount));
  lines.push('*Total: ' + money(c.currency, c.total) + '*');
  if (o.paymentMethod) lines.push('Payment: ' + o.paymentMethod);
  return lines.join('\n');
}

function htmlInvoice(order) {
  const o = order || {}; const c = compute(o);
  const rows = (o.items || []).map(function (it) { return '<tr><td>' + (it.title || it.name || 'item') + '</td><td>' + (it.qty || 1) + '</td><td>' + money(c.currency, (it.price || 0) * (it.qty || 1)) + '</td></tr>'; }).join('');
  return '<!doctype html><meta charset="utf-8"><title>Invoice ' + (o.orderId || '') + '</title>' +
    '<div style="font-family:system-ui;max-width:600px;margin:auto;padding:24px">' +
    '<h2>Invoice \u2014 Order ' + (o.orderId || '') + '</h2>' +
    (o.buyerName ? '<p>Buyer: ' + o.buyerName + '</p>' : '') +
    '<table style="width:100%;border-collapse:collapse" border="1" cellpadding="6"><tr><th>Item</th><th>Qty</th><th>Amount</th></tr>' + rows + '</table>' +
    '<p>Subtotal: ' + money(c.currency, c.subtotal) + '<br>' + (c.shipping ? 'Shipping: ' + money(c.currency, c.shipping) + '<br>' : '') + (c.discount ? 'Discount: -' + money(c.currency, c.discount) + '<br>' : '') +
    '<strong>Total: ' + money(c.currency, c.total) + '</strong></p></div>';
}

module.exports = { textInvoice, htmlInvoice, compute };
