#!/usr/bin/env node
// scripts/check-revenue-ops.js — Validates Revenue Ops install + safe behaviour. No server, no external calls.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: String(d).slice(0, 80) });

let failHard = false;
let revenueOps, red;
try {
  revenueOps = require('../lib/revenueOps/index.js');
  red = require('../lib/revenueOps/redactor.js');
  add('lib/revenueOps/index.js loads', true);
  add('lib/revenueOps/redactor.js loads', true);
  require('../routes/revenueOpsRoutes.js');
  add('routes/revenueOpsRoutes.js loads', true);
} catch (e) { add('modules load', false, e.message); failHard = true; }

const EXPORTS = ['getRevenueOpsStatus', 'getPipelineDashboardData', 'getLeadRegistryPreview',
  'getOpportunityRegistryPreview', 'getOpportunityPreview', 'analyzeRevenueOpsPreview', 'calculateDealScorePreview',
  'calculatePipelineHealthPreview', 'calculateForecastPreview', 'calculateFollowupReadinessPreview',
  'calculateConversionAnalyticsPreview', 'calculateRepPerformancePreview', 'calculateRevenueRiskPreview',
  'getRevenueRecommendationsPreview', 'compareOpportunitiesPreview', 'getRevenueAuditPreview'];

if (!failHard) {
  add('all required exports present', EXPORTS.every((f) => typeof revenueOps[f] === 'function'),
    EXPORTS.filter((f) => typeof revenueOps[f] !== 'function').join(',') || 'all present');

  const FLAGS = ["dryRun", "previewOnly", "readOnly", "liveActionsEnabled", "externalCallsEnabled", "liveSend", "liveAiCall", "liveDbMutation", "leadMutationEnabled", "opportunityMutationEnabled", "pipelineMutationEnabled", "repAssignmentEnabled", "invoiceMutationEnabled", "paymentMutationEnabled", "piiMasked", "secretsExposed"];
  const TRUE_FLAGS = ["dryRun", "previewOnly", "readOnly", "piiMasked"];

  function assertSafe(label, resp) {
    if (!resp || typeof resp !== 'object') { add(label + ' returns object', false); return; }
    FLAGS.forEach((flag) => {
      if (TRUE_FLAGS.indexOf(flag) !== -1) add(label + ' ' + flag + ' true', resp[flag] === true);
      else add(label + ' ' + flag + ' false', resp[flag] === false);
    });
    add(label + ' no leak (no full phone/email/token)', red.hasLeak(resp) === false);
  }

  // status + demo analysis carry all flags
  assertSafe('status', revenueOps.getRevenueOpsStatus());
  const analysis = revenueOps.analyzeRevenueOpsPreview({});
  assertSafe('analyze', analysis);

  add('analyze has pipeline health score', typeof analysis.pipelineHealthPreview.pipelineHealthScore === 'number');
  add('analyze has forecast score', typeof analysis.forecastPreview.weightedForecastScore === 'number');
  add('analyze recommendations is array', Array.isArray(analysis.recommendationsPreview));

  const ds = revenueOps.calculateDealScorePreview({ opportunity: { stage: 'Quotation Sent', valueBand: 'high', lastContactDays: 2, replies: 5 } });
  add('deal score in 0..100', ds.dealScore >= 0 && ds.dealScore <= 100, String(ds.dealScore));
  add('close probability in 0..100', ds.closeProbabilityPreview >= 0 && ds.closeProbabilityPreview <= 100);
  add('deal score deterministic', revenueOps.calculateDealScorePreview({ opportunity: { stage: 'Quotation Sent', valueBand: 'high', lastContactDays: 2, replies: 5 } }).dealScore === ds.dealScore);

  // redaction
  add('maskPhone hides digits', !/\d{7,}/.test(red.maskPhone('+923001234567')), red.maskPhone('+923001234567'));
  add('maskEmail hides local', /\*+@/.test(red.maskEmail('user@example.com')), red.maskEmail('user@example.com'));
  add('maskName masks', red.maskName('Ahmed Khan').includes('*'));
  add('maskAmount is banded (no raw number)', !/\b\d{5,}\b/.test(red.maskAmount(850000)), red.maskAmount(850000));
  add('sanitizeError hides stack', red.sanitizeError(new Error('boom')).stackExposed === false);

  // dashboard data masks PII (no raw phone/email)
  const dash = revenueOps.getPipelineDashboardData();
  add('dashboard data no full PII', red.hasLeak(dash) === false);
  add('opportunity preview masks phone', dash.opportunitiesPreview[0].maskedPhone.includes('*'));

  // compare
  const cmp = revenueOps.compareOpportunitiesPreview({
    opportunityA: { id: 'opp_demo_1', stage: 'Quotation Sent', valueBand: 'high', lastContactDays: 2, replies: 4 },
    opportunityB: { id: 'opp_demo_2', stage: 'New Lead', valueBand: 'medium', lastContactDays: 12, replies: 1 },
  });
  add('compare picks a better priority', cmp.betterPriorityPreview === 'opportunityA' || cmp.betterPriorityPreview === 'opportunityB');
  add('compare carries safety flags', cmp.dryRun === true && cmp.previewOnly === true && cmp.liveActionsEnabled === false);

  // audit masked
  const audit = revenueOps.getRevenueAuditPreview();
  add('audit raw not exposed', audit.rawAuditExposed === false);
  add('audit no leak', red.hasLeak(audit) === false);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, checks };
try {
  const dir = path.join(ROOT, 'artifacts');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'revenue_ops_check.json'), JSON.stringify(out, null, 2));
} catch (_) { /* ignore */ }
console.log('Revenue Ops Check: ' + passed + '/' + checks.length + ' passed' + (failed ? ' — ' + failed + ' FAILED' : ''));
checks.filter((c) => !c.ok).forEach((c) => console.log('  FAIL: ' + c.name + ' :: ' + c.detail));
process.exit(failed === 0 ? 0 : 1);
