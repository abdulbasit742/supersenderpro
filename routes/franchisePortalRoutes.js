// routes/franchisePortalRoutes.js — Express router for the Franchise/Branch Partner Portal + Multi-Outlet Self-Service Center.
// Mounted at /api/franchise-portal. Preview-only: no live order/stock/royalty/payment/invoice/fund mutation,
// no live send, no document download, no external calls, PII masked.
'use strict';

const express = require('express');
const router = express.Router();

const svc = require('../lib/franchisePortal/franchisePortalService');
const { hasLeak } = require('../lib/franchisePortal/redactor');

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
router.get('/status', safe(() => svc.getFranchisePortalStatus()));
router.post('/lookup-preview', safe((req) => svc.lookupFranchisePreview(body(req))));
router.get('/summary', safe(() => svc.getFranchiseSummaryPreview({ mode: 'demo_preview' })));
router.post('/summary-preview', safe((req) => svc.getFranchiseSummaryPreview(body(req))));

/* Profile / tier / outlet account */
router.get('/profile', safe(() => svc.getFranchiseProfilePreview({})));
router.get('/tier-status', safe(() => svc.getTierStatusPreview({})));
router.get('/outlet-account', safe(() => svc.getOutletAccountStatusPreview({})));
router.get('/outlets', safe(() => svc.listOutlets({})));

/* Sales / targets / royalty */
router.get('/sales-summary', safe(() => svc.getSalesSummaryPreview({})));
router.get('/target-achievement', safe(() => svc.getTargetAchievementPreview({})));
router.get('/royalty', safe(() => svc.getRoyaltySummaryPreview({})));
router.get('/royalty-invoices', safe(() => svc.listRoyaltyInvoices({})));
router.get('/royalty-invoices/:id/payment-status', safe((req) => svc.getRoyaltyPaymentStatusPreview(withId(req))));
router.get('/outstanding-payable', safe(() => svc.getOutstandingPayablePreview({})));

/* Inventory / replenishment / orders / settlements */
router.get('/inventory-allocation', safe(() => svc.getInventoryAllocationPreview({})));
router.post('/replenishment-draft-preview', safe((req) => svc.createReplenishmentDraftPreview(body(req))));
router.get('/orders', safe(() => svc.listOrders({})));
router.get('/orders/:id/status', safe((req) => svc.getOrderStatusPreview(withId(req))));
router.get('/settlements', safe(() => svc.listSettlements({})));

/* Marketing fund / headcount / compliance / territory */
router.get('/marketing-fund', safe(() => svc.getMarketingFundPreview({})));
router.get('/headcount', safe(() => svc.getHeadcountPreview({})));
router.get('/compliance', safe(() => svc.getComplianceChecklistPreview({})));
router.get('/territory', safe(() => svc.getTerritoryAssignmentPreview({})));

/* Contracts / documents */
router.get('/contracts', safe(() => svc.getContractStatusPreview({})));
router.get('/documents', safe(() => svc.listDocuments({})));
router.post('/document-request-preview', safe((req) => svc.createDocumentRequestPreview(body(req))));

/* Draft previews (never send / never create live ticket) */
router.post('/support-request-preview', safe((req) => svc.createSupportRequestPreview(body(req))));
router.post('/message-draft-preview', safe((req) => svc.createMessageDraftPreview(body(req))));

/* Audit preview */
router.get('/audit-preview', safe(() => svc.getAuditPreview()));

module.exports = router;
