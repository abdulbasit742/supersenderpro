// lib/saasBilling/flowNodes.js — Flow Studio trigger/action registry entries for billing.
// This only EXPORTS metadata + safe handlers. If a Flow Studio registry exists it can import
// register(). Nothing here sends, charges, or suspends — actions produce drafts/notifications.

const billingStatus = require('./billingStatus');
const invoiceBuilder = require('./invoiceBuilder');
const renewalEngine = require('./renewalEngine');
const upgradeAdvisor = require('./upgradeAdvisor');
const reportBuilder = require('./reportBuilder');

const TRIGGERS = [
  'billing.trial_started', 'billing.trial_ending', 'billing.license_expiring',
  'billing.invoice_due', 'billing.invoice_overdue', 'billing.payment_review_needed',
  'billing.usage_limit_warning', 'billing.usage_limit_exceeded', 'billing.plan_upgraded',
  'billing.plan_cancelled', 'billing.reseller_commission_created',
].map((id) => ({ id, label: id, category: 'SaaS Billing' }));

const ACTIONS = [
  { id: 'create_invoice_draft', run: (ctx = {}) => invoiceBuilder.createDraft(ctx) },
  { id: 'send_payment_reminder_draft', run: (ctx = {}) => ({ type: 'reminder_draft', dryRun: true, tenantId: ctx.tenantId || 'default' }) },
  { id: 'request_payment_review', run: (ctx = {}) => ({ type: 'payment_review_request', status: 'pending_manual_review', invoiceId: ctx.invoiceId || null }) },
  { id: 'recommend_upgrade', run: (ctx = {}) => upgradeAdvisor.recommend(ctx.tenantId) },
  { id: 'notify_admin', run: (ctx = {}) => ({ type: 'admin_notification_draft', dryRun: true, message: String(ctx.message || 'billing event') }) },
  { id: 'create_reseller_commission_record', run: (ctx = {}) => ({ type: 'commission_draft', dryRun: true, ...ctx }) },
  { id: 'pause_noncritical_features_dry_run', run: (ctx = {}) => ({ type: 'pause_preview', dryRun: true, tenantId: ctx.tenantId || 'default', note: 'dry-run only — nothing paused' }) },
  { id: 'generate_billing_report', run: () => reportBuilder.all() },
];

// Optional helper for an existing Flow Studio registry to consume.
function register(registry) {
  if (!registry || typeof registry.addTrigger !== 'function') return { registered: false, reason: 'no compatible registry' };
  TRIGGERS.forEach((t) => registry.addTrigger(t));
  if (typeof registry.addAction === 'function') ACTIONS.forEach((a) => registry.addAction(a));
  return { registered: true, triggers: TRIGGERS.length, actions: ACTIONS.length };
}

module.exports = { TRIGGERS, ACTIONS, register };
