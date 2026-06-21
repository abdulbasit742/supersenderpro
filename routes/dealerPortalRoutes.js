// routes/dealerPortalRoutes.js — Express router for the Dealer/Reseller Portal + B2B Order Self-Service Center.
// Mounted at /api/dealer-portal. Preview-only: no live order/stock/price/invoice/payment/credit/commission/delivery
// mutation, no live send, no document download, no external calls, PII masked.
'use strict';

const express = require('express');
const router = express.Router();

const svc = require('../lib/dealerPortal/dealerPortalService');
const { hasLeak } = require('../lib/dealerPortal/redactor');

// Wrap handlers: never leak stack traces or PII; always return safe JSON.
function safe(fn) {
  return (req, res) => {
    try {
      const out = fn(req, res);
      if (out !== undefined && !res.headersSent) {
        if (hasLeak(out)) return res.status(500).json({ ok: false, dryRun: true, liveActionsEnabled: false, error: 'response_blocked_pii_leak' });
        res.json(out);
      }
    } catch (e) {
      // No stack trace in the response.
      res.status(200).json({ ok: false, dryRun: true, liveActionsEnabled: false, error: 'preview_error', warnings: ['handler_error_suppressed'], blockers: [] });
    }
  };
}

const body = (req) => (req && req.body) || {};
const withId = (req) => Object.assign({}, body(req), { id: req.params.id, reference: req.params.id });

/* Status + lookup + summary */
router.get('/status', safe(() => svc.getDealerPortalStatus()));
router.post('/lookup-preview', safe((req) => svc.lookupDealerPreview(body(req))));
router.get('/summary', safe(() => svc.getDealerSummaryPreview({ mode: 'demo_preview' })));
router.post('/summary-preview', safe((req) => svc.getDealerSummaryPreview(body(req))));

/* Profile / tier / account */
router.get('/profile', safe(() => svc.getDealerProfilePreview({})));
router.get('/tier-status', safe(() => svc.getTierStatusPreview({})));
router.get('/account-status', safe(() => svc.getB2bAccountStatusPreview({})));

/* Catalog / pricing / stock / MOQ */
router.get('/catalog', safe(() => svc.getCatalogPreview({})));
router.get('/price-list', safe(() => svc.getDealerPriceListPreview({})));
router.get('/wholesale-prices', safe(() => svc.getWholesalePricePreview({})));
router.get('/stock-availability', safe(() => svc.getStockAvailabilityPreview({})));
router.get('/moq', safe(() => svc.getMoqPreview({})));

/* Drafts: bulk order + quotation (never create / reserve / send) */
router.post('/bulk-order-draft-preview', safe((req) => svc.createBulkOrderDraftPreview(body(req))));
router.post('/quotation-request-preview', safe((req) => svc.createQuotationRequestPreview(body(req))));

/* Orders */
router.get('/orders', safe(() => svc.listOrders({})));
router.get('/orders/:id/status', safe((req) => svc.getOrderStatusPreview(withId(req))));

/* Invoices / payment */
router.get('/invoices', safe(() => svc.listInvoices({})));
router.get('/invoices/:id/payment-status', safe((req) => svc.getInvoicePaymentStatusPreview(withId(req))));

/* Credit / balance / commission */
router.get('/credit-limit', safe(() => svc.getCreditLimitPreview({})));
router.get('/outstanding-balance', safe(() => svc.getOutstandingBalancePreview({})));
router.get('/commission-margin', safe(() => svc.getCommissionMarginPreview({})));

/* Delivery / shipment / returns / warranty */
router.get('/deliveries', safe(() => svc.listDeliveries({})));
router.get('/shipments', safe(() => svc.listShipments({})));
router.get('/returns-claims', safe(() => svc.getReturnClaimStatusPreview({})));
router.get('/warranty-claims', safe(() => svc.getWarrantyClaimStatusPreview({})));

/* Loyalty / contracts / documents */
router.get('/loyalty', safe(() => svc.getLoyaltyStatusPreview({})));
router.get('/contracts', safe(() => svc.getContractStatusPreview({})));
router.get('/documents', safe(() => svc.listDocuments({})));
router.post('/document-request-preview', safe((req) => svc.createDocumentRequestPreview(body(req))));

/* Draft previews (never send / never pay / never create live ticket) */
router.post('/support-request-preview', safe((req) => svc.createSupportRequestPreview(body(req))));
router.post('/payment-query-preview', safe((req) => svc.createPaymentQueryPreview(body(req))));
router.post('/message-draft-preview', safe((req) => svc.createMessageDraftPreview(body(req))));

/* Audit preview */
router.get('/audit-preview', safe(() => svc.getAuditPreview()));

/* ---- Advanced B2B Commerce Operating System routes (preview-only) ---- */

/* Onboarding / compliance */
router.get('/onboarding', safe(() => svc.getOnboardingPreview({})));
router.get('/compliance-documents', safe(() => svc.getComplianceDocumentPreview({})));

/* Advanced pricing */
router.get('/contract-prices', safe(() => svc.getContractPricePreview({})));
router.get('/tier-discounts', safe(() => svc.getTierDiscountPreview({})));
router.get('/volume-discounts', safe((req) => svc.getVolumeDiscountPreview(body(req))));
router.post('/dynamic-pricing-preview', safe((req) => svc.createDynamicPricingPreview(body(req))));

/* Stock (warehouse / branch) */
router.get('/warehouse-stock', safe(() => svc.getWarehouseStockPreview({})));
router.get('/branch-stock', safe(() => svc.getBranchStockPreview({})));

/* Ordering intelligence drafts */
router.post('/bulk-import-preview', safe((req) => svc.createBulkImportPreview(body(req))));
router.post('/reorder-suggestion-preview', safe((req) => svc.createReorderSuggestionPreview(body(req))));
router.post('/product-substitution-preview', safe((req) => svc.createProductSubstitutionPreview(body(req))));
router.post('/cross-sell-upsell-preview', safe((req) => svc.createCrossSellUpsellPreview(body(req))));

/* Quotes (negotiation / approval) */
router.post('/quote-negotiation-preview', safe((req) => svc.createQuoteNegotiationPreview(body(req))));
router.post('/quote-approval-preview', safe((req) => svc.createQuoteApprovalPreview(body(req))));

/* Orders extensions */
router.get('/backorders', safe(() => svc.listBackorders({})));
router.get('/partial-shipments', safe(() => svc.listPartialShipments({})));
router.get('/deliveries/:id/status', safe((req) => svc.listDeliveries(withId(req))));
router.get('/shipments/:id/status', safe((req) => svc.listShipments(withId(req))));

/* Finance extensions */
router.get('/statement', safe(() => svc.getOutstandingStatementPreview({})));
router.get('/credit-risk', safe(() => svc.getCreditRiskPreview({})));
router.post('/dispute-preview', safe((req) => svc.createDisputePreview(body(req))));

/* Incentives / channel */
router.get('/rebates-incentives', safe(() => svc.getRebateIncentivePreview({})));
router.get('/targets-achievements', safe(() => svc.getTargetAchievementPreview({})));
router.get('/leaderboard', safe(() => svc.getLeaderboardPreview({})));
router.get('/territory-performance', safe(() => svc.getTerritoryPerformancePreview({})));
router.post('/channel-conflict-preview', safe((req) => svc.createChannelConflictPreview(body(req))));
router.post('/lead-registration-preview', safe((req) => svc.createLeadRegistrationPreview(body(req))));
router.post('/deal-registration-preview', safe((req) => svc.createDealRegistrationPreview(body(req))));

/* Risk / analytics / AI insight (no live AI call) */
router.get('/risk-score', safe(() => svc.getRiskScorePreview({})));
router.get('/analytics', safe(() => svc.getAnalyticsPreview({})));
router.post('/ai-insight-preview', safe((req) => svc.createAiInsightPreview(body(req))));

/* ---- v2: Distributor B2B Commerce OS routes (preview-only) ---- */
router.get('/business-verification', safe(() => svc.getBusinessVerificationPreview({})));
router.get('/catalog/:id/status', safe((req) => svc.getCatalogItemStatus(withId(req))));
router.post('/price-protection-preview', safe((req) => svc.createPriceProtectionPreview(body(req))));
router.get('/promotion-eligibility', safe(() => svc.getPromotionEligibilityPreview({})));
router.get('/region-stock', safe(() => svc.getRegionStockPreview({})));
router.post('/cart-risk-preview', safe((req) => svc.createCartRiskPreview(body(req))));
router.post('/dealer-quote-comparison-preview', safe((req) => svc.createDealerQuoteComparisonPreview(body(req))));
router.get('/delivery-eta-risk', safe(() => svc.getDeliveryEtaRiskPreview({})));
router.get('/claim-pipeline', safe(() => svc.getClaimPipelinePreview({})));

module.exports = router;
