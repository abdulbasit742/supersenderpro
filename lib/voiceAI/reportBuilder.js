// lib/voiceAI/reportBuilder.js — Builds voice reports from stored history/conversations.

const conversationStore = require('./conversationStore');
const queue = require('./voiceQueue');
const historyStore = require('./historyStore');

function dailyDigest() {
  const today = new Date().toISOString().slice(0, 10);
  const convos = conversationStore.all().filter((c) => (c.createdAt || '').slice(0, 10) === today);
  const intents = {};
  convos.forEach((c) => { if (c.intent) intents[c.intent] = (intents[c.intent] || 0) + 1; });
  return {
    date: today,
    voiceConversations: convos.length,
    pendingApprovals: queue.pending().length,
    failedJobs: historyStore.list({ limit: 500 }).filter((h) => h.status === 'failed').length,
    topIntents: Object.entries(intents).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ({ intent: k, count: v })),
    negativeSentiment: convos.filter((c) => c.sentiment === 'negative').length,
  };
}

function providerUsage() {
  const hist = historyStore.list({ limit: 1000 });
  const usage = {};
  hist.forEach((h) => { if (h.provider) usage[h.provider] = (usage[h.provider] || 0) + 1; });
  return Object.entries(usage).map(([provider, count]) => ({ provider, count }));
}

module.exports = { dailyDigest, providerUsage };
