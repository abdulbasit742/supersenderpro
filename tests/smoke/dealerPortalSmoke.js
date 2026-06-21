#!/usr/bin/env node
// tests/smoke/dealerPortalSmoke.js — Offline smoke test. No server, no external APIs, no live actions.
'use strict';
const fs = require('fs');
const path = require('path');
const results = [];
function check(n, fn) { try { results.push({ name: n, pass: true, detail: fn() || 'ok' }); } catch (e) { results.push({ name: n, pass: false, detail: e.message }); } }
function assert(c, m) { if (!c) throw new Error(m || 'assertion failed'); return true; }

let svc, red;
check('require service module', () => { svc = require('../../lib/dealerPortal/dealerPortalService'); assert(svc.getDealerPortalStatus, 'no service'); return 'ok'; });
check('require redactor', () => { red = require('../../lib/dealerPortal/redactor'); assert(red.maskPhone, 'no redactor'); return 'ok'; });
check('require route module', () => { require('../../routes/dealerPortalRoutes'); return 'loaded'; });

function assertSafe(resp, label) {
  assert(resp.dryRun === true, `${label}: dryRun not true`);
  assert(resp.liveActionsEnabled === false, `${label}: liveActionsEnabled not false`);
  for (const [k, v] of Object.entries(resp)) {
    if (/^live[A-Z]/.test(k)) assert(v === false, `${label}: ${k} is truthy`);
  }
  return true;
}

check('portal status is safe', () => { const s = svc.getDealerPortalStatus(); assertSafe(s, 'status'); assert(s.externalCallsEnabled === false, 'external calls on'); assert(s.dealerPortalPublicLive === false, 'public live on'); return 'safe'; });
check('lookup preview safe + masked', () => { const l = svc.lookupDealerPreview({ mode: 'preview_token' }); assert(l.dryRun === true && l.liveAuthEnabled === false, 'unsafe'); assert(l.phoneMasked.includes('*') && l.emailMasked.includes('*'), 'pii not masked'); return l.lookupMode; });
check('summary works even though no real modules', () => { const s = svc.getDealerSummaryPreview({}); assertSafe(s, 'summary'); assert(s.piiMasked === true, 'pii not masked'); assert(s.dealerPortalPublicLive === false, 'public live'); return `${s.unpaidInvoicesPreview} unpaid`; });

['getDealerProfilePreview', 'getTierStatusPreview', 'getB2bAccountStatusPreview', 'getCatalogPreview',
 'getDealerPriceListPreview', 'getWholesalePricePreview', 'getStockAvailabilityPreview', 'getMoqPreview',
 'getOrderStatusPreview', 'getInvoicePaymentStatusPreview', 'getCreditLimitPreview', 'getOutstandingBalancePreview',
 'getCommissionMarginPreview', 'getReturnClaimStatusPreview', 'getWarrantyClaimStatusPreview', 'getLoyaltyStatusPreview',
 'getContractStatusPreview',
 // ---- Advanced B2B Commerce Operating System getters ----
 'getOnboardingPreview', 'getComplianceDocumentPreview', 'getContractPricePreview', 'getTierDiscountPreview',
 'getVolumeDiscountPreview', 'getWarehouseStockPreview', 'getBranchStockPreview', 'getOutstandingStatementPreview',
 'getCreditRiskPreview', 'getRebateIncentivePreview', 'getTargetAchievementPreview', 'getLeaderboardPreview',
 'getTerritoryPerformancePreview', 'getRiskScorePreview', 'getAnalyticsPreview',
 // ---- v2 getters ----
 'getBusinessVerificationPreview', 'getPromotionEligibilityPreview', 'getRegionStockPreview',
 'getDeliveryEtaRiskPreview', 'getClaimPipelinePreview'].forEach((fn) => {
  check(`${fn} safe`, () => { const r = svc[fn]({}); assertSafe(r, fn); return 'safe'; });
});

check('bulk order draft safe (no live order creation/stock reservation)', () => { const r = svc.createBulkOrderDraftPreview({ items: [{ productId: 'prod_1', qty: 60 }] }); assertSafe(r, 'bulk'); assert(r.liveOrderCreation === false && r.liveStockReservation === false && r.liveStockMutation === false && r.livePriceMutation === false, 'live'); return `total ${r.orderDraftPreview.totalPreview}`; });
check('quotation request safe (no live quotation creation)', () => { const r = svc.createQuotationRequestPreview({ items: [] }); assertSafe(r, 'quote'); assert(r.liveQuotationCreation === false && r.liveMessageSend === false, 'live'); return 'safe'; });
check('invoice/payment safe (no live payment action)', () => { const r = svc.getInvoicePaymentStatusPreview({}); assertSafe(r, 'inv'); assert(r.livePaymentAction === false && r.liveInvoiceMutation === false, 'live'); return r.paymentReferenceMasked; });
check('credit limit safe (no live credit mutation)', () => { const r = svc.getCreditLimitPreview({}); assertSafe(r, 'credit'); assert(r.liveCreditMutation === false, 'live'); return `${r.availableCreditPreview} avail`; });
check('document request safe (no download)', () => { const r = svc.createDocumentRequestPreview({ documentId: 'doc_1' }); assertSafe(r, 'doc'); assert(r.liveDocumentDownload === false && r.liveShare === false, 'live'); return 'safe'; });
check('payment query safe (no payment action/send)', () => { const r = svc.createPaymentQueryPreview({ invoiceId: 'inv_1' }); assertSafe(r, 'payQuery'); assert(r.livePaymentAction === false && r.liveMessageSend === false, 'live'); return 'safe'; });
check('support request safe (no live ticket creation)', () => { const r = svc.createSupportRequestPreview({ message: 'hi' }); assertSafe(r, 'support'); assert(r.liveTicketCreation === false && r.liveMessageSend === false, 'live'); return 'safe'; });
check('message draft safe (no live send)', () => { const r = svc.createMessageDraftPreview({ message: 'x' }); assertSafe(r, 'message'); assert(r.liveSend === false, 'live send'); return r.recipientMasked; });
check('audit preview is local + no live write', () => { const a = svc.getAuditPreview(); assert(a.liveAuditWrite === false, 'live audit'); return `${a.auditPreview.length} entries`; });

// ---- Advanced B2B Commerce Operating System action previews ----
check('dynamic pricing safe (no live price mutation)', () => { const r = svc.createDynamicPricingPreview({ productId: 'prod_1', qty: 120 }); assertSafe(r, 'dyn'); assert(r.livePriceMutation === false, 'live'); return `final ${r.finalPricePreview}`; });
check('bulk import safe (no live import/order)', () => { const r = svc.createBulkImportPreview({ csv: 'productId,qty\nprod_1,60' }); assertSafe(r, 'import'); assert(r.liveImport === false && r.liveOrderCreation === false, 'live'); return `${r.validRowsPreview} valid`; });
check('reorder suggestion safe (no order creation)', () => { const r = svc.createReorderSuggestionPreview({}); assertSafe(r, 'reorder'); assert(r.liveOrderCreation === false, 'live'); return 'safe'; });
check('product substitution safe (no order creation)', () => { const r = svc.createProductSubstitutionPreview({ productId: 'prod_2' }); assertSafe(r, 'sub'); assert(r.liveOrderCreation === false, 'live'); return 'safe'; });
check('cross-sell/upsell safe (no order creation)', () => { const r = svc.createCrossSellUpsellPreview({ productId: 'prod_1' }); assertSafe(r, 'cross'); assert(r.liveOrderCreation === false, 'live'); return 'safe'; });
check('quote negotiation safe (no quote/approval mutation)', () => { const r = svc.createQuoteNegotiationPreview({ requestedDiscount: 15 }); assertSafe(r, 'qn'); assert(r.liveQuoteMutation === false && r.liveApprovalMutation === false, 'live'); return 'safe'; });
check('quote approval safe (no approval mutation)', () => { const r = svc.createQuoteApprovalPreview({ requestedDiscount: 15 }); assertSafe(r, 'qa'); assert(r.liveApprovalMutation === false, 'live'); return 'safe'; });
check('credit risk safe (no credit mutation)', () => { const r = svc.getCreditRiskPreview({}); assertSafe(r, 'crk'); assert(r.liveCreditMutation === false, 'live'); return r.creditRiskLevelPreview; });
check('dispute preview safe (no dispute/invoice/payment mutation)', () => { const r = svc.createDisputePreview({ invoiceId: 'inv_2001', reason: 'x' }); assertSafe(r, 'dsp'); assert(r.liveDisputeCreation === false && r.liveInvoiceMutation === false && r.livePaymentAction === false, 'live'); return 'safe'; });
check('lead registration safe (no lead/CRM creation)', () => { const r = svc.createLeadRegistrationPreview({ company: 'X' }); assertSafe(r, 'lead'); assert(r.liveLeadCreation === false && r.liveCrmMutation === false, 'live'); return 'safe'; });
check('deal registration safe (no deal/CRM creation)', () => { const r = svc.createDealRegistrationPreview({ name: 'Y' }); assertSafe(r, 'deal'); assert(r.liveDealCreation === false && r.liveCrmMutation === false, 'live'); return 'safe'; });
check('channel conflict safe (no CRM/assignment mutation)', () => { const r = svc.createChannelConflictPreview({ region: 'South' }); assertSafe(r, 'ch'); assert(r.liveCrmMutation === false && r.liveAssignmentMutation === false, 'live'); return 'safe'; });
check('AI insight safe (no live AI call, no external call)', () => { const r = svc.createAiInsightPreview({}); assertSafe(r, 'ai'); assert(r.liveAiCall === false && r.externalCallsEnabled === false, 'live'); return `${r.recommendationPreview.length} recs`; });
check('risk score safe (no external call)', () => { const r = svc.getRiskScorePreview({}); assertSafe(r, 'risk'); assert(r.externalCallsEnabled === false, 'external'); return `score ${r.riskScorePreview}`; });
check('backorders + partial shipments safe', () => { const b = svc.listBackorders({}); const p = svc.listPartialShipments({}); assertSafe(b, 'bo'); assertSafe(p, 'ps'); return `${b.backordersPreview.length} bo / ${p.partialShipmentsPreview.length} ps`; });
check('no full PII in advanced aggregate blob', () => {
  const blob = JSON.stringify({
    dyn: svc.createDynamicPricingPreview({ productId: 'prod_1', qty: 50 }), wh: svc.getWarehouseStockPreview({}),
    br: svc.getBranchStockPreview({}), statement: svc.getOutstandingStatementPreview({}), crk: svc.getCreditRiskPreview({}),
    lead: svc.createLeadRegistrationPreview({ company: 'X' }), leaderboard: svc.getLeaderboardPreview({}),
    ai: svc.createAiInsightPreview({}), analytics: svc.getAnalyticsPreview({}), dsp: svc.createDisputePreview({ invoiceId: 'inv_1' }),
  });
  assert(!red.hasLeak(blob), 'leak detected');
  return 'clean';
});

// ---- v2: Distributor B2B Commerce OS action previews ----
check('status advancedFeaturesEnabledPreview true', () => { const s = svc.getDealerPortalStatus(); assert(s.advancedFeaturesEnabledPreview === true, 'flag'); return 'ok'; });
check('business verification safe (no mutation/download)', () => { const r = svc.getBusinessVerificationPreview({}); assertSafe(r, 'bv'); assert(r.liveVerificationMutation === false && r.liveDocumentDownload === false, 'live'); return r.verificationStatusPreview; });
check('price protection safe (no price mutation)', () => { const r = svc.createPriceProtectionPreview({ productId: 'prod_1' }); assertSafe(r, 'pp'); assert(r.livePriceMutation === false, 'live'); return 'safe'; });
check('promotion eligibility safe (no promotion mutation)', () => { const r = svc.getPromotionEligibilityPreview({}); assertSafe(r, 'promo'); assert(r.livePromotionMutation === false, 'live'); return `${r.promotionEligibilityPreview.length} promos`; });
check('region stock safe (no stock mutation/reservation)', () => { const r = svc.getRegionStockPreview({}); assertSafe(r, 'region'); assert(r.liveStockMutation === false && r.liveStockReservation === false, 'live'); return 'safe'; });
check('cart risk safe (no order/stock/credit mutation)', () => { const r = svc.createCartRiskPreview({ items: [{ productId: 'prod_2', qty: 5 }] }); assertSafe(r, 'cart'); assert(r.liveOrderCreation === false && r.liveStockMutation === false && r.liveCreditMutation === false, 'live'); return r.cartRiskLevelPreview; });
check('dealer quote comparison safe (no quote mutation)', () => { const r = svc.createDealerQuoteComparisonPreview({ productId: 'prod_1' }); assertSafe(r, 'qc'); assert(r.liveQuoteMutation === false, 'live'); return r.bestOptionPreview; });
check('delivery ETA risk safe (no delivery/shipment mutation)', () => { const r = svc.getDeliveryEtaRiskPreview({}); assertSafe(r, 'eta'); assert(r.liveDeliveryMutation === false && r.liveShipmentMutation === false, 'live'); return 'safe'; });
check('claim pipeline safe (no claim mutation)', () => { const r = svc.getClaimPipelinePreview({}); assertSafe(r, 'clm'); assert(r.liveClaimMutation === false, 'live'); return `${r.claimPipelinePreview.length} claims`; });
check('catalog item status safe (no mutation)', () => { const r = svc.getCatalogItemStatus({ id: 'prod_1' }); assertSafe(r, 'catItem'); assert(r.livePriceMutation === false && r.liveStockMutation === false, 'live'); return 'safe'; });
check('redactor masks shipment ref', () => { assert(red.maskShipmentRef('shp_3101') === 'ship_****', 'shipment'); return 'ok'; });
check('no full PII in v2 aggregate blob', () => {
  const blob = JSON.stringify({
    bv: svc.getBusinessVerificationPreview({}), pp: svc.createPriceProtectionPreview({ productId: 'prod_1' }),
    promo: svc.getPromotionEligibilityPreview({}), region: svc.getRegionStockPreview({}),
    cart: svc.createCartRiskPreview({ items: [{ productId: 'prod_1', qty: 60 }] }), qc: svc.createDealerQuoteComparisonPreview({ productId: 'prod_1' }),
    eta: svc.getDeliveryEtaRiskPreview({}), clm: svc.getClaimPipelinePreview({}), catItem: svc.getCatalogItemStatus({ id: 'prod_1' }),
  });
  assert(!red.hasLeak(blob), 'leak detected');
  return 'clean';
});

check('redactor masking examples', () => {
  assert(red.maskPhone('+923001234567') === '+92******4567', 'phone');
  assert(/^de\*+@example\.com$/.test(red.maskEmail('dealer@example.com')), 'email');
  assert(red.maskRef('ord_1001') === 'ord_****', 'order');
  assert(red.maskRef('inv_2001') === 'inv_****', 'invoice');
  assert(red.maskPaymentRef('x') === 'pay_****', 'payment');
  assert(red.maskCreditRef('x') === 'credit_****', 'credit');
  assert(red.maskTaxRef('x') === 'tax_****', 'tax');
  assert(red.maskDocumentRef('x') === 'doc_****', 'document');
  return 'ok';
});
check('no full PII in aggregate response blob', () => {
  const blob = JSON.stringify({
    status: svc.getDealerPortalStatus(), lookup: svc.lookupDealerPreview({}), summary: svc.getDealerSummaryPreview({}),
    profile: svc.getDealerProfilePreview({}), catalog: svc.getCatalogPreview({}), price: svc.getDealerPriceListPreview({}),
    invoices: svc.listInvoices({}), credit: svc.getCreditLimitPreview({}), documents: svc.listDocuments({}),
    bulk: svc.createBulkOrderDraftPreview({ items: [{ productId: 'prod_1', qty: 1 }] }), msg: svc.createMessageDraftPreview({ message: 'x' }), audit: svc.getAuditPreview(),
  });
  assert(!red.hasLeak(blob), 'leak detected');
  return 'clean';
});

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: results.length, results };
const dir = path.join(__dirname, '..', '..', 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'dealer_portal_smoke.json'), JSON.stringify(out, null, 2));
let md = `# Dealer Portal Smoke Test\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${results.length} passed**`;
md += failed ? ` — ${failed} FAILED\n\n` : ' — all passed\n\n';
md += '| # | Check | Result | Detail |\n|---|---|---|---|\n';
results.forEach((r, i) => { md += `| ${i + 1} | ${r.name} | ${r.pass ? 'PASS' : 'FAIL'} | ${String(r.detail).replace(/\|/g, '/').slice(0, 70)} |\n`; });
fs.writeFileSync(path.join(dir, 'dealer_portal_smoke.md'), md);
console.log(md);
process.exit(failed === 0 ? 0 : 1);
