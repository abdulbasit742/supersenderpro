# Dealer Portal Check

Generated: 2026-06-21T03:23:06.538Z

**58/58 passed**

| Check | Result | Detail |
|---|---|---|
| file lib/dealerPortal/store.js | PASS |  |
| file lib/dealerPortal/dealerPortalModel.js | PASS |  |
| file lib/dealerPortal/dealerPortalService.js | PASS |  |
| file lib/dealerPortal/statusSummaryPreview.js | PASS |  |
| file lib/dealerPortal/dealerProfilePreview.js | PASS |  |
| file lib/dealerPortal/tierStatusPreview.js | PASS |  |
| file lib/dealerPortal/b2bAccountStatusPreview.js | PASS |  |
| file lib/dealerPortal/catalogPreview.js | PASS |  |
| file lib/dealerPortal/dealerPriceListPreview.js | PASS |  |
| file lib/dealerPortal/wholesalePricePreview.js | PASS |  |
| file lib/dealerPortal/stockAvailabilityPreview.js | PASS |  |
| file lib/dealerPortal/moqPreview.js | PASS |  |
| file lib/dealerPortal/bulkOrderDraftPreview.js | PASS |  |
| file lib/dealerPortal/quotationRequestPreview.js | PASS |  |
| file lib/dealerPortal/orderStatusPreview.js | PASS |  |
| file lib/dealerPortal/invoicePaymentStatusPreview.js | PASS |  |
| file lib/dealerPortal/creditLimitPreview.js | PASS |  |
| file lib/dealerPortal/outstandingBalancePreview.js | PASS |  |
| file lib/dealerPortal/commissionMarginPreview.js | PASS |  |
| file lib/dealerPortal/deliveryStatusPreview.js | PASS |  |
| file lib/dealerPortal/shipmentStatusPreview.js | PASS |  |
| file lib/dealerPortal/returnClaimStatusPreview.js | PASS |  |
| file lib/dealerPortal/warrantyClaimStatusPreview.js | PASS |  |
| file lib/dealerPortal/loyaltyStatusPreview.js | PASS |  |
| file lib/dealerPortal/contractStatusPreview.js | PASS |  |
| file lib/dealerPortal/documentRequestPreview.js | PASS |  |
| file lib/dealerPortal/paymentQueryPreview.js | PASS |  |
| file lib/dealerPortal/supportRequestPreview.js | PASS |  |
| file lib/dealerPortal/messageDrafts.js | PASS |  |
| file lib/dealerPortal/auditPreview.js | PASS |  |
| file lib/dealerPortal/redactor.js | PASS |  |
| file routes/dealerPortalRoutes.js | PASS |  |
| file public/dealer-portal.html | PASS |  |
| file public/js/dealer-portal.js | PASS |  |
| file public/css/dealer-portal.css | PASS |  |
| server hook present | PASS |  |
| route module loads | PASS |  |
| all service functions exported | PASS | all present |
| status dryRun true + liveActionsEnabled false | PASS |  |
| status dealerPortalPublicLive false | PASS |  |
| status piiMasked true | PASS |  |
| status externalCallsEnabled false | PASS |  |
| redactor masks phone | PASS | +92******4567 |
| redactor masks email | PASS | de****@example.com |
| redactor masks order ref | PASS |  |
| redactor masks invoice ref | PASS |  |
| redactor masks payment ref | PASS |  |
| redactor masks credit ref | PASS |  |
| redactor masks tax ref | PASS |  |
| redactor masks document ref | PASS |  |
| bulk order liveOrderCreation false | PASS |  |
| quotation liveQuotationCreation false | PASS |  |
| invoice livePaymentAction false | PASS |  |
| credit liveCreditMutation false | PASS |  |
| document request liveDocumentDownload false | PASS |  |
| message draft liveSend false + masked recipient | PASS |  |
| summary piiMasked true + works without modules | PASS |  |
| no PII/secret leak | PASS |  |
