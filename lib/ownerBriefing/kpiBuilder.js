// lib/ownerBriefing/kpiBuilder.js — Builds the KPI snapshot for a briefing from data sources.
// Pure read. Returns a list of {key,label,value,unit} plus a structured object.

const ds = require('./dataSources');
const { config } = require('./config');

function build() {
  const vc = ds.voiceConversations();
  const vq = ds.voiceQueue();
  const ot = ds.onboardingTasks();
  const cs = ds.commerceSnapshot();
  const sr = ds.setupReadiness();

  const kpis = [
    { key: 'voice_conversations_today', label: 'Voice conversations (today)', value: vc.today, unit: '' },
    { key: 'voice_conversations_total', label: 'Voice conversations (total)', value: vc.total, unit: '' },
    { key: 'negative_sentiment', label: 'Negative-sentiment voice notes', value: vc.negative, unit: '' },
    { key: 'pending_approvals', label: 'Voice drafts pending approval', value: vq.pendingApprovals, unit: '' },
    { key: 'open_onboarding_tasks', label: 'Open onboarding tasks', value: ot.open, unit: '' },
    { key: 'orders_known', label: 'Orders on record', value: cs.ordersKnown, unit: '' },
    { key: 'transactions_known', label: 'Transactions on record', value: cs.transactionsKnown, unit: '' },
  ];

  return {
    generatedAt: new Date().toISOString(),
    currency: config.currency,
    timezone: config.timezone,
    businessType: sr.businessType,
    hasProfile: sr.hasProfile,
    kpis,
    raw: { voice: vc, queue: vq, tasks: ot, commerce: cs, setup: sr },
  };
}

module.exports = { build };
