'use strict';

/**
 * Ecommerce Hub — self-test / ship-readiness check.
 * Requires every hub module + reports which load cleanly, plus a checklist of
 * the env flags needed to go live. Pure introspection; sends nothing, writes
 * nothing. Hit /api/ecommerce-hub/selftest before flipping anything live.
 */

const MODULES = [
  'connectorBase', 'registry', 'productStore', 'waCommands', 'adminCommands',
  'orderNotify', 'codStore', 'tracking', 'trackingStore',
  'abandonedCart', 'orderStatus', 'reviews', 'alerts', 'coupons', 'broadcast', 'reorder', 'optOutStore',
  'i18n', 'loyalty', 'faq', 'analytics',
  'courierRouter', 'exporter', 'segments', 'scheduler', 'catalogCards',
  'liveAgent', 'orderSearch', 'wishlist', 'priceWatch', 'bundles', 'riskScore',
  'invoice', 'nps', 'referral', 'backInStock', 'dripCampaign', 'codOtp', 'stores', 'jobsRunner',
  'currencyRates', 'tax', 'packingSlip', 'returns', 'giftOptions', 'stockHold', 'crmNotes', 'orderTimeline', 'flashSale', 'outboundWebhooks',
  'unifiedInventory', 'clv', 'subscriptions', 'deliverySlots', 'geoFees', 'bulkImport', 'supportTickets', 'loyaltyTiers', 'salesReport', 'conversionStats', 'quickReplies', 'orderEdit',
  'catalogSearch', 'recommendations', 'waitlist', 'orderNotesStore', 'deliveryEta', 'paymentLinks', 'storeHours', 'blacklist', 'stockSyncAlerts', 'topSellers', 'birthdays', 'browseAbandon', 'qrDeepLink',
  'aiReply', 'addressBook', 'reorderPoint', 'invoiceNumber', 'agentRouting', 'returnsAnalytics', 'cartResume', 'deliveryProof', 'refundTracker', 'priorityQueue', 'bundlePricing', 'escalation', 'sentiment', 'checkoutLink', 'repeatBuyer', 'kpiAlert'
];

function run() {
  const ok = [];
  const failed = [];
  MODULES.forEach(function (m) {
    try { require('./' + m); ok.push(m); }
    catch (e) { failed.push({ module: m, error: e && e.message }); }
  });

  const flags = [
    { key: 'ECOMMERCE_HUB_DRY_RUN', purpose: 'Master safety. Keep true until ready; false enables live platform reads.' },
    { key: 'ECOMMERCE_HUB_ADMIN_WRITE', purpose: 'Enable WhatsApp admin write commands (stock/price/track).' },
    { key: 'ORDER_NOTIFY_ENABLED', purpose: 'Enable any outbound WhatsApp send (notifications, COD, etc.).' },
    { key: 'ORDER_NOTIFY_ADMIN_NUMBERS', purpose: 'Your admin number(s) for order alerts + admin commands.' },
    { key: 'DARAZ_LIVE / SHOPIFY_LIVE / WOO_LIVE ...', purpose: 'Per-platform live switch + that platform\'s keys.' }
  ];

  return {
    ok: failed.length === 0,
    totalModules: MODULES.length,
    loaded: ok.length,
    failedCount: failed.length,
    failed: failed,
    requiredFlagsToGoLive: flags,
    note: failed.length === 0
      ? 'All hub modules load cleanly. Hub is ship-ready (still dry-run until you flip flags).'
      : 'Some modules failed to load; see failed[]. Fix before going live.'
  };
}

module.exports = { run, MODULES };
