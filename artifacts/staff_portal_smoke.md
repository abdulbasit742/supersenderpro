# Staff Portal Smoke Test

Generated: 2026-06-20T17:09:17.815Z

**31/31 passed** — all passed

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | require service module | PASS | ok |
| 2 | require redactor | PASS | ok |
| 3 | require route module | PASS | loaded |
| 4 | portal status is safe | PASS | safe |
| 5 | lookup preview safe + masked | PASS | preview_token |
| 6 | summary works even though no real modules | PASS | 1 pending leave |
| 7 | getProfileStatusPreview safe | PASS | safe |
| 8 | getAttendanceStatusPreview safe | PASS | safe |
| 9 | getShiftStatusPreview safe | PASS | safe |
| 10 | getLeaveStatusPreview safe | PASS | safe |
| 11 | getPayrollSummaryPreview safe | PASS | safe |
| 12 | getPayslipMetadataPreview safe | PASS | safe |
| 13 | getCommissionSummaryPreview safe | PASS | safe |
| 14 | getExpenseStatusPreview safe | PASS | safe |
| 15 | getTaskStatusPreview safe | PASS | safe |
| 16 | getSopStatusPreview safe | PASS | safe |
| 17 | getBranchAssignmentPreview safe | PASS | safe |
| 18 | getApprovalStatusPreview safe | PASS | safe |
| 19 | getContractStatusPreview safe | PASS | safe |
| 20 | getDocumentStatusPreview safe | PASS | safe |
| 21 | leave request preview safe (no live leave/approval mutation) | PASS | safe |
| 22 | expense request preview safe (no live expense mutation) | PASS | safe |
| 23 | hr support preview safe (no live ticket creation) | PASS | safe |
| 24 | document request preview safe (no download) | PASS | safe |
| 25 | message draft preview safe (no live send) | PASS | +92******4567 |
| 26 | payroll preview has no live payroll/payment mutation | PASS | bank_**** |
| 27 | payslip metadata only (no download) | PASS | safe |
| 28 | attendance has no check-in/out mutation | PASS | safe |
| 29 | audit preview is local + no live write | PASS | 7 entries |
| 30 | redactor masking examples | PASS | ok |
| 31 | no full PII in aggregate response blob | PASS | clean |
