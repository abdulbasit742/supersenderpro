// lib/dealerPortal/statusSummaryPreview.js — Aggregated, masked dealer summary. Resilient if a module is missing.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { redactDealer } = require('./redactor');

function safeCall(label, fn, fallback, warnings) {
  try { return fn(); } catch (e) { warnings.push(`module_not_available:${label}`); return fallback; }
}

function getDealerSummaryPreview(input = {}) {
  const warnings = [];
  const { dealer } = store.findDealerPreview(input);
  const r = redactDealer(dealer);

  const orders = safeCall('orders', () => require('./orderStatusPreview').listOrders(input).ordersPreview, [], warnings);
  const invoices = safeCall('invoices', () => require('./invoicePaymentStatusPreview').listInvoices(input).invoicesPreview, [], warnings);
  const credit = safeCall('credit', () => require('./creditLimitPreview').getCreditLimitPreview(input), {}, warnings);
  const outstanding = safeCall('outstanding', () => require('./outstandingBalancePreview').getOutstandingBalancePreview(input).outstandingBalancePreview, 0, warnings);
  const deliveries = safeCall('deliveries', () => require('./deliveryStatusPreview').listDeliveries(input).deliveriesPreview, [], warnings);
  const returns = safeCall('returns', () => require('./returnClaimStatusPreview').listReturnsClaims(input).returnsClaimsPreview, [], warnings);
  const loyalty = safeCall('loyalty', () => require('./loyaltyStatusPreview').getLoyaltyStatusPreview(input).loyaltyPointsPreview, 0, warnings);
  const contracts = safeCall('contracts', () => require('./contractStatusPreview').listContracts(input).contractsPreview, [], warnings);
  const documents = safeCall('documents', () => require('./documentRequestPreview').listDocuments(input).documentsPreview, [], warnings);
  const catalog = safeCall('catalog', () => require('./catalogPreview').listCatalog(input).catalogPreview, [], warnings);
  const commission = safeCall('commission', () => require('./commissionMarginPreview').getCommissionMarginPreview(input), {}, warnings);
  const warranty = safeCall('warranty', () => require('./warrantyClaimStatusPreview').listWarrantyClaims(input).warrantyClaimsPreview, [], warnings);
  const risk = safeCall('risk', () => require('./riskScorePreview').getRiskScorePreview(input), {}, warnings);
  const target = safeCall('target', () => require('./targetAchievementPreview').getTargetAchievementPreview(input), {}, warnings);

  if (!dealer.phone && !dealer.email) warnings.push('missing_dealer_contact');
  warnings.push('pii_masked');

  return safeResponse({
    liveActionsEnabled: false,
    dealerPortalPublicLive: false,
    piiMasked: true,
    dealerNameSafe: r.dealerNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    tierSafe: 'tier_preview',
    tierPreview: `${String(dealer.tier || 'silver').toLowerCase()}_preview`,
    accountStatusPreview: `${dealer.accountStatus || 'active'}_preview`,
    catalogItemsPreview: catalog.length,
    availableStockItemsPreview: catalog.filter((c) => c.inStockPreview).length,
    draftOrdersPreview: 0,
    openOrdersPreview: orders.filter((o) => o.statusPreview !== 'delivered_preview').length,
    unpaidInvoicesPreview: invoices.filter((i) => i.paymentStatusPreview !== 'paid_preview').length,
    creditLimitPreview: credit.creditLimitPreview || 0,
    availableCreditPreview: credit.availableCreditPreview || 0,
    creditAvailablePreview: credit.availableCreditPreview || 0,
    creditHoldPreview: !!credit.creditHoldPreview,
    outstandingBalancePreview: outstanding,
    commissionPreview: commission.accruedPreview || 0,
    marginPreview: commission.marginPercentPreview || 0,
    pendingDeliveriesPreview: deliveries.length,
    activeDeliveriesPreview: deliveries.length,
    openReturnsPreview: returns.length,
    openClaimsPreview: returns.length + warranty.length,
    loyaltyPointsPreview: loyalty,
    expiringContractsPreview: contracts.filter((c) => c.statusPreview === 'expiring_preview').length,
    pendingDocumentsPreview: documents.filter((d) => d.statusPreview === 'missing').length,
    achievementPercentPreview: target.achievementPercentPreview || 0,
    riskLevelPreview: risk.riskLevelPreview || 'low',
    warnings: [...new Set(warnings)],
  });
}
module.exports = { getDealerSummaryPreview };
