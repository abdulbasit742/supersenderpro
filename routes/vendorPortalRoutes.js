// routes/vendorPortalRoutes.js — Express router for the Vendor/Supplier Portal + Procurement Self-Service Center.
// Mounted at /api/vendor-portal. Preview-only: no live PO/GRN/invoice/payment/price/delivery/inspection mutation,
// no live send, no document download, no external calls, PII masked.
'use strict';

const express = require('express');
const router = express.Router();

const svc = require('../lib/vendorPortal/vendorPortalService');
const { hasLeak } = require('../lib/vendorPortal/redactor');

function safe(fn) {
  return (req, res) => {
    try {
      const out = fn(req, res);
      if (out !== undefined && !res.headersSent) {
        if (hasLeak(out)) return res.status(500).json({ ok: false, dryRun: true, liveActionsEnabled: false, error: 'response_blocked_pii_leak' });
        res.json(out);
      }
    } catch (e) {
      res.status(200).json({ ok: false, dryRun: true, liveActionsEnabled: false, error: 'preview_error', warnings: ['handler_error_suppressed'], blockers: [] });
    }
  };
}

const body = (req) => (req && req.body) || {};
const withId = (req) => Object.assign({}, body(req), { id: req.params.id, reference: req.params.id });

/* Status + lookup + summary */
router.get('/status', safe(() => svc.getVendorPortalStatus()));
router.post('/lookup-preview', safe((req) => svc.lookupVendorPreview(body(req))));
router.get('/summary', safe(() => svc.getVendorSummaryPreview({ mode: 'demo_preview' })));
router.post('/summary-preview', safe((req) => svc.getVendorSummaryPreview(body(req))));

/* Profile / tier / account */
router.get('/profile', safe(() => svc.getVendorProfilePreview({})));
router.get('/tier-status', safe(() => svc.getTierStatusPreview({})));
router.get('/account-status', safe(() => svc.getAccountStatusPreview({})));

/* Supply catalog / pricing */
router.get('/supply-catalog', safe(() => svc.getSupplyCatalogPreview({})));
router.get('/price-list', safe(() => svc.getPurchasePriceListPreview({})));

/* Purchase orders / GRNs */
router.get('/purchase-orders', safe(() => svc.listPurchaseOrders({})));
router.get('/purchase-orders/:id/status', safe((req) => svc.getPurchaseOrderStatusPreview(withId(req))));
router.get('/grns', safe(() => svc.getGrnStatusPreview({})));

/* Invoices / payment */
router.post('/invoice-submission-preview', safe((req) => svc.createInvoiceSubmissionPreview(body(req))));
router.get('/invoices', safe(() => svc.listInvoices({})));
router.get('/invoices/:id/payment-status', safe((req) => svc.getInvoicePaymentStatusPreview(withId(req))));
router.get('/outstanding-payable', safe(() => svc.getOutstandingPayablePreview({})));
router.get('/payment-schedule', safe(() => svc.getPaymentSchedulePreview({})));

/* Delivery / quality / compliance / contracts / rating */
router.get('/deliveries', safe(() => svc.listDeliveries({})));
router.get('/quality-inspections', safe(() => svc.getQualityInspectionPreview({})));
router.get('/compliance-documents', safe(() => svc.getComplianceDocumentPreview({})));
router.get('/contracts', safe(() => svc.getContractStatusPreview({})));
router.get('/rating', safe(() => svc.getRatingStatusPreview({})));

/* Documents */
router.get('/documents', safe(() => svc.listDocuments({})));
router.post('/document-request-preview', safe((req) => svc.createDocumentRequestPreview(body(req))));

/* Draft previews (never send / never pay / never create live ticket) */
router.post('/payment-query-preview', safe((req) => svc.createPaymentQueryPreview(body(req))));
router.post('/support-request-preview', safe((req) => svc.createSupportRequestPreview(body(req))));
router.post('/message-draft-preview', safe((req) => svc.createMessageDraftPreview(body(req))));

/* Audit preview */
router.get('/audit-preview', safe(() => svc.getAuditPreview()));

module.exports = router;
