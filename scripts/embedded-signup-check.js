'use strict';
/**
 * scripts/embedded-signup-check.js - smoke test for Embedded Signup (simulation mode).
 * Runs the full onboarding flow with a stub code, asserts a connection is created + activated,
 * and verifies tokens are NEVER exposed in API-facing output. No Meta calls. Usage:
 *   node scripts/embedded-signup-check.js   (exit 0 = pass)
 */
const ES = require('../lib/embeddedSignup');

const TID = '__check_es__' + Date.now().toString(36);
let failures = 0;
const assert = (cond, msg) => { if (!cond) { failures++; console.error('  FAIL: ' + msg); } else { console.log('  ok: ' + msg); } };

(async () => {
  console.log('=== embedded-signup-check (tenant ' + TID + ') ===');

  // public config never leaks the secret
  const pub = ES.publicConfig();
  assert(!('appSecret' in pub), 'public config has no appSecret');

  // full flow in simulation
  const r = await ES.completeSignup(TID, { code: 'TESTCODE123' });
  assert(r.stub === true && r.live === false, 'runs in simulation (stub) mode');
  assert(r.steps.tokenExchanged && r.steps.assetsRead, 'token exchanged + assets read');
  assert(!!r.connectionId && !!r.wabaId, 'connection + waba created');

  // stored connection holds a token internally...
  const raw = ES.connections.get(TID, r.connectionId);
  assert(!!raw.accessToken, 'token stored server-side');
  // ...but the redacted (API-facing) view never exposes it
  const safe = ES.redactConnection(raw);
  assert(!('accessToken' in safe), 'redacted connection drops raw accessToken');
  assert(typeof safe.accessTokenFingerprint === 'string', 'redacted connection keeps only a fingerprint');
  assert(safe.status === 'active' || safe.status === 'connected', 'connection status set');

  const doc = ES.doctor.run();
  assert(Array.isArray(doc.checks) && doc.ok !== undefined, 'doctor runs');

  // cleanup
  try { require('fs').rmSync(require('path').join(__dirname, '..', 'data', 'embedded_signup', TID + '_connections.json'), { force: true }); } catch {}

  console.log('=== ' + (failures ? 'FAILED (' + failures + ')' : 'PASSED') + ' ===');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('check crashed:', e); process.exit(1); });
