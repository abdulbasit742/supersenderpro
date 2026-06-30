#!/usr/bin/env node
// scripts/faq-trainer-batch.js
// Overnight FAQ mining batch. Runs on PC #2 (Linux GPU box) while the model is
// warm: harvest recent customer questions, cluster, draft candidate FAQs, and
// queue them for morning human approval. Does NOT auto-publish — approval is a
// deliberate human step (see routes/faqTrainerRoutes.js).
//
// Usage:
//   node scripts/faq-trainer-batch.js                       # default_store, last 30 days
//   node scripts/faq-trainer-batch.js --store mystore --days 14 --escalated
//
// Cron (PC #2), nightly at 3am:
//   0 3 * * *  cd /path/to/supersenderpro && node scripts/faq-trainer-batch.js >> data/faq_trainer/batch.log 2>&1

const path = require('path');
const fs = require('fs');
const trainer = require('../lib/faqTrainer/faqTrainer');

function flag(name) { return process.argv.includes(name); }
function val(name, def) { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def; }

(async () => {
  const storeId = val('--store', 'default_store');
  const sinceDays = parseInt(val('--days', '30'), 10);
  const onlyEscalated = flag('--escalated');
  const start = Date.now();
  console.log(`[faq-trainer-batch] start store=${storeId} days=${sinceDays} escalated=${onlyEscalated} at ${new Date().toISOString()}`);

  const result = await trainer.mine({ storeId, onlyEscalated, sinceDays });

  const reportDir = path.join(__dirname, '..', 'data', 'faq_trainer');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const report = {
    ranAt: new Date().toISOString(), storeId, durationMs: Date.now() - start,
    minedQuestions: result.mined, clusters: result.clusters, newCandidates: result.candidates,
    top: (result.newCandidates || []).slice(0, 10).map(c => ({ q: c.q, frequency: c.frequency, drafted: c.drafted }))
  };
  fs.writeFileSync(path.join(reportDir, `${storeId}_last_batch.json`), JSON.stringify(report, null, 2));

  console.log(`[faq-trainer-batch] done: mined=${result.mined} clusters=${result.clusters} new=${result.candidates} | ${report.durationMs}ms`);
  console.log('[faq-trainer-batch] review + approve pending candidates via /api/faq-trainer/candidates');
  process.exit(0);
})().catch((e) => { console.error('[faq-trainer-batch] failed:', e); process.exit(1); });
