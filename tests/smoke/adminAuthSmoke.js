  'use strict';
  /**
   * tests/smoke/adminAuthSmoke.js — module-level smoke. No server, no network.
   * Verifies safe defaults, session round-trip, guard behavior, and no leaks.
   */
  const path = require('path');
  const assert = require('assert');
  const ROOT = process.cwd();
  const R = (p) => require(path.join(ROOT, p));


  function main() {
    const results = [];
    const ok = (name, fn) => { try { fn(); results.push({ name, status: 'pass' }); } catch (e) { results.push({ name,
  status: 'fail', error: e.message }); } };


    const { config } = R('lib/adminAuth/authConfig.js');
    const sessionStore = R('lib/adminAuth/sessionStore.js');
    const { requireAdminAuth } = R('lib/adminAuth/routeGuard.js');
    const redactor = R('lib/adminAuth/redactor.js');
    R('routes/adminAuthRoutes.js');


    ok('require-login defaults false (demo safe)', () => assert.strictEqual(config().requireLogin, false));
    ok('session create + get round-trip', () => { const { token, sig } = sessionStore.create('a@b.com', 'admin');
  assert.ok(sessionStore.get(token, sig)); });
    ok('bad signature rejected', () => { const { token } = sessionStore.create('a@b.com', 'admin');
  assert.strictEqual(sessionStore.get(token, 'deadbeef'), null); });
    ok('guard passes through in demo when unauthenticated', () => {
      const mw = requireAdminAuth({ requireLogin: false, allowDemo: true });
      let nexted = false; const req = { adminAuth: { authenticated: false } };
      const res = { setHeader() {}, status() { return { json() {} }; } };
      mw(req, res, () => { nexted = true; }); assert.strictEqual(nexted, true);
    });
    ok('guard 401s when requireLogin + unauthenticated', () => {
      const mw = requireAdminAuth({ requireLogin: true, allowDemo: false });
      let code = 0; let payload = null;
      const req = { adminAuth: { authenticated: false } };
      const res = { setHeader() {}, status(c) { code = c; return { json(p) { payload = p; } }; } };
      mw(req, res, () => { throw new Error('should not pass'); });
      assert.strictEqual(code, 401); assert.strictEqual(payload.status, 'unauthorized');
  assert.strictEqual(payload.liveActionsEnabled, false);
    });
    ok('redactor masks email + strips token fields', () => {
      assert.ok(/\*\*\*/.test(redactor.maskEmail('admin@x.com')));
      const s = redactor.stripSecrets({ token: 'abc', sig: 'xyz', email: 'a@b.com' });
      assert.strictEqual(s.token, '[redacted]'); assert.strictEqual(s.sig, '[redacted]');
    });

    const passed = results.filter((r) => r.status === 'pass').length;

      const failed = results.filter((r) => r.status === 'fail').length;
      console.log('[admin-auth:smoke] passed=%d failed=%d', passed, failed);
      results.filter((r) => r.status === 'fail').forEach((r) => console.log('   FAIL', r.name, '-', r.error));
      process.exit(failed === 0 ? 0 : 1);
  }
  main();
