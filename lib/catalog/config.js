'use strict';
// #83 Product Catalog & Variants — config.
function bool(v, d) { if (v === undefined || v === null || v === '') return d; return String(v).toLowerCase() === 'true' || v === '1'; }
function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }
module.exports = {
  enabled: bool(process.env.CATALOG_ENABLED, true),
  currency: process.env.CATALOG_CURRENCY || 'PKR',
  // Require unique SKUs across the tenant.
  uniqueSku: bool(process.env.CATALOG_UNIQUE_SKU, true),
  // Default page size for listing.
  pageSize: num(process.env.CATALOG_PAGE_SIZE, 50)
};
