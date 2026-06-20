// lib/saasBilling/invoiceBuilder.js — Build invoice DRAFTS. Never captures payments,
// never auto-marks paid. "Mark paid" only moves an invoice to a review state unless an
// existing verifier confirms AND auto-verify is explicitly enabled.

const { config } = require('./config');
const store = require('./store');
const invoiceStore = require('./invoiceStore');
const planRegistry = require('./planRegistry');
const tenantPlans = require('./tenantPlans');
const safetyGuard = require('./safetyGuard');
const { maskReference } = require('./privacy');

const STATUSES = ['draft', 'issued', 'paid', 'overdue', 'cancelled', 'refunded'];

function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + Number(days || 0)); return d.toISOString(); }

// Create a draft invoice for a tenant's plan (or custom line items).
function createDraft({ tenantId, planId, lineItems, dueInDays = 7, notes = '', paymentMethod = 'manual_review' } = {}) {
  const tid = tenantPlans.normalizeTenantId(tenantId);
  const plan = planId ? planRegistry.getPlan(planId) : tenantPlans.getTenantPlan(tid);
  const items = Array.isArray(lineItems) && lineItems.length
    ? lineItems.map((li) => ({ description: String(li.description || 'Item'), qty: Number(li.qty || 1), unitPrice: Number(li.unitPrice || 0), amount: Number(li.qty || 1) * Number(li.unitPrice || 0) }))
    : [{ description: `${plan ? plan.name : 'Plan'} subscription`, qty: 1, unitPrice: plan ? plan.price : 0, amount: plan ? plan.price : 0 }];
  const amount = items.reduce((s, li) => s + li.amount, 0);
  const now = store.nowIso();

  const invoice = {
    id: store.genId('inv'),
    tenantId: tid,
    planId: plan ? plan.id : (planId || null),
    invoiceNumber: invoiceStore.nextInvoiceNumber(),
    amount,
    currency: plan ? plan.currency : config.defaultCurrency,
    status: 'draft',
    billingCycle: plan ? plan.billingCycle : 'monthly',
    dueAt: addDays(now, dueInDays),
    paidAt: null,
    lineItems: items,
    paymentMethod,
    paymentReferenceMasked: '',     // never store full refs
    notes,
    createdAt: now,
  };
  invoiceStore.upsert(invoice);
  return invoice;
}

function issue(id) {
  const inv = invoiceStore.getById(id);
  if (!inv) throw new Error('invoice not found');
  if (inv.status === 'draft') inv.status = 'issued';
  invoiceStore.upsert(inv);
  return inv;
}

// Mark for review — does NOT mark paid unless verifier confirms + auto-verify enabled.
function markPaidForReview(id, { paymentReference = '', verifierConfirmed = false } = {}) {
  const inv = invoiceStore.getById(id);
  if (!inv) throw new Error('invoice not found');
  inv.paymentReferenceMasked = maskReference(paymentReference);
  const canAuto = safetyGuard.canAutoVerifyPayment() && verifierConfirmed;
  if (canAuto) {
    inv.status = 'paid';
    inv.paidAt = store.nowIso();
    inv.notes = `${inv.notes || ''} [auto-verified via existing verifier]`.trim();
  } else {
    inv.status = 'issued';
    inv.reviewState = 'pending_manual_review';
    inv.notes = `${inv.notes || ''} [payment submitted ${store.nowIso()} — pending manual review]`.trim();
  }
  invoiceStore.upsert(inv);
  return { invoice: inv, autoVerified: canAuto, manualReviewRequired: !canAuto };
}

function cancel(id, reason = '') {
  const inv = invoiceStore.getById(id);
  if (!inv) throw new Error('invoice not found');
  inv.status = 'cancelled';
  inv.notes = `${inv.notes || ''} [cancelled ${store.nowIso()}${reason ? ': ' + reason : ''}]`.trim();
  invoiceStore.upsert(inv);
  return inv;
}

// Recompute overdue flags (read-only sweep used by reports/renewal engine).
function markOverdueSweep(refNow = Date.now()) {
  const changed = [];
  for (const inv of invoiceStore.all()) {
    if (['issued'].includes(inv.status) && inv.dueAt && Date.parse(inv.dueAt) < refNow) {
      inv.status = 'overdue';
      invoiceStore.upsert(inv);
      changed.push(inv.id);
    }
  }
  return changed;
}

module.exports = { STATUSES, createDraft, issue, markPaidForReview, cancel, markOverdueSweep };
