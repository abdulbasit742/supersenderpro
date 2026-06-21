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

// ---- Advanced B2B Commerce Operating System modules (all preview-only) ----
const onboarding = require('./onboardingPreview');
const compliance = require('./complianceDocumentPreview');
const contractPrice = require('./contractPricePreview');
const tierDiscount = require('./tierDiscountPreview');
const volumeDiscount = require('./volumeDiscountPreview');
const dynamicPricing = require('./dynamicPricingPreview');
const warehouseStock = require('./warehouseStockPreview');
const branchStock = require('./branchStockPreview');
const bulkImport = require('./bulkImportPreview');
const reorder = require('./reorderSuggestionPreview');
const substitution = require('./productSubstitutionPreview');
const crossSell = require('./crossSellUpsellPreview');
const quoteNegotiation = require('./quoteNegotiationPreview');
const quoteApproval = require('./quoteApprovalPreview');
const backorder = require('./backorderPreview');
const partialShipment = require('./partialShipmentPreview');
const statement = require('./statementPreview');
const creditRisk = require('./creditRiskPreview');
const dispute = require('./disputeCenterPreview');
const rebate = require('./rebateIncentivePreview');
const target = require('./targetAchievementPreview');
const leaderboard = require('./leaderboardPreview');
const territory = require('./territoryPerformancePreview');
const channelConflict = require('./channelConflictPreview');
const leadReg = require('./leadRegistrationPreview');
const dealReg = require('./dealRegistrationPreview');
const riskScore = require('./riskScorePreview');
const analytics = require('./analyticsPreview');
const aiInsight = require('./aiInsightPreview');

// ---- v2: distributor B2B commerce OS additions ----
const businessVerification = require('./businessVerificationPreview');
const priceProtection = require('./priceProtectionPreview');
const promotionEligibility = require('./promotionEligibilityPreview');
const regionStock = require('./regionStockPreview');
const cartRisk = require('./cartRiskPreview');
const quoteComparison = require('./dealerQuoteComparisonPreview');
const deliveryEtaRisk = require('./deliveryEtaRiskPreview');
const claimPipeline = require('./dealerClaimPipelinePreview');

const SUPPORTED_MODULES = [
  'profile', 'tier', 'account', 'onboarding', 'compliance-documents', 'catalog', 'price-list', 'wholesale-prices',
  'contract-prices', 'tier-discounts', 'volume-discounts', 'dynamic-pricing', 'stock-availability', 'warehouse-stock',
  'branch-stock', 'moq', 'bulk-order-draft', 'bulk-import', 'reorder-suggestion', 'product-substitution',
  'cross-sell-upsell', 'quotation-request', 'quote-negotiation', 'quote-approval', 'orders', 'backorders',
  'partial-shipments', 'deliveries', 'shipments', 'invoices', 'statement', 'outstanding-balance', 'credit-limit',
  'credit-risk', 'payment-query', 'dispute', 'commission-margin', 'rebates-incentives', 'targets-achievements',
  'leaderboard', 'territory-performance', 'channel-conflict', 'lead-registration', 'deal-registration',
  'returns-claims', 'warranty-claims', 'loyalty', 'contracts', 'documents', 'document-request', 'support-request',
  'message-draft', 'audit', 'risk-score', 'analytics', 'ai-insight',
  // ---- v2 ----
  'business-verification', 'price-protection', 'promotion-eligibility', 'region-stock', 'cart-risk',
  'dealer-quote-comparison', 'delivery-eta-risk', 'claim-pipeline', 'catalog-item-status',
];

// GET /status — always-safe capability + safety report.
function getDealerPortalStatus() {
  return model.safeResponse({
    liveActionsEnabled: false,
    dealerPortalPublicLive: false,
    piiMasked: true,
    externalCallsEnabled: false,
    supportedModules: SUPPORTED_MODULES,
    advancedFeaturesEnabledPreview: true,
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

// ---- Advanced module pass-throughs (preview-only) ----
function getOnboardingPreview(i) { return onboarding.getOnboardingPreview(i); }
function getComplianceDocumentPreview(i) { return compliance.listComplianceDocuments(i); }
function getContractPricePreview(i) { return contractPrice.getContractPricePreview(i); }
function getTierDiscountPreview(i) { return tierDiscount.getTierDiscountPreview(i); }
function getVolumeDiscountPreview(i) { return volumeDiscount.getVolumeDiscountPreview(i); }
function createDynamicPricingPreview(i) { audit.recordPreview('dynamic_pricing_preview', store.demoDealer()); return dynamicPricing.createDynamicPricingPreview(i); }
function getWarehouseStockPreview(i) { return warehouseStock.getWarehouseStockPreview(i); }
function getBranchStockPreview(i) { return branchStock.getBranchStockPreview(i); }
function createBulkImportPreview(i) { audit.recordPreview('bulk_import_preview', store.demoDealer()); return bulkImport.createBulkImportPreview(i); }
function createReorderSuggestionPreview(i) { return reorder.createReorderSuggestionPreview(i); }
function createProductSubstitutionPreview(i) { return substitution.createProductSubstitutionPreview(i); }
function createCrossSellUpsellPreview(i) { return crossSell.createCrossSellUpsellPreview(i); }
function createQuoteNegotiationPreview(i) { audit.recordPreview('quote_negotiation_preview', store.demoDealer()); return quoteNegotiation.createQuoteNegotiationPreview(i); }
function createQuoteApprovalPreview(i) { audit.recordPreview('quote_approval_preview', store.demoDealer()); return quoteApproval.createQuoteApprovalPreview(i); }
function getOutstandingStatementPreview(i) { return statement.getStatementPreview(i); }
function getCreditRiskPreview(i) { return creditRisk.getCreditRiskPreview(i); }
function createDisputePreview(i) { audit.recordPreview('dispute_preview', store.demoDealer()); return dispute.createDisputePreview(i); }
function getRebateIncentivePreview(i) { return rebate.getRebateIncentivePreview(i); }
function getTargetAchievementPreview(i) { return target.getTargetAchievementPreview(i); }
function getLeaderboardPreview(i) { return leaderboard.getLeaderboardPreview(i); }
function getTerritoryPerformancePreview(i) { return territory.getTerritoryPerformancePreview(i); }
function createChannelConflictPreview(i) { return channelConflict.createChannelConflictPreview(i); }
function createLeadRegistrationPreview(i) { audit.recordPreview('lead_registration_preview', store.demoDealer()); return leadReg.createLeadRegistrationPreview(i); }
function createDealRegistrationPreview(i) { audit.recordPreview('deal_registration_preview', store.demoDealer()); return dealReg.createDealRegistrationPreview(i); }
function getRiskScorePreview(i) { return riskScore.getRiskScorePreview(i); }
function getAnalyticsPreview(i) { return analytics.getAnalyticsPreview(i); }
function createAiInsightPreview(i) { audit.recordPreview('ai_insight_preview', store.demoDealer()); return aiInsight.createAiInsightPreview(i); }

// ---- v2 pass-throughs ----
function getBusinessVerificationPreview(i) { return businessVerification.getBusinessVerificationPreview(i); }
function createPriceProtectionPreview(i) { return priceProtection.createPriceProtectionPreview(i); }
function getPromotionEligibilityPreview(i) { return promotionEligibility.getPromotionEligibilityPreview(i); }
function getRegionStockPreview(i) { return regionStock.getRegionStockPreview(i); }
function createCartRiskPreview(i) { return cartRisk.createCartRiskPreview(i); }
function createDealerQuoteComparisonPreview(i) { audit.recordPreview('quote_comparison_preview', store.demoDealer()); return quoteComparison.createDealerQuoteComparisonPreview(i); }
function getDeliveryEtaRiskPreview(i) { return deliveryEtaRisk.getDeliveryEtaRiskPreview(i); }
function getClaimPipelinePreview(i) { return claimPipeline.getClaimPipelinePreview(i); }
function getCatalogItemStatus(i) { return catalog.getCatalogItemStatus(i); }

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
  // ---- Advanced B2B Commerce Operating System ----
  getOnboardingPreview,
  getComplianceDocumentPreview,
  getContractPricePreview,
  getTierDiscountPreview,
  getVolumeDiscountPreview,
  createDynamicPricingPreview,
  getWarehouseStockPreview,
  getBranchStockPreview,
  createBulkImportPreview,
  createReorderSuggestionPreview,
  createProductSubstitutionPreview,
  createCrossSellUpsellPreview,
  createQuoteNegotiationPreview,
  createQuoteApprovalPreview,
  getOutstandingStatementPreview,
  getCreditRiskPreview,
  listDisputes: dispute.listDisputes,
  createDisputePreview,
  getRebateIncentivePreview,
  getTargetAchievementPreview,
  getLeaderboardPreview,
  getTerritoryPerformancePreview,
  createChannelConflictPreview,
  createLeadRegistrationPreview,
  createDealRegistrationPreview,
  listBackorders: backorder.listBackorders,
  listPartialShipments: partialShipment.listPartialShipments,
  getRiskScorePreview,
  getAnalyticsPreview,
  createAiInsightPreview,
  // ---- v2 ----
  getBusinessVerificationPreview,
  createPriceProtectionPreview,
  getPromotionEligibilityPreview,
  getRegionStockPreview,
  createCartRiskPreview,
  createDealerQuoteComparisonPreview,
  getDeliveryEtaRiskPreview,
  getClaimPipelinePreview,
  getCatalogItemStatus,
};
