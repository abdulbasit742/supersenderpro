'use strict';
// #71 Loyalty & Points — tier resolution by lifetime earned points.
const config = require('./config');

function sortedTiers() {
  return [...config.tiers].sort((a, b) => a.minLifetime - b.minLifetime);
}

function tierFor(lifetimeEarned) {
  const pts = Number(lifetimeEarned) || 0;
  const tiers = sortedTiers();
  let current = tiers[0];
  for (const t of tiers) { if (pts >= t.minLifetime) current = t; }
  return current;
}

function nextTier(lifetimeEarned) {
  const pts = Number(lifetimeEarned) || 0;
  const tiers = sortedTiers();
  for (const t of tiers) { if (pts < t.minLifetime) return { tier: t, pointsAway: t.minLifetime - pts }; }
  return null; // already top tier
}

module.exports = { tierFor, nextTier, sortedTiers };
