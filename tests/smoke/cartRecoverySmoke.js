'use strict';
// #80 Abandoned Cart Recovery — smoke test. Run: npm run cart-recovery:smoke
const assert = require('assert');
const cart = require('../../lib/cartRecovery');
const detector = require('../../lib/cartRecovery/detector');
const seq = require('../../lib/cartRecovery/recoverySequence');
const store = require('../../lib/cartRecovery/store');

let pass = 0;
function t(name, fn) { try { fn(); pass++; console.log('  PASS', name); } catch (e) { console.error('  FAIL', name, '-', e.message); process.exitCode = 1; } }

const tenantId = 'smoke-tenant';
const cartId = 'cart-' + Date.now();
const contactId = 'contact-' + Date.now();

t('track creates an open cart', () => {
  const out = cart.track({ tenantId, cartId, contactId, value: 5000, items: [{ sku: 'A', qty: 1 }] });
  assert(out.ok && out.cart.status === 'open', 'open cart created');
});

t('detect flips stale cart to abandoned', () => {
  const db = store.load();
  const c = store.get(db, tenantId, cartId);
  // backdate activity beyond abandon window
  c.lastActivityAt = new Date(Date.now() - (cart.config.abandonAfterMinutes + 5) * 60000).toISOString();
  store.save(db);
  const db2 = store.load();
  const flipped = detector.detectAbandoned(db2);
  store.save(db2);
  assert(flipped.some(x => x.id === cartId), 'cart abandoned');
});

t('processDue drafts a nudge (advisory)', () => {
  const db = store.load();
  const c = store.get(db, tenantId, cartId);
  c.abandonedAt = new Date(Date.now() - 100 * 3600000).toISOString(); // far in past so all nudges due
  store.save(db);
  const db2 = store.load();
  const drafts = seq.processDue(db2, Date.now());
  store.save(db2);
  assert(drafts.some(d => d.cartId === cartId && d.draft && d.draft.text), 'draft built');
});

t('markPaid after nudges => recovered', () => {
  const out = cart.markPaid({ tenantId, cartId });
  assert(out.ok && (out.cart.status === 'recovered' || out.cart.status === 'paid'), 'marked paid/recovered');
});

t('runCycle returns drafts array', () => {
  const out = cart.runCycle();
  assert(Array.isArray(out.drafts), 'drafts array');
});

t('doctor healthy', () => {
  const r = cart.doctor.check();
  assert(r.healthy, 'doctor healthy: ' + JSON.stringify(r.issues));
});

console.log(`\nCart recovery smoke: ${pass} checks passed.`);
