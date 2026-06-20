// lib/ownerBriefing/briefingBuilder.js — Assembles a morning briefing or evening summary.
// Output is a redacted, owner-friendly text + structured payload. No live action.

const kpiBuilder = require('./kpiBuilder');
const alertRules = require('./alertRules');
const actionItems = require('./actionItems');
const { redact } = require('./privacy');
const { config } = require('./config');

function greeting(kind) {
  if (kind === 'evening') return 'Aaj ka summary (Good evening!)';
  return 'Subah ki briefing (Good morning!)';
}

function build(kind = 'morning') {
  const snapshot = kpiBuilder.build();
  const alerts = alertRules.evaluate(snapshot);
  const actions = actionItems.fromAlerts(alerts);

  const lines = [];
  lines.push(greeting(kind));
  snapshot.kpis.filter((k) => k.value > 0 || ['voice_conversations_today', 'open_onboarding_tasks'].includes(k.key))
    .forEach((k) => lines.push(`• ${k.label}: ${k.value}${k.unit ? ' ' + k.unit : ''}`));
  if (alerts.length) {
    lines.push('');
    lines.push('Dhyan dein (Alerts):');
    alerts.slice(0, 5).forEach((a) => lines.push(`  [${a.severity.toUpperCase()}] ${a.message}`));
  } else {
    lines.push('Koi urgent alert nahi — sab theek hai ✅');
  }
  if (actions.length) {
    lines.push('');
    lines.push('Suggested actions:');
    actions.slice(0, 5).forEach((a, i) => lines.push(`  ${i + 1}. ${a.title}`));
  }

  const text = redact(lines.join('\n'));

  return {
    kind,
    generatedAt: snapshot.generatedAt,
    dryRun: config.dryRun,
    text,
    snapshot,
    alerts,
    actions,
    deliveryChannel: config.channel,
    approvalRequired: true,
  };
}

module.exports = { build };
