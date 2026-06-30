'use strict';
// #74 Referral Program — smoke test. Run: npm run referral:smoke
const assert = require('assert');
const referral = require('../../lib/referral');

let pass = 0;
function t(name, fn) { try { fn(); pass++; console.log('  PASS', name); } catch (e) { console.error('  FAIL', name, '-', e.message); process.exitCode = 1; } }

const tenantId = 'smoke-tenant';
const owner = 'owner-' + Date.now();
const referee = 'referee-' + Date.now();
let code;

t('getCode returns stable code', () => {
  const c1 = referral.getCode(tenantId, owner);
  const c2 = referral.getCode(tenantId, owner);
  code = c1.code;
  assert(c1.code && c1.code === c2.code, 'code stable per owner');
});

t('self-referral rejected', () => {
  const out = referral.attribute({ tenantId, code, refereeId: owner });
  assert(out.ok === false && out.error === 'self_referral', 'self referral blocked');
});

t('attribute creates pending referral', () => {
  const out = referral.attribute({ tenantId, code, refereeId: referee });
  assert(out.ok && out.referral.status === 'pending', 'pending created');
});

t('double attribution blocked', () => {
  const out = referral.attribute({ tenantId, code, refereeId: referee });
  assert(out.ok === false && out.error === 'already_referred', 'no double attribution');
});

t('invalid code rejected', () => {
  const out = referral.attribute({ tenantId, code: 'ZZZZZZZZ', refereeId: 'x-' + Date.now() });
  assert(out.ok === false && out.error === 'invalid_code', 'invalid code blocked');
});

t('qualify moves to qualified + issues rewards', () => {
  const out = referral.qualify({ tenantId, refereeId: referee, orderTotal: 100000 });
  assert(out.ok && (out.referral.status === 'qualified' || out.capped), 'qualified or capped');
  if (out.referral.status === 'qualified') assert(out.referral.rewards, 'rewards recorded');
});

t('stats reflect counts', () => {
  const s = referral.stats(tenantId, owner);
  assert(s.total >= 1, 'has referrals');
});

t('doctor healthy', () => {
  const r = referral.doctor.check();
  assert(r.healthy, 'doctor healthy: ' + JSON.stringify(r.issues));
});

console.log(`\nReferral smoke: ${pass} checks passed.`);
