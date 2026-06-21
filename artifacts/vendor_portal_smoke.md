# Vendor Portal Smoke Test

Generated: 2026-06-21T03:50:31.047Z

**30/30 passed** — all passed

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | require service module | PASS | ok |
| 2 | require redactor | PASS | ok |
| 3 | require route module | PASS | loaded |
| 4 | portal status is safe | PASS | safe |
| 5 | lookup preview safe + masked | PASS | preview_token |
| 6 | summary works even though no real modules | PASS | 1 unpaid |
| 7 | getVendorProfilePreview safe | PASS | safe |
| 8 | getTierStatusPreview safe | PASS | safe |
| 9 | getAccountStatusPreview safe | PASS | safe |
| 10 | getSupplyCatalogPreview safe | PASS | safe |
| 11 | getPurchasePriceListPreview safe | PASS | safe |
| 12 | getPurchaseOrderStatusPreview safe | PASS | safe |
| 13 | getGrnStatusPreview safe | PASS | safe |
| 14 | getInvoicePaymentStatusPreview safe | PASS | safe |
| 15 | getOutstandingPayablePreview safe | PASS | safe |
| 16 | getPaymentSchedulePreview safe | PASS | safe |
| 17 | getQualityInspectionPreview safe | PASS | safe |
| 18 | getComplianceDocumentPreview safe | PASS | safe |
| 19 | getContractStatusPreview safe | PASS | safe |
| 20 | getRatingStatusPreview safe | PASS | safe |
| 21 | invoice submission safe (no live submission/payment) | PASS | total 10 |
| 22 | invoice/payment safe (no live payment action) | PASS | pay_**** |
| 23 | outstanding payable safe (no payment action) | PASS | 160000 |
| 24 | document request safe (no download) | PASS | safe |
| 25 | payment query safe (no payment action/send) | PASS | safe |
| 26 | support request safe (no live ticket creation) | PASS | safe |
| 27 | message draft safe (no live send) | PASS | +92******4567 |
| 28 | audit preview is local + no live write | PASS | 7 entries |
| 29 | redactor masking examples | PASS | ok |
| 30 | no full PII in aggregate response blob | PASS | clean |
