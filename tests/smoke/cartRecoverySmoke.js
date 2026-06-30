'use strict';
// Smoke test for Cart Recovery. Uses an isolated temp DATA_DIR so it never touches real data.
const os = require('os');
const path = require('path');
const fs = require('fs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cartrec-'));
process.env.DATA_DIR = tmp;
process.env.CART_ABANDON_MINUTES = '0';      // abandon instantly for test
process.env.CART_NUDGE_STEPS = '0';          // first nudge due immediately
process.env.CART_MAX_NUDGES = '1';
process.env.CART_QUIET_START = '0';
process.env.CART_QUIET_END = '0';            // disable quiet hours

const cart = require('../../lib/cartRecovery');

function assert(cond, msg) { if (!cond) { console.error('FAIL: ' + msg); process.exit(1); } else { console.log('ok: ' + msg); } }

const T = 'tenantA';

// 1) tenant guard
let threw = false; try { cart.upsertCart({ cartId: 'c1' }); } catch (_) { threw = true; }
assert(threw, 'upsertCart without tenantId throws');

// 2) upsert
const c = cart.upsertCart({ tenantId: T, cartId: 'c1', contact: { name: 'Ali', phone: '+923001234567' }, items: [{ sku: 'X', qty: 2 }], total: 500 });
assert(c && c.status === 'active', 'cart created active');

// 3) tick drafts a nudge (abandon=0, step=0)
const s1 = cart.tick({ tenantId: T });
assert(s1.abandoned >= 1, 'cart marked abandoned');
assert(s1.drafted === 1, 'one nudge drafted');
assert(s1.live === false, 'dry-run: not live');

// 4) draft is masked + draft status
const nudges = cart.listNudges({ tenantId: T });
assert(nudges.length === 1 && nudges[0].status === 'draft', 'nudge stored as draft');

// 5) second tick respects maxNudges (no new draft)
const s2 = cart.tick({ tenantId: T });
assert(s2.drafted === 0, 'maxNudges respected, no extra draft');

// 6) PII masking in listCarts
const listed = cart.listCarts({ tenantId: T });
assert(listed[0].contact.phone.includes('*'), 'phone masked in listing');

// 7) convert stops nudging
cart.markConverted({ tenantId: T, cartId: 'c1', orderId: 'o1' });
const conv = cart.listCarts({ tenantId: T, status: 'converted' });
assert(conv.length === 1, 'cart marked converted');

// 8) stats reflect recovered value
const st = cart.stats({ tenantId: T });
assert(st.recoveredValue === 500, 'recovered value tallied');

// 9) doctor ok
assert(cart.check().ok === true, 'doctor reports ok');

console.log('\nALL CART RECOVERY SMOKE TESTS PASSED');
