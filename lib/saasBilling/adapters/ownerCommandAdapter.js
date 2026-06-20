// lib/saasBilling/adapters/ownerCommandAdapter.js — Read-only billing summary for the
// existing Owner Command surface. Does NOT rebuild Owner Command; provides a compact
// summary object it can render. Detects Owner Briefing/Command presence safely.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '..');
const billingStatus = require('../billingStatus');
const renewalEngine = require('../renewalEngine');

function detect() {
  const candidates = ['lib/ownerBriefing/index.js', 'public/owner-briefing.html', 'routes/ownerBriefingRoutes.js'];
  const found = candidates.filter((rel) => { try { return fs.existsSync(path.join(ROOT, rel)); } catch { return false; } });
  return { present: found.length > 0, modules: found };
}

// Compact summary card for Owner Command / daily briefing.
function summary() {
  const ov = billingStatus.overview();
  const events = renewalEngine.scan();
  return {
    source: 'saas-billing',
    activeTenants: ov.cards.activeTenants,
    trials: ov.cards.trials,
    pastDue: ov.cards.pastDue,
    pendingInvoices: ov.cards.invoicesDue,
    monthlyRevenueDraft: ov.cards.monthlyRevenueDraft,
    trialsEnding: events.trialsEnding.length,
    usageWarnings: ov.cards.usageWarnings,
    currency: ov.currency,
  };
}

module.exports = { detect, summary };
