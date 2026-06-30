'use strict';
// #83 Product Catalog & Variants — CRUD + variant + pricing logic.
const crypto = require('crypto');
const config = require('./config');
const store = require('./store');

function pid() { return 'prod_' + crypto.randomBytes(6).toString('hex'); }
function vid() { return 'var_' + crypto.randomBytes(6).toString('hex'); }

function skuTaken(db, tenantId, sku, exceptProductId) {
  if (!sku) return false;
  return store.list(db, tenantId).some(p =>
    p.id !== exceptProductId && (
      p.sku === sku || (p.variants || []).some(v => v.sku === sku)
    )
  );
}

function create(db, { tenantId, name, sku, price, description, category, tags, variants, active }) {
  if (!name) throw new Error('name required');
  if (config.uniqueSku && sku && skuTaken(db, tenantId, sku)) return { ok: false, error: 'sku_taken' };
  const id = pid();
  const product = {
    id, tenantId: tenantId || 'default', name, sku: sku || null,
    price: Number(price) || 0, currency: config.currency,
    description: description || '', category: category || null, tags: tags || [],
    variants: (variants || []).map(v => ({ id: vid(), sku: v.sku || null, name: v.name || '', price: Number(v.price) || Number(price) || 0, attributes: v.attributes || {} })),
    active: active !== false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  db.products[store.key(tenantId, id)] = product;
  return { ok: true, product };
}

function update(db, { tenantId, productId, patch }) {
  const p = store.get(db, tenantId, productId);
  if (!p) return { ok: false, error: 'not_found' };
  const allowed = ['name', 'sku', 'price', 'description', 'category', 'tags', 'active'];
  for (const k of allowed) if (patch && patch[k] !== undefined) p[k] = (k === 'price') ? Number(patch[k]) || 0 : patch[k];
  p.updatedAt = new Date().toISOString();
  return { ok: true, product: p };
}

function addVariant(db, { tenantId, productId, variant }) {
  const p = store.get(db, tenantId, productId);
  if (!p) return { ok: false, error: 'not_found' };
  if (config.uniqueSku && variant && variant.sku && skuTaken(db, tenantId, variant.sku, productId)) return { ok: false, error: 'sku_taken' };
  const v = { id: vid(), sku: variant.sku || null, name: variant.name || '', price: Number(variant.price) || p.price, attributes: variant.attributes || {} };
  p.variants = p.variants || [];
  p.variants.push(v);
  p.updatedAt = new Date().toISOString();
  return { ok: true, product: p, variant: v };
}

function remove(db, { tenantId, productId }) {
  const k = store.key(tenantId, productId);
  if (!db.products[k]) return { ok: false, error: 'not_found' };
  delete db.products[k];
  return { ok: true };
}

// Resolve a price for a product (optionally a variant).
function priceOf(db, { tenantId, productId, variantId }) {
  const p = store.get(db, tenantId, productId);
  if (!p) return { ok: false, error: 'not_found' };
  if (variantId) {
    const v = (p.variants || []).find(x => x.id === variantId);
    if (!v) return { ok: false, error: 'variant_not_found' };
    return { ok: true, price: v.price, currency: p.currency };
  }
  return { ok: true, price: p.price, currency: p.currency };
}

module.exports = { create, update, addVariant, remove, priceOf, skuTaken };
