// lib/franchisePortal/tierStatusPreview.js — Safe franchise tier/agreement status preview. No mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { maskName } = require('./redactor');

function getTierStatusPreview(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  return safeResponse({
    liveTierMutation: false,
    franchiseMasked: maskName(franchise.name),
    tierSafe: 'tier_preview',
    tierLabelPreview: `${String(franchise.tier || 'Unit').toLowerCase()}_preview`,
    agreementStatusPreview: `${franchise.agreementStatus || 'active'}_preview`,
    warnings: [],
  });
}
module.exports = { getTierStatusPreview };
