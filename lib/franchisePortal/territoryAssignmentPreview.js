// lib/franchisePortal/territoryAssignmentPreview.js — Safe territory/area assignment preview. No mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { maskName, safeText } = require('./redactor');

function getTerritoryAssignmentPreview(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  const t = franchise.territory || {};
  return safeResponse({
    liveTerritoryMutation: false,
    franchiseMasked: maskName(franchise.name),
    territoryCodePreview: safeText(t.code || 'territory'),
    exclusivityPreview: `${t.exclusivity || 'non_exclusive'}_preview`,
    statusPreview: `${t.status || 'active'}_preview`,
    warnings: [],
  });
}
module.exports = { getTerritoryAssignmentPreview };
