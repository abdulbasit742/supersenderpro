'use strict';

/**
 * Ecommerce Hub — WhatsApp click-to-chat deep links + QR.
 * Builds wa.me links with a prefilled message (e.g. for a product or campaign)
 * and a QR image URL (via a public QR endpoint template) for print/ads.
 * Pure URL building; no network.
 */

function waNumber() { return String(process.env.WA_BUSINESS_NUMBER || '').replace(/[^0-9]/g, ''); }

function link(prefillText) {
  const num = waNumber();
  const text = encodeURIComponent(prefillText || '');
  if (!num) return { ok: false, error: 'WA_BUSINESS_NUMBER_not_set' };
  return { ok: true, url: 'https://wa.me/' + num + (text ? ('?text=' + text) : '') };
}
function productLink(productId) { return link('Mujhe product ' + productId + ' chahiye'); }
function qr(prefillText) {
  const l = link(prefillText);
  if (!l.ok) return l;
  const tmpl = process.env.QR_IMAGE_TEMPLATE || 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={url}';
  return { ok: true, waUrl: l.url, qrImage: tmpl.replace('{url}', encodeURIComponent(l.url)) };
}

module.exports = { link, productLink, qr };
