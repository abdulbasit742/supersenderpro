// lib/saasBilling/renewalEngine.js — Detect renewals/trials/overdue and produce DRAFT
// actions only (e.g. draft invoices, reminder drafts). It never charges, sends, or suspends.

const licenseStore = require('./licenseStore');
const licenseEngine = require('./licenseEngine');
const invoiceBuilder = require('./invoiceBuilder');
const { config } = require('./config');

const DAY = 24 * 60 * 60 * 1000;

// Scan all licenses and classify upcoming billing events (read-only).
function scan(refNow = Date.now(), opts = {}) {
  const horizonDays = opts.horizonDays || 7;
  const events = { trialsEnding: [], expiringSoon: [], pastDue: [], inGrace: [] };
  for (const raw of licenseStore.all()) {
    const view = licenseEngine.publicView(raw);
    const s = view.status;
    const expMs = view.expiresAt ? Date.parse(view.expiresAt) : null;
    const trialMs = view.trialEndsAt ? Date.parse(view.trialEndsAt) : null;
    if (s === 'trial' && trialMs && trialMs - refNow <= horizonDays * DAY) events.trialsEnding.push(view);
    if (['active'].includes(s) && expMs && expMs - refNow <= horizonDays * DAY) events.expiringSoon.push(view);
    if (s === 'past_due') events.pastDue.push(view);
    if (s === 'grace') events.inGrace.push(view);
  }
  return events;
}

// Produce DRAFT invoices for expiring/past-due tenants. Dry-run by default: returns
// the would-be drafts without persisting unless opts.persist === true.
function buildRenewalDrafts(opts = {}) {
  const events = scan(Date.now(), opts);
  const candidates = [...events.expiringSoon, ...events.pastDue, ...events.inGrace];
  const drafts = candidates.map((lic) => ({
    tenantId: lic.tenantId,
    planId: lic.planId,
    action: 'create_invoice_draft',
    dryRun: config.dryRun,
  }));
  let created = [];
  if (opts.persist === true && !config.dryRun) {
    created = candidates.map((lic) => invoiceBuilder.createDraft({ tenantId: lic.tenantId, planId: lic.planId, notes: 'Auto renewal draft' }));
  }
  return { dryRun: config.dryRun, candidates: candidates.length, drafts, created };
}

module.exports = { scan, buildRenewalDrafts };
