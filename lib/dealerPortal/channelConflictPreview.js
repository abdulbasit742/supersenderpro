// lib/dealerPortal/channelConflictPreview.js — Channel conflict detection preview. No CRM/assignment mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName } = require('./redactor');

function createChannelConflictPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const region = (input.region || dealer.territory && dealer.territory.region || '').toString();
  // Preview heuristic only — never reads/writes live CRM.
  const overlapping = region ? [{ dealerMasked: maskName('Other Partner') }] : [];
  const conflict = overlapping.length > 0;
  return safeResponse({
    liveCrmMutation: false,
    liveAssignmentMutation: false,
    conflictDetectedPreview: conflict,
    overlappingDealersPreview: overlapping,
    suggestedResolutionPreview: conflict ? 'route_to_channel_manager_preview' : '',
    warnings: conflict ? ['channel_conflict_possible'] : [],
  });
}
module.exports = { createChannelConflictPreview };
