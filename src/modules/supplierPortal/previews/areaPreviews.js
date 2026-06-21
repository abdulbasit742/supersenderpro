 // src/modules/supplierPortal/previews/areaPreviews.js
 // Read-only, dry-run previews per supplier status area.
 const path = require('path');
 const { redactor } = require('../redactor');

 function safeRequire(rel) {
   try { return require(path.join(process.cwd(), rel)); } catch (_e) { return null; }
 }


 // Fault-tolerant adapters. Never throw, never mutate.
 const moduleLinker = {
      supplierPlanner: () => safeRequire('src/modules/procurement/supplierPlanner.js'),
      payablesCenter: () => safeRequire('src/modules/payables/payablesCenter.js'),
      qualityCenter: () => safeRequire('src/modules/quality/qualityCenter.js'),
      contractCenter: () => safeRequire('src/modules/contracts/contractCenter.js'),
      documentVault: () => safeRequire('src/modules/documents/documentVault.js'),
 };

 const SAFE = { dryRun: true, liveActionsEnabled: false, supplierPortalPublicLive: false };


 function shell(area, extra) {
      return Object.assign({ area, ok: true, generatedAt: new Date().toISOString() }, SAFE, extra || {});
 }


 function rfqStatusPreview(supplier) {
      const m = moduleLinker.supplierPlanner();
      let items = [];
      try { items = (m && m.listRfqsForSupplier ? m.listRfqsForSupplier(supplier.id) : []) || []; } catch (_e) { items = [];
 }
      return shell('rfq', {
        liveQuoteMutation: false,
        count: items.length,
        items: items.slice(0, 25).map((r) => ({ ref: redactor.maskRef(r.ref), title: r.title, status: r.status, dueDate:
 r.dueDate })),
     attention: items.filter((r) => r.status === 'awaiting_quote').length,
      });
 }


 function quoteStatusPreview(supplier) {
      const m = moduleLinker.supplierPlanner();
      let items = [];
   try { items = (m && m.listQuotesForSupplier ? m.listQuotesForSupplier(supplier.id) : []) || []; } catch (_e) { items =
 []; }
      return shell('quote', {

    liveQuoteMutation: false,
    count: items.length,
    items: items.slice(0, 25).map((q) => ({ ref: redactor.maskRef(q.ref), amount: q.amount, currency: q.currency, status:
q.status })),
});
}


function purchaseOrderStatusPreview(supplier) {
const m = moduleLinker.supplierPlanner();
  let items = [];
  try { items = (m && m.listPurchaseOrders ? m.listPurchaseOrders(supplier.id) : []) || []; } catch (_e) { items = []; }
  return shell('purchase_order', {
    liveAcceptAction: false,
    count: items.length,
    items: items.slice(0, 25).map((p) => ({ ref: redactor.maskRef(p.poNumber), status: p.status, total: p.total,
currency: p.currency })),
});
}


function billPaymentStatusPreview(supplier) {
const m = moduleLinker.payablesCenter();
  let items = [];
  try { items = (m && m.listBillsForSupplier ? m.listBillsForSupplier(supplier.id) : []) || []; } catch (_e) { items =
[]; }
return shell('bill_payment', {
    livePaymentAction: false,
    count: items.length,
    items: items.slice(0, 25).map((b) => ({
      ref: redactor.maskRef(b.invoiceRef),
        amount: b.amount,
        currency: b.currency,
        status: b.status,
        bank: redactor.maskBank(b.bankAccount),
      tax: redactor.maskTax(b.taxId),
    })),
  });
}


function deliveryStatusPreview(supplier) {
  const m = moduleLinker.supplierPlanner();
  let items = [];
  try { items = (m && m.listDeliveries ? m.listDeliveries(supplier.id) : []) || []; } catch (_e) { items = []; }
  return shell('delivery', {
    liveConfirmAction: false,
    count: items.length,
    items: items.slice(0, 25).map((d) => ({ ref: redactor.maskRef(d.ref), eta: d.eta, status: d.status })),
  });
}

function qualityScorePreview(supplier) {
const m = moduleLinker.qualityCenter();
  let score = null;
  try { score = m && m.getSupplierScore ? m.getSupplierScore(supplier.id) : null; } catch (_e) { score = null; }
  return shell('quality_score', {
    score: score ? { rating: score.rating, defectRate: score.defectRate, onTimeRate: score.onTimeRate } : null,
  });
}

function contractStatusPreview(supplier) {
const m = moduleLinker.contractCenter();
   let items = [];
   try { items = (m && m.listContracts ? m.listContracts(supplier.id) : []) || []; } catch (_e) { items = []; }
   return shell('contract', {
     count: items.length,
  items: items.slice(0, 25).map((c) => ({ ref: redactor.maskRef(c.ref), title: c.title, status: c.status, expiresAt:
c.expiresAt })),
   });
}


function documentRequestPreview(supplier) {
   const m = moduleLinker.documentVault();
   let items = [];
try { items = (m && m.listSupplierDocuments ? m.listSupplierDocuments(supplier.id) : []) || []; } catch (_e) { items =
[]; }
   return shell('document_request', {
     liveDocumentDownload: false,
     count: items.length,
     items: items.slice(0, 25).map((d) => ({ ref: redactor.maskRef(d.ref), name: d.name, status: d.status })),
   });
}

module.exports = {
   moduleLinker,
   rfqStatusPreview,
   quoteStatusPreview,
   purchaseOrderStatusPreview,
   billPaymentStatusPreview,
   deliveryStatusPreview,
   qualityScorePreview,
   contractStatusPreview,
   documentRequestPreview,
};
