// lib/franchisePortal/headcountPreview.js — Safe per-outlet staff headcount preview. No PII, no mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { maskRef, safeText } = require('./redactor');

function getHeadcountPreview(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  const items = (franchise.outlets || []).map((o) => ({
    outletIdPreview: maskRef(o.id, 'outlet'),
    nameSafe: safeText(o.name),
    staffCountPreview: Number(o.staffCount || 0),
  }));
  const total = items.reduce((s, i) => s + i.staffCountPreview, 0);
  return safeResponse({ liveHrMutation: false, headcountByOutletPreview: items, totalHeadcountPreview: total });
}
module.exports = { getHeadcountPreview };
