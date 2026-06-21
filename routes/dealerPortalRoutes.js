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

module.exports = router;
