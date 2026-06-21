// lib/dealerPortal/store.js — Demo-safe, in-memory preview data for the Dealer/Reseller Portal.
// NO real dealer/customer/payment data. Used only to render safe previews. Nothing here is committed as real PII.
'use strict';

const DAY = 86400000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString();

// A single demo dealer with linked demo records across every B2B module.
const DEMO_DEALER = {
  id: 'dealer_demo_1',
  name: 'Demo Distributors',
  phone: '+923001234567',
  email: 'demo.dealer@example.com',
  address: { area: 'SITE', city: 'Karachi', line: 'Plot 7 Demo Industrial Area' },
  taxRef: 'tax_secret_1',
  tier: 'Gold',
  accountStatus: 'active',
  creditRef: 'credit_secret_1',
  credit: { limit: 500000, used: 180000, available: 320000, hold: false },
  catalog: [
    { id: 'prod_1', name: 'Wholesale Item A', retailPrice: 1000, dealerPrice: 820, wholesalePrice: 760, moq: 50, stock: 1200 },
    { id: 'prod_2', name: 'Wholesale Item B', retailPrice: 2500, dealerPrice: 2100, wholesalePrice: 1950, moq: 20, stock: 0 },
    { id: 'prod_3', name: 'Wholesale Item C', retailPrice: 600, dealerPrice: 480, wholesalePrice: 440, moq: 100, stock: 75 },
  ],
  orders: [
    { id: 'ord_1001', status: 'processing', total: 82000, eta: iso(4), delayed: false },
    { id: 'ord_1002', status: 'delayed', total: 41000, eta: iso(-1), delayed: true },
  ],
  invoices: [
    { id: 'inv_2001', amount: 82000, paid: 0, balance: 82000, status: 'unpaid', dueDate: iso(-2), paymentRef: 'pay_abc' },
    { id: 'inv_2002', amount: 41000, paid: 41000, balance: 0, status: 'paid', dueDate: iso(-15), paymentRef: 'pay_def' },
  ],
  commission: { period: '2026-06', marginPercentPreview: 12, accruedPreview: 0, payoutStatus: 'pending' },
  deliveries: [
    { id: 'dlv_3001', status: 'in_transit', carrier: 'Demo Logistics', eta: iso(2) },
  ],
  shipments: [
    { id: 'shp_3101', status: 'dispatched', trackingRef: 'trk_secret_1' },
  ],
  returns: [
    { id: 'rma_4001', status: 'under_review', reason: 'Damaged unit' },
  ],
  warrantyClaims: [
    { id: 'wc_4101', status: 'pending', product: 'Wholesale Item A' },
  ],
  loyalty: { points: 3400, tier: 'Gold', expiringPoints: 200, expiresAt: iso(25) },
  contracts: [
    { id: 'con_5001', name: 'Dealership Agreement', status: 'expiring', expiry: iso(18) },
  ],
  documents: [
    { id: 'doc_6001', name: 'Dealer Agreement', status: 'available' },
    { id: 'doc_6002', name: 'Tax Certificate', status: 'missing' },
  ],
};

// Preview lookup: in demo mode any supported lookup returns the demo dealer.
function findDealerPreview(input = {}) {
  const mode = input.mode || input.lookupMode || 'demo_preview';
  const supported = ['preview_token', 'masked_phone_lookup_preview', 'dealer_reference_preview',
    'dealer_code_preview', 'b2b_account_preview', 'demo_preview'];
  const accessMode = supported.includes(mode) ? mode : 'demo_preview';
  // Always returns the demo dealer — there is no real lookup against live data.
  return { dealer: DEMO_DEALER, accessMode, found: true };
}

function demoDealer() {
  return DEMO_DEALER;
}

module.exports = { DEMO_DEALER, findDealerPreview, demoDealer, iso };
