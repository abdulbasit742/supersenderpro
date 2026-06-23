# Staff Portal Check

Generated: 2026-06-23T10:24:49.757Z

**50/50 passed**

| Check | Result | Detail |
|---|---|---|
| file lib/staffPortal/store.js | PASS |  |
| file lib/staffPortal/staffPortalModel.js | PASS |  |
| file lib/staffPortal/staffPortalService.js | PASS |  |
| file lib/staffPortal/statusSummaryPreview.js | PASS |  |
| file lib/staffPortal/profileStatusPreview.js | PASS |  |
| file lib/staffPortal/attendanceStatusPreview.js | PASS |  |
| file lib/staffPortal/shiftStatusPreview.js | PASS |  |
| file lib/staffPortal/leaveStatusPreview.js | PASS |  |
| file lib/staffPortal/leaveRequestPreview.js | PASS |  |
| file lib/staffPortal/payrollSummaryPreview.js | PASS |  |
| file lib/staffPortal/payslipMetadataPreview.js | PASS |  |
| file lib/staffPortal/commissionSummaryPreview.js | PASS |  |
| file lib/staffPortal/expenseStatusPreview.js | PASS |  |
| file lib/staffPortal/expenseRequestPreview.js | PASS |  |
| file lib/staffPortal/taskStatusPreview.js | PASS |  |
| file lib/staffPortal/sopStatusPreview.js | PASS |  |
| file lib/staffPortal/branchAssignmentPreview.js | PASS |  |
| file lib/staffPortal/approvalStatusPreview.js | PASS |  |
| file lib/staffPortal/documentRequestPreview.js | PASS |  |
| file lib/staffPortal/contractStatusPreview.js | PASS |  |
| file lib/staffPortal/hrSupportRequestPreview.js | PASS |  |
| file lib/staffPortal/messageDrafts.js | PASS |  |
| file lib/staffPortal/auditPreview.js | PASS |  |
| file lib/staffPortal/redactor.js | PASS |  |
| file routes/staffPortalRoutes.js | PASS |  |
| file public/staff-portal.html | PASS |  |
| file public/js/staff-portal.js | PASS |  |
| file public/css/staff-portal.css | PASS |  |
| server hook present | PASS |  |
| route module loads | PASS |  |
| all service functions exported | PASS | all present |
| status dryRun true + liveActionsEnabled false | PASS |  |
| status staffPortalPublicLive false | PASS |  |
| status piiMasked true | PASS |  |
| status externalCallsEnabled false | PASS |  |
| redactor masks phone | PASS | +92******4567 |
| redactor masks email | PASS | st***@example.com |
| redactor masks ref | PASS |  |
| redactor masks bank | PASS |  |
| redactor masks cnic | PASS |  |
| redactor masks salary | PASS |  |
| redactor masks payment | PASS |  |
| redactor masks document via redactDocument | PASS |  |
| payroll livePayrollMutation false | PASS |  |
| leave request liveLeaveMutation false | PASS |  |
| expense request liveExpenseMutation false | PASS |  |
| hr support liveTicketCreation false | PASS |  |
| message draft liveSend false + masked recipient | PASS |  |
| summary piiMasked true + works without modules | PASS |  |
| no PII/secret leak | PASS |  |
