#!/usr/bin/env node
// tests/smoke/revenueOpsSmoke.js — Offline smoke test. No server, no external APIs, no live actions.
'use strict';
const fs = require('fs');
const path = require('path');
const results = [];
function check(n, fn) { try { results.push({ name: n, pass: true, detail: fn() || 'ok' }); } catch (e) { results.push({ name: n, pass: false, detail: e.message }); } }
function assert(c, m) { if (!c) throw new Error(m || 'assertion failed'); return true; }

let revenueOps, red;
check('require lib', () => { revenueOps = require('../../lib/revenueOps'); assert(revenueOps.getRevenueOpsStatus, 'no lib'); return 'ok'; });
check('require redactor', () => { red = require('../../lib/revenueOps/redactor'); assert(red.maskPhone, 'no redactor'); return 'ok'; });
check('require route', () => { require('../../routes/revenueOpsRoutes'); return 'loaded'; });

const FALSE_FLAGS = ['liveActionsEnabled', 'externalCallsEnabled', 'liveSend', 'liveAiCall', 'liveDbMutation',
  'leadMutationEnabled', 'opportunityMutationEnabled', 'pipelineMutationEnabled', 'repAssignmentEnabled',
  'invoiceMutationEnabled', 'paymentMutationEnabled', 'secretsExposed'];
function assertSafe(resp, label) {
  assert(resp && resp.dryRun === true, label + ': dryRun');
  assert(resp.previewOnly === true, label + ': previewOnly');
  assert(resp.readOnly === true, label + ': readOnly');
  assert(resp.piiMasked === true, label + ': piiMasked');
  FALSE_FLAGS.forEach((f) => assert(resp[f] === false, label + ': ' + f + ' must be false'));
  assert(red.hasLeak(resp) === false, label + ': leaked pii/secret');
  return true;
}

check('status works + safe', () => { const r = revenueOps.getRevenueOpsStatus(); assertSafe(r, 'status'); return r.feature; });
check('dashboard data works + safe', () => { const r = revenueOps.getPipelineDashboardData(); assertSafe(r, 'dash'); assert(Array.isArray(r.opportunitiesPreview), 'arr'); return r.totalOpportunitiesPreview + ' opps'; });
check('lead registry safe + masked', () => { const r = revenueOps.getLeadRegistryPreview(); assertSafe(r, 'leads'); assert(r.leadsPreview.every((l) => l.maskedPhone.includes('*') || l.maskedPhone === 'not_provided'), 'phone'); return r.totalPreview + ' leads'; });
check('opportunity registry safe + masked', () => { const r = revenueOps.getOpportunityRegistryPreview(); assertSafe(r, 'opps'); assert(r.opportunitiesPreview.every((o) => o.maskedEmail.includes('*') || o.maskedEmail === 'not_provided'), 'email'); return r.totalPreview + ' opps'; });
check('opportunity by id safe', () => { const r = revenueOps.getOpportunityPreview('opp_demo_1'); assertSafe(r, 'opp'); assert(r.found === true, 'found'); return 'found'; });
check('missing opportunity does not crash', () => { const r = revenueOps.getOpportunityPreview('nope'); assertSafe(r, 'missing'); assert(r.found === false, 'not found'); return 'safe'; });
check('analyze works + safe', () => { const r = revenueOps.analyzeRevenueOpsPreview({}); assertSafe(r, 'analyze'); assert(Array.isArray(r.recommendationsPreview), 'recs'); return 'ok'; });

check('deal score works + bounded', () => { const r = revenueOps.calculateDealScorePreview({ opportunity: { stage: 'Negotiation', valueBand: 'high', lastContactDays: 3, replies: 6 } }); assertSafe(r, 'deal'); assert(r.dealScore >= 0 && r.dealScore <= 100, 'bound'); assert(['Hot', 'Warm', 'Neutral', 'Cold', 'Needs Review'].indexOf(r.scoreLevel) !== -1, 'level'); return r.dealScore + '/' + r.scoreLevel; });
check('deal score deterministic', () => { const a = revenueOps.calculateDealScorePreview({ opportunity: { stage: 'Negotiation', valueBand: 'high', lastContactDays: 3, replies: 6 } }).dealScore; const b = revenueOps.calculateDealScorePreview({ opportunity: { stage: 'Negotiation', valueBand: 'high', lastContactDays: 3, replies: 6 } }).dealScore; assert(a === b, 'not deterministic'); return 'stable'; });
check('pipeline health works', () => { const r = revenueOps.calculatePipelineHealthPreview({}); assertSafe(r, 'pipe'); assert(r.pipelineHealthScore >= 0 && r.pipelineHealthScore <= 100, 'bound'); assert(Array.isArray(r.stageBreakdown), 'stages'); return r.pipelineHealthLevel; });
check('forecast works (banded)', () => { const r = revenueOps.calculateForecastPreview({}); assertSafe(r, 'fc'); assert(typeof r.forecastAmountPreview === 'string', 'banded'); assert(!/\b\d{5,}\b/.test(r.forecastAmountPreview), 'raw amount'); return r.forecastConfidence; });
check('followup readiness aggregate works', () => { const r = revenueOps.calculateFollowupReadinessPreview({}); assertSafe(r, 'fu'); assert(r.followupReadinessScore >= 0 && r.followupReadinessScore <= 100, 'bound'); return r.readinessLevel; });
check('followup readiness single deal works', () => { const r = revenueOps.calculateFollowupReadinessPreview({ opportunity: { stage: 'Payment Pending', lastContactDays: 9, consent: 'opt_in' } }); assertSafe(r, 'fu1'); return r.suggestedFollowupType; });
check('conversion analytics works', () => { const r = revenueOps.calculateConversionAnalyticsPreview({}); assertSafe(r, 'conv'); assert(typeof r.leadToQualifiedRatePreview === 'number', 'rate'); return r.topStuckStagePreview; });
check('rep performance works (no assignment)', () => { const r = revenueOps.calculateRepPerformancePreview({}); assertSafe(r, 'rep'); assert(Array.isArray(r.repsPreview), 'arr'); assert(r.repsPreview.every((x) => x.maskedRepPreview.includes('*')), 'masked'); return r.repsPreview.length + ' reps'; });
check('revenue risk works', () => { const r = revenueOps.calculateRevenueRiskPreview({}); assertSafe(r, 'risk'); assert(['Low', 'Medium', 'High', 'Critical'].indexOf(r.revenueRiskLevel) !== -1, 'level'); return r.revenueRiskLevel; });
check('recommendations work', () => { const r = revenueOps.getRevenueRecommendationsPreview({}); assertSafe(r, 'recs'); assert(Array.isArray(r.recommendationsPreview), 'arr'); return r.recommendationsPreview.length + ' recs'; });
check('compare opportunities works', () => { const r = revenueOps.compareOpportunitiesPreview({ opportunityA: { stage: 'Quotation Sent', valueBand: 'high', lastContactDays: 2, replies: 4 }, opportunityB: { stage: 'New Lead', valueBand: 'medium', lastContactDays: 12, replies: 1 } }); assertSafe(r, 'cmp'); assert(['opportunityA', 'opportunityB'].indexOf(r.betterPriorityPreview) !== -1, 'better'); return r.betterPriorityPreview; });
check('audit preview masks data', () => { const r = revenueOps.getRevenueAuditPreview(); assertSafe(r, 'audit'); assert(r.rawAuditExposed === false, 'raw'); return r.auditPreview.length + ' rows'; });
check('lead score works + bounded', () => { const r = revenueOps.calculateLeadScorePreview({ lead: { source: 'WhatsApp', stage: 'Contacted', replies: 3, lastContactDays: 5 } }); assertSafe(r, 'lead'); assert(r.leadScore >= 0 && r.leadScore <= 100, 'bound'); assert(['A', 'B', 'C', 'D'].indexOf(r.leadGrade) !== -1, 'grade'); return r.leadScore + '/' + r.leadGrade; });
check('deal aging works + masked', () => { const r = revenueOps.getDealAgingPreview(); assertSafe(r, 'aging'); assert(typeof r.staleCountPreview === 'number', 'count'); assert(r.staleDealsPreview.every((d) => d.maskedCustomerName.includes('*')), 'masked'); return r.staleCountPreview + ' stale'; });
check('sales velocity works (banded)', () => { const r = revenueOps.calculateSalesVelocityPreview(); assertSafe(r, 'vel'); assert(!/\b\d{5,}\b/.test(r.salesVelocityBandPreview), 'raw amount'); return r.winRatePreview + '% win'; });
check('quota attainment works (banded)', () => { const r = revenueOps.calculateQuotaAttainmentPreview({ targetBand: 'high' }); assertSafe(r, 'quota'); assert(typeof r.attainmentPercentPreview === 'number', 'pct'); assert(!/\b\d{5,}\b/.test(JSON.stringify(r)), 'raw'); return r.attainmentLevel; });
check('win-loss analysis works', () => { const r = revenueOps.getWinLossAnalysisPreview(); assertSafe(r, 'wl'); assert(typeof r.overallWinRatePreview === 'number', 'rate'); return r.overallWinRatePreview + '%'; });
check('next best actions works + masked', () => { const r = revenueOps.getNextBestActionsPreview(); assertSafe(r, 'nba'); assert(Array.isArray(r.nextBestActionsPreview), 'arr'); assert(r.nextBestActionsPreview.every((a) => a.maskedCustomerName.includes('*')), 'masked'); return r.nextBestActionsPreview.length + ' actions'; });
check('funnel analysis works', () => { const r = revenueOps.getFunnelAnalysisPreview(); assertSafe(r, 'funnel'); assert(Array.isArray(r.funnelPreview), 'arr'); return r.biggestDropOffStagePreview; });
check('export preview writes no file + masked', () => { const r = revenueOps.getExportPreview(); assertSafe(r, 'export'); assert(r.fileWritten === false, 'file'); assert(red.hasLeak(r) === false, 'leak'); return r.rowCountPreview + ' rows'; });
check('no secrets/full PII in sampled responses', () => { const sample = [revenueOps.getRevenueOpsStatus(), revenueOps.getPipelineDashboardData(), revenueOps.getLeadRegistryPreview(), revenueOps.analyzeRevenueOpsPreview({}), revenueOps.getRevenueAuditPreview()]; assert(red.hasLeak(sample) === false, 'leak'); return 'clean'; });

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: results.length, results };
try { const dir = path.join(__dirname, '..', '..', 'artifacts'); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'revenue_ops_smoke.json'), JSON.stringify(out, null, 2)); } catch (_) {}
console.log('Revenue Ops Smoke: ' + passed + '/' + results.length + ' passed' + (failed ? ' — ' + failed + ' FAILED' : ' — all passed'));
results.filter((r) => !r.pass).forEach((r) => console.log('  FAIL: ' + r.name + ' :: ' + r.detail));
process.exit(failed === 0 ? 0 : 1);
