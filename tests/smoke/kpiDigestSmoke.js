// tests/smoke/kpiDigestSmoke.js
// Offline smoke test for Feature #116. Forces the AI host unreachable so we prove
// the deterministic core + CSV + scheduler work with NO model. No new deps.
// Run: node tests/smoke/kpiDigestSmoke.js

'use strict';

process.env.OLLAMA_HOST = 'http://127.0.0.1:9'; // unreachable on purpose
process.env.LLM_HUB_DRY_RUN = 'true';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Use an isolated CWD so we don't touch real data/.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kpidigest-'));
const origCwd = process.cwd();
process.chdir(tmp);

// Seed a couple of source stores.
function seed(rel, tenant, file, arr) {
  const dir = path.join(tmp, 'data', rel, tenant);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), JSON.stringify(arr));
}

const TENANT = 't_demo';
const now = Date.now();
seed('orders', TENANT, 'o.json', [
  { total: 1500, createdAt: now - 1000 },
  { total: 2500, createdAt: now - 2000 },
  { total: 999, createdAt: now - 5 * 24 * 3600 * 1000 } // outside 24h window
]);
seed('leadIntel', TENANT, 'l.json', [{ createdAt: now - 100 }, { createdAt: now - 200 }]);
seed('supportAgent', TENANT, 'c.json', [
  { ts: now - 50, escalated: false },
  { ts: now - 60, escalated: true },
  { ts: now - 70, escalated: false }
]);

const digest = require(path.join(origCwd, 'lib', 'kpiDigest', 'kpiDigest.js'));

(async () => {
  // 1. tenant required
  assert.throws(() => digest.computeKpis(''), /tenantId is required/, 'must require tenantId');

  // 2. deterministic KPIs
  const d = digest.computeKpis(TENANT, { windowHours: 24, now });
  assert.strictEqual(d.kpis.revenue, 4000, 'revenue should sum only in-window orders');
  assert.strictEqual(d.kpis.orders, 2, 'order count in window');
  assert.strictEqual(d.kpis.avgOrderValue, 2000, 'AOV');
  assert.strictEqual(d.kpis.newLeads, 2, 'new leads');
  assert.strictEqual(d.kpis.conversationsHandled, 3, 'handled');
  assert.strictEqual(d.kpis.escalations, 1, 'escalations');

  // 3. AI unreachable -> falls back to deterministic headline
  const full = await digest.buildDigest(TENANT, { windowHours: 24, now });
  assert.ok(full.headline && full.headline.length > 0, 'headline present even offline');
  assert.ok(/4000/.test(full.headline), 'headline keeps exact revenue');

  // 4. CSV export
  assert.ok(/revenue,4000/.test(full.csv), 'csv contains revenue row');
  assert.ok(/metric,value/.test(full.csv), 'csv header');

  // 5. persist writes files
  const files = digest.persistDigest(TENANT, full);
  assert.ok(fs.existsSync(files.jsonFile), 'json persisted');
  assert.ok(fs.existsSync(files.csvFile), 'csv persisted');

  // 6. scheduler register/list/stop
  const r = digest.scheduleDigest(TENANT, { everyMs: 60000 });
  assert.strictEqual(r.everyMs, 60000, 'scheduled interval');
  assert.ok(digest.listSchedules().includes(TENANT), 'schedule listed');
  assert.strictEqual(digest.stopSchedule(TENANT), true, 'stop returns true');
  assert.strictEqual(digest.listSchedules().includes(TENANT), false, 'schedule cleared');

  process.chdir(origCwd);
  console.log('kpiDigest smoke: OK');
})().catch(e => {
  process.chdir(origCwd);
  console.error('kpiDigest smoke: FAIL', e);
  process.exit(1);
});
