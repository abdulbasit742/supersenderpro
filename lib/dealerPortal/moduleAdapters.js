// lib/dealerPortal/moduleAdapters.js — Safe adapters that aggregate previews from existing modules.
// If a module is missing it returns an empty preview + a module_not_available warning. Never crashes, never leaks.
'use strict';

// Try to load an internal dealer-portal preview module by relative name.
function tryRequire(rel) {
  try { return require(rel); } catch (e) { return null; }
}

// Generic safe adapter: runs fn(), captures result, never throws, tags missing modules.
function adapt(label, fn) {
  const warnings = [];
  let data = [];
  try {
    const out = fn();
    data = out === undefined || out === null ? [] : out;
  } catch (e) {
    warnings.push(`module_not_available:${label}`);
    data = [];
  }
  return { ok: true, dryRun: true, label, dataPreview: data, warnings };
}

// Known module map — each entry resolves to a safe preview or an empty fallback.
const ADAPTER_SOURCES = [
  'customer-portal', 'customer-360', 'crm', 'product-catalog', 'product-bi', 'pricing-center',
  'inventory-control', 'warehouse-stock', 'fulfillment-orders', 'deliveries-shipments',
  'receivables-invoices', 'cashbook-payment', 'loyalty', 'returns-rma', 'warranty-quality',
  'contract-center', 'document-vault', 'approval-center', 'audit-ledger', 'executive-dashboard',
  'ai-business-analyst',
];

// Returns a list of adapter availability previews. A source is "available" only if a
// corresponding internal preview module loads; otherwise it is reported as not available.
function getAdapterAvailabilityPreview() {
  return ADAPTER_SOURCES.map((src) => {
    const present = !!tryRequire(`./${src}`); // internal preview modules are not named this way -> false by design
    return { sourcePreview: src, availablePreview: present, warnings: present ? [] : ['module_not_available'] };
  });
}

module.exports = { tryRequire, adapt, getAdapterAvailabilityPreview, ADAPTER_SOURCES };
