// lib/dealerPortal/dealerPortalService.js — Central service: portal status, lookup, and re-export of all previews.
// Everything is dry-run / preview-only. No external calls, no live mutations, no live sends, PII masked.
'use strict';

const store = require('./store');
const model = require('./dealerPortalModel');
const { redactDealer } = require('./redactor');

const profile = require('./dealerProfilePreview');
const tier = require('./tierStatusPreview');
const account = require('./b2bAccountStatusPreview');
const catalog = require('./catalogPreview');
const priceList = require('./dealerPriceListPreview');
const wholesale = require('./wholesalePricePreview');
const stock = require('./stockAvailabilityPreview');
const moq = require('./moqPreview');
const bulkOrder = require('./bulkOrderDraftPreview');
const quotation = require('./quotationRequestPreview');
const orders = require('./orderStatusPreview');
const invoices = require('./invoicePaymentStatusPreview');
const credit = require('./creditLimitPreview');
const outstanding = require('./outstandingBalancePreview');
const commission = require('./commissionMarginPreview');
const delivery = require('./deliveryStatusPreview');
const shipment = require('./shipmentStatusPreview');
const returns = require('./returnClaimStatusPreview');
const warranty = require('./warrantyClaimStatusPreview');
const loyalty = require('./loyaltyStatusPreview');
const contracts = require('./contractStatusPreview');
const documents = require('./documentRequestPreview');
const paymentQuery = require('./paymentQueryPreview');
const support = require('./supportRequestPreview');
const drafts = require('./messageDrafts');
const audit = require('./auditPreview');
const summary = require('./statusSummaryPreview');

const SUPPORTED_MODULES = [
  'profile', 'tier', 'account', 'catalog', 'price-list', 'wholesale-prices', 'stock-availability', 'moq',
  'orders', 'invoices', 'credit-limit', 'outstanding-balance', 'commission-margin', 'deliveries', 'shipments',
  'returns-claims', 'warranty-claims', 'loyalty', 'contracts', 'documents',
];

// GET /status — always-safe capability + safety report.
function getDealerPortalStatus() {
  return model.safeResponse({
    liveActionsEnabled: false,
    dealerPortalPublicLive: false,
    piiMasked: true,
    externalCallsEnabled: false,
    supportedModules: SUPPORTED_MODULES,
    accessModes: model.ACCESS_MODES,
    portalStatuses: model.PORTAL_STATUSES,
    accountStatuses: model.ACCOUNT_STATUSES,
    tiers: model.TIERS,
  });
}

// POST /lookup-preview — returns a masked session preview. No real auth, no live lookup.
function lookupDealerPreview(input = {}) {
  const { dealer, accessMode } = store.findDealerPreview(input);
  const r = redactDealer(dealer);
  audit.recordPreview('lookup_preview', dealer, 'dealer_portal');
  return model.safeResponse({
    liveAuthEnabled: false,
    lookupMode: accessMode,
    dealerNameSafe: r.dealerNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    dealerTokenPreview: 'dealer_preview_****',
    warnings: ['auth_preview_only', 'pii_masked'],
  });
}

function getDealerSummaryPreview(input = {}) {
  audit.recordPreview('summary_preview', store.demoDealer(), 'dealer_portal');
  return summary.getDealerSummaryPreview(input);
}

// Thin pass-throughs so every spec-named service function is available on one object.
function getDealerProfilePreview(i) { return profile.getDealerProfilePreview(i); }
function getTierStatusPreview(i) { return tier.getTierStatusPreview(i); }
function getB2bAccountStatusPreview(i) { return account.getB2bAccountStatusPreview(i); }
function getCatalogPreview(i) { return catalog.listCatalog(i); }
function getDealerPriceListPreview(i) { return priceList.getDealerPriceListPreview(i); }
function getWholesalePricePreview(i) { return wholesale.getWholesalePricePreview(i); }
function getStockAvailabilityPreview(i) { return stock.getStockAvailabilityPreview(i); }
function getMoqPreview(i) { return moq.getMoqPreview(i); }
function createBulkOrderDraftPreview(i) { audit.recordPreview('bulk_order_draft_preview', store.demoDealer()); return bulkOrder.createBulkOrderDraftPreview(i); }
function createQuotationRequestPreview(i) { audit.recordPreview('quotation_request_preview', store.demoDealer()); return quotation.createQuotationRequestPreview(i); }
function getOrderStatusPreview(i) { return orders.getOrderStatusPreview(i); }
function getInvoicePaymentStatusPreview(i) { return invoices.getInvoicePaymentStatusPreview(i); }
function getCreditLimitPreview(i) { return credit.getCreditLimitPreview(i); }
function getOutstandingBalancePreview(i) { return outstanding.getOutstandingBalancePreview(i); }
function getCommissionMarginPreview(i) { return commission.getCommissionMarginPreview(i); }
function getReturnClaimStatusPreview(i) { return returns.listReturnsClaims(i); }
function getWarrantyClaimStatusPreview(i) { return warranty.listWarrantyClaims(i); }
function getLoyaltyStatusPreview(i) { return loyalty.getLoyaltyStatusPreview(i); }
function getContractStatusPreview(i) { return contracts.listContracts(i); }
function createDocumentRequestPreview(i) { audit.recordPreview('document_request_preview', store.demoDealer()); return documents.createDocumentRequestPreview(i); }
function createPaymentQueryPreview(i) { audit.recordPreview('payment_query_preview', store.demoDealer()); return paymentQuery.createPaymentQueryPreview(i); }
function createSupportRequestPreview(i) { audit.recordPreview('support_request_preview', store.demoDealer()); return support.createSupportRequestPreview(i); }
function createMessageDraftPreview(i) { audit.recordPreview('message_draft_preview', store.demoDealer()); return drafts.createMessageDraftPreview(i); }
function getAuditPreview() { return audit.getAuditPreview(); }

module.exports = {
  SUPPORTED_MODULES,
  getDealerPortalStatus,
  lookupDealerPreview,
  getDealerSummaryPreview,
  getDealerProfilePreview,
  getTierStatusPreview,
  getB2bAccountStatusPreview,
  getCatalogPreview,
  getDealerPriceListPreview,
  getWholesalePricePreview,
  getStockAvailabilityPreview,
  getMoqPreview,
  createBulkOrderDraftPreview,
  createQuotationRequestPreview,
  getOrderStatusPreview, listOrders: orders.listOrders,
  getInvoicePaymentStatusPreview, listInvoices: invoices.listInvoices,
  getCreditLimitPreview,
  getOutstandingBalancePreview,
  getCommissionMarginPreview,
  listDeliveries: delivery.listDeliveries,
  listShipments: shipment.listShipments,
  getReturnClaimStatusPreview, listReturnsClaims: returns.listReturnsClaims,
  getWarrantyClaimStatusPreview, listWarrantyClaims: warranty.listWarrantyClaims,
  getLoyaltyStatusPreview,
  getContractStatusPreview, listContracts: contracts.listContracts,
  listDocuments: documents.listDocuments,
  createDocumentRequestPreview,
  createPaymentQueryPreview,
  createSupportRequestPreview,
  createMessageDraftPreview,
  getAuditPreview,
};
