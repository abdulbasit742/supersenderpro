// lib/paymentFulfillment/fulfillmentEngine.js — The core bridge. Given a normalized,
// VERIFIED payment, it: (1) resolves/marks the invoice paid, (2) activates or renews the
// tenant license, (3) issues a receipt, (4) schedules renewal + dunning reminders. Idempotent.
//
// SAFETY: shared billing/license state is mutated ONLY when config.effective.liveFulfillment
// is true AND the payment is verified. Otherwise a 'planned' record is produced describing
// exactly what would happen — nothing in the shared saasBilling stores is touched.

const { config } = require('./config');
const store = require('./store');
const idempotency = require('./idempotency');
const receiptBuilder = require('./receiptBuilder');
const reminderScheduler = require('./reminderScheduler');

let saas = null; try { saas = require('../saasBilling'); } catch (_e) { saas = null; }

function resolvePlan(planId) {
 if (!saas || !planId) return null;
 try { return saas.planRegistry.getPlan(planId); } catch (_e) { return null; }
}

function resolveInvoice({ invoiceId, tenantId, planId }) {
 if (!saas) return { invoice: null };
 try {
 if (invoiceId) { const inv = saas.invoiceStore.getById(invoiceId); if (inv) return { invoice: inv }; }
 const open = saas.invoiceStore.forTenant(saas.tenantPlans.normalizeTenantId(tenantId))
 .filter((i) => ['draft', 'issued', 'overdue'].includes(i.status))
 .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
 if (open.length) return { invoice: open[0] };
 if (config.effective.liveFulfillment && planId) {
 const draft = saas.invoiceBuilder.createDraft({ tenantId, planId });
 saas.invoiceBuilder.issue(draft.id);
 return { invoice: draft, created: true };
 }
 return { invoice: null };
 } catch (_e) { return { invoice: null }; }
}

async function fulfill(input = {}) {
 const {
 gateway = 'unknown', eventId = null, paymentReference = null,
 tenantId = 'default', planId = null, invoiceId = null,
 amount = null, currency = null, customer = {}, verified = false,
 } = input;

 const k = idempotency.key(gateway, eventId, paymentReference);
 if (idempotency.seen(k)) {
 const prior = idempotency.getRecord(k);
 return { ok: true, idempotent: true, fulfillmentId: (prior && prior.fulfillmentId) || null, status: 'already_processed', key: k };
 }

 const plan = resolvePlan(planId);
 const tid = saas ? saas.tenantPlans.normalizeTenantId(tenantId) : String(tenantId || 'default');
 const live = config.effective.liveFulfillment && verified;
 const actions = [];
 let invoiceResult = null;
 let licenseResult = null;

 // 1. Invoice → paid
 const { invoice } = resolveInvoice({ invoiceId, tenantId: tid, planId });
 if (invoice) {
 if (live && saas) {
 try {
 const r = saas.invoiceBuilder.markPaidForReview(invoice.id, { paymentReference: paymentReference || '', verifierConfirmed: true });
 invoiceResult = { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, status: r.invoice.status, autoVerified: r.autoVerified, manualReviewRequired: r.manualReviewRequired };
 actions.push(r.autoVerified ? 'invoice_marked_paid' : 'invoice_pending_manual_review');
 } catch (e) { actions.push('invoice_error:' + e.message); }
 } else {
 invoiceResult = { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, status: invoice.status, planned: true };
 actions.push('plan_mark_invoice_paid');
 }
 } else {
 invoiceResult = { invoiceId: null, planned: true, note: 'no open invoice; a draft would be created + issued on live fulfillment' };
 actions.push('plan_create_invoice');
 }

 // 2. License → active / renewed
 if (live && saas) {
 try {
 const existing = saas.licenseEngine.getLicense(tid);
 let view = null;
 if (existing && planId && existing.planId === planId) { view = saas.licenseEngine.renewLicense(tid); actions.push('license_renewed'); }
 else if (planId) { view = saas.licenseEngine.issueLicense(tid, planId, { startTrial: false }); actions.push('license_issued'); }
 else if (existing) { view = saas.licenseEngine.renewLicense(tid); actions.push('license_renewed'); }
 licenseResult = view ? { tenantId: view.tenantId, planId: view.planId, status: view.status, expiresAt: view.expiresAt, renewalDueAt: view.renewalDueAt } : null;
 } catch (e) { actions.push('license_error:' + e.message); }
 } else {
 licenseResult = { planned: true, planId, note: 'license would be issued/renewed on live fulfillment' };
 actions.push('plan_activate_license');
 }

 // 3. Receipt
 const receipt = receiptBuilder.buildReceipt({
 tenantId: tid, planId, plan,
 amount: amount !== null && amount !== undefined ? amount : (plan ? plan.price : null),
 currency: currency || (plan ? plan.currency : null),
 paymentReference, gateway,
 invoiceNumber: invoice ? invoice.invoiceNumber : null,
 customer,
 });
 const receiptSend = await receiptBuilder.sendReceipt(receipt, { to: customer.phone || customer.email || null });
 actions.push(receiptSend.sent ? 'receipt_sent' : 'receipt_drafted');

 // 4. Reminders (scheduled off the live license expiry when available)
 let reminders = [];
 try {
 const licForReminders = (live && saas) ? saas.licenseEngine.getLicense(tid) : null;
 reminders = reminderScheduler.schedule(licForReminders, { tenantId: tid, planId, plan });
 actions.push('reminders_scheduled:' + reminders.length);
 } catch (e) { actions.push('reminders_error:' + e.message); }

 // 5. Persist + idempotency
 const record = {
 id: store.genId('ful'),
 key: k, gateway, eventId,
 paymentReferenceMasked: receiptBuilder.maskRef(paymentReference),
 tenantId: tid, planId,
 amount: amount !== null && amount !== undefined ? amount : (plan ? plan.price : null),
 currency: currency || (plan ? plan.currency : null),
 verified, live,
 status: live ? 'fulfilled' : 'planned',
 actions, invoice: invoiceResult, license: licenseResult,
 receiptId: receipt.id,
 dryRun: config.dryRun,
 createdAt: store.nowIso(),
 };
 const d = store.load(); d.fulfillments.push(record); store.save(d);
 idempotency.mark(k, { fulfillmentId: record.id });

 return {
 ok: true, idempotent: false, fulfillmentId: record.id, status: record.status,
 live, actions, invoice: invoiceResult, license: licenseResult,
 receipt: { id: receipt.id, sent: receiptSend.sent, preview: receiptSend.preview || receipt.text },
 reminders: reminders.length, dryRun: config.dryRun,
 };
}

function list(limit = 100) { return store.load().fulfillments.slice(-limit).reverse(); }

module.exports = { fulfill, list, resolvePlan };
