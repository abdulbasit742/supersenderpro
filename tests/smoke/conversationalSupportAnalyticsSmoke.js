'use strict';
/**
 * tests/smoke/conversationalSupportAnalyticsSmoke.js
 * Smoke test for the Conversational Support analytics layer. No network, no sends: runs the
 * engine in forced dry-run against a throwaway tenant, then asserts analytics/insights shapes
 * and cleans up its own data files. Run: node tests/smoke/conversationalSupportAnalyticsSmoke.js
 */
const assert = require('assert');
const CS = require('../../lib/conversationalSupport');

(async () => {
  const tid = 'smoke_analytics_' + Date.now().toString(36);
  try {
    CS.seedExample(tid);
    await CS.handleMessage(tid, { phone: '+920000000001', name: 'Ali', text: 'What are your prices?' }, { forceDryRun: true });
    await CS.handleMessage(tid, { phone: '+920000000002', name: 'Sara', text: 'I want to talk to a human agent' }, { forceDryRun: true });

    const a = CS.analytics.summarize(tid);
    assert.ok(a && a.conversations, 'summarize returns a conversations block');
    assert.strictEqual(typeof a.conversations.total, 'number', 'total is a number');
    assert.ok(a.conversations.total >= 2, 'counted both conversations');
    assert.ok('deflectionRate' in a.conversations, 'has deflectionRate');
    assert.ok(a.handoffs && typeof a.handoffs.total === 'number', 'handoffs block present');
    assert.ok(a.handoffs.total >= 1, 'human ask created a handoff');

    const ins = CS.analytics.insights(tid);
    assert.ok(typeof ins.summary === 'string' && ins.summary.length, 'insights summary is a non-empty string');
    assert.ok(Array.isArray(ins.highlights), 'highlights is an array');
    assert.ok(Array.isArray(ins.flags), 'flags is an array');
    assert.ok(ins.metrics && ins.metrics.conversations, 'insights carries the raw metrics');

    // Clean up this throwaway tenant's data files.
    try {
      const fs = require('fs');
      const { paths } = require('../../lib/conversationalSupport/config');
      [paths.kb(tid), paths.conversations(tid), paths.handoffs(tid)].forEach((f) => { if (fs.existsSync(f)) fs.unlinkSync(f); });
    } catch {}

    console.log('OK conversationalSupportAnalyticsSmoke:', ins.summary);
    process.exit(0);
  } catch (e) {
    console.error('FAIL conversationalSupportAnalyticsSmoke:', e && e.message);
    process.exit(1);
  }
})();
