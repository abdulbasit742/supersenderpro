'use strict';
// Offline smoke test. Forces an unreachable Ollama host so the deterministic
// core + template fallback are exercised with NO model. Auto-discovered by
// scripts/ci-smoke.js. Exits non-zero on failure.
process.env.OLLAMA_HOST = 'http://127.0.0.1:0';
process.env.CHURN_USE_MODEL = 'false';
process.env.CHURN_RISK_THRESHOLD = '60';

const os = require('os');
const path = require('path');
const fs = require('fs');

// Isolate data dir to a temp cwd so we never touch real tenant data.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'churn-smoke-'));
process.chdir(tmp);

(async () => {
  const churn = require(path.join(__dirname, '..', '..', 'lib', 'churnPredictor'));
  const doctor = require(path.join(__dirname, '..', '..', 'lib', 'churnPredictor', 'doctor'));
  const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exit(1); } };

  // tenantId required
  let threw = false;
  try { churn.upsertContacts('', []); } catch { threw = true; }
  assert(threw, 'missing tenantId must throw');

  const now = Date.now();
  churn.upsertContacts('t1', [
    { phone: '923001112233', lastOrderAt: new Date(now - 90 * 864e5).toISOString(), orderCount: 1, lifetimeValue: 800, recentReplies: 0 },
    { phone: '923004445566', lastOrderAt: new Date(now - 2 * 864e5).toISOString(), orderCount: 14, lifetimeValue: 120000, recentReplies: 6 }
  ]);

  const out = await churn.predict('t1', { now });
  assert(out.summary.total === 2, 'should score 2 contacts');
  assert(out.summary.aiUsed === false, 'model disabled => no aiNote');
  assert(out.flagged.length >= 1, 'stale contact should be flagged');
  const top = out.flagged[0];
  assert(!String(top.phoneMasked).includes('1112'), 'phone must be masked');
  assert(top.winBackDraft && top.winBackDraft.length > 0, 'template win-back draft present');
  assert(top.dryRun === true, 'must be dry-run');

  const d = await doctor.check();
  assert(d.ok === true, 'doctor must pass: ' + (d.error || ''));

  console.log('churnPredictor smoke OK', { atRisk: out.summary.atRisk, masked: top.phoneMasked });
  process.exit(0);
})().catch(e => { console.error('FAIL:', e && e.message); process.exit(1); });
