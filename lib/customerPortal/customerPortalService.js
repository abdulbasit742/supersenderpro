// lib/customerPortal/customerPortalService.js — Central service: portal status, lookup, and re-export of all previews.
// Everything is dry-run / preview-only. No external calls, no live mutations, no live sends.
'use strict';

const store = require('./store');
const model = require('./customerPortalModel');
const { redactCustomer } = require('./redactor');

const orders = require('./orderStatusPreview');
const invoices = require('./invoiceStatusPreview');
const bookings = require('./bookingStatusPreview');
const service = require('./serviceStatusPreview');
const maintenance = require('./maintenanceStatusPreview');
const tickets = require('./ticketStatusPreview');
const warranty = require('./warrantyStatusPreview');
const loyalty = require('./loyaltyStatusPreview');
const contracts = require('./contractStatusPreview');
const documents = require('./documentRequestPreview');
const support = require('./supportRequestPreview');
const drafts = require('./messageDrafts');
const audit = require('./auditPreview');
const summary = require('./statusSummaryPreview');

const SUPPORTED_MODULES = [
  'profile', 'orders', 'invoices', 'bookings', 'service-jobs', 'maintenance-plans',
  'tickets', 'complaints', 'warranty', 'loyalty', 'contracts', 'documents',
];

// GET /status — always-safe capability + safety report.
function getPortalStatus() {
  return model.safeResponse({
    liveActionsEnabled: false,
    portalPublicLive: false,
    piiMasked: true,
    externalCallsEnabled: false,
    supportedModules: SUPPORTED_MODULES,
    accessModes: model.ACCESS_MODES,
    portalStatuses: model.PORTAL_STATUSES,
  });
}

// POST /lookup-preview — returns a masked session preview. No real auth, no live lookup.
function lookupCustomerPreview(input = {}) {
  const { customer, accessMode } = store.findCustomerPreview(input);
  const r = redactCustomer(customer);
  audit.recordPreview('lookup_preview', customer, 'portal');
  return model.safeResponse({
    liveAuthEnabled: false,
    lookupMode: accessMode,
    customerNameSafe: r.customerNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    portalTokenPreview: 'preview_****',
    warnings: ['auth_preview_only', 'pii_masked'],
  });
}

function getCustomerSummaryPreview(input = {}) {
  audit.recordPreview('summary_preview', store.demoCustomer(), 'portal');
  return summary.getCustomerSummaryPreview(input);
}

// Thin pass-throughs so every spec-named service function is available on one object.
function getOrderStatusPreview(i) { return orders.getOrderStatusPreview(i); }
function getInvoiceStatusPreview(i) { return invoices.getInvoiceStatusPreview(i); }
function getBookingStatusPreview(i) { return bookings.getBookingStatusPreview(i); }
function getServiceStatusPreview(i) { return service.getServiceStatusPreview(i); }
function getMaintenanceStatusPreview(i) { return maintenance.getMaintenanceStatusPreview(i); }
function getTicketStatusPreview(i) { return tickets.getTicketStatusPreview(i); }
function getWarrantyStatusPreview(i) { return warranty.getWarrantyStatusPreview(i); }
function getLoyaltyStatusPreview(i) { return loyalty.getLoyaltyStatusPreview(i); }
function getContractStatusPreview(i) { return contracts.getContractStatusPreview(i); }
function getDocumentStatusPreview(i) { return documents.getDocumentStatusPreview(i); }
function createSupportRequestPreview(i) { audit.recordPreview('support_request_preview', store.demoCustomer()); return support.createSupportRequestPreview(i); }
function createDocumentRequestPreview(i) { audit.recordPreview('document_request_preview', store.demoCustomer()); return documents.createDocumentRequestPreview(i); }
function createRescheduleRequestPreview(i) { audit.recordPreview('reschedule_request_preview', store.demoCustomer()); return drafts.createRescheduleRequestPreview(i); }
function createPaymentReminderPreview(i) { audit.recordPreview('payment_reminder_preview', store.demoCustomer()); return drafts.createPaymentReminderPreview(i); }
function createMessageDraftPreview(i) { audit.recordPreview('message_draft_preview', store.demoCustomer()); return drafts.createMessageDraftPreview(i); }
function getAuditPreview() { return audit.getAuditPreview(); }

module.exports = {
  SUPPORTED_MODULES,
  getPortalStatus,
  lookupCustomerPreview,
  getCustomerSummaryPreview,
  getOrderStatusPreview, listOrders: orders.listOrders,
  getInvoiceStatusPreview, listInvoices: invoices.listInvoices,
  getBookingStatusPreview, listBookings: bookings.listBookings,
  getServiceStatusPreview, listServiceJobs: service.listServiceJobs,
  getMaintenanceStatusPreview, listMaintenancePlans: maintenance.listMaintenancePlans,
  getTicketStatusPreview, listTickets: tickets.listTickets, listComplaints: tickets.listComplaints,
  getWarrantyStatusPreview, listWarranty: warranty.listWarranty,
  getLoyaltyStatusPreview,
  getContractStatusPreview, listContracts: contracts.listContracts,
  getDocumentStatusPreview, listDocuments: documents.listDocuments,
  createSupportRequestPreview,
  createDocumentRequestPreview,
  createRescheduleRequestPreview,
  createPaymentReminderPreview,
  createMessageDraftPreview,
  getAuditPreview,
};
