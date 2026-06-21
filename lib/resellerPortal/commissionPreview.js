'use strict';
/** Commission PREVIEW from existing billing data if present; else estimates from referrals. No real payout. */
const path = require('path');
const resellers = require('./resellerRegistry');
const referrals = require('./referralTracker');
function tryRequire(rels) { for (const r of rels) { try { return require(path.resolve(process.cwd(), r)); } catch {} }
return null; }
const billing = tryRequire(['lib/saasBilling/index', 'src/modules/billing']);
function preview(resellerId, period) {
    const r = resellers.get(resellerId); if (!r) return { ok: false, errors: ['not_found'] };
    const refs = referrals.list(resellerId);
    const converted = refs.filter((x) => ['converted_preview', 'paid_confirmed_manual'].includes(x.status));
    let invoiceValue = converted.reduce((a, x) => a + (x.estimatedValue || 0), 0);
    let source = 'referral_estimate';
    if (billing && typeof billing.resellerInvoiceValue === 'function') { try { const v =
billing.resellerInvoiceValue(resellerId, period); if (v != null) { invoiceValue = v; source = 'saas_billing'; } } catch
{} }
    const rate = r.commissionRate || 0.2;
    return {
      resellerId, period: period || 'current', leads: refs.length, convertedTenants: converted.length,
      invoiceValue, commissionRate: rate, commissionAmountPreview: Math.round(invoiceValue * rate),
    payoutStatus: 'preview_only', source, warnings: source === 'referral_estimate' ? ['no_billing_data_using_estimates']
: [], dryRun: true,
    };
}
module.exports = { preview };
