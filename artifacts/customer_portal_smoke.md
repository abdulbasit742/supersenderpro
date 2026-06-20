# Customer Portal Smoke Test

Generated: 2026-06-20T16:41:27.578Z

**24/24 passed** — all passed ✅

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | require service module | ✅ | ok |
| 2 | require redactor | ✅ | ok |
| 3 | require route module | ✅ | loaded |
| 4 | portal status is safe | ✅ | safe |
| 5 | lookup preview safe + masked | ✅ | preview_token |
| 6 | summary works even though no real modules | ✅ | 1 unpaid |
| 7 | getOrderStatusPreview safe | ✅ | safe |
| 8 | getInvoiceStatusPreview safe | ✅ | safe |
| 9 | getBookingStatusPreview safe | ✅ | safe |
| 10 | getServiceStatusPreview safe | ✅ | safe |
| 11 | getMaintenanceStatusPreview safe | ✅ | safe |
| 12 | getTicketStatusPreview safe | ✅ | safe |
| 13 | getWarrantyStatusPreview safe | ✅ | safe |
| 14 | getLoyaltyStatusPreview safe | ✅ | safe |
| 15 | getContractStatusPreview safe | ✅ | safe |
| 16 | getDocumentStatusPreview safe | ✅ | safe |
| 17 | support request preview safe | ✅ | safe |
| 18 | document request preview safe | ✅ | safe |
| 19 | reschedule preview safe | ✅ | safe |
| 20 | payment reminder preview safe (no live payment) | ✅ | safe |
| 21 | message draft preview safe (no live send) | ✅ | +92******4567 |
| 22 | audit preview is local + no live write | ✅ | 7 entries |
| 23 | redactor masking examples | ✅ | ok |
| 24 | no full PII in aggregate response blob | ✅ | clean |
