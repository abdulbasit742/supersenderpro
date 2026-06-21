  'use strict';
  /**
   * routes/customerPortalRoutes.js — Customer Portal + Self-Service Status Center API.
   * Preview-only / dry-run. portalPublicLive:false. No login activation, no live
   * payment, no live download, no booking/order/ticket mutation, no sends, no
   * external calls, no secrets, PII masked. express.json() for POST.
   */
  const express = require('express');
  const router = express.Router();


  const service = require('../lib/customerPortal/customerPortalService');
  const statusSummaryPreview = require('../lib/customerPortal/statusSummaryPreview');
  const orderStatusPreview = require('../lib/customerPortal/orderStatusPreview');
  const invoiceStatusPreview = require('../lib/customerPortal/invoiceStatusPreview');
  const bookingStatusPreview = require('../lib/customerPortal/bookingStatusPreview');
  const serviceStatusPreview = require('../lib/customerPortal/serviceStatusPreview');
  const maintenanceStatusPreview = require('../lib/customerPortal/maintenanceStatusPreview');
  const ticketStatusPreview = require('../lib/customerPortal/ticketStatusPreview');
  const warrantyStatusPreview = require('../lib/customerPortal/warrantyStatusPreview');
  const loyaltyStatusPreview = require('../lib/customerPortal/loyaltyStatusPreview');
  const contractStatusPreview = require('../lib/customerPortal/contractStatusPreview');
  const documentRequestPreview = require('../lib/customerPortal/documentRequestPreview');
  const supportRequestPreview = require('../lib/customerPortal/supportRequestPreview');
  const messageDrafts = require('../lib/customerPortal/messageDrafts');
  const auditPreview = require('../lib/customerPortal/auditPreview');

  function wrap(h) { return function (req, res) { try { h(req, res); } catch (e) { res.status(500).json({ ok: false, error:
  'internal_error' }); } }; }
  const AREAS = {
       order: orderStatusPreview, invoice: invoiceStatusPreview, appointment: bookingStatusPreview,
       service: serviceStatusPreview, maintenance: maintenanceStatusPreview, ticket: ticketStatusPreview,
    warranty: warrantyStatusPreview, loyalty: loyaltyStatusPreview, contract: contractStatusPreview, document:
  documentRequestPreview,
  };

  router.get('/status', wrap(function (req, res) {
    res.json({ ok: true, dryRun: true, liveActionsEnabled: false, module: 'customer-portal', portalPublicLive: false,
  piiMasked: true, externalCallsEnabled: false, livePayment: false, liveSend: false, liveOrderMutation: false,
  liveInvoiceMutation: false, liveBookingMutation: false, liveTicketCreation: false, liveDocumentDownload: false,
  customersPreview: service.list().length, warnings: [], blockers: [], timestamp: new Date().toISOString() });
  }));

router.get('/overview', wrap(function (req, res) { res.json(statusSummaryPreview.overview()); }));
router.get('/customers', wrap(function (req, res) { res.json({ ok: true, dryRun: true, liveActionsEnabled: false,
customers: service.list() }); }));


// Lookup by demo-safe preview token only (never by raw phone/email).
router.get('/customers/:token', wrap(function (req, res) {
 const c = service.getByToken(req.params.token);
 return c ? res.json({ ok: true, dryRun: true, liveActionsEnabled: false, customer: { previewToken: c.previewToken,
displayNameSafe: c.displayNameSafe, phoneMasked: c.phoneMasked, emailMasked: c.emailMasked } }) : res.status(404).json({
ok: false, error: 'not_found' });
}));

router.get('/customers/:token/summary-preview', wrap(function (req, res) {
res.json(statusSummaryPreview.forToken(req.params.token)); }));


// Per-area status previews.
router.get('/customers/:token/:area-status', wrap(function (req, res) {
 const mod = AREAS[req.params.area];
 if (!mod) return res.status(404).json({ ok: false, error: 'unknown_area' });
 res.json(mod.forToken(req.params.token));
}));

// Support request preview (NEVER creates a ticket).
router.post('/customers/:token/support-request-preview', wrap(function (req, res) {
res.json(supportRequestPreview.preview(req.params.token, req.body || {})); }));


// Message draft (NEVER sends).
router.post('/customers/:token/message-draft-preview', wrap(function (req, res) {
res.json(messageDrafts.draft(req.params.token, req.body || {})); }));


// Document request preview (NEVER downloads).
router.post('/customers/:token/document-request-preview', wrap(function (req, res) {
res.json(documentRequestPreview.forToken(req.params.token)); }));


router.get('/audit-preview', wrap(function (req, res) { res.json(auditPreview.preview(req.query.limit)); }));

module.exports = router;
