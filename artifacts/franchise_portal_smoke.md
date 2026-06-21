# Franchise Portal Smoke Test

Generated: 2026-06-21T06:09:01.519Z

**33/33 passed** — all passed

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | require service module | PASS | ok |
| 2 | require redactor | PASS | ok |
| 3 | require route module | PASS | loaded |
| 4 | portal status is safe | PASS | safe |
| 5 | lookup preview safe + masked | PASS | preview_token |
| 6 | summary works even though no real modules | PASS | 3 outlets |
| 7 | getFranchiseProfilePreview safe | PASS | safe |
| 8 | getTierStatusPreview safe | PASS | safe |
| 9 | getOutletAccountStatusPreview safe | PASS | safe |
| 10 | getSalesSummaryPreview safe | PASS | safe |
| 11 | getTargetAchievementPreview safe | PASS | safe |
| 12 | getRoyaltySummaryPreview safe | PASS | safe |
| 13 | getRoyaltyPaymentStatusPreview safe | PASS | safe |
| 14 | getOutstandingPayablePreview safe | PASS | safe |
| 15 | getInventoryAllocationPreview safe | PASS | safe |
| 16 | getOrderStatusPreview safe | PASS | safe |
| 17 | getMarketingFundPreview safe | PASS | safe |
| 18 | getHeadcountPreview safe | PASS | safe |
| 19 | getComplianceChecklistPreview safe | PASS | safe |
| 20 | getTerritoryAssignmentPreview safe | PASS | safe |
| 21 | getContractStatusPreview safe | PASS | safe |
| 22 | replenishment draft safe (no live order/stock) | PASS | 1 items |
| 23 | royalty summary safe (no royalty/payment mutation) | PASS | safe |
| 24 | royalty payment safe (no payment action) | PASS | pay_**** |
| 25 | outstanding payable safe (no payment action) | PASS | 93000 |
| 26 | inventory safe (no stock mutation/reservation) | PASS | safe |
| 27 | marketing fund safe (no fund/payment mutation) | PASS | safe |
| 28 | document request safe (no download) | PASS | safe |
| 29 | support request safe (no live ticket creation) | PASS | safe |
| 30 | message draft safe (no live send) | PASS | +92******4567 |
| 31 | audit preview is local + no live write | PASS | 6 entries |
| 32 | redactor masking examples | PASS | ok |
| 33 | no full PII in aggregate response blob | PASS | clean |
