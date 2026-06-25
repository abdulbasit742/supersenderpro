// lib/paymentGateway/index.js
// Real payment gateway — Stripe (international) + Local PKR (JazzCash/EasyPaisa)
// Sandbox ON by default until live keys are set

const crypto = require("crypto");

const GATEWAY = (process.env.PAYMENT_GATEWAY || "local").toLowerCase();
const SANDBOX = !["0","false","no"].includes(String(process.env.PAYMENT_SANDBOX || "1").toLowerCase());

function stripeKey() {
  return SANDBOX ? (process.env.STRIPE_TEST_SECRET_KEY||"") : (process.env.STRIPE_LIVE_SECRET_KEY||"");
}

async function stripeCreateCheckout({ planId, planName, amount, currency, customerEmail, successUrl, cancelUrl, metadata = {} }) {
  const key = stripeKey();
  if (!key) throw new Error("Stripe key not configured. Set STRIPE_TEST_SECRET_KEY or STRIPE_LIVE_SECRET_KEY in .env");
  const params = new URLSearchParams({
    "payment_method_types[]": "card",
    "line_items[0][price_data][currency]": (currency||"pkr").toLowerCase(),
    "line_items[0][price_data][product_data][name]": planName,
    "line_items[0][price_data][unit_amount]": String(Math.round(Number(amount)*100)),
    "line_items[0][quantity]": "1",
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: customerEmail||"",
  });
  Object.entries(metadata).forEach(([k,v]) => params.append(`metadata[${k}]`, String(v)));
  const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method:"POST",
    headers:{ Authorization:`Bearer ${key}`, "Content-Type":"application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json?.error?.message || "Stripe checkout failed");
  return { checkoutUrl: json.url, sessionId: json.id, gateway:"stripe", sandbox:SANDBOX };
}

function stripeVerifyWebhook(rawBody, signature) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET||"";
  if (!secret) return { verified:false, reason:"No STRIPE_WEBHOOK_SECRET" };
  try {
    const parts = String(signature).split(",");
    const ts = parts.find(p=>p.startsWith("t="))?.slice(2);
    const v1 = parts.find(p=>p.startsWith("v1="))?.slice(3);
    const expected = crypto.createHmac("sha256",secret).update(`${ts}.${rawBody}`).digest("hex");
    return expected===v1 ? {verified:true} : {verified:false,reason:"Mismatch"};
  } catch(e){ return {verified:false,reason:e.message}; }
}

function localGatewayCheckout({ planId, planName, amount, customerPhone }) {
  const ref = `SSP-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
  const base = process.env.PUBLIC_BASE_URL||"http://localhost:3001";
  return {
    checkoutUrl: `${base}/payment-instructions.html?ref=${encodeURIComponent(ref)}&plan=${encodeURIComponent(planId)}&amount=${encodeURIComponent(amount)}&name=${encodeURIComponent(planName)}&phone=${encodeURIComponent(customerPhone||"")}`,
    paymentRef: ref,
    gateway: "local",
    instructions: {
      jazzcash: process.env.JAZZCASH_NUMBER||process.env.JAZZCASH_MERCHANT_NUMBER||"",
      easypaisa: process.env.EASYPAISA_NUMBER||process.env.EASYPAISA_MERCHANT_NUMBER||"",
      bank: process.env.BANK_ACCOUNT||process.env.BANK_ACCOUNT_NUMBER||"",
      bankName: process.env.BANK_NAME||"Bank Transfer",
    },
  };
}

async function createCheckout(opts) {
  const gw = (opts.gateway||GATEWAY).toLowerCase();
  if (gw==="stripe") return stripeCreateCheckout(opts);
  return localGatewayCheckout(opts);
}

function verifyWebhook(gateway, rawBody, headers) {
  if (gateway==="stripe") return stripeVerifyWebhook(rawBody, headers["stripe-signature"]||"");
  return { verified:false, reason:"Gateway not supported" };
}

function getStatus() {
  return {
    gateway:GATEWAY, sandbox:SANDBOX,
    stripe:{ configured:!!stripeKey(), sandbox:SANDBOX },
    local:{ configured:!!(process.env.JAZZCASH_NUMBER||process.env.EASYPAISA_NUMBER||process.env.JAZZCASH_MERCHANT_NUMBER) },
    supportedCurrencies:["PKR","USD","EUR","GBP"],
  };
}

module.exports = { createCheckout, verifyWebhook, getStatus, GATEWAY, SANDBOX };
