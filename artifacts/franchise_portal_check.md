# Franchise Portal Check

Generated: 2026-06-23T10:24:50.538Z

**52/52 passed**

| Check | Result | Detail |
|---|---|---|
| file lib/franchisePortal/store.js | PASS |  |
| file lib/franchisePortal/franchisePortalModel.js | PASS |  |
| file lib/franchisePortal/franchisePortalService.js | PASS |  |
| file lib/franchisePortal/statusSummaryPreview.js | PASS |  |
| file lib/franchisePortal/franchiseProfilePreview.js | PASS |  |
| file lib/franchisePortal/tierStatusPreview.js | PASS |  |
| file lib/franchisePortal/outletAccountStatusPreview.js | PASS |  |
| file lib/franchisePortal/outletListPreview.js | PASS |  |
| file lib/franchisePortal/salesSummaryPreview.js | PASS |  |
| file lib/franchisePortal/targetAchievementPreview.js | PASS |  |
| file lib/franchisePortal/royaltySummaryPreview.js | PASS |  |
| file lib/franchisePortal/royaltyPaymentStatusPreview.js | PASS |  |
| file lib/franchisePortal/outstandingPayablePreview.js | PASS |  |
| file lib/franchisePortal/inventoryAllocationPreview.js | PASS |  |
| file lib/franchisePortal/replenishmentDraftPreview.js | PASS |  |
| file lib/franchisePortal/orderStatusPreview.js | PASS |  |
| file lib/franchisePortal/settlementStatusPreview.js | PASS |  |
| file lib/franchisePortal/marketingFundPreview.js | PASS |  |
| file lib/franchisePortal/headcountPreview.js | PASS |  |
| file lib/franchisePortal/complianceChecklistPreview.js | PASS |  |
| file lib/franchisePortal/territoryAssignmentPreview.js | PASS |  |
| file lib/franchisePortal/contractStatusPreview.js | PASS |  |
| file lib/franchisePortal/documentRequestPreview.js | PASS |  |
| file lib/franchisePortal/supportRequestPreview.js | PASS |  |
| file lib/franchisePortal/messageDrafts.js | PASS |  |
| file lib/franchisePortal/auditPreview.js | PASS |  |
| file lib/franchisePortal/redactor.js | PASS |  |
| file routes/franchisePortalRoutes.js | PASS |  |
| file public/franchise-portal.html | PASS |  |
| file public/js/franchise-portal.js | PASS |  |
| file public/css/franchise-portal.css | PASS |  |
| server hook present | PASS |  |
| route module loads | PASS |  |
| all service functions exported | PASS | all present |
| status dryRun true + liveActionsEnabled false | PASS |  |
| status franchisePortalPublicLive false | PASS |  |
| status piiMasked true | PASS |  |
| status externalCallsEnabled false | PASS |  |
| redactor masks phone | PASS | +92******4567 |
| redactor masks email | PASS | fr*******@example.com |
| redactor masks order ref | PASS |  |
| redactor masks invoice ref | PASS |  |
| redactor masks payment ref | PASS |  |
| redactor masks tax ref | PASS |  |
| redactor masks document ref | PASS |  |
| replenishment liveOrderCreation false | PASS |  |
| royalty liveRoyaltyMutation false | PASS |  |
| royalty payment livePaymentAction false | PASS |  |
| document request liveDocumentDownload false | PASS |  |
| message draft liveSend false + masked recipient | PASS |  |
| summary piiMasked true + works without modules | PASS |  |
| no PII/secret leak | PASS |  |
