// lib/vendorPortal/statusSummaryPreview.js — Aggregated, masked vendor summary. Resilient if a module is missing.
'use strict';
const store = require('./store');
const { safeResponse } = require('./vendorPortalModel');
const { redactVendor } = require('./redactor');

function safeCall(label, fn, fallback, warnings) {
  try { return fn(); } catch (e) { warnings.push(`module_not_available:${label}`); return fallback; }
}

function getVendorSummaryPreview(input = {}) {
  const warnings = [];
  const { vendor } = store.findVendorPreview(input);
  const r = redactVendor(vendor);

  const pos = safeCall('purchaseOrders', () => require('./purchaseOrderStatusPreview').listPurchaseOrders(input).purchaseOrdersPreview, [], warnings);
  const grns = safeCall('grns', () => require('./grnStatusPreview').listGrns(input).grnsPreview, [], warnings);
  const invoices = safeCall('invoices', () => require('./invoicePaymentStatusPreview').listInvoices(input).invoicesPreview, [], warnings);
  const payable = safeCall('payable', () => require('./outstandingPayablePreview').getOutstandingPayablePreview(input).outstandingPayablePreview, 0, warnings);
  const deliveries = safeCall('deliveries', () => require('./deliveryStatusPreview').listDeliveries(input).deliveriesPreview, [], warnings);
  const inspections = safeCall('inspections', () => require('./qualityInspectionPreview').listQualityInspections(input).qualityInspectionsPreview, [], warnings);
  const compliance = safeCall('compliance', () => require('./complianceDocumentPreview').listComplianceDocuments(input).complianceDocumentsPreview, [], warnings);
  const contracts = safeCall('contracts', () => require('./contractStatusPreview').listContracts(input).contractsPreview, [], warnings);
  const documents = safeCall('documents', () => require('./documentRequestPreview').listDocuments(input).documentsPreview, [], warnings);

  if (!vendor.phone && !vendor.email) warnings.push('missing_vendor_contact');
  warnings.push('pii_masked');

  return safeResponse({
    liveActionsEnabled: false,
    vendorPortalPublicLive: false,
    piiMasked: true,
    vendorNameSafe: r.vendorNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    tierSafe: 'tier_preview',
    accountStatusPreview: `${vendor.accountStatus || 'active'}_preview`,
    openPurchaseOrdersPreview: pos.filter((o) => o.statusPreview !== 'closed_preview').length,
    pendingGrnsPreview: grns.length,
    unpaidInvoicesPreview: invoices.filter((i) => i.paymentStatusPreview !== 'paid_preview').length,
    outstandingPayablePreview: payable,
    activeDeliveriesPreview: deliveries.length,
    pendingInspectionsPreview: inspections.length,
    expiringComplianceDocsPreview: compliance.filter((c) => c.statusPreview === 'expiring_preview').length,
    expiringContractsPreview: contracts.filter((c) => c.statusPreview === 'expiring_preview').length,
    pendingDocumentsPreview: documents.filter((d) => d.statusPreview === 'missing').length,
    warnings: [...new Set(warnings)],
  });
}
module.exports = { getVendorSummaryPreview };
