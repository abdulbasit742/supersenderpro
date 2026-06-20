// routes/customerPortalRoutes.js — Express router for the Customer Portal + Self-Service Status Center.
// Mounted at /api/customer-portal. Preview-only: no live payment/mutation/send, no external calls, PII masked.
'use strict';

const express = require('express');
const router = express.Router();

const svc = require('../lib/customerPortal/customerPortalService');
const { hasLeak } = require('../lib/customerPortal/redactor');

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
router.get('/status', safe(() => svc.getPortalStatus()));
router.post('/lookup-preview', safe((req) => svc.lookupCustomerPreview(body(req))));
router.get('/summary', safe(() => svc.getCustomerSummaryPreview({ mode: 'demo_preview' })));
router.post('/summary-preview', safe((req) => svc.getCustomerSummaryPreview(body(req))));

/* Orders */
router.get('/orders', safe(() => svc.listOrders({})));
router.get('/orders/:id/status', safe((req) => svc.getOrderStatusPreview(withId(req))));

/* Invoices */
router.get('/invoices', safe(() => svc.listInvoices({})));
router.get('/invoices/:id/status', safe((req) => svc.getInvoiceStatusPreview(withId(req))));

/* Bookings */
router.get('/bookings', safe(() => svc.listBookings({})));
router.get('/bookings/:id/status', safe((req) => svc.getBookingStatusPreview(withId(req))));

/* Service jobs + maintenance */
router.get('/service-jobs', safe(() => svc.listServiceJobs({})));
router.get('/service-jobs/:id/status', safe((req) => svc.getServiceStatusPreview(withId(req))));
router.get('/maintenance-plans', safe(() => svc.listMaintenancePlans({})));

/* Tickets + complaints */
router.get('/tickets', safe(() => svc.listTickets({})));
router.get('/tickets/:id/status', safe((req) => svc.getTicketStatusPreview(withId(req))));
router.post('/support-request-preview', safe((req) => svc.createSupportRequestPreview(body(req))));
router.get('/complaints', safe(() => svc.listComplaints({})));

/* Warranty / loyalty / contracts / documents */
router.get('/warranty', safe(() => svc.listWarranty({})));
router.get('/loyalty', safe(() => svc.getLoyaltyStatusPreview({})));
router.get('/contracts', safe(() => svc.listContracts({})));
router.get('/documents', safe(() => svc.listDocuments({})));
router.post('/document-request-preview', safe((req) => svc.createDocumentRequestPreview(body(req))));

/* Draft previews (never send / never pay) */
router.post('/reschedule-request-preview', safe((req) => svc.createRescheduleRequestPreview(body(req))));
router.post('/payment-reminder-preview', safe((req) => svc.createPaymentReminderPreview(body(req))));
router.post('/message-draft-preview', safe((req) => svc.createMessageDraftPreview(body(req))));

/* Audit preview */
router.get('/audit-preview', safe(() => svc.getAuditPreview()));

module.exports = router;
