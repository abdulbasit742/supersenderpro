// lib/saasBilling/commissionTracker.js — Track per-invoice commissions for resellers.
// Records DRAFT commission entries. Never processes real payouts.

const store = require('./store');
const resellerStore = require('./resellerStore');

// Create a commission record from an invoice + reseller (status starts unpaid).
function recordForInvoice({ resellerId, invoiceId, amount, rate }) {
  const reseller = resellerStore.getReseller(resellerId);
  const effectiveRate = rate !== undefined ? Number(rate) : (reseller ? Number(reseller.commissionRate || 0) : 0);
  const commission = {
    id: store.genId('com'),
    resellerId,
    invoiceId,
    invoiceAmount: Number(amount || 0),
    commissionRate: effectiveRate,
    commissionAmount: Math.round(Number(amount || 0) * effectiveRate * 100) / 100,
    payoutStatus: 'unpaid',
    createdAt: store.nowIso(),
  };
  return resellerStore.addCommission(commission);
}

function summary(resellerId) {
  const list = resellerStore.commissionsFor(resellerId);
  const unpaid = list.filter((c) => c.payoutStatus === 'unpaid');
  return {
    resellerId,
    totalCommissions: list.length,
    totalCommissionAmount: list.reduce((s, c) => s + c.commissionAmount, 0),
    unpaidCount: unpaid.length,
    unpaidAmount: unpaid.reduce((s, c) => s + c.commissionAmount, 0),
    commissions: list,
  };
}

module.exports = { recordForInvoice, summary };
