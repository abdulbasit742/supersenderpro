'use strict';
/**
 * Offline smoke test for Order Status Lookup (#114).
 * Forces Ollama unreachable so we exercise the deterministic path with NO model.
 * Run: node tests/smoke/orderStatusSmoke.js
 */
process.env.OLLAMA_HOST = 'http://127.0.0.1:0';
process.env.LLM_DEFAULT_PROVIDER = process.env.LLM_DEFAULT_PROVIDER || 'ollama';

const assert = require('assert');
const os = require('os');
const fs = require('fs');
const path = require('path');

// isolate data dir to a temp cwd so we never touch real data/
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'order-status-'));
const origCwd = process.cwd();
process.chdir(tmp);

const engine = require(path.join(origCwd, 'lib', 'orderStatus', 'orderStatusLookup.js'));

(async function run() {
  const TENANT = 'store_demo';

  // missing tenant must throw
  let threw = false;
  try { engine.resolveOrder({ orderId: 'A1' }); } catch (_) { threw = true; }
  assert.ok(threw, 'missing tenantId should throw');

  // extractOrderId from free text
  assert.strictEqual(engine.extractOrderId('where is my order #A1024 ??'), 'A1024');

  // seed a local fallback order, then resolve by id and by phone
  engine.saveLocalOrder(TENANT, {
    id: 'A1024', phone: '+92 300 1234567', total: 2499,
    status: 'packed', createdAt: '2026-06-29T10:00:00Z',
    items: [{ name: 'Kurta', qty: 1 }]
  });

  const byId = engine.resolveOrder({ tenantId: TENANT, orderId: 'a1024' });
  assert.ok(byId && byId.id === 'A1024', 'resolve by id');

  const byPhone = engine.resolveOrder({ tenantId: TENANT, phone: '03001234567' });
  assert.ok(byPhone && byPhone.id === 'A1024', 'resolve by phone (last 10 digits)');

  const miss = engine.resolveOrder({ tenantId: TENANT, orderId: 'NOPE999' });
  assert.strictEqual(miss, null, 'unknown order resolves to null');

  // answer() must fall back to deterministic template (Ollama unreachable)
  const ans = await engine.answer({ tenantId: TENANT, text: 'kahan hai mera order #A1024' });
  assert.ok(ans.found === true, 'answer found order');
  assert.ok(/A1024/.test(ans.reply), 'reply mentions order id');
  assert.ok(ans.reply.length > 0, 'non-empty reply with no model');

  const ansMiss = await engine.answer({ tenantId: TENANT, orderId: 'GHOST' });
  assert.ok(ansMiss.found === false, 'missing order -> found false');
  assert.ok(/nahi mila|not/i.test(ansMiss.reply), 'missing reply is graceful');

  process.chdir(origCwd);
  console.log('orderStatusSmoke: OK');
})().catch(function (e) {
  process.chdir(origCwd);
  console.error('orderStatusSmoke: FAIL', e);
  process.exit(1);
});
