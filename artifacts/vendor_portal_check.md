# Vendor Portal Check

Generated: 2026-06-21T03:50:30.904Z

**52/52 passed**

| Check | Result | Detail |
|---|---|---|
| file lib/vendorPortal/store.js | PASS |  |
| file lib/vendorPortal/vendorPortalModel.js | PASS |  |
| file lib/vendorPortal/vendorPortalService.js | PASS |  |
| file lib/vendorPortal/statusSummaryPreview.js | PASS |  |
| file lib/vendorPortal/vendorProfilePreview.js | PASS |  |
| file lib/vendorPortal/tierStatusPreview.js | PASS |  |
| file lib/vendorPortal/accountStatusPreview.js | PASS |  |
| file lib/vendorPortal/supplyCatalogPreview.js | PASS |  |
| file lib/vendorPortal/purchasePriceListPreview.js | PASS |  |
| file lib/vendorPortal/purchaseOrderStatusPreview.js | PASS |  |
| file lib/vendorPortal/grnStatusPreview.js | PASS |  |
| file lib/vendorPortal/invoiceSubmissionPreview.js | PASS |  |
| file lib/vendorPortal/invoicePaymentStatusPreview.js | PASS |  |
| file lib/vendorPortal/outstandingPayablePreview.js | PASS |  |
| file lib/vendorPortal/paymentSchedulePreview.js | PASS |  |
| file lib/vendorPortal/deliveryStatusPreview.js | PASS |  |
| file lib/vendorPortal/qualityInspectionPreview.js | PASS |  |
| file lib/vendorPortal/complianceDocumentPreview.js | PASS |  |
| file lib/vendorPortal/contractStatusPreview.js | PASS |  |
| file lib/vendorPortal/ratingStatusPreview.js | PASS |  |
| file lib/vendorPortal/documentRequestPreview.js | PASS |  |
| file lib/vendorPortal/paymentQueryPreview.js | PASS |  |
| file lib/vendorPortal/supportRequestPreview.js | PASS |  |
| file lib/vendorPortal/messageDrafts.js | PASS |  |
| file lib/vendorPortal/auditPreview.js | PASS |  |
| file lib/vendorPortal/redactor.js | PASS |  |
| file routes/vendorPortalRoutes.js | PASS |  |
| file public/vendor-portal.html | PASS |  |
| file public/js/vendor-portal.js | PASS |  |
| file public/css/vendor-portal.css | PASS |  |
| server hook present | PASS |  |
| route module loads | PASS |  |
| all service functions exported | PASS | all present |
| status dryRun true + liveActionsEnabled false | PASS |  |
| status vendorPortalPublicLive false | PASS |  |
| status piiMasked true | PASS |  |
| status externalCallsEnabled false | PASS |  |
| redactor masks phone | PASS | +92******4567 |
| redactor masks email | PASS | ve****@example.com |
| redactor masks PO ref | PASS |  |
| redactor masks invoice ref | PASS |  |
| redactor masks payment ref | PASS |  |
| redactor masks bank ref | PASS |  |
| redactor masks tax ref | PASS |  |
| redactor masks document ref | PASS |  |
| invoice submission liveInvoiceSubmission false | PASS |  |
| invoice/payment livePaymentAction false | PASS |  |
| PO livePOMutation false | PASS |  |
| document request liveDocumentDownload false | PASS |  |
| message draft liveSend false + masked recipient | PASS |  |
| summary piiMasked true + works without modules | PASS |  |
| no PII/secret leak | PASS |  |
