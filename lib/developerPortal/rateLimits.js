// developerPortal/rateLimits.js — local policy-only rate-limit tiers (no enforcement bypass).
const TIERS = {
  free:    { rpm: 30,  rpd: 1000,  burst: 10 },
  starter: { rpm: 120, rpd: 10000, burst: 30 },
  pro:     { rpm: 600, rpd: 100000, burst: 120 },
  partner: { rpm: 1200,rpd: 500000, burst: 240 },
};
function tier(name){ return TIERS[name] || TIERS.free; }
module.exports = { TIERS, tier };
