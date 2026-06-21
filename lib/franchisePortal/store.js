// lib/franchisePortal/store.js — Demo-safe, in-memory preview data for the Franchise/Branch Partner Portal.
// NO real franchise/payment/tax data. Used only to render safe previews. Nothing here is committed as real PII.
'use strict';

const DAY = 86400000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString();

const DEMO_FRANCHISE = {
  id: 'fr_demo_1',
  name: 'Demo Franchise Holdings',
  phone: '+923001234567',
  email: 'demo.franchise@example.com',
  address: { area: 'Clifton', city: 'Karachi', line: 'Block 5 Demo Plaza' },
  taxRef: 'tax_secret_1',
  tier: 'Master',
  agreementStatus: 'active',
  outlets: [
    { id: 'outlet_1', name: 'Clifton Outlet', status: 'active', staffCount: 8, salesMTD: 850000, target: 1000000 },
    { id: 'outlet_2', name: 'DHA Outlet', status: 'active', staffCount: 6, salesMTD: 620000, target: 600000 },
    { id: 'outlet_3', name: 'Gulshan Outlet', status: 'onboarding', staffCount: 3, salesMTD: 90000, target: 300000 },
  ],
  royalty: { period: '2026-06', ratePercent: 6, accrued: 0, status: 'pending' },
  royaltyInvoices: [
    { id: 'finv_2001', amount: 93000, paid: 0, balance: 93000, status: 'unpaid', dueDate: iso(-3), paymentRef: 'pay_abc' },
    { id: 'finv_2002', amount: 78000, paid: 78000, balance: 0, status: 'paid', dueDate: iso(-20), paymentRef: 'pay_def' },
  ],
  replenishmentOrders: [
    { id: 'rord_3001', status: 'processing', total: 220000, eta: iso(5), delayed: false },
  ],
  inventoryAllocation: [
    { id: 'sku_1', name: 'Core Product A', allocatedQty: 1200, onHandQty: 340 },
    { id: 'sku_2', name: 'Core Product B', allocatedQty: 800, onHandQty: 60 },
  ],
  marketingFund: { period: '2026-06', contributionPercent: 2, balance: 145000, status: 'available' },
  compliance: [
    { id: 'chk_4001', name: 'Brand Standards Audit', status: 'passed' },
    { id: 'chk_4002', name: 'Hygiene Checklist', status: 'pending' },
  ],
  territory: { code: 'KHI-SOUTH', exclusivity: 'exclusive', status: 'active' },
  contracts: [
    { id: 'con_5001', name: 'Franchise Agreement', status: 'expiring', expiry: iso(45) },
  ],
  documents: [
    { id: 'doc_6001', name: 'Franchise Agreement', status: 'available' },
    { id: 'doc_6002', name: 'Brand Manual', status: 'missing' },
  ],
};

function findFranchisePreview(input = {}) {
  const mode = input.mode || input.lookupMode || 'demo_preview';
  const supported = ['preview_token', 'masked_phone_lookup_preview', 'franchise_reference_preview',
    'franchise_code_preview', 'outlet_account_preview', 'demo_preview'];
  const accessMode = supported.includes(mode) ? mode : 'demo_preview';
  return { franchise: DEMO_FRANCHISE, accessMode, found: true };
}

function demoFranchise() { return DEMO_FRANCHISE; }

module.exports = { DEMO_FRANCHISE, findFranchisePreview, demoFranchise, iso };
