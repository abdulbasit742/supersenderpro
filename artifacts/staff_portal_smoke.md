# Staff Portal Smoke Test

Generated: 2026-06-20T17:06:51.990Z

**29/29 passed** — all passed ✅

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | require service module | ✅ | ok |
| 2 | require redactor | ✅ | ok |
| 3 | require route module | ✅ | loaded |
| 4 | getStaffPortalStatus works + safe | ✅ | safe |
| 5 | lookupStaffPreview works + masked | ✅ | preview_token |
| 6 | getStaffSummaryPreview works (modules ok) | ✅ | leave 12 |
| 7 | leave request preview liveLeaveMutation false | ✅ | safe |
| 8 | expense request preview liveExpenseMutation false | ✅ | safe |
| 9 | payroll livePayrollMutation + livePaymentAction false | ✅ | safe |
| 10 | attendance no checkin/checkout/mutation | ✅ | safe |
| 11 | HR support preview liveTicketCreation false | ✅ | safe |
| 12 | document request preview liveDocumentDownload false | ✅ | safe |
| 13 | message draft preview liveSend false | ✅ | +92******4567 |
| 14 | getProfilePreview safe | ✅ | safe |
| 15 | getShiftStatusPreview safe | ✅ | safe |
| 16 | getLeaveStatusPreview safe | ✅ | safe |
| 17 | getPayslipMetadataPreview safe | ✅ | safe |
| 18 | getCommissionSummaryPreview safe | ✅ | safe |
| 19 | getExpenseStatusPreview safe | ✅ | safe |
| 20 | getTaskStatusPreview safe | ✅ | safe |
| 21 | getSopStatusPreview safe | ✅ | safe |
| 22 | getBranchAssignmentPreview safe | ✅ | safe |
| 23 | getApprovalStatusPreview safe | ✅ | safe |
| 24 | getDocumentStatusPreview safe | ✅ | safe |
| 25 | getContractStatusPreview safe | ✅ | safe |
| 26 | audit preview no live write | ✅ | 7 entries |
| 27 | redactor masking examples | ✅ | ok |
| 28 | no full PII in aggregate blob | ✅ | clean |
| 29 | missing-module fallback does not crash | ✅ | ok |
