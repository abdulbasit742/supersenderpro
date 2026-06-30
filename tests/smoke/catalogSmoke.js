'use strict';
// #83 Product Catalog & Variants — smoke test. Run: npm run catalog:smoke
const assert = require('assert');
const catalog = require('../../lib/catalog');

let pass = 0;
function t(name, fn) { try { fn(); pass++; console.log('  PASS', name); } catch (e) { console.error('  FAIL', name, '-', e.message); process.exitCode = 1; } }

const tenantId = 'smoke-tenant';
const sku = 'SKU-' + Date.now();
let productId;

t('create product', () => {
  const out = catalog.create({ tenantId, name: 'Test Widget', sku, price: 999, category: 'widgets', tags: ['new'] });
  assert(out.ok && out.product.id, 'created');
  productId = out.product.id;
});

t('unique SKU enforced', () => {
  const out = catalog.create({ tenantId, name: 'Dup', sku });
  assert(out.ok === false && out.error === 'sku_taken', 'dup sku blocked');
});

t('add variant with own price', () => {
  const out = catalog.addVariant({ tenantId, productId, variant: { name: 'Large', sku: sku + '-L', price: 1299, attributes: { size: 'L' } } });
  assert(out.ok && out.variant.id, 'variant added');
});

t('priceOf product + variant', () => {
  const base = catalog.priceOf({ tenantId, productId });
  assert(base.ok && base.price === 999, 'base price');
  const p = catalog.get(tenantId, productId);
  const vId = p.variants[0].id;
  const vp = catalog.priceOf({ tenantId, productId, variantId: vId });
  assert(vp.ok && vp.price === 1299, 'variant price');
});

t('update mutates allowed fields', () => {
  const out = catalog.update({ tenantId, productId, patch: { price: 1500, active: false } });
  assert(out.ok && out.product.price === 1500 && out.product.active === false, 'updated');
});

t('search finds by query', () => {
  const out = catalog.find(tenantId, { q: 'widget' });
  assert(out.total >= 1, 'found by query');
});

t('doctor healthy', () => {
  const r = catalog.doctor.check();
  assert(r.healthy, 'doctor healthy: ' + JSON.stringify(r.issues));
});

console.log(`\nCatalog smoke: ${pass} checks passed.`);
