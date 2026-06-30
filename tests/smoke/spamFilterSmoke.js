'use strict';
/**
 * Offline smoke test for the spam filter.
 * Forces AI fallback by pointing the model host at an unreachable address,
 * so this passes with NO Ollama running.
 * Run: node tests/smoke/spamFilterSmoke.js
 */

process.env.OLLAMA_HOST = 'http://127.0.0.1:0';
process.env.LLM_DEFAULT_PROVIDER = process.env.LLM_DEFAULT_PROVIDER || 'ollama';

const assert = require('assert');
const spam = require('../../lib/spamFilter/spamFilter');

(async () => {
  let pass = 0;

  // clean
  const c = await spam.classify('Hi, is my order shipped yet? Thanks!', { useAi: false });
  assert.strictEqual(c.label, 'clean', 'normal msg should be clean');
  assert.strictEqual(c.action, 'allow');
  pass++;

  // scam
  const s = await spam.classify('CONGRATULATIONS YOU have won a lottery! Send OTP and bank details to claim your prize via wire transfer', { useAi: false });
  assert.ok(['scam', 'spam'].includes(s.label), 'lottery/otp msg should flag');
  assert.ok(s.score > 25, 'scam score should be elevated');
  pass++;

  // abuse
  const a = await spam.classify('you stupid idiot i will kill you', { useAi: false });
  assert.strictEqual(a.label, 'abuse', 'threat should be abuse');
  assert.ok(['block', 'quarantine'].includes(a.action));
  pass++;

  // spam links/caps
  const sp = await spam.classify('BUY NOW!!! LIMITED OFFER http://cheap.xyz http://deal.click best price guaranteed', { useAi: false });
  assert.ok(['spam', 'scam'].includes(sp.label), 'promo+links should flag');
  pass++;

  // borderline triggers AI path but must fall back gracefully (host unreachable)
  const b = await spam.classify('free trial, subscribe today', { useAi: true });
  assert.ok(b && b.label, 'borderline must return a result via fallback');
  pass++;

  // tenant persistence + stats
  const t = 'smoke-tenant';
  await spam.check(t, 'hello there', { useAi: false });
  await spam.check(t, 'you stupid idiot', { useAi: false });
  const st = spam.stats(t);
  assert.ok(st.total >= 2, 'stats should count checks');
  pass++;

  // missing tenant throws
  let threw = false;
  try { spam.stats(''); } catch (_) { threw = true; }
  assert.ok(threw, 'missing tenantId must throw');
  pass++;

  console.log(`spamFilter smoke OK (${pass} checks passed)`);
})().catch((e) => { console.error('spamFilter smoke FAILED:', e.message); process.exit(1); });
