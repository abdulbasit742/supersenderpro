// lib/dealerPortal/dealerClaimPipelinePreview.js — Aggregated claim pipeline preview. No claim mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, safeText } = require('./redactor');

function getClaimPipelinePreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const warnings = [];
  const list = (dealer.claimPipeline || []).map((c) => {
    if (c.stage !== 'approved' && c.stage !== 'closed') warnings.push('claim_open');
    return { claimIdPreview: maskRef(c.id, 'clm'), typeSafe: safeText(c.type), stagePreview: `${c.stage || 'unknown'}_preview` };
  });
  const byStage = list.reduce((acc, c) => { acc[c.stagePreview] = (acc[c.stagePreview] || 0) + 1; return acc; }, {});
  return safeResponse({ liveClaimMutation: false, claimPipelinePreview: list, stageCountsPreview: byStage, warnings: [...new Set(warnings)] });
}
module.exports = { getClaimPipelinePreview };
