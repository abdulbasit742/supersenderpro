// routes/staffPortalRoutes.js — Express router for Staff Portal + Employee Self-Service HR Center.
// Mounted at /api/staff-portal. Preview-only: no payroll/attendance/leave/expense/approval mutation, no sends, PII masked.
'use strict';

const express = require('express');
const router = express.Router();

const svc = require('../lib/staffPortal/staffPortalService');
const { hasLeak } = require('../lib/staffPortal/redactor');

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

/* Status + lookup + summary */
router.get('/status', safe(() => svc.getStaffPortalStatus()));
router.post('/lookup-preview', safe((req) => svc.lookupStaffPreview(body(req))));
router.get('/summary', safe(() => svc.getStaffSummaryPreview({ mode: 'demo_preview' })));
router.post('/summary-preview', safe((req) => svc.getStaffSummaryPreview(body(req))));

/* Profile / attendance / shifts */
router.get('/profile', safe(() => svc.getProfilePreview({})));
router.get('/attendance', safe(() => svc.getAttendanceStatusPreview({})));
router.get('/shifts', safe(() => svc.listShifts({})));

/* Leave */
router.get('/leave', safe(() => svc.getLeaveStatusPreview({})));
router.post('/leave-request-preview', safe((req) => svc.createLeaveRequestPreview(body(req))));

/* Payroll / payslips / commission */
router.get('/payroll', safe(() => svc.getPayrollSummaryPreview({})));
router.get('/payslips', safe(() => svc.listPayslips({})));
router.get('/commission', safe(() => svc.getCommissionSummaryPreview({})));

/* Expenses */
router.get('/expenses', safe(() => svc.listExpenses({})));
router.post('/expense-request-preview', safe((req) => svc.createExpenseRequestPreview(body(req))));

/* Tasks / SOPs / branch / approvals */
router.get('/tasks', safe(() => svc.listTasks({})));
router.get('/sops', safe(() => svc.listSops({})));
router.get('/branch-assignment', safe(() => svc.getBranchAssignmentPreview({})));
router.get('/approvals', safe(() => svc.listApprovals({})));

/* Documents / contracts */
router.get('/documents', safe(() => svc.listDocuments({})));
router.post('/document-request-preview', safe((req) => svc.createDocumentRequestPreview(body(req))));
router.get('/contracts', safe(() => svc.listContracts({})));

/* HR support / message drafts / audit */
router.post('/hr-support-request-preview', safe((req) => svc.createHrSupportRequestPreview(body(req))));
router.post('/message-draft-preview', safe((req) => svc.createMessageDraftPreview(body(req))));
router.get('/audit-preview', safe(() => svc.getAuditPreview()));

module.exports = router;
