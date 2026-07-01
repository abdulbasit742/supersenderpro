'use strict';
// Offline smoke test for SLA Monitor. Forces an unreachable Ollama host to
// prove the deterministic path works with no model and no network.

process.env.OLLAMA_HOST = 'http://127.0.0.1:0';
process.env.SLA_DATA_DIR = require('path').join(require('os').tmpdir(), 'sla-smoke-' + Date.now());

const assert = require('assert');
const store = require('../../lib/slaMonitor/store');
const sla = require('../../lib/slaMonitor/index');
const doctor = require('../../lib/slaMonitor/doctor');

async function main() {
  const tenantId = 't-smoke';

  // tenantId required.
  let threw = false;
  try { store.listConversations(undefined); } catch (_) { threw = true; }
  assert.ok(threw, 'missing tenantId must throw');

  const conversations = [
    { id: 'fast', tenantId, customer: '923001112233',
      events: [ { t: '2026-06-30T10:00:00', dir: 'in', kind: 'open' }, { t: '2026-06-30T10:03:00', dir: 'out' } ],
      resolvedAt: '2026-06-30T10:20:00' },
    { id: 'slow', tenantId, customer: '923009998877',
      events: [ { t: '2026-06-30T10:00:00', dir: 'in', kind: 'open' }, { t: '2026-06-30T11:30:00', dir: 'out' } ],
      resolvedAt: '2026-06-30T18:00:00' }
  ];
  store.saveConversations(tenantId, conversations);

  const rep = sla.report(tenantId);
  assert.strictEqual(rep.totals.conversations, 2, 'two conversations');
  assert.ok(rep.totals.breached >= 1, 'slow conversation should breach');

  const fast = rep.conversations.find(c => c.id === 'fast');
  assert.strictEqual(fast.firstResponseMin, 3, 'fast first response = 3 min');
  assert.strictEqual(fast.firstResponseState, 'ok', 'fast is ok');
  assert.ok(/\*\*\*/.test(fast.customer), 'phone masked');

  // Owner brief must fall back deterministically (no model reachable).
  const ob = await sla.ownerBrief(tenantId);
  assert.ok(ob.brief && ob.brief.length > 0, 'brief produced');
  assert.strictEqual(ob.aiUsed, false, 'no AI when host unreachable');

  const d = doctor.check();
  assert.ok(d.ok, 'doctor checks pass');

  console.log('slaMonitorSmoke OK');
}

main().then(() => process.exit(0)).catch(e => { console.error('slaMonitorSmoke FAILED:', e); process.exit(1); });
