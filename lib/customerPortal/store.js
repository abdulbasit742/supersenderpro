// lib/customerPortal/store.js — Demo-safe, in-memory preview data for the Customer Portal.
// NO real customer data. Used only to render safe previews. Nothing here is committed as real PII.
'use strict';

// Dates relative to "now" so previews show realistic upcoming/overdue states.
const DAY = 86400000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString();

// A single demo customer with linked demo records across every module.
const DEMO_CUSTOMER = {
  id: 'cus_demo_1',
  name: 'Demo Customer',
  phone: '+923001234567',
  email: 'demo.customer@example.com',
  address: { area: 'Gulberg', city: 'Lahore', line: '123 Demo Street' },
  loyalty: { points: 1240, tier: 'Gold', expiringPoints: 150, expiresAt: iso(20) },
  orders: [
    { id: 'ord_1001', status: 'processing', payment: 'unpaid', total: 5000, eta: iso(5), delayed: false },
    { id: 'ord_1002', status: 'delayed', payment: 'paid', total: 12000, eta: iso(-2), delayed: true },
  ],
  invoices: [
    { id: 'inv_2001', amount: 5000, paid: 0, balance: 5000, status: 'unpaid', dueDate: iso(-3), paymentRef: 'pay_abc123' },
    { id: 'inv_2002', amount: 12000, paid: 12000, balance: 0, status: 'paid', dueDate: iso(-10), paymentRef: 'pay_def456' },
  ],
  bookings: [
    { id: 'book_3001', status: 'confirmed', time: iso(2), staff: 'Staff Member A' },
  ],
  serviceJobs: [
    { id: 'wo_4001', status: 'in_progress', technician: 'Technician B', summary: 'AC servicing', delayed: false },
  ],
  maintenancePlans: [
    { id: 'amc_5001', plan: 'AMC Gold', status: 'active', expiry: iso(40) },
  ],
  tickets: [
    { id: 'tkt_6001', status: 'open', subject: 'Delivery query', priority: 'normal' },
  ],
  complaints: [
    { id: 'cmp_7001', status: 'unresolved', subject: 'Late delivery' },
  ],
  warranties: [
    { id: 'wty_8001', status: 'expiring', product: 'Appliance X', expiry: iso(15) },
  ],
  contracts: [
    { id: 'con_9001', status: 'expiring', name: 'Service Plan', expiry: iso(10) },
  ],
  documents: [
    { id: 'doc_1101', name: 'Latest Invoice', status: 'available' },
    { id: 'doc_1102', name: 'Warranty Card', status: 'missing' },
  ],
};

// Preview lookup: in demo mode any supported lookup returns the demo customer.
// accessMode is one of the supported portal access modes.
function findCustomerPreview(input = {}) {
  const mode = input.mode || input.lookupMode || 'demo_preview';
  const supported = ['preview_token', 'masked_phone_lookup_preview', 'invoice_reference_preview',
    'order_reference_preview', 'ticket_reference_preview', 'demo_preview'];
  const accessMode = supported.includes(mode) ? mode : 'demo_preview';
  // Always returns the demo customer — there is no real lookup against live data.
  return { customer: DEMO_CUSTOMER, accessMode, found: true };
}

function demoCustomer() {
  return DEMO_CUSTOMER;
}

module.exports = { DEMO_CUSTOMER, findCustomerPreview, demoCustomer, iso };
