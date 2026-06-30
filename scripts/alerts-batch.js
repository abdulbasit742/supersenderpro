#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const anomalies = require('../lib/anomalies');
let ds = null; try { ds = require('../lib/analyticsInsights/dataSources'); } catch {}
const OUT = path.join(__dirname, '..', 'public', 'alerts', 'feed.json');
const PUSH = String(process.env.ALERTS_PUSH || 'false').toLowerCase() === 'true';
const OWNER = process.env.OWNER_WHATSAPP || process.env.ADMIN_PHONE || '';
function run() { let storeIds = ['default_store']; try { if (ds) storeIds = ds.listStoreIds(); } catch {} const feed = { generatedAt: new Date().toISOString(), push: PUSH, stores: storeIds, alerts: [] }; const toPush = []; for (const storeId of storeIds) { const { fresh, all } = anomalies.scan(storeId); feed.alerts.push(...all.map((a) => ({ ...a, storeId }))); for (const a of fresh) if (a.severity === 'critical' || a.severity === 'warning') toPush.push({ storeId, ...a }); console.log(`[alerts] ${storeId}: ${all.length} active, ${fresh.length} new`); } const rank = { critical: 0, warning: 1, notice: 2, positive: 3 }; feed.alerts.sort((a, b) => rank[a.severity] - rank[b.severity]); fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(feed, null, 2)); if (toPush.length) { if (PUSH && OWNER && global.sendDirect) { const lines = toPush.map((a) => `\u2022 [${a.severity.toUpperCase()}] ${a.headline}`).join('\n'); global.sendDirect(OWNER, `\uD83D\uDCCA *SuperSender alert*\n${lines}`, { source: 'AnomalyAlerts' }).catch(() => {}); console.log(`[alerts] pushed ${toPush.length} to owner`); } else { console.log(`[alerts] ${toPush.length} would be pushed (dry-run)`); } } console.log(`[alerts] done — stores=${storeIds.length} active=${feed.alerts.length} push=${PUSH}`); return feed; }
if (require.main === module) { try { run(); process.exit(0); } catch (e) { console.error('[alerts] FAILED:', e.message); process.exit(1); } }
module.exports = { run };
