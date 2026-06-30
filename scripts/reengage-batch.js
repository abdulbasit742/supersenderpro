#!/usr/bin/env node
// scripts/reengage-batch.js — overnight win-back batch for PC #2 (dry-run unless REENGAGE_LIVE=true).
const path = require('path');
const reengage = require('../lib/reEngagement');
const ds = require('../lib/analyticsInsights/dataSources');
function loadSettings() { try { const fs = require('fs'); const f = path.join(ds.DATA_DIR, 'settings.json'); if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8')); } catch {} return {}; }
function run() { const settings = loadSettings(); const storeIds = ds.listStoreIds(); const live = String(process.env.REENGAGE_LIVE || 'false').toLowerCase() === 'true'; let totalTargeted = 0, totalQueued = 0; for (const storeId of storeIds) { const c = reengage.plan(storeId, settings); totalTargeted += c.summary.targeted; if (c.summary.targeted === 0) { console.log(`[reengage] ${storeId}: nobody to win back today`); continue; } const r = reengage.execute(c.id); totalQueued += r.queuedCount || 0; console.log(`[reengage] ${storeId}: ${c.summary.targeted} targeted (PKR ${c.summary.revenueAtRiskTargeted} at risk) mode=${c.mode} -> ${r.status}` + (live ? ` queued=${r.queuedCount}` : ' (dry-run)')); } console.log(`[reengage] done — stores=${storeIds.length} targeted=${totalTargeted} queued=${totalQueued} live=${live}`); }
if (require.main === module) { try { run(); process.exit(0); } catch (e) { console.error('[reengage] FAILED:', e.message); process.exit(1); } }
module.exports = { run };
