// lib/publicSaasFunnel/adapters/saasBillingAdapter.js
// Safe read of the existing SaaS Billing plan registry. Draft-only requests.
// Never captures payment. Never activates a license. Never creates a live subscription.

const { config } = require('../store');

let billing = null;
try { billing = require('../../subscriptionPlans'); } catch { billing = null; }

const present = !!(billing && typeof billing.getPlans === 'function');

// Safe fallback plan catalogue used when SaaS Billing is unavailable.
const FALLBACK_PLANS = [
  { id: 'free_trial', name: 'Free Trial', price: 0, cycle: '14 days', bestFor: 'Trying SuperSender Pro', highlights: ['Core WhatsApp tools', 'Limited messages', 'No card required'], limits: 'Trial limits', trial: true },
  { id: 'starter', name: 'Starter', price: 0, cycle: 'monthly', bestFor: 'Solo owners & local shops', highlights: ['Basic WhatsApp', 'Lead capture'], limits: '~100 contacts', trial: true },
  { id: 'growth', name: 'Growth', price: 2000, cycle: 'monthly', bestFor: 'Growing stores', highlights: ['AI replies', 'Auto-post drafts', 'Customer 360'], limits: '~5,000 contacts', trial: true },
  { id: 'pro', name: 'Pro', price: 5000, cycle: 'monthly', bestFor: 'Busy teams', highlights: ['Custom agents', 'Voice AI', 'KPI Command'], limits: 'High limits', trial: true },
  { id: 'agency', name: 'Agency', price: 12000, cycle: 'monthly', bestFor: 'Agencies & multi-client', highlights: ['Multi-tenant', 'Playbooks', 'Owner Command'], limits: 'Multiple clients', trial: false },
  { id: 'reseller', name: 'Reseller', price: 0, cycle: 'custom', bestFor: 'Reselling SuperSender Pro', highlights: ['White-label options', 'Reseller network'], limits: 'Custom', trial: false },
  { id: 'enterprise', name: 'Enterprise', price: 0, cycle: 'custom', bestFor: 'Large orgs', highlights: ['SLA', 'Dedicated support', 'Compliance'], limits: 'Custom', trial: false },
  { id: 'lifetime', name: 'Lifetime', price: 0, cycle: 'one-time', bestFor: 'Early adopters', highlights: ['Pay once', 'Core modules'], limits: 'See sales', trial: false },
  { id: 'custom', name: 'Custom', price: 0, cycle: 'custom', bestFor: 'Unique needs', highlights: ['Tailored modules'], limits: 'Custom', trial: false },
];

// Normalize whatever SaaS Billing returns into public-safe plan cards.
function plans() {
  if (!present) {
    return { source: 'fallback', currency: config.defaultCurrency, plans: FALLBACK_PLANS };
  }
  let raw = {};
  try { raw = billing.getPlans() || {}; } catch { raw = {}; }
  const mapped = [];
  for (const [id, p] of Object.entries(raw)) {
    if (!p || typeof p !== 'object' || id === 'users') continue;
    mapped.push({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      price: typeof p.price === 'number' ? p.price : 0,
      cycle: p.cycle || 'monthly',
      bestFor: p.bestFor || '',
      highlights: Array.isArray(p.features) ? p.features : (p.highlights || []),
      limits: (p.limit === -1 ? 'Unlimited' : (p.limit != null ? `${p.limit} contacts` : 'See sales')),
      trial: p.trial !== undefined ? !!p.trial : (typeof p.price === 'number' && p.price === 0),
    });
  }
  // Merge with fallback to guarantee the full public plan ladder is shown.
  const byId = new Map(mapped.map((m) => [m.id, m]));
  for (const f of FALLBACK_PLANS) if (!byId.has(f.id)) byId.set(f.id, f);
  return { source: 'saas_billing', currency: config.defaultCurrency, plans: Array.from(byId.values()) };
}

// Create a draft (never a live subscription/invoice).
function createTrialRequestDraft({ planId, businessType, leadId }) {
  return {
    type: 'saas_billing_trial_request_draft',
    planId: planId || 'free_trial',
    businessType: businessType || 'custom',
    leadId: leadId || null,
    note: 'DRAFT only — no payment captured, no subscription created, no license activated.',
    capturePayment: false,
    createSubscription: false,
    activateLicense: false,
    createdAt: new Date().toISOString(),
  };
}

function invoicePreview({ planId }) {
  const cat = plans().plans;
  const plan = cat.find((p) => p.id === planId) || cat[0];
  return {
    type: 'invoice_preview',
    planId: plan.id,
    estimatedPrice: plan.price,
    currency: config.defaultCurrency,
    cycle: plan.cycle,
    note: 'PREVIEW only — not a real invoice. No charge will occur.',
  };
}

module.exports = { present, plans, createTrialRequestDraft, invoicePreview, FALLBACK_PLANS };
