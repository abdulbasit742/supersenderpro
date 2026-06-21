// lib/franchisePortal/statusSummaryPreview.js — Aggregated, masked franchise summary. Resilient if a module is missing.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { redactFranchise } = require('./redactor');

function safeCall(label, fn, fallback, warnings) {
  try { return fn(); } catch (e) { warnings.push(`module_not_available:${label}`); return fallback; }
}

function getFranchiseSummaryPreview(input = {}) {
  const warnings = [];
  const { franchise } = store.findFranchisePreview(input);
  const r = redactFranchise(franchise);

  const outlets = safeCall('outlets', () => require('./outletListPreview').listOutlets(input).outletsPreview, [], warnings);
  const sales = safeCall('sales', () => require('./salesSummaryPreview').getSalesSummaryPreview(input).totalSalesMtdPreview, 0, warnings);
  const royalty = safeCall('royalty', () => require('./royaltySummaryPreview').getRoyaltySummaryPreview(input), {}, warnings);
  const payable = safeCall('payable', () => require('./outstandingPayablePreview').getOutstandingPayablePreview(input).outstandingPayablePreview, 0, warnings);
  const orders = safeCall('orders', () => require('./orderStatusPreview').listOrders(input).ordersPreview, [], warnings);
  const compliance = safeCall('compliance', () => require('./complianceChecklistPreview').getComplianceChecklistPreview(input).complianceChecklistPreview, [], warnings);
  const fund = safeCall('fund', () => require('./marketingFundPreview').getMarketingFundPreview(input).fundBalancePreview, 0, warnings);
  const contracts = safeCall('contracts', () => require('./contractStatusPreview').listContracts(input).contractsPreview, [], warnings);
  const documents = safeCall('documents', () => require('./documentRequestPreview').listDocuments(input).documentsPreview, [], warnings);

  if (!franchise.phone && !franchise.email) warnings.push('missing_franchise_contact');
  warnings.push('pii_masked');

  return safeResponse({
    liveActionsEnabled: false,
    franchisePortalPublicLive: false,
    piiMasked: true,
    franchiseNameSafe: r.franchiseNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    tierSafe: 'tier_preview',
    agreementStatusPreview: `${franchise.agreementStatus || 'active'}_preview`,
    totalOutletsPreview: outlets.length,
    activeOutletsPreview: outlets.filter((o) => o.statusPreview === 'active_preview').length,
    totalSalesMtdPreview: sales,
    royaltyStatusPreview: royalty.royaltyStatusPreview || 'pending_preview',
    outstandingPayablePreview: payable,
    openOrdersPreview: orders.filter((o) => o.statusPreview !== 'delivered_preview').length,
    pendingCompliancePreview: compliance.filter((c) => c.statusPreview === 'pending_preview').length,
    marketingFundBalancePreview: fund,
    expiringContractsPreview: contracts.filter((c) => c.statusPreview === 'expiring_preview').length,
    pendingDocumentsPreview: documents.filter((d) => d.statusPreview === 'missing').length,
    warnings: [...new Set(warnings)],
  });
}
module.exports = { getFranchiseSummaryPreview };
