'use strict';
/**
 * Offline smoke test for #97 AI Shipping & COD Calculator.
 * Runs with NO model. Forces aiBrain offline by pointing OLLAMA_HOST at a
 * dead port so phrase() falls back to the deterministic template.
 * Run: node tests/smoke/shippingSmoke.js
 */
process.env.OLLAMA_HOST = 'http://127.0.0.1:0';
process.env.LLM_HUB_DRY_RUN = 'true';

const assert = require('assert');
const calc = require('../../lib/shippingCalculator');

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  console.log('  \u2713 ' + name);
  passed++;
}

(async function run() {
  console.log('AI Shipping & COD smoke...');

  // 1. Local zone, light parcel, prepaid.
  const q1 = calc.quote({ city: 'Karachi', weightKg: 0.7, subtotal: 1200, payment: 'prepaid' });
  ok('local zone resolved', q1.zone === 'local');
  ok('weight rounded up to 1kg', q1.weightKg === 1);
  ok('shipping = base 150 + 40*1 = 190', q1.shipping === 190);
  ok('no cod surcharge on prepaid', q1.codSurcharge === 0);
  ok('total = 1200 + 190', q1.total === 1390);

  // 2. COD surcharge applies.
  const q2 = calc.quote({ city: 'Karachi', weightKg: 1, subtotal: 2000, payment: 'cod' });
  ok('cod surcharge = flat 50 + 1% of 2000 = 70', q2.codSurcharge === 70);
  ok('cod total includes surcharge', q2.total === 2000 + q2.shipping + 70);

  // 3. Free shipping threshold.
  const q3 = calc.quote({ city: 'Lahore', weightKg: 2, subtotal: 6000, payment: 'prepaid' });
  ok('free shipping above threshold', q3.freeShipping === true && q3.shipping === 0);

  // 4. Unknown city -> default national zone.
  const q4 = calc.quote({ city: 'Nowhereville', weightKg: 1, subtotal: 100 });
  ok('unknown city -> national', q4.zone === 'national');

  // 5. COD blocked above max order value.
  const q5 = calc.quote({ city: 'Karachi', subtotal: 200000, payment: 'cod' });
  ok('cod blocked over max value', q5.codBlocked === true && q5.codSurcharge === 0);

  // 6. ETA window present and ordered.
  ok('eta min <= max', q5.eta.minDays <= q5.eta.maxDays);

  // 7. phrase() falls back to template offline and keeps the exact total.
  const r = await calc.quoteAndReply({ city: 'Karachi', weightKg: 1, subtotal: 1200, payment: 'prepaid' });
  ok('reply is a non-empty string', typeof r.message === 'string' && r.message.length > 0);
  ok('reply contains exact total figure', r.message.includes(String(r.quote.total)));

  console.log(`\nAll ${passed} shipping checks passed (offline, no model).`);
})().catch((e) => { console.error('SMOKE FAILED:', e); process.exit(1); });
