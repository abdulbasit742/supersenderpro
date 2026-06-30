'use strict';

/**
 * Ecommerce Hub — packing slip / mini shipping-label HTML.
 * Printable slip for an order: items, qty, buyer, address, courier + tracking.
 * Read-only; you feed the order. Pairs with tracking + courierRouter.
 */

function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

function html(order) {
  const o = order || {};
  const rows = (o.items || []).map(function (it) { return '<tr><td>' + esc(it.title || it.name || 'item') + '</td><td style="text-align:center">' + esc(it.qty || 1) + '</td></tr>'; }).join('');
  return '<!doctype html><meta charset="utf-8"><title>Packing Slip ' + esc(o.orderId) + '</title>' +
    '<div style="font-family:system-ui;max-width:480px;margin:auto;padding:20px;border:1px solid #000">' +
    '<h2 style="margin:0 0 6px">Packing Slip</h2>' +
    '<div>Order: <strong>' + esc(o.orderId) + '</strong>' + (o.platform ? ' [' + esc(o.platform) + ']' : '') + '</div>' +
    '<hr><div><strong>Ship to:</strong><br>' + esc(o.buyerName || '') + '<br>' + esc(o.address || '') + '<br>' + esc(o.city || '') + ' ' + esc(o.phone || '') + '</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-top:10px" border="1" cellpadding="6"><tr><th>Item</th><th>Qty</th></tr>' + rows + '</table>' +
    (o.courier || o.trackingId ? ('<div style="margin-top:10px">Courier: ' + esc(o.courier || '-') + ' | Tracking: <strong>' + esc(o.trackingId || '-') + '</strong></div>') : '') +
    (o.cod ? '<div style="margin-top:8px;font-size:18px"><strong>COD: ' + esc((o.currency || "PKR") + ' ' + (o.total != null ? o.total : '')) + '</strong></div>' : '') +
    '</div>';
}

module.exports = { html };
