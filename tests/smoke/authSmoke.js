'use strict';
/**
 * tests/smoke/authSmoke.js - dependency-free smoke test for Phase 2 auth (json driver).
 * Usage: node tests/smoke/authSmoke.js
 */
process.env.DB_DRIVER = 'json';
process.env.AUTH_JWT_SECRET = 'test-secret';
const assert = require('assert');
const auth = require('../../lib/auth');

const TID = 'auth_smoke_' + Date.now();
const OTHER = 'auth_other_' + Date.now();
let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  let token, resetToken;
  await t('first user becomes owner', async () => { const r = await auth.signup(TID, { email: 'Owner@Test.com', password: 'supersecret1', name: 'Owner' }); assert.strictEqual(r.user.role, 'owner'); token = r.token; });
  await t('second user becomes agent', async () => { const r = await auth.signup(TID, { email: 'agent@test.com', password: 'supersecret1' }); assert.strictEqual(r.user.role, 'agent'); });
  await t('duplicate email rejected', async () => { let threw = false; try { await auth.signup(TID, { email: 'owner@test.com', password: 'supersecret1' }); } catch { threw = true; } assert.ok(threw); });
  await t('login works + email case-insensitive', async () => { const r = await auth.login(TID, { email: 'owner@test.com', password: 'supersecret1' }); assert.ok(r.token); });
  await t('wrong password rejected', async () => { let threw = false; try { await auth.login(TID, { email: 'owner@test.com', password: 'nope' }); } catch { threw = true; } assert.ok(threw); });
  await t('token resolves to user', async () => { const { user } = await auth.getUserFromToken(token); assert.strictEqual(user.email, 'owner@test.com'); assert.strictEqual(user.tenantId, TID); });
  await t('password reset round-trip', async () => { const req = await auth.requestPasswordReset(TID, 'owner@test.com'); resetToken = req.resetToken; assert.ok(resetToken); await auth.resetPassword(TID, { email: 'owner@test.com', token: resetToken, newPassword: 'brandnewpass1' }); const r = await auth.login(TID, { email: 'owner@test.com', password: 'brandnewpass1' }); assert.ok(r.token); });
  await t('tenant isolation: other tenant cannot see users', async () => { const users = await auth.listUsers(OTHER); assert.strictEqual(users.length, 0); });
  await t('RBAC ranks', async () => { assert.ok(auth.roleAtLeast('owner', 'admin')); assert.ok(!auth.roleAtLeast('agent', 'admin')); });
  console.log('\n' + passed + ' checks passed.');
})();
