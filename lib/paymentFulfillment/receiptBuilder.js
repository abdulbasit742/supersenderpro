// lib/paymentFulfillment/receiptBuilder.js — Build + (optionally) send payment receipts.
// Receipt text never contains a full payment reference. Sending is draft-only unless live
// notifications are enabled and a notifier is wired (see notify.js).

const store = require('./store');
const notify = require('./notify');

function maskRef(ref) {
 if (!ref) return '';
 const s = String(ref);
 if (s.length <= 4) return '****';
 return s.slice(0, 2) + '****' + s.slice(-2);
}
function fmtMoney(amount, currency) {
 if (amount === null || amount === undefined) return 'N/A';
 return `${currency || ''} ${Number(amount).toLocaleString()}`.trim();
}

function buildReceipt({ tenantId, planId, plan, amount, currency, paymentReference, gateway, invoiceNumber, customer = {} } = {}) {
 const now = store.nowIso();
 const text = [
 'Payment received — SuperSender Pro',
 invoiceNumber ? `Invoice: ${invoiceNumber}` : null,
 plan ? `Plan: ${plan.name}` : (planId ? `Plan: ${planId}` : null),
 `Amount: ${fmtMoney(amount, currency)}`,
 `Method: ${gateway}`,
 paymentReference ? `Ref: ${maskRef(paymentReference)}` : null,
 `Date: ${now}`,
 'Thank you — your subscription is now active.',
 ].filter(Boolean).join('\n');

 const receipt = {
 id: store.genId('rcpt'),
 tenantId, planId: planId || null,
 invoiceNumber: invoiceNumber || null,
 amount: (amount === null || amount === undefined) ? null : Number(amount),
 currency: currency || null,
 gateway: gateway || 'unknown',
 paymentReferenceMasked: maskRef(paymentReference),
 to: notify.mask(customer.phone || customer.email || null),
 text,
 sent: false,
 createdAt: now,
 };
 const d = store.load(); d.receipts.push(receipt); store.save(d);
 return receipt;
}

async function sendReceipt(receipt, { to } = {}) {
 const res = await notify.dispatch(to || null, receipt.text, { kind: 'receipt' });
 if (res.sent) {
 const d = store.load();
 const r = d.receipts.find((x) => x.id === receipt.id);
 if (r) { r.sent = true; r.sentAt = store.nowIso(); store.save(d); }
 }
 return res;
}

function listForTenant(tenantId) { return store.load().receipts.filter((r) => String(r.tenantId) === String(tenantId)); }

module.exports = { buildReceipt, sendReceipt, listForTenant, maskRef };
