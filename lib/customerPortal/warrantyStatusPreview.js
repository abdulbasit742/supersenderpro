// lib/customerPortal/warrantyStatusPreview.js — Safe warranty / repair status previews.
'use strict';

const store = require('./store');
const { safeResponse } = require('./customerPortalModel');
const { maskRef, safeText } = require('./redactor');

function expiringSoon(dateStr, days = 30) {
  return dateStr && new Date(dateStr).getTime() - Date.now() < days * 86400000;
}

function listWarranty(input = {}) {
  const { customer } = store.findCustomerPreview(input);
  const warnings = [];
  const claims = (customer.warranties || []).map((w) => {
    if (w.status === 'expiring' || expiringSoon(w.expiry)) warnings.push('warranty_expiring');
    return {
      warrantyIdPreview: maskRef(w.id, 'wty'),
      productSafe: safeText(w.product),
      statusPreview: `${w.status}_preview`,
      expiryPreview: w.expiry || '',
    };
  });
  return safeResponse({ liveJobMutation: false, warrantyPreview: claims, warnings });
}

function getWarrantyStatusPreview(input = {}) {
  const list = listWarranty(input);
  const first = (list.warrantyPreview || [])[0] || {};
  return safeResponse({ warrantyClaimPreview: first, warnings: list.warnings });
}

module.exports = { listWarranty, getWarrantyStatusPreview };
