// lib/franchisePortal/outletListPreview.js — Safe outlet list preview. No mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { maskRef, safeText } = require('./redactor');

function listOutlets(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  const items = (franchise.outlets || []).map((o) => ({
    outletIdPreview: maskRef(o.id, 'outlet'),
    nameSafe: safeText(o.name),
    statusPreview: `${o.status || 'active'}_preview`,
    staffCountPreview: Number(o.staffCount || 0),
  }));
  return safeResponse({ liveOutletMutation: false, outletsPreview: items });
}
module.exports = { listOutlets };
