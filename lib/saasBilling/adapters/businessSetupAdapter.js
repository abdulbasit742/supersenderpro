// lib/saasBilling/adapters/businessSetupAdapter.js — Provides a SaaS billing checklist +
// plan-selection card for the existing Business Setup / Unified Setup wizard.
// Read-only suggestions; does NOT rebuild the wizard.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '..');
const planRegistry = require('../planRegistry');
const { config } = require('../config');

function detect() {
  const candidates = ['lib/unifiedSetup', 'routes/unifiedSetupRoutes.js', 'public/unified-setup.html'];
  const found = candidates.filter((rel) => { try { return fs.existsSync(path.join(ROOT, rel)); } catch { return false; } });
  return { present: found.length > 0, modules: found };
}

function checklist() {
  return [
    { id: 'choose_plan', label: 'Choose a billing plan', done: false },
    { id: 'set_currency', label: `Confirm billing currency (${config.defaultCurrency})`, done: true },
    { id: 'payment_method', label: 'Configure a payment method (manual review by default)', done: false },
    { id: 'review_limits', label: 'Review plan limits & feature gates', done: false },
    { id: 'enforcement', label: 'Keep enforcement warn-only until ready', done: true },
  ];
}

// Plan selection card the wizard can render (price + headline features).
function planCard() {
  return planRegistry.getPlans().filter((p) => p.isActive).map((p) => ({
    id: p.id, name: p.name, tier: p.tier, price: p.price, currency: p.currency,
    billingCycle: p.billingCycle, trialDays: p.trialDays,
    headlineFeatures: Object.keys(p.features).filter((f) => p.features[f]).slice(0, 6),
  }));
}

module.exports = { detect, checklist, planCard };
