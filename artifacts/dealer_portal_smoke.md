# Dealer Portal Smoke Test

Generated: 2026-06-21T10:37:07.226Z

**65/65 passed** — all passed

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
| 24 | getOnboardingPreview safe | PASS | safe |
| 25 | getComplianceDocumentPreview safe | PASS | safe |
| 26 | getContractPricePreview safe | PASS | safe |
| 27 | getTierDiscountPreview safe | PASS | safe |
| 28 | getVolumeDiscountPreview safe | PASS | safe |
| 29 | getWarehouseStockPreview safe | PASS | safe |
| 30 | getBranchStockPreview safe | PASS | safe |
| 31 | getOutstandingStatementPreview safe | PASS | safe |
| 32 | getCreditRiskPreview safe | PASS | safe |
| 33 | getRebateIncentivePreview safe | PASS | safe |
| 34 | getTargetAchievementPreview safe | PASS | safe |
| 35 | getLeaderboardPreview safe | PASS | safe |
| 36 | getTerritoryPerformancePreview safe | PASS | safe |
| 37 | getRiskScorePreview safe | PASS | safe |
| 38 | getAnalyticsPreview safe | PASS | safe |
| 39 | bulk order draft safe (no live order creation/stock reservation) | PASS | total 49200 |
| 40 | quotation request safe (no live quotation creation) | PASS | safe |
| 41 | invoice/payment safe (no live payment action) | PASS | pay_**** |
| 42 | credit limit safe (no live credit mutation) | PASS | 320000 avail |
| 43 | document request safe (no download) | PASS | safe |
| 44 | payment query safe (no payment action/send) | PASS | safe |
| 45 | support request safe (no live ticket creation) | PASS | safe |
| 46 | message draft safe (no live send) | PASS | +92******4567 |
| 47 | audit preview is local + no live write | PASS | 8 entries |
| 48 | dynamic pricing safe (no live price mutation) | PASS | final 738 |
| 49 | bulk import safe (no live import/order) | PASS | 1 valid |
| 50 | reorder suggestion safe (no order creation) | PASS | safe |
| 51 | product substitution safe (no order creation) | PASS | safe |
| 52 | cross-sell/upsell safe (no order creation) | PASS | safe |
| 53 | quote negotiation safe (no quote/approval mutation) | PASS | safe |
| 54 | quote approval safe (no approval mutation) | PASS | safe |
| 55 | credit risk safe (no credit mutation) | PASS | medium |
| 56 | dispute preview safe (no dispute/invoice/payment mutation) | PASS | safe |
| 57 | lead registration safe (no lead/CRM creation) | PASS | safe |
| 58 | deal registration safe (no deal/CRM creation) | PASS | safe |
| 59 | channel conflict safe (no CRM/assignment mutation) | PASS | safe |
| 60 | AI insight safe (no live AI call, no external call) | PASS | 2 recs |
| 61 | risk score safe (no external call) | PASS | score 70 |
| 62 | backorders + partial shipments safe | PASS | 1 bo / 1 ps |
| 63 | no full PII in advanced aggregate blob | PASS | clean |
| 64 | redactor masking examples | PASS | ok |
| 65 | no full PII in aggregate response blob | PASS | clean |
