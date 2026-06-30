// tests/smoke/quickReplySmoke.js
// Offline smoke test for Quick-Reply Manager (#118).
// Forces Ollama unreachable so AI path falls back to deterministic. Zero deps.
// Run: node tests/smoke/quickReplySmoke.js

'use strict';

process.env.OLLAMA_HOST = 'http://127.0.0.1:0';

const assert = require('assert');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Isolate data dir to a temp cwd so we don't pollute repo data/
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qr-smoke-'));
const origCwd = process.cwd();
process.chdir(tmp);

const qr = require(path.join(origCwd, 'lib', 'quickReply', 'quickReply'));

(async function run() {
  const T = 'tenant-A';

  // tenant guard
  let threw = false;
  try { qr.list(''); } catch (e) { threw = true; }
  assert.ok(threw, 'missing tenantId should throw');

  // create
  const a = qr.create(T, { title: 'Thanks', body: 'Thank you {{name}}! Aapka order confirm ho gaya.', shortcut: 'thanks', triggers: ['thank', 'shukriya'], tags: ['greeting'] });
  assert.ok(a.id, 'create returns id');
  assert.strictEqual(a.shortcut, '/thanks', 'shortcut normalized');

  const b = qr.create(T, { title: 'Shipping', body: 'Delivery 2-3 din me ho jayegi.', shortcut: '/ship', triggers: ['delivery', 'shipping', 'kab'], tags: ['logistics'] });
  assert.ok(b.id);

  // list + tenant isolation
  assert.strictEqual(qr.list(T).length, 2, 'two items for tenant A');
  assert.strictEqual(qr.list('tenant-B').length, 0, 'tenant B isolated');

  // render variables
  const rendered = qr.render(a, { name: 'Ali' });
  assert.ok(rendered.indexOf('Ali') !== -1, 'variable substituted');
  assert.ok(rendered.indexOf('{{') === -1, 'no leftover tokens');

  // shortcut lookup
  const found = qr.byShortcut(T, 'thanks');
  assert.strictEqual(found.id, a.id, 'byShortcut resolves');

  // deterministic suggest by trigger
  const sug = qr.suggest(T, 'mera order kab tak delivery hogi?');
  assert.ok(sug.length >= 1, 'suggest returns candidate');
  assert.strictEqual(sug[0].id, b.id, 'shipping reply ranks top for delivery query');

  // usage analytics
  qr.markUsed(T, a.id);
  qr.markUsed(T, a.id);
  const stats = qr.analytics(T);
  assert.strictEqual(stats.total, 2, 'analytics total');
  assert.strictEqual(stats.totalUses, 2, 'analytics totalUses');
  assert.strictEqual(stats.top[0].id, a.id, 'most used on top');

  // AI path falls back gracefully (Ollama unreachable)
  const ai = await qr.aiSuggest(T, 'shukriya bhai', { limit: 2 });
  assert.ok(ai && ai.candidates, 'aiSuggest returns candidates');
  assert.ok(ai.source === 'deterministic' || ai.source === 'ai', 'aiSuggest source valid');

  // update + remove
  const upd = qr.update(T, a.id, { body: 'Updated body {{name}}' });
  assert.ok(upd.body.indexOf('Updated') !== -1, 'update applied');
  const rem = qr.remove(T, b.id);
  assert.strictEqual(rem.removed, 1, 'remove works');
  assert.strictEqual(qr.list(T).length, 1, 'one left after remove');

  process.chdir(origCwd);
  console.log('quickReplySmoke: OK');
})().catch(function (e) {
  process.chdir(origCwd);
  console.error('quickReplySmoke: FAIL', e);
  process.exit(1);
});
