// lib/vendorPortal/store.js — Demo-safe, in-memory preview data for the Vendor/Supplier Portal.
// NO real vendor/payment/bank/tax data. Used only to render safe previews. Nothing here is committed as real PII.
'use strict';

const DAY = 86400000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString();

const DEMO_VENDOR = {
  id: 'vendor_demo_1',
  name: 'Demo Supplies Co',
  phone: '+923001234567',
  email: 'demo.vendor@example.com',
  address: { area: 'Korangi', city: 'Karachi', line: 'Unit 9 Demo Trade Center' },
  taxRef: 'tax_secret_1',
  bankRef: 'bank_secret_1',
  tier: 'Preferred',
  accountStatus: 'active',
  rating: { score: 4.6, onTimeRate: 0.92, qualityRate: 0.97 },
  supplyCatalog: [
    { id: 'sku_1', name: 'Raw Material A', agreedPrice: 320, leadTimeDays: 7, moq: 500 },
    { id: 'sku_2', name: 'Component B', agreedPrice: 85, leadTimeDays: 14, moq: 1000 },
    { id: 'sku_3', name: 'Packaging C', agreedPrice: 12, leadTimeDays: 5, moq: 5000 },
  ],
  purchaseOrders: [
    { id: 'po_1001', status: 'open', total: 160000, eta: iso(6), delayed: false },
    { id: 'po_1002', status: 'partially_received', total: 85000, eta: iso(-1), delayed: true },
  ],
  grns: [
    { id: 'grn_2001', poId: 'po_1002', status: 'inspection_pending', receivedQty: 600 },
  ],
  invoices: [
    { id: 'vinv_3001', amount: 160000, paid: 0, balance: 160000, status: 'submitted', dueDate: iso(20), paymentRef: 'pay_abc' },
    { id: 'vinv_3002', amount: 85000, paid: 85000, balance: 0, status: 'paid', dueDate: iso(-5), paymentRef: 'pay_def' },
  ],
  paymentSchedule: [
    { id: 'sch_3101', dueDate: iso(20), amount: 160000, status: 'scheduled' },
  ],
  deliveries: [
    { id: 'dlv_4001', poId: 'po_1001', status: 'in_transit', carrier: 'Demo Freight', eta: iso(3) },
  ],
  qualityInspections: [
    { id: 'qc_4101', grnId: 'grn_2001', status: 'pending', result: '' },
  ],
  complianceDocs: [
    { id: 'cmp_5001', name: 'Tax Registration', status: 'valid', expiry: iso(120) },
    { id: 'cmp_5002', name: 'ISO Certificate', status: 'expiring', expiry: iso(20) },
  ],
  contracts: [
    { id: 'con_6001', name: 'Supply Agreement', status: 'active', expiry: iso(180) },
  ],
  documents: [
    { id: 'doc_7001', name: 'Vendor Agreement', status: 'available' },
    { id: 'doc_7002', name: 'Bank Mandate Form', status: 'missing' },
  ],
};

function findVendorPreview(input = {}) {
  const mode = input.mode || input.lookupMode || 'demo_preview';
  const supported = ['preview_token', 'masked_phone_lookup_preview', 'vendor_reference_preview',
    'vendor_code_preview', 'supplier_account_preview', 'demo_preview'];
  const accessMode = supported.includes(mode) ? mode : 'demo_preview';
  return { vendor: DEMO_VENDOR, accessMode, found: true };
}

function demoVendor() { return DEMO_VENDOR; }

module.exports = { DEMO_VENDOR, findVendorPreview, demoVendor, iso };
