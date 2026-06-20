// lib/saasBilling/quotaChecker.js — Compare a tenant's usage against plan limits.
// Returns warn-only results by default. -1 limit = unlimited. Never blocks here;
// the featureGate decides whether to enforce.

const tenantPlans = require('./tenantPlans');
const usageMeter = require('./usageMeter');
const planRegistry = require('./planRegistry');

// Map plan limit keys -> usage metrics they constrain.
const LIMIT_TO_METRIC = {
  channelPostsPerDay: 'channel_posts',
  socialPostsPerDay: 'social_posts',
  customer360Profiles: 'customer360_profiles',
  marketplaceItems: 'marketplace_entities',
  flowRunsPerMonth: 'flow_studio_runs',
  apiCallsPerMonth: 'api_calls',
  ttsCharacters: 'voice_tts_characters',
  sttMinutes: 'voice_stt_minutes',
  teamMembers: 'team_member_seats',
  storageMb: 'storage_estimate_mb',
};

// Per-day limits use the daily rollup; everything else uses monthly.
function periodForLimit(limitKey) {
  return /PerDay$/.test(limitKey) ? 'daily' : 'monthly';
}

function checkTenant(tenantId) {
  const tid = tenantPlans.normalizeTenantId(tenantId);
  const plan = tenantPlans.getTenantPlan(tid);
  const periods = usageMeter.getAllPeriods(tid);
  const results = [];

  for (const [limitKey, metric] of Object.entries(LIMIT_TO_METRIC)) {
    const limit = plan.limits[limitKey];
    if (limit === undefined) continue;
    const period = periodForLimit(limitKey);
    const used = (periods[period].totals[metric]) || 0;
    const unlimited = limit === -1;
    const pct = unlimited || limit === 0 ? 0 : Math.round((used / limit) * 100);
    let level = 'ok';
    if (!unlimited && limit > 0) {
      if (used >= limit) level = 'exceeded';
      else if (pct >= 80) level = 'warning';
    }
    results.push({ limitKey, metric, period, used, limit, unlimited, percent: pct, level });
  }

  const warnings = results.filter((r) => r.level === 'warning');
  const exceeded = results.filter((r) => r.level === 'exceeded');
  return {
    tenantId: tid,
    planId: plan.id,
    overallLevel: exceeded.length ? 'exceeded' : (warnings.length ? 'warning' : 'ok'),
    warnOnly: true,
    results,
    warnings,
    exceeded,
  };
}

// Check a single metric quota (used by featureGate before an action).
function check({ tenantId, metric, increment = 1 } = {}) {
  const full = checkTenant(tenantId);
  const limitKey = Object.keys(LIMIT_TO_METRIC).find((k) => LIMIT_TO_METRIC[k] === metric);
  const row = full.results.find((r) => r.metric === metric) || null;
  let wouldExceed = false;
  if (row && !row.unlimited && row.limit > 0) wouldExceed = (row.used + increment) > row.limit;
  return { tenantId: full.tenantId, planId: full.planId, metric, limitKey, row, wouldExceed, warnOnly: true };
}

module.exports = { LIMIT_TO_METRIC, checkTenant, check, periodForLimit };
