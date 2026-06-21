# Dealer Portal Smoke Test

Generated: 2026-06-21T12:11:17.505Z

**82/82 passed** — all passed

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
| 39 | getBusinessVerificationPreview safe | PASS | safe |
| 40 | getPromotionEligibilityPreview safe | PASS | safe |
| 41 | getRegionStockPreview safe | PASS | safe |
| 42 | getDeliveryEtaRiskPreview safe | PASS | safe |
| 43 | getClaimPipelinePreview safe | PASS | safe |
| 44 | bulk order draft safe (no live order creation/stock reservation) | PASS | total 49200 |
| 45 | quotation request safe (no live quotation creation) | PASS | safe |
| 46 | invoice/payment safe (no live payment action) | PASS | pay_**** |
| 47 | credit limit safe (no live credit mutation) | PASS | 320000 avail |
| 48 | document request safe (no download) | PASS | safe |
| 49 | payment query safe (no payment action/send) | PASS | safe |
| 50 | support request safe (no live ticket creation) | PASS | safe |
| 51 | message draft safe (no live send) | PASS | +92******4567 |
| 52 | audit preview is local + no live write | PASS | 8 entries |
| 53 | dynamic pricing safe (no live price mutation) | PASS | final 738 |
| 54 | bulk import safe (no live import/order) | PASS | 1 valid |
| 55 | reorder suggestion safe (no order creation) | PASS | safe |
| 56 | product substitution safe (no order creation) | PASS | safe |
| 57 | cross-sell/upsell safe (no order creation) | PASS | safe |
| 58 | quote negotiation safe (no quote/approval mutation) | PASS | safe |
| 59 | quote approval safe (no approval mutation) | PASS | safe |
| 60 | credit risk safe (no credit mutation) | PASS | medium |
| 61 | dispute preview safe (no dispute/invoice/payment mutation) | PASS | safe |
| 62 | lead registration safe (no lead/CRM creation) | PASS | safe |
| 63 | deal registration safe (no deal/CRM creation) | PASS | safe |
| 64 | channel conflict safe (no CRM/assignment mutation) | PASS | safe |
| 65 | AI insight safe (no live AI call, no external call) | PASS | 2 recs |
| 66 | risk score safe (no external call) | PASS | score 70 |
| 67 | backorders + partial shipments safe | PASS | 1 bo / 1 ps |
| 68 | no full PII in advanced aggregate blob | PASS | clean |
| 69 | status advancedFeaturesEnabledPreview true | PASS | ok |
| 70 | business verification safe (no mutation/download) | PASS | partially_verified_preview |
| 71 | price protection safe (no price mutation) | PASS | safe |
| 72 | promotion eligibility safe (no promotion mutation) | PASS | 2 promos |
| 73 | region stock safe (no stock mutation/reservation) | PASS | safe |
| 74 | cart risk safe (no order/stock/credit mutation) | PASS | medium |
| 75 | dealer quote comparison safe (no quote mutation) | PASS | tier_adjusted_preview |
| 76 | delivery ETA risk safe (no delivery/shipment mutation) | PASS | safe |
| 77 | claim pipeline safe (no claim mutation) | PASS | 3 claims |
| 78 | catalog item status safe (no mutation) | PASS | safe |
| 79 | redactor masks shipment ref | PASS | ok |
| 80 | no full PII in v2 aggregate blob | PASS | clean |
| 81 | redactor masking examples | PASS | ok |
| 82 | no full PII in aggregate response blob | PASS | clean |
