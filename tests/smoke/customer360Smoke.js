// tests/smoke/customer360Smoke.js
// Offline smoke test for Customer 360. No model: summary uses the template
// fallback. Seeds several suite stores for one phone so the merge is exercised
// end-to-end. Exit code 0 = pass.
//
// Run: node tests/smoke/customer360Smoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> template summary

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const c360 = require('../../lib/customer360/customer360');

function seed(rel, data) {
  const p = path.join(__dirname, '..', '..', 'data', rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

(async () => {
  let passed = 0;
  const STORE = 'c360_smoke';
  const PHONE = '+92300555';
  const now = Date.now();

  // unknown contact -> known:false, graceful summary
  const unknown = await c360.profile({ storeId: STORE, phone: '+000nobody' });
  assert.strictEqual(unknown.profile.known, false); passed++;
  assert.ok(/No history/i.test(unknown.summary)); passed++;

  // seed lead intel, conversation, order, review, booking for PHONE
  seed(`lead_intel/${STORE}_scores.json`, { [PHONE]: { score: 82, band: 'hot', atRisk: false, nextBestAction: 'Send pricing and close', signals: { messageCount: 4 } } });
  seed(`support_agent/${STORE}_conversations.json`, { [PHONE]: { customerName: 'Ayesha', escalatedAt: now, lastIntent: 'order', history: [ { role: 'user', content: 'price?', ts: now }, { role: 'agent', content: 'sure', ts: now } ] } });
  seed(`orders_draft/${STORE}_drafts.json`, { [PHONE]: { status: 'draft', total: 2500, ts: now, order: { items: [ { name: 'Red Shirt', qty: 2 } ] } } });
  seed(`reviews/${STORE}_reviews.json`, { [PHONE]: { verdict: 'happy', rating: 5, status: 'happy_routed' } });
  seed(`bookings/${STORE}_bookings.json`, [ { phone: PHONE, status: 'confirmed', ts: now + 86400000, label: 'Wed 1 Jul at 17:00' } ]);

  // buildProfile merges all sources
  const p = c360.buildProfile({ storeId: STORE, phone: PHONE });
  assert.strictEqual(p.known, true); passed++;
  assert.strictEqual(p.name, 'Ayesha'); passed++;
  assert.ok(p.lead && p.lead.band === 'hot'); passed++;
  assert.ok(p.conversation && p.conversation.escalated === true); passed++;
  assert.ok(p.order && p.order.total === 2500); passed++;
  assert.ok(p.review && p.review.rating === 5); passed++;
  assert.ok(p.booking && p.booking.upcoming && /Jul/.test(p.booking.upcoming.label)); passed++;

  // highlights chips include key facts
  assert.ok(p.highlights.some(h => /hot/.test(h))); passed++;
  assert.ok(p.highlights.includes('escalated')); passed++;
  assert.ok(p.highlights.some(h => /order/.test(h))); passed++;

  // profile() summary (fallback) mentions the name + a NEXT
  const full = await c360.profile({ storeId: STORE, phone: PHONE });
  assert.strictEqual(full.source, 'fallback'); passed++;
  assert.ok(/Ayesha/.test(full.summary)); passed++;
  assert.ok(/NEXT:/.test(full.summary)); passed++;

  // search by band finds the hot lead
  const hits = c360.search({ storeId: STORE, band: 'hot' });
  assert.ok(hits.find(h => h.phone === PHONE)); passed++;

  // missing phone throws
  let threw = false; try { c360.buildProfile({ storeId: STORE }); } catch { threw = true; }
  assert.ok(threw, 'buildProfile without phone should throw'); passed++;

  console.log(`\u2705 customer360 smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c customer360 smoke failed:', e); process.exit(1); });
