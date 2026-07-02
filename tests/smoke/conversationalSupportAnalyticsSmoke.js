'use strict';
/**
 * tests/smoke/conversationalSupportAnalyticsSmoke.js - drives the support agent through a few
 * conversations on a throwaway tenant (forced dry-run, JSON driver, no network) and asserts the
 * analytics rollups are coherent. Exits non-zero on failure so ci-smoke catches regressions.
 */
const assert = require('assert');
const CS = require('../../lib/conversationalSupport');

async function main() {
  const tid = 'smoke_convanalytics_' + Date.now().toString(36);
  const opts = { forceDryRun: true };

  CS.seedExample(tid);

  // A couple of FAQ turns.
  await CS.handleMessage(tid, { phone: '+923001110001', name: 'Ali', text: 'how long does delivery take?' }, opts);
  await CS.handleMessage(tid, { phone: '+923001110002', name: 'Sara', text: 'what are your prices?' }, opts);

  // One conversation that escalates to a human.
  const esc = await CS.handleMessage(tid, { phone: '+923001110003', text: 'I want to talk to a human agent' }, opts);
  assert.strictEqual(esc.escalated, true, 'third convo escalated');

  const a = CS.analytics.overview(tid);
  assert.ok(a && a.conversations, 'overview returns a shape');
  assert.strictEqual(a.conversations.total, 3, 'counted all 3 conversations');
  assert.strictEqual(a.escalation.convosEscalated, 1, 'one escalated conversation');
  assert.ok(a.escalation.handoffs >= 1, 'at least one handoff recorded');
  assert.ok(a.escalation.escalationRate > 0 && a.escalation.escalationRate <= 100, 'escalation rate is a sane %');
  assert.ok(a.automation.selfServeRate >= 0 && a.automation.selfServeRate <= 100, 'self-serve rate is a sane %');
  assert.ok(a.messages.agent >= 3, 'agent produced replies');
  assert.ok(a.messages.groundingRate >= 0 && a.messages.groundingRate <= 100, 'grounding rate is a sane %');

  // Windowed query (all recent) should match all-time here since everything is fresh.
  const recent = CS.analytics.overview(tid, { days: 7 });
  assert.strictEqual(recent.conversations.total, 3, 'windowed count matches for fresh data');

  console.log('[conversationalSupportAnalyticsSmoke] OK - totals, escalation rate, self-serve, window all passed');
}

main().catch((e) => { console.error('[conversationalSupportAnalyticsSmoke] FAILED:', e && e.message); process.exit(1); });
