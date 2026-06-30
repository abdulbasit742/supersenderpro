#!/usr/bin/env node
// scripts/reengage-batch.js
// Overnight win-back batch — designed to run on PC #2 after analytics-batch.js.
// Plans the day's re-engagement campaign for every store and (only when
// REENGAGE_LIVE=true) queues the follow-ups. Dry-run by default: it will print
// exactly what WOULD go out without sending a thing.
//
// Schedule on PC #2 (after the 3am analytics batch):
//   30 3 * * *  cd /path/to/supersenderpro && REENGAGE_LIVE=false node scripts/reengage-batch.js
// Flip REENGAGE_LIVE=true once you've eyeballed a few dry-run plans.

const path = require('path');
const reengage = require('../lib/reEngagement');
const ds = require('../lib/analyticsInsights/dataSources');

function loadSettings() {
  try {
    const fs = require('fs');
    const f = path.join(ds.DATA_DIR, 'settings.json');
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch { /* ignore */ }
  return {};
}

function run() {
  const settings = loadSettings();
  const storeIds = ds.listStoreIds();
  const live = String(process.env.REENGAGE_LIVE || 'false').toLowerCase() === 'true';
  let totalTargeted = 0;
  let totalQueued = 0;

  for (const storeId of storeIds) {
    const campaign = reengage.plan(storeId, settings);
    totalTargeted += campaign.summary.targeted;
    if (campaign.summary.targeted === 0) {
      console.log(`[reengage] ${storeId}: nobody to win back today`);
      continue;
    }
    const result = reengage.execute(campaign.id);
    totalQueued += result.queuedCount || 0;
    console.log(
      `[reengage] ${storeId}: ${campaign.summary.targeted} targeted ` +
        `(PKR ${campaign.summary.revenueAtRiskTargeted} at risk) ` +
        `mode=${campaign.mode} -> ${result.status}` +
        (live ? ` queued=${result.queuedCount}` : ' (dry-run, nothing sent)')
    );
  }

  console.log(`[reengage] done — stores=${storeIds.length} targeted=${totalTargeted} queued=${totalQueued} live=${live}`);
}

if (require.main === module) {
  try { run(); process.exit(0); }
  catch (e) { console.error('[reengage] FAILED:', e.message); process.exit(1); }
}

module.exports = { run };
