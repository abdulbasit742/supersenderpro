#!/usr/bin/env node
// scripts/dealer-portal-check.js — Validates Dealer Portal install + safe behaviour. No server, no external calls.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: String(d).slice(0, 80) });
const exists = (r) => fs.existsSync(path.join(ROOT, r));

const LIB = [
  'store.js', 'dealerPortalModel.js', 'dealerPortalService.js', 'statusSummaryPreview.js',
  'dealerProfilePreview.js', 'tierStatusPreview.js', 'b2bAccountStatusPreview.js', 'catalogPreview.js',
  'dealerPriceListPreview.js', 'wholesalePricePreview.js', 'stockAvailabilityPreview.js', 'moqPreview.js',
  'bulkOrderDraftPreview.js', 'quotationRequestPreview.js', 'orderStatusPreview.js', 'invoicePaymentStatusPreview.js',
  'creditLimitPreview.js', 'outstandingBalancePreview.js', 'commissionMarginPreview.js', 'deliveryStatusPreview.js',
  'shipmentStatusPreview.js', 'returnClaimStatusPreview.js', 'warrantyClaimStatusPreview.js', 'loyaltyStatusPreview.js',
  'contractStatusPreview.js', 'documentRequestPreview.js', 'paymentQueryPreview.js', 'supportRequestPreview.js',
  'messageDrafts.js', 'auditPreview.js', 'redactor.js',
  // ---- Advanced B2B Commerce Operating System ----
  'onboardingPreview.js', 'complianceDocumentPreview.js', 'contractPricePreview.js', 'tierDiscountPreview.js',
  'volumeDiscountPreview.js', 'dynamicPricingPreview.js', 'warehouseStockPreview.js', 'branchStockPreview.js',
  'bulkImportPreview.js', 'reorderSuggestionPreview.js', 'productSubstitutionPreview.js', 'crossSellUpsellPreview.js',
  'quoteNegotiationPreview.js', 'quoteApprovalPreview.js', 'backorderPreview.js', 'partialShipmentPreview.js',
  'statementPreview.js', 'creditRiskPreview.js', 'disputeCenterPreview.js', 'rebateIncentivePreview.js',
  'targetAchievementPreview.js', 'leaderboardPreview.js', 'territoryPerformancePreview.js', 'channelConflictPreview.js',
  'leadRegistrationPreview.js', 'dealRegistrationPreview.js', 'riskScorePreview.js', 'analyticsPreview.js',
  'aiInsightPreview.js', 'moduleAdapters.js',
  // ---- v2 ----
  'businessVerificationPreview.js', 'priceProtectionPreview.js', 'promotionEligibilityPreview.js',
  'regionStockPreview.js', 'cartRiskPreview.js', 'dealerQuoteComparisonPreview.js', 'deliveryEtaRiskPreview.js',
  'dealerClaimPipelinePreview.js',
];
LIB.forEach((f) => add(`file lib/dealerPortal/${f}`, exists(`lib/dealerPortal/${f}`)));
['routes/dealerPortalRoutes.js', 'public/dealer-portal.html', 'public/js/dealer-portal.js', 'public/css/dealer-portal.css',
  'public/dealer-portal.webmanifest', 'public/dealer-portal-sw.js', 'public/assets/dealer-portal-icon.svg']
  .forEach((f) => add(`file ${f}`, exists(f)));

add('server hook present', exists('server.js') && fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8').includes('DEALER PORTAL HOOK'));

let leakBlob = '';
try {
  const svc = require('../lib/dealerPortal/dealerPortalService');
  const red = require('../lib/dealerPortal/redactor');
  require('../routes/dealerPortalRoutes');
  add('route module loads', true);

  const fns = ['getDealerPortalStatus', 'lookupDealerPreview', 'getDealerSummaryPreview', 'getDealerProfilePreview',
    'getTierStatusPreview', 'getB2bAccountStatusPreview', 'getCatalogPreview', 'getDealerPriceListPreview',
    'getWholesalePricePreview', 'getStockAvailabilityPreview', 'getMoqPreview', 'createBulkOrderDraftPreview',
    'createQuotationRequestPreview', 'getOrderStatusPreview', 'getInvoicePaymentStatusPreview', 'getCreditLimitPreview',
    'getOutstandingBalancePreview', 'getCommissionMarginPreview', 'getReturnClaimStatusPreview', 'getWarrantyClaimStatusPreview',
    'getLoyaltyStatusPreview', 'getContractStatusPreview', 'createDocumentRequestPreview', 'createPaymentQueryPreview',
    'createSupportRequestPreview', 'createMessageDraftPreview', 'getAuditPreview',
    'getOnboardingPreview', 'getComplianceDocumentPreview', 'getContractPricePreview', 'getTierDiscountPreview',
    'getVolumeDiscountPreview', 'createDynamicPricingPreview', 'getWarehouseStockPreview', 'getBranchStockPreview',
    'createBulkImportPreview', 'createReorderSuggestionPreview', 'createProductSubstitutionPreview',
    'createCrossSellUpsellPreview', 'createQuoteNegotiationPreview', 'createQuoteApprovalPreview',
    'getOutstandingStatementPreview', 'getCreditRiskPreview', 'createDisputePreview', 'getRebateIncentivePreview',
    'getTargetAchievementPreview', 'getLeaderboardPreview', 'getTerritoryPerformancePreview',
    'createChannelConflictPreview', 'createLeadRegistrationPreview', 'createDealRegistrationPreview',
    'getRiskScorePreview', 'getAnalyticsPreview', 'createAiInsightPreview',
    'getBusinessVerificationPreview', 'createPriceProtectionPreview', 'getPromotionEligibilityPreview',
    'getRegionStockPreview', 'createCartRiskPreview', 'createDealerQuoteComparisonPreview',
    'getDeliveryEtaRiskPreview', 'getClaimPipelinePreview', 'getCatalogItemStatus'];
  add('all service functions exported', fns.every((f) => typeof svc[f] === 'function'), fns.filter((f) => typeof svc[f] !== 'function').join(',') || 'all present');

  const status = svc.getDealerPortalStatus();
  add('status dryRun true + liveActionsEnabled false', status.dryRun === true && status.liveActionsEnabled === false);
  add('status dealerPortalPublicLive false', status.dealerPortalPublicLive === false);
  add('status piiMasked true', status.piiMasked === true);
  add('status externalCallsEnabled false', status.externalCallsEnabled === false);

  add('redactor masks phone', red.maskPhone('+923001234567') === '+92******4567', red.maskPhone('+923001234567'));
  add('redactor masks email', /^de\*+@example\.com$/.test(red.maskEmail('dealer@example.com')), red.maskEmail('dealer@example.com'));
  add('redactor masks order ref', red.maskRef('ord_1001') === 'ord_****');
  add('redactor masks invoice ref', red.maskRef('inv_2001') === 'inv_****');
  add('redactor masks payment ref', red.maskPaymentRef('pay_x') === 'pay_****');
  add('redactor masks credit ref', red.maskCreditRef('x') === 'credit_****');
  add('redactor masks tax ref', red.maskTaxRef('x') === 'tax_****');
  add('redactor masks document ref', red.maskDocumentRef('x') === 'doc_****');

  const bulk = svc.createBulkOrderDraftPreview({ items: [{ productId: 'prod_1', qty: 60 }] });
  add('bulk order liveOrderCreation false', bulk.liveOrderCreation === false && bulk.liveStockReservation === false && bulk.livePriceMutation === false);
  const quote = svc.createQuotationRequestPreview({ items: [] });
  add('quotation liveQuotationCreation false', quote.liveQuotationCreation === false && quote.liveMessageSend === false);
  const inv = svc.getInvoicePaymentStatusPreview({});
  add('invoice livePaymentAction false', inv.livePaymentAction === false && inv.liveInvoiceMutation === false);
  const cr = svc.getCreditLimitPreview({});
  add('credit liveCreditMutation false', cr.liveCreditMutation === false);
  const doc = svc.createDocumentRequestPreview({ documentId: 'doc_6001' });
  add('document request liveDocumentDownload false', doc.liveDocumentDownload === false);
  const msg = svc.createMessageDraftPreview({ message: 'hi' });
  add('message draft liveSend false + masked recipient', msg.liveSend === false && msg.recipientMasked.includes('*'));
  const sum = svc.getDealerSummaryPreview({});
  add('summary piiMasked true + works without modules', sum.piiMasked === true);

  // ---- Advanced B2B Commerce Operating System safety checks ----
  const dyn = svc.createDynamicPricingPreview({ productId: 'prod_1', qty: 120 });
  add('dynamic pricing livePriceMutation false', dyn.livePriceMutation === false);
  const imp = svc.createBulkImportPreview({ csv: 'productId,qty\nprod_1,60' });
  add('bulk import liveImport false', imp.liveImport === false && imp.liveOrderCreation === false);
  const qn = svc.createQuoteNegotiationPreview({ requestedDiscount: 15 });
  add('quote negotiation liveQuoteMutation false', qn.liveQuoteMutation === false && qn.liveApprovalMutation === false);
  const crk = svc.getCreditRiskPreview({});
  add('credit risk liveCreditMutation false', crk.liveCreditMutation === false);
  const dsp = svc.createDisputePreview({ invoiceId: 'inv_2001', reason: 'x' });
  add('dispute liveDisputeCreation false', dsp.liveDisputeCreation === false && dsp.liveInvoiceMutation === false);
  const lead = svc.createLeadRegistrationPreview({ company: 'X' });
  add('lead registration liveLeadCreation false', lead.liveLeadCreation === false && lead.liveCrmMutation === false);
  const ch = svc.createChannelConflictPreview({ region: 'South' });
  add('channel conflict liveCrmMutation false', ch.liveCrmMutation === false && ch.liveAssignmentMutation === false);
  const ai = svc.createAiInsightPreview({});
  add('ai insight liveAiCall false + no external call', ai.liveAiCall === false && ai.externalCallsEnabled === false);
  const rsk = svc.getRiskScorePreview({});
  add('risk score no external call', rsk.externalCallsEnabled === false);

  // ---- v2 advanced safety checks ----
  add('redactor masks shipment ref', red.maskShipmentRef('shp_3101') === 'ship_****', red.maskShipmentRef('shp_3101'));
  add('status advancedFeaturesEnabledPreview true', status.advancedFeaturesEnabledPreview === true);
  const bv = svc.getBusinessVerificationPreview({});
  add('business verification no live mutation/download', bv.liveVerificationMutation === false && bv.liveDocumentDownload === false);
  const pp = svc.createPriceProtectionPreview({ productId: 'prod_1' });
  add('price protection livePriceMutation false', pp.livePriceMutation === false);
  const cart = svc.createCartRiskPreview({ items: [{ productId: 'prod_2', qty: 5 }] });
  add('cart risk no live order/stock/credit mutation', cart.liveOrderCreation === false && cart.liveStockMutation === false && cart.liveCreditMutation === false);
  const qc = svc.createDealerQuoteComparisonPreview({ productId: 'prod_1' });
  add('quote comparison liveQuoteMutation false', qc.liveQuoteMutation === false);
  const eta = svc.getDeliveryEtaRiskPreview({});
  add('delivery ETA risk no live mutation', eta.liveDeliveryMutation === false && eta.liveShipmentMutation === false);
  const cp2 = svc.getClaimPipelinePreview({});
  add('claim pipeline liveClaimMutation false', cp2.liveClaimMutation === false);
  const catItem = svc.getCatalogItemStatus({ id: 'prod_1' });
  add('catalog item status no mutation', catItem.livePriceMutation === false && catItem.liveStockMutation === false);

  leakBlob = JSON.stringify({ status, bulk, quote, inv, cr, doc, msg, sum, dyn, imp, qn, crk, dsp, lead, ch, ai, rsk,
    bv, pp, cart, qc, eta, cp2, catItem,
    promo: svc.getPromotionEligibilityPreview({}), region: svc.getRegionStockPreview({}),
    catalog: svc.getCatalogPreview({}), price: svc.getDealerPriceListPreview({}), orders: svc.listOrders({}), audit: svc.getAuditPreview(),
    warehouse: svc.getWarehouseStockPreview({}), branch: svc.getBranchStockPreview({}), statement: svc.getOutstandingStatementPreview({}),
    leaderboard: svc.getLeaderboardPreview({}), analytics: svc.getAnalyticsPreview({}) });
  add('no PII/secret leak', !red.hasLeak(leakBlob));
} catch (e) {
  add('functional pipeline', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, strict: String(process.env.DEALER_PORTAL_STRICT || 'false'), checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'dealer_portal_check.json'), JSON.stringify(out, null, 2));
let md = `# Dealer Portal Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? 'PASS' : 'FAIL'} | ${c.detail.replace(/\|/g, '/')} |\n`; });
fs.writeFileSync(path.join(dir, 'dealer_portal_check.md'), md);
console.log(md);
const strict = String(process.env.DEALER_PORTAL_STRICT || '').toLowerCase() === 'true';
process.exit((strict && failed > 0) ? 1 : 0);
