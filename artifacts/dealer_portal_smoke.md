# Dealer Portal Smoke Test

Generated: 2026-06-21T03:23:06.697Z

**34/34 passed** — all passed

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | require service module | PASS | ok |
| 2 | require redactor | PASS | ok |
| 3 | require route module | PASS | loaded |
| 4 | portal status is safe | PASS | safe |
| 5 | lookup preview safe + masked | PASS | preview_token |
| 6 | summary works even though no real modules | PASS | 1 unpaid |
| 7 | getDealerProfilePreview safe | PASS | safe |
| 8 | getTierStatusPreview safe | PASS | safe |
| 9 | getB2bAccountStatusPreview safe | PASS | safe |
| 10 | getCatalogPreview safe | PASS | safe |
| 11 | getDealerPriceListPreview safe | PASS | safe |
| 12 | getWholesalePricePreview safe | PASS | safe |
| 13 | getStockAvailabilityPreview safe | PASS | safe |
| 14 | getMoqPreview safe | PASS | safe |
| 15 | getOrderStatusPreview safe | PASS | safe |
| 16 | getInvoicePaymentStatusPreview safe | PASS | safe |
| 17 | getCreditLimitPreview safe | PASS | safe |
| 18 | getOutstandingBalancePreview safe | PASS | safe |
| 19 | getCommissionMarginPreview safe | PASS | safe |
| 20 | getReturnClaimStatusPreview safe | PASS | safe |
| 21 | getWarrantyClaimStatusPreview safe | PASS | safe |
| 22 | getLoyaltyStatusPreview safe | PASS | safe |
| 23 | getContractStatusPreview safe | PASS | safe |
| 24 | bulk order draft safe (no live order creation/stock reservation) | PASS | total 49200 |
| 25 | quotation request safe (no live quotation creation) | PASS | safe |
| 26 | invoice/payment safe (no live payment action) | PASS | pay_**** |
| 27 | credit limit safe (no live credit mutation) | PASS | 320000 avail |
| 28 | document request safe (no download) | PASS | safe |
| 29 | payment query safe (no payment action/send) | PASS | safe |
| 30 | support request safe (no live ticket creation) | PASS | safe |
| 31 | message draft safe (no live send) | PASS | +92******4567 |
| 32 | audit preview is local + no live write | PASS | 8 entries |
| 33 | redactor masking examples | PASS | ok |
| 34 | no full PII in aggregate response blob | PASS | clean |
