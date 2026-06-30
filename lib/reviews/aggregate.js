'use strict';
// #77 Reviews & Ratings — aggregate scores from approved reviews only.
const store = require('./store');

function forProduct(db, tenantId, productId) {
  const approved = store.list(db, tenantId, { productId, status: 'approved' });
  const count = approved.length;
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of approved) { sum += r.rating; if (dist[r.rating] !== undefined) dist[r.rating]++; }
  const avg = count ? +(sum / count).toFixed(2) : 0;
  return { productId, count, average: avg, distribution: dist };
}

function topProducts(db, tenantId, limit) {
  const approved = store.list(db, tenantId, { status: 'approved' });
  const byProduct = {};
  for (const r of approved) {
    byProduct[r.productId] = byProduct[r.productId] || { productId: r.productId, sum: 0, count: 0 };
    byProduct[r.productId].sum += r.rating;
    byProduct[r.productId].count++;
  }
  return Object.values(byProduct)
    .map(p => ({ productId: p.productId, count: p.count, average: +(p.sum / p.count).toFixed(2) }))
    .sort((a, b) => b.average - a.average || b.count - a.count)
    .slice(0, limit || 20);
}

module.exports = { forProduct, topProducts };
