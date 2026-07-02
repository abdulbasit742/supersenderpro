'use strict';
/**
 * lib/conversationalSupport/analytics.js - read-only rollups for the 24/7 WhatsApp support agent.
 *
 * Zero deps, tenant-scoped, NO side effects. It only reads the same conversations + handoffs JSON
 * that the engine already writes (via conversations.js / escalation.js) and turns them into the
 * health numbers an owner actually cares about: how much the bot is handling, how often it grounds
 * its answers, and how often it has to pull in a human.
 *
 * Surfaced at GET /api/conversational-support/analytics. Never writes, never throws on bad data.
 */
const conversations = require('./conversations');
const escalation = require('./escalation');
const { hoursAgo } = require('./util');

// one-decimal percentage helper (0 when denominator is 0)
const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);
const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

function withinDays(iso, days) {
  if (!days || days <= 0) return true; // 0 / undefined => all time
  if (!iso) return false;
  const h = hoursAgo(iso);
  return Number.isFinite(h) && h <= days * 24;
}

/**
 * Analytics overview for a tenant.
 * @param {string} tid tenant id (default 'default')
 * @param {object} [opts] { days } only count records updated within the last N days (0 = all time)
 * @returns {object} aggregate stats (no phone numbers, no message text)
 */
function overview(tid = 'default', opts = {}) {
  const days = Number(opts && opts.days) || 0;
  const convos = conversations.list(tid).filter((c) => withinDays(c && c.updatedAt, days));
  const handoffs = escalation.listQueue(tid).filter((h) => withinDays(h && h.updatedAt, days));

  const byStatus = { active: 0, escalated: 0, closed: 0 };
  const intents = {};
  let userMsgs = 0;
  let agentMsgs = 0;
  let groundedAgentMsgs = 0;
  let orderConvos = 0;
  let escalatedConvos = 0;
  let turnsTotal = 0;

  for (const c of convos) {
    if (!c) continue;
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    if (c.mode === 'order') orderConvos++;
    if (c.status === 'escalated') escalatedConvos++;
    const hist = Array.isArray(c.history) ? c.history : [];
    turnsTotal += hist.length;
    for (const t of hist) {
      if (!t) continue;
      if (t.role === 'user') {
        userMsgs++;
      } else if (t.role === 'agent') {
        agentMsgs++;
        // "grounded" = the reply was backed by KB/AI (has a source that isn't a blind fallback)
        if (t.source && t.source !== 'fallback') groundedAgentMsgs++;
        if (t.intent) intents[t.intent] = (intents[t.intent] || 0) + 1;
      }
    }
  }

  const handoffByStatus = { open: 0, claimed: 0, resolved: 0 };
  const handoffByReason = {};
  for (const h of handoffs) {
    if (!h) continue;
    handoffByStatus[h.status] = (handoffByStatus[h.status] || 0) + 1;
    const r = h.reason || 'unspecified';
    handoffByReason[r] = (handoffByReason[r] || 0) + 1;
  }

  const total = convos.length;
  return {
    tenantId: tid,
    windowDays: days || 'all',
    generatedAt: new Date().toISOString(),
    conversations: {
      total,
      byStatus,
      order: orderConvos,
      avgTurns: total ? round1(turnsTotal / total) : 0,
    },
    messages: {
      user: userMsgs,
      agent: agentMsgs,
      grounded: groundedAgentMsgs,
      // % of agent replies backed by KB/AI rather than a blind fallback
      groundingRate: pct(groundedAgentMsgs, agentMsgs),
    },
    intents, // distribution across agent turns, e.g. { faq: n, order: n, smalltalk: n }
    escalation: {
      convosEscalated: escalatedConvos,
      // % of conversations that needed a human
      escalationRate: pct(escalatedConvos, total),
      handoffs: handoffs.length,
      byStatus: handoffByStatus,
      byReason: handoffByReason,
      openNow: handoffByStatus.open || 0,
      // % of handoffs marked resolved
      resolutionRate: pct(handoffByStatus.resolved, handoffs.length),
    },
    automation: {
      // conversations the bot handled without ever escalating, as a share of all conversations
      selfServeRate: pct(total - escalatedConvos, total),
    },
  };
}

module.exports = { overview };
