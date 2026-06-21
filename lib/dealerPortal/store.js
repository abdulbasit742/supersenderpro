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
  // ---- Extended demo data for the advanced B2B operating system (all preview-only) ----
  onboarding: { stage: 'documents_review', stepsTotal: 5, stepsDonePreview: 3, kycStatus: 'in_review' },
  compliance: [
    { id: 'cmp_7001', name: 'Business Registration', status: 'verified' },
    { id: 'cmp_7002', name: 'Tax / NTN Certificate', status: 'pending' },
    { id: 'cmp_7003', name: 'Bank Verification Letter', status: 'missing' },
  ],
  contractPrices: [
    { id: 'prod_1', contractPrice: 800, validTill: iso(60) },
    { id: 'prod_3', contractPrice: 470, validTill: iso(30) },
  ],
  tierDiscounts: { silver: 3, gold: 6, platinum: 9, distributor: 12 },
  volumeDiscountTiers: [
    { minQty: 50, percent: 2 },
    { minQty: 100, percent: 4 },
    { minQty: 250, percent: 7 },
  ],
  warehouses: [
    { id: 'wh_1', name: 'Karachi Central', items: [{ id: 'prod_1', qty: 800 }, { id: 'prod_2', qty: 0 }, { id: 'prod_3', qty: 45 }] },
    { id: 'wh_2', name: 'Lahore North', items: [{ id: 'prod_1', qty: 400 }, { id: 'prod_2', qty: 0 }, { id: 'prod_3', qty: 30 }] },
  ],
  branches: [
    { id: 'br_1', name: 'Karachi Showroom', items: [{ id: 'prod_1', qty: 120 }, { id: 'prod_3', qty: 10 }] },
    { id: 'br_2', name: 'Islamabad Outlet', items: [{ id: 'prod_1', qty: 60 }, { id: 'prod_3', qty: 5 }] },
  ],
  backorders: [
    { id: 'bo_8001', productId: 'prod_2', qty: 40, expectedRestock: iso(7) },
  ],
  partialShipments: [
    { id: 'ps_8101', orderId: 'ord_1001', shippedQty: 30, pendingQty: 20, status: 'partial' },
  ],
  statement: { openingBalance: 41000, charges: 123000, payments: 41000, closingBalance: 123000, period: '2026-06' },
  rebates: [
    { id: 'reb_9001', scheme: 'Q2 Volume Rebate', status: 'accruing', amount: 0, atRisk: true },
    { id: 'reb_9002', scheme: 'Loyalty Bonus', status: 'eligible', amount: 0, atRisk: false },
  ],
  targets: { period: '2026-06', targetPreview: 1500000, achievedPreview: 980000 },
  leaderboard: [
    { dealer: 'North Traders', rank: 1, score: 98 },
    { dealer: 'Demo Distributors', rank: 2, score: 91 },
    { dealer: 'City Wholesale', rank: 3, score: 84 },
  ],
  territory: { region: 'South', performancePercentPreview: 73, rankPreview: 2, dealersInRegionPreview: 14 },
  leads: [
    { id: 'lead_9501', company: 'Prospect Retail', status: 'new', estimatedValue: 250000 },
  ],
  deals: [
    { id: 'deal_9601', name: 'Bulk Supply Q3', stage: 'qualification', value: 600000 },
  ],
  disputes: [
    { id: 'dsp_9701', invoiceRef: 'inv_2001', reason: 'Amount mismatch', status: 'open' },
  ],
  substitutions: {
    prod_2: [{ id: 'prod_1', name: 'Wholesale Item A', reason: 'same_category_in_stock' }],
  },
  crossSell: {
    prod_1: [{ id: 'prod_3', name: 'Wholesale Item C', reason: 'frequently_bought_together' }],
  },
  // ---- v2 additions: verification, regions, promotions, price protection, claim pipeline ----
  businessVerification: { status: 'partially_verified', businessNameVerified: true, taxVerified: false, bankVerified: false, addressVerified: true },
  regions: [
    { id: 'rg_south', name: 'South', items: [{ id: 'prod_1', qty: 1200 }, { id: 'prod_2', qty: 0 }, { id: 'prod_3', qty: 75 }] },
    { id: 'rg_north', name: 'North', items: [{ id: 'prod_1', qty: 460 }, { id: 'prod_2', qty: 0 }, { id: 'prod_3', qty: 35 }] },
  ],
  promotions: [
    { id: 'promo_1', name: 'Q2 Volume Booster', eligible: true, minQty: 100, benefit: '5% extra off' },
    { id: 'promo_2', name: 'New Dealer Bonus', eligible: false, reason: 'tier_not_eligible' },
  ],
  priceProtection: [
    { id: 'prod_1', oldPrice: 900, newPrice: 820, protectedUntil: iso(20) },
  ],
  claimPipeline: [
    { id: 'clm_1', type: 'return', stage: 'under_review' },
    { id: 'clm_2', type: 'warranty', stage: 'pending' },
    { id: 'clm_3', type: 'quality', stage: 'approved' },
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
