// routes/staffPortalRoutes.js — Express router for the Staff Portal + Employee Self-Service HR Center.
// Mounted at /api/staff-portal. Preview-only: no live payroll/attendance/leave/expense mutation,
// no live send, no document download, no external calls, PII masked.
'use strict';

const express = require('express');
const router = express.Router();

const svc = require('../lib/staffPortal/staffPortalService');
const { hasLeak } = require('../lib/staffPortal/redactor');

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
router.get('/status', safe(() => svc.getStaffPortalStatus()));
router.post('/lookup-preview', safe((req) => svc.lookupStaffPreview(body(req))));
router.get('/summary', safe(() => svc.getStaffSummaryPreview({ mode: 'demo_preview' })));
router.post('/summary-preview', safe((req) => svc.getStaffSummaryPreview(body(req))));

/* Profile */
router.get('/profile', safe(() => svc.getProfileStatusPreview({})));

/* Attendance */
router.get('/attendance', safe(() => svc.listAttendance({})));
router.get('/attendance/:id/status', safe((req) => svc.getAttendanceItemStatusPreview(withId(req))));

/* Shifts */
router.get('/shifts', safe(() => svc.listShifts({})));
router.get('/shifts/:id/status', safe((req) => svc.getShiftStatusPreview(withId(req))));

/* Leave */
router.get('/leave', safe(() => svc.getLeaveStatusPreview({})));
router.get('/leave/:id/status', safe((req) => svc.getLeaveItemStatusPreview(withId(req))));
router.post('/leave-request-preview', safe((req) => svc.createLeaveRequestPreview(body(req))));

/* Payroll + payslips + commission */
router.get('/payroll', safe(() => svc.getPayrollSummaryPreview({})));
router.get('/payroll/:id/status', safe((req) => svc.getPayrollSummaryPreview(withId(req))));
router.get('/payslips', safe(() => svc.listPayslips({})));
router.get('/commission', safe(() => svc.getCommissionSummaryPreview({})));

/* Expenses / reimbursements */
router.get('/expenses', safe(() => svc.listExpenses({})));
router.get('/expenses/:id/status', safe((req) => svc.getExpenseStatusPreview(withId(req))));
router.post('/expense-request-preview', safe((req) => svc.createExpenseRequestPreview(body(req))));

/* Tasks + SOPs */
router.get('/tasks', safe(() => svc.getTaskStatusPreview({})));
router.get('/tasks/:id/status', safe((req) => svc.getTaskItemStatusPreview(withId(req))));
router.get('/sops', safe(() => svc.getSopStatusPreview({})));

/* Branch / approvals / documents / contracts */
router.get('/branch-assignment', safe(() => svc.getBranchAssignmentPreview({})));
router.get('/approvals', safe(() => svc.getApprovalStatusPreview({})));
router.get('/documents', safe(() => svc.listDocuments({})));
router.post('/document-request-preview', safe((req) => svc.createDocumentRequestPreview(body(req))));
router.get('/contracts', safe(() => svc.listContracts({})));

/* Draft previews (never send / never create live ticket) */
router.post('/hr-support-request-preview', safe((req) => svc.createHrSupportRequestPreview(body(req))));
router.post('/message-draft-preview', safe((req) => svc.createMessageDraftPreview(body(req))));

/* Audit preview */
router.get('/audit-preview', safe(() => svc.getAuditPreview()));

module.exports = router;
