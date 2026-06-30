#!/usr/bin/env node
// tests/smoke/alertCenterSmoke.js — Smoke test for conditions + digest + dedupe. Run: npm run alert-center:smoke

const ac = require('../../lib/alertCenter');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!ac.alertEngine, 'engine present');

 // Condition matcher: AND/OR + operators, no eval.
 const ctx = { event: 'usage.exceeded', used: 120, limit: 100, tenantId: 't1' };
 t(ac.conditionMatcher.matches(ctx, { all: [{ field: 'used', op: 'gt', value: 'limit' } ] }) === false, 'value is literal, not a field ref (used>"limit" string compares false)');
 t(ac.conditionMatcher.matches(ctx, { all: [{ field: 'used', op: 'gt', value: 100 }] }) === true, 'numeric gt condition matches');
 t(ac.conditionMatcher.matches(ctx, { any: [{ field: 'tenantId', op: 'eq', value: 'tX' }, { field: 'tenantId', op: 'eq', value: 't1' }] }) === true, 'OR condition matches');

 // Per-rule throttle independence: different discriminators are NOT throttled together.
 await ac.alertEngine.emit('send.failed', { target: 'A', reason: 'x', ownerTarget: '+923009998877' });
 const b = await ac.alertEngine.emit('send.failed', { target: 'B', reason: 'y' });
 t(b.fired.find((f) => f.ruleId === 'send-failed'), 'different target is not throttled (separate dedupe key)');

 // Digest groups unread by severity.
 const dg = ac.alertEngine.digest();
 t(typeof dg.unread === 'number' && Array.isArray(dg.critical) && Array.isArray(dg.warning), 'digest groups unread by severity');

 const ov = ac.alertEngine.overview();
 t(typeof ov.cards.alerts === 'number', 'overview returns card counts');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
