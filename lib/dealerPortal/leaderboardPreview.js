// lib/dealerPortal/leaderboardPreview.js — Dealer leaderboard preview. All dealer names masked.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName } = require('./redactor');

function getLeaderboardPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const list = (dealer.leaderboard || []).map((row) => ({ dealerMasked: maskName(row.dealer), rankPreview: Number(row.rank || 0), scorePreview: Number(row.score || 0) }));
  return safeResponse({ liveMutation: false, leaderboardPreview: list, warnings: [] });
}
module.exports = { getLeaderboardPreview };
