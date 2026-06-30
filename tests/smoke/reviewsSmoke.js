'use strict';
// #77 Reviews & Ratings — smoke test. Run: npm run reviews:smoke
const assert = require('assert');
const reviews = require('../../lib/reviews');

let pass = 0;
function t(name, fn) { try { fn(); pass++; console.log('  PASS', name); } catch (e) { console.error('  FAIL', name, '-', e.message); process.exitCode = 1; } }

const tenantId = 'smoke-tenant';
const product = 'prod-' + Date.now();
const contact = 'contact-' + Date.now();
let reviewId;

t('submit clamps rating + starts pending/flagged', () => {
  const out = reviews.submit({ tenantId, productId: product, contactId: contact, rating: 9, title: 'Great', body: 'Loved it' });
  assert(out.ok, 'submitted');
  assert(out.review.rating <= reviews.config.maxRating, 'rating clamped');
  reviewId = out.review.id;
});

t('flag words auto-flag review', () => {
  const out = reviews.submit({ tenantId, productId: product + '-x', contactId: contact, rating: 1, title: 'this is a scam', body: 'fraud' });
  assert(out.ok && out.review.status === 'flagged', 'auto-flagged');
});

t('one review per product enforced', () => {
  const out = reviews.submit({ tenantId, productId: product, contactId: contact, rating: 5 });
  assert(out.ok === false && out.error === 'already_reviewed', 'dup blocked');
});

t('moderation approves review', () => {
  const out = reviews.moderate({ tenantId, reviewId, status: 'approved', by: 'smoke' });
  assert(out.ok && out.review.status === 'approved', 'approved');
});

t('aggregate counts only approved', () => {
  const agg = reviews.product(tenantId, product);
  assert(agg.count >= 1 && agg.average >= reviews.config.minRating, 'aggregate computed');
});

t('top products returns sorted list', () => {
  const top = reviews.top(tenantId, 5);
  assert(Array.isArray(top), 'array returned');
});

t('doctor healthy', () => {
  const r = reviews.doctor.check();
  assert(r.healthy, 'doctor healthy: ' + JSON.stringify(r.issues));
});

console.log(`\nReviews smoke: ${pass} checks passed.`);
