// lib/paymentFulfillment/webhookHandlers.js — Normalize gateway payloads into a single
// fulfillment input. Stripe signature verification happens in the route (via lib/paymentGateway)
// before handleStripe() is called, so verified:true here means cryptographically verified.

const fulfillmentEngine = require('./fulfillmentEngine');

const FULFILLABLE_STRIPE_TYPES = ['checkout.session.completed', 'invoice.payment_succeeded', 'invoice.paid'];

function fromStripeEvent(event) {
 const obj = (event && event.data && event.data.object) || {};
 const md = obj.metadata || {};
 const customer = {
 email: (obj.customer_details && obj.customer_details.email) || obj.customer_email || md.customerEmail || null,
 phone: (obj.customer_details && obj.customer_details.phone) || md.customerPhone || null,
 name: (obj.customer_details && obj.customer_details.name) || md.customerName || null,
 };
 const amount = (obj.amount_total !== undefined && obj.amount_total !== null)
 ? Number(obj.amount_total) / 100
 : (md.amount !== undefined ? Number(md.amount) : null);
 return {
 gateway: 'stripe',
 eventId: (event && event.id) || obj.id || null,
 paymentReference: obj.payment_intent || obj.id || null,
 tenantId: md.tenantId || md.tenant || 'default',
 planId: md.planId || md.plan || null,
 invoiceId: md.invoiceId || null,
 amount,
 currency: obj.currency ? String(obj.currency).toUpperCase() : (md.currency || null),
 customer,
 verified: true,
 };
}

async function handleStripe(event) {
 if (!event || !FULFILLABLE_STRIPE_TYPES.includes(event.type)) {
 return { ok: true, ignored: true, type: (event && event.type) || null };
 }
 return fulfillmentEngine.fulfill(fromStripeEvent(event));
}

// Local PKR rails (JazzCash/EasyPaisa/bank) have no signature — an admin/verifier confirms.
async function handleLocal(body = {}) {
 return fulfillmentEngine.fulfill({
 gateway: 'local',
 eventId: body.eventId || null,
 paymentReference: body.paymentReference || body.ref || null,
 tenantId: body.tenantId || 'default',
 planId: body.planId || null,
 invoiceId: body.invoiceId || null,
 amount: (body.amount !== undefined && body.amount !== null) ? Number(body.amount) : null,
 currency: body.currency || null,
 customer: body.customer || { phone: body.phone || null, email: body.email || null },
 verified: !!(body.verifierConfirmed || body.verified),
 });
}

module.exports = { handleStripe, handleLocal, fromStripeEvent, FULFILLABLE_STRIPE_TYPES };
