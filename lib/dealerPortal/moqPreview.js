// lib/dealerPortal/moqPreview.js — Safe MOQ (minimum order quantity) preview. No mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, safeText } = require('./redactor');

function getMoqPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const items = (dealer.catalog || []).map((p) => ({
    productIdPreview: maskRef(p.id, 'prod'),
    nameSafe: safeText(p.name),
    moqPreview: Number(p.moq || 0),
  }));
  return safeResponse({ liveOrderCreation: false, moqPreview: items });
}
module.exports = { getMoqPreview };
