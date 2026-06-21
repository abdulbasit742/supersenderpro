  'use strict';
  /**
   * routes/supplierPortalRoutes.js — Supplier Portal + Vendor Self-Service Status
   * Center API. Preview-only / dry-run. supplierPortalPublicLive:false. No RFQ/quote/
   * PO/bill/contract mutation, no payment action, no download, no sends, no external
   * calls, no secrets, supplier/bank/tax/payment refs masked. express.json() for POST.
   */
  const express = require('express');
  const router = express.Router();


  const service = require('../lib/supplierPortal/supplierPortalService');
  const statusSummaryPreview = require('../lib/supplierPortal/statusSummaryPreview');
  const rfqStatusPreview = require('../lib/supplierPortal/rfqStatusPreview');
  const quoteStatusPreview = require('../lib/supplierPortal/quoteStatusPreview');
  const purchaseOrderStatusPreview = require('../lib/supplierPortal/purchaseOrderStatusPreview');
  const billPaymentStatusPreview = require('../lib/supplierPortal/billPaymentStatusPreview');
  const deliveryStatusPreview = require('../lib/supplierPortal/deliveryStatusPreview');
  const qualityScorePreview = require('../lib/supplierPortal/qualityScorePreview');
  const contractStatusPreview = require('../lib/supplierPortal/contractStatusPreview');
  const documentRequestPreview = require('../lib/supplierPortal/documentRequestPreview');
  const supportRequestPreview = require('../lib/supplierPortal/supportRequestPreview');
  const messageDrafts = require('../lib/supplierPortal/messageDrafts');
  const auditPreview = require('../lib/supplierPortal/auditPreview');

  function wrap(h) { return function (req, res) { try { h(req, res); } catch (e) { res.status(500).json({ ok: false, error:
  'internal_error' }); } }; }
  const AREAS = {
       rfq: rfqStatusPreview, quote: quoteStatusPreview, 'purchase-order': purchaseOrderStatusPreview,
       'bill-payment': billPaymentStatusPreview, delivery: deliveryStatusPreview, 'quality-score': qualityScorePreview,
       contract: contractStatusPreview, document: documentRequestPreview,
  };

  router.get('/status', wrap(function (req, res) {
    res.json({ ok: true, dryRun: true, liveActionsEnabled: false, module: 'supplier-portal', supplierPortalPublicLive:
  false, piiMasked: true, externalCallsEnabled: false, liveRfqMutation: false, liveQuoteMutation: false,
  livePurchaseOrderMutation: false, livePaymentAction: false, liveBillMutation: false, liveContractMutation: false,
  liveDocumentDownload: false, liveSend: false, suppliersPreview: service.list().length, warnings: [], blockers: [],
  timestamp: new Date().toISOString() });
  }));

  router.get('/overview', wrap(function (req, res) { res.json(statusSummaryPreview.overview()); }));

router.get('/suppliers', wrap(function (req, res) { res.json({ ok: true, dryRun: true, liveActionsEnabled: false,
suppliers: service.list() }); }));
router.get('/suppliers/:token', wrap(function (req, res) {
 const s = service.getByToken(req.params.token);
 return s ? res.json({ ok: true, dryRun: true, liveActionsEnabled: false, supplier: { previewToken: s.previewToken,
displayNameSafe: s.displayNameSafe, phoneMasked: s.phoneMasked, emailMasked: s.emailMasked, bankMasked: s.bankMasked,
taxMasked: s.taxMasked } }) : res.status(404).json({ ok: false, error: 'not_found' });
}));
router.get('/suppliers/:token/summary-preview', wrap(function (req, res) {
res.json(statusSummaryPreview.forToken(req.params.token)); }));

router.get('/suppliers/:token/:area-status', wrap(function (req, res) {
 const mod = AREAS[req.params.area];
 if (!mod) return res.status(404).json({ ok: false, error: 'unknown_area' });
 res.json(mod.forToken(req.params.token));
}));

// Quote submit preview (NEVER mutates a quote).
router.post('/suppliers/:token/quote-submit-preview', wrap(function (req, res) {
 const r = quoteStatusPreview.forToken(req.params.token);
 res.json(Object.assign({}, r, { liveQuoteMutation: false, note: 'Quote submit preview only; nothing submitted live.'
}));
}));


// Payment query preview (NEVER triggers a payment).
router.post('/suppliers/:token/payment-query-preview', wrap(function (req, res) {
 const r = billPaymentStatusPreview.forToken(req.params.token);
 res.json(Object.assign({}, r, { livePaymentAction: false, note: 'Payment query preview only; no payment triggered.'
}));
}));

router.post('/suppliers/:token/support-request-preview', wrap(function (req, res) {
res.json(supportRequestPreview.preview(req.params.token, req.body || {})); }));
router.post('/suppliers/:token/message-draft-preview', wrap(function (req, res) {
res.json(messageDrafts.draft(req.params.token, req.body || {})); }));
router.post('/suppliers/:token/document-request-preview', wrap(function (req, res) {
res.json(documentRequestPreview.forToken(req.params.token)); }));


router.get('/audit-preview', wrap(function (req, res) { res.json(auditPreview.preview(req.query.limit)); }));


module.exports = router;
