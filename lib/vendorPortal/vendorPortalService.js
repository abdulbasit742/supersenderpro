// lib/vendorPortal/vendorPortalService.js — Central service: portal status, lookup, and re-export of all previews.
// Everything is dry-run / preview-only. No external calls, no live mutations, no live sends, PII masked.
'use strict';

const store = require('./store');
const model = require('./vendorPortalModel');
const { redactVendor } = require('./redactor');

const profile = require('./vendorProfilePreview');
const tier = require('./tierStatusPreview');
const account = require('./accountStatusPreview');
const catalog = require('./supplyCatalogPreview');
const priceList = require('./purchasePriceListPreview');
const po = require('./purchaseOrderStatusPreview');
const grn = require('./grnStatusPreview');
const invSubmission = require('./invoiceSubmissionPreview');
const invoices = require('./invoicePaymentStatusPreview');
const payable = require('./outstandingPayablePreview');
const schedule = require('./paymentSchedulePreview');
const delivery = require('./deliveryStatusPreview');
const quality = require('./qualityInspectionPreview');
const compliance = require('./complianceDocumentPreview');
const contracts = require('./contractStatusPreview');
const rating = require('./ratingStatusPreview');
const documents = require('./documentRequestPreview');
const paymentQuery = require('./paymentQueryPreview');
const support = require('./supportRequestPreview');
const drafts = require('./messageDrafts');
const audit = require('./auditPreview');
const summary = require('./statusSummaryPreview');

const SUPPORTED_MODULES = [
  'profile', 'tier', 'account', 'supply-catalog', 'price-list', 'purchase-orders', 'grns',
  'invoices', 'outstanding-payable', 'payment-schedule', 'deliveries', 'quality-inspections',
  'compliance-documents', 'contracts', 'rating', 'documents',
];

function getVendorPortalStatus() {
  return model.safeResponse({
    liveActionsEnabled: false,
    vendorPortalPublicLive: false,
    piiMasked: true,
    externalCallsEnabled: false,
    supportedModules: SUPPORTED_MODULES,
    accessModes: model.ACCESS_MODES,
    portalStatuses: model.PORTAL_STATUSES,
    accountStatuses: model.ACCOUNT_STATUSES,
    tiers: model.TIERS,
  });
}

function lookupVendorPreview(input = {}) {
  const { vendor, accessMode } = store.findVendorPreview(input);
  const r = redactVendor(vendor);
  audit.recordPreview('lookup_preview', vendor, 'vendor_portal');
  return model.safeResponse({
    liveAuthEnabled: false,
    lookupMode: accessMode,
    vendorNameSafe: r.vendorNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    vendorTokenPreview: 'vendor_preview_****',
    warnings: ['auth_preview_only', 'pii_masked'],
  });
}

function getVendorSummaryPreview(input = {}) {
  audit.recordPreview('summary_preview', store.demoVendor(), 'vendor_portal');
  return summary.getVendorSummaryPreview(input);
}

function getVendorProfilePreview(i) { return profile.getVendorProfilePreview(i); }
function getTierStatusPreview(i) { return tier.getTierStatusPreview(i); }
function getAccountStatusPreview(i) { return account.getAccountStatusPreview(i); }
function getSupplyCatalogPreview(i) { return catalog.listSupplyCatalog(i); }
function getPurchasePriceListPreview(i) { return priceList.getPurchasePriceListPreview(i); }
function getPurchaseOrderStatusPreview(i) { return po.getPurchaseOrderStatusPreview(i); }
function getGrnStatusPreview(i) { return grn.listGrns(i); }
function createInvoiceSubmissionPreview(i) { audit.recordPreview('invoice_submission_preview', store.demoVendor()); return invSubmission.createInvoiceSubmissionPreview(i); }
function getInvoicePaymentStatusPreview(i) { return invoices.getInvoicePaymentStatusPreview(i); }
function getOutstandingPayablePreview(i) { return payable.getOutstandingPayablePreview(i); }
function getPaymentSchedulePreview(i) { return schedule.getPaymentSchedulePreview(i); }
function getQualityInspectionPreview(i) { return quality.listQualityInspections(i); }
function getComplianceDocumentPreview(i) { return compliance.listComplianceDocuments(i); }
function getContractStatusPreview(i) { return contracts.listContracts(i); }
function getRatingStatusPreview(i) { return rating.getRatingStatusPreview(i); }
function createDocumentRequestPreview(i) { audit.recordPreview('document_request_preview', store.demoVendor()); return documents.createDocumentRequestPreview(i); }
function createPaymentQueryPreview(i) { audit.recordPreview('payment_query_preview', store.demoVendor()); return paymentQuery.createPaymentQueryPreview(i); }
function createSupportRequestPreview(i) { audit.recordPreview('support_request_preview', store.demoVendor()); return support.createSupportRequestPreview(i); }
function createMessageDraftPreview(i) { audit.recordPreview('message_draft_preview', store.demoVendor()); return drafts.createMessageDraftPreview(i); }
function getAuditPreview() { return audit.getAuditPreview(); }

module.exports = {
  SUPPORTED_MODULES,
  getVendorPortalStatus,
  lookupVendorPreview,
  getVendorSummaryPreview,
  getVendorProfilePreview,
  getTierStatusPreview,
  getAccountStatusPreview,
  getSupplyCatalogPreview,
  getPurchasePriceListPreview,
  getPurchaseOrderStatusPreview, listPurchaseOrders: po.listPurchaseOrders,
  getGrnStatusPreview,
  createInvoiceSubmissionPreview,
  getInvoicePaymentStatusPreview, listInvoices: invoices.listInvoices,
  getOutstandingPayablePreview,
  getPaymentSchedulePreview,
  listDeliveries: delivery.listDeliveries,
  getQualityInspectionPreview,
  getComplianceDocumentPreview,
  getContractStatusPreview, listContracts: contracts.listContracts,
  getRatingStatusPreview,
  listDocuments: documents.listDocuments,
  createDocumentRequestPreview,
  createPaymentQueryPreview,
  createSupportRequestPreview,
  createMessageDraftPreview,
  getAuditPreview,
};
