// lib/customerPortal/statusSummaryPreview.js — Aggregated, masked customer summary. Resilient if a module is missing.
'use strict';

const store = require('./store');
const { safeResponse } = require('./customerPortalModel');
const { redactCustomer } = require('./redactor');

// Safely run a producer; on any error push a module_not_available warning and return a fallback.
function safeCall(label, fn, fallback, warnings) {
  try {
    return fn();
  } catch (e) {
    warnings.push(`module_not_available:${label}`);
    return fallback;
  }
}

function getCustomerSummaryPreview(input = {}) {
  const warnings = [];
  const { customer } = store.findCustomerPreview(input);
  const r = redactCustomer(customer);

  const orders = safeCall('orders', () => require('./orderStatusPreview').listOrders(input).ordersPreview, [], warnings);
  const invoices = safeCall('invoices', () => require('./invoiceStatusPreview').listInvoices(input).invoicesPreview, [], warnings);
  const bookings = safeCall('bookings', () => require('./bookingStatusPreview').listBookings(input).bookingsPreview, [], warnings);
  const tickets = safeCall('tickets', () => require('./ticketStatusPreview').listTickets(input).ticketsPreview, [], warnings);
  const plans = safeCall('maintenance', () => require('./maintenanceStatusPreview').listMaintenancePlans(input).maintenancePlansPreview, [], warnings);
  const warranty = safeCall('warranty', () => require('./warrantyStatusPreview').listWarranty(input).warrantyPreview, [], warnings);
  const loyalty = safeCall('loyalty', () => require('./loyaltyStatusPreview').getLoyaltyStatusPreview(input).loyaltyPointsPreview, 0, warnings);
  const contracts = safeCall('contracts', () => require('./contractStatusPreview').listContracts(input).contractsPreview, [], warnings);
  const documents = safeCall('documents', () => require('./documentRequestPreview').listDocuments(input).documentsPreview, [], warnings);

  if (!customer.phone && !customer.email) warnings.push('missing_customer_contact');
  warnings.push('pii_masked');

  return safeResponse({
    liveActionsEnabled: false,
    portalPublicLive: false,
    piiMasked: true,
    customerNameSafe: r.customerNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    openOrdersPreview: orders.filter((o) => o.statusPreview !== 'delivered_preview').length,
    unpaidInvoicesPreview: invoices.filter((i) => i.statusPreview !== 'paid_preview').length,
    upcomingAppointmentsPreview: bookings.length,
    openTicketsPreview: tickets.filter((t) => t.statusPreview === 'open_preview').length,
    activeServicePlansPreview: plans.filter((p) => p.statusPreview === 'active_preview').length,
    activeWarrantyClaimsPreview: warranty.length,
    loyaltyPointsPreview: loyalty,
    expiringContractsPreview: contracts.filter((c) => c.statusPreview === 'expiring_preview').length,
    pendingDocumentsPreview: documents.filter((d) => d.statusPreview === 'missing').length,
    warnings: [...new Set(warnings)],
  });
}

module.exports = { getCustomerSummaryPreview };
