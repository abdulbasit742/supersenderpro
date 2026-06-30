// lib/paymentFulfillment/checkoutOrchestrator.js — One call to start a checkout that the
// webhook can later fulfill: it issues an invoice draft, embeds tenantId/planId/invoiceId in
// the gateway metadata, and returns the gateway checkout URL. The metadata is what lets the
// webhook fulfill the exact invoice for the exact tenant.

let saas = null; try { saas = require('../saasBilling'); } catch (_e) { saas = null; }
let gw = null; try { gw = require('../paymentGateway'); } catch (_e) { gw = null; }

async function startCheckout({ tenantId = 'default', planId, customer = {}, gateway, successUrl, cancelUrl } = {}) {
 if (!planId) throw new Error('planId is required');
 if (!saas) throw new Error('saasBilling layer not available');
 if (!gw) throw new Error('payment gateway not available');

 const plan = saas.planRegistry.getPlan(planId);
 if (!plan) throw new Error('unknown planId: ' + planId);
 const tid = saas.tenantPlans.normalizeTenantId(tenantId);

 // Issue an invoice draft so the webhook fulfills the exact invoice.
 const invoice = saas.invoiceBuilder.createDraft({ tenantId: tid, planId });
 saas.invoiceBuilder.issue(invoice.id);

 const result = await gw.createCheckout({
 gateway,
 planId, planName: plan.name, amount: plan.price, currency: plan.currency,
 customerEmail: customer.email || '', customerPhone: customer.phone || '',
 successUrl, cancelUrl,
 metadata: { tenantId: tid, planId, invoiceId: invoice.id, customerEmail: customer.email || '', customerPhone: customer.phone || '' },
 });

 return {
 ok: true,
 invoice: { id: invoice.id, invoiceNumber: invoice.invoiceNumber, amount: invoice.amount, currency: invoice.currency, status: invoice.status },
 checkout: result,
 };
}

module.exports = { startCheckout };
