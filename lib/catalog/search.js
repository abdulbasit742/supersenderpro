'use strict';
// #83 Product Catalog & Variants — simple search/filter.
const store = require('./store');
const config = require('./config');

function query(db, tenantId, { q, category, tag, activeOnly, page, pageSize } = {}) {
  let rows = store.list(db, tenantId);
  if (activeOnly) rows = rows.filter(p => p.active);
  if (category) rows = rows.filter(p => p.category === category);
  if (tag) rows = rows.filter(p => (p.tags || []).includes(tag));
  if (q) {
    const lc = String(q).toLowerCase();
    rows = rows.filter(p =>
      p.name.toLowerCase().includes(lc) ||
      (p.sku && p.sku.toLowerCase().includes(lc)) ||
      (p.description && p.description.toLowerCase().includes(lc))
    );
  }
  const size = pageSize || config.pageSize;
  const pg = Math.max(1, page || 1);
  const start = (pg - 1) * size;
  return { total: rows.length, page: pg, pageSize: size, products: rows.slice(start, start + size) };
}
module.exports = { query };
