'use strict';
// #58 Shipping — draft-only customer notifications. Consent-gated (#38), advisory-safe.
// NEVER auto-sends. Returns a draft object the operator can review/send elsewhere.
const { CONFIG } = require('./config');

// Optional consent check via #38 messaging consent dept (degrades to allow-draft if absent).
let consent = null;
try { consent = require('../messaging'); } catch (_) { consent = null; }

function hasConsent(tenantId, contactId) {
  if (!consent || typeof consent.checkConsent !== 'function') return true; // advisory: still only a draft
  try {
    const r = consent.checkConsent(tenantId, contactId);
    return r == null ? true : !!r;
  } catch (_) { return true; }
}

function templateFor(status, sh) {
  const tn = sh.trackingNumber ? (' Tracking: ' + sh.trackingNumber) : '';
  const carrier = sh.carrier ? sh.carrier.toUpperCase() : 'carrier';
  switch (status) {
    case 'in_transit':
      return 'Good news! Your order is on its way via ' + carrier + '.' + tn;
    case 'out_for_delivery':
      return 'Your order is out for delivery today via ' + carrier + '.' + tn;
    case 'delivered':
      return 'Your order has been delivered. Thanks for shopping with us!';
    case 'exception':
      return 'There was a delay with your shipment. We are looking into it and will update you soon.';
    default:
      return 'Shipment update: ' + status + '.' + tn;
  }
}

function draftFor(tenantId, sh, status) {
  if (CONFIG.NOTIFY_ON.indexOf(status) === -1) return null;
  if (!sh.notifyCustomer) return null;
  const allowed = hasConsent(tenantId, sh.contactId);
  return {
    type: 'shipping_update',
    status,
    shipmentId: sh.id,
    contactId: sh.contactId,
    consent: allowed,
    draft: true,
    autoSend: false,
    body: templateFor(status, sh),
    note: allowed ? 'draft ready for review' : 'no consent on file — review before sending'
  };
}

module.exports = { draftFor, templateFor };
