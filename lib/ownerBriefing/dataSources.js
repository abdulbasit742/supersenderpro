// lib/ownerBriefing/dataSources.js — READ-ONLY, defensive readers over existing runtime data.
// Every reader returns safe numbers and never throws. If a data file is absent, returns zeros.
// This module imports NO other platform module — it only reads JSON files that may exist.

const { readDataFile, countRecords } = require('./store');

function todayStr() { return new Date().toISOString().slice(0, 10); }
function isToday(iso) { return typeof iso === 'string' && iso.slice(0, 10) === todayStr(); }

// Voice AI conversations (created by the Voice AI module, if present).
function voiceConversations() {
  const d = readDataFile('voice-ai-conversations.json', { items: [] });
  const items = Array.isArray(d.items) ? d.items : [];
  return {
    total: items.length,
    today: items.filter((c) => isToday(c.createdAt)).length,
    negative: items.filter((c) => c.sentiment === 'negative').length,
  };
}
// Voice AI queue (pending approvals).
function voiceQueue() {
  const d = readDataFile('voice-ai-queue.json', { items: [] });
  const items = Array.isArray(d.items) ? d.items : [];
  return { pendingApprovals: items.filter((i) => i.status === 'approval_pending').length };
}
// Unified setup tasks (open onboarding tasks).
function onboardingTasks() {
  const d = readDataFile('unified-setup-tasks.json', { tasks: [] });
  const tasks = Array.isArray(d.tasks) ? d.tasks : [];
  return { open: tasks.filter((t) => t.status === 'open').length, total: tasks.length };
}
// Generic transaction/order/payment style files (defensive — schema unknown).
function commerceSnapshot() {
  const orders = readDataFile('orders.json', null) || readDataFile('store_crm/orders.json', null);
  const txns = readDataFile('transactions.json', null) || readDataFile('txns.json', null);
  return { ordersKnown: countRecords(orders), transactionsKnown: countRecords(txns) };
}
// Whether the unified setup readiness is available (read its store).
function setupReadiness() {
  const d = readDataFile('unified-setup.json', null);
  return { hasProfile: !!(d && d.profile), businessType: d && d.profile ? d.profile.businessType : null };
}

module.exports = { voiceConversations, voiceQueue, onboardingTasks, commerceSnapshot, setupReadiness, todayStr };
