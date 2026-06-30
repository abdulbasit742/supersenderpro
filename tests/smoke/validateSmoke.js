'use strict';
/**
 * tests/smoke/validateSmoke.js - checks the validator logic + middleware behavior.
 * Usage: node tests/smoke/validateSmoke.js
 */
const assert = require('assert');
const { validate, validateBody, schemas } = require('../../lib/security/validate');

function fakeRes() { return { _c: 200, _j: null, status(c) { this._c = c; return this; }, json(o) { this._j = o; return this; } }; }

let passed = 0;
const t = (n, fn) => { try { fn(); passed++; console.log('OK', n); } catch (e) { console.error('XX', n, '-', e.message); process.exitCode = 1; } };

t('required fields enforced', () => {
  const r = validate(schemas.signup, { email: 'x@y.com' });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.field === 'password'));
});
t('invalid email rejected', () => {
  const r = validate(schemas.signup, { email: 'nope', password: 'supersecret1' });
  assert.ok(r.errors.some((e) => e.field === 'email'));
});
t('valid signup passes', () => {
  const r = validate(schemas.signup, { email: 'a@b.com', password: 'supersecret1', name: 'A' });
  assert.strictEqual(r.ok, true);
});
t('number coercion works', () => {
  const r = validate(schemas.deal, { value: '500' });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.value.value, 500);
});
t('enum enforced for checkout', () => {
  const r = validate(schemas.checkout, { planId: 'enterprise' });
  assert.strictEqual(r.ok, false);
});
t('middleware 400s on bad body + passes good body', () => {
  const mw = validateBody(schemas.login);
  const bad = fakeRes(); let nexted = false;
  mw({ body: { email: 'bad' } }, bad, () => { nexted = true; });
  assert.strictEqual(bad._c, 400); assert.strictEqual(nexted, false);
  const ok = fakeRes(); let nexted2 = false;
  mw({ body: { email: 'a@b.com', password: 'x' } }, ok, () => { nexted2 = true; });
  assert.ok(nexted2);
});

console.log('\n' + passed + ' checks passed.');
process.exit(process.exitCode || 0);
