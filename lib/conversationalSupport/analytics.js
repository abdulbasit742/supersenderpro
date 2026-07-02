'use strict';
/**
 * lib/conversationalSupport/analytics.js - read-only performance analytics for the 24/7
 * Conversational AI Support agent (companion to Feature #1).
 *
 * Everything here is derived straight from the already-stored conversations + handoff queue,
 * so it is safe to call anytime: no LLM calls, no sends, no writes. Powers the /analytics and
 * /insights endpoints and can feed the owner briefing / ops dashboard.
 */
const conversations = require('./conversations');
const escalation = require('./escalation');
const { config } = require('./config');
const { hoursAgo } = require('./util');

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0); // one-decimal percentage
const inWindow = (iso, sinceHours) => (!sinceHours ? true : hoursAgo(iso) <= sinceHours);
function bump(map, key) { if (key === undefined || key === null || key === '') return; map[key] = (map[key] || 0) + 1; }

/**
 * Aggregate metrics for a tenant. opts.sinceHours (optional) limits to conversations/handoffs
 * touched within the trailing window.
 */
function summarize(tid = 'default', opts = {}) {
  const sinceHours = opts.sinceHours && opts.sinceHours > 0 ? Number(opts.sinceHours) : 0;
  const convos = conversations.list(tid).filter((c) => inWindow(c.updatedAt, sinceHours));
  const handoffs = escalation.listQueue(tid).filter((h) => inWindow(h.updatedAt, sinceHours));

  const byStatus = { active: 0, escalated: 0, closed: 0 };
  const byMode = { chat: 0, order: 0 };
  const intents = {};
  const answerSources = {};
  const hourHistogram = {}; // hour-of-day (0-23) of inbound messages
  let userTurns = 0, agentTurns = 0, escalatedTurns = 0, staleActive = 0;

  for (const c of convos) {
    bump(byStatus, c.status);
    bump(byMode, c.mode);
    if (c.status === 'active' && hoursAgo(c.updatedAt) > config.sessionTtlHours) staleActive++;
    for (const t of c.history || []) {
      if (t.role === 'user') {
        userTurns++;
        const h = new Date(t.at).getHours();
        if (!Number.isNaN(h)) bump(hourHistogram, h);
      } else if (t.role === 'agent') {
        agentTurns++;
        bump(intents, t.intent);
        if (t.source) bump(answerSources, t.source);
        if (t.escalated) escalatedTurns++;
      }
    }
  }

  const handoffByStatus = { open: 0, claimed: 0, resolved: 0 };
  const handoffByReason = {};
  for (const h of handoffs) { bump(handoffByStatus, h.status); bump(handoffByReason, h.reason); }

  const total = convos.length;
  const escalatedConvos = byStatus.escalated;
  const busiest = Object.keys(hourHistogram).sort((a, b) => hourHistogram[b] - hourHistogram[a])[0];

  return {
    tenantId: tid,
    windowHours: sinceHours || null,
    generatedAt: new Date().toISOString(),
    conversations: {
      total,
      byStatus,
      byMode,
      escalationRate: pct(escalatedConvos, total),
      deflectionRate: pct(total - escalatedConvos, total),
      orderRate: pct(byMode.order, total),
      staleActive,
    },
    messages: {
      user: userTurns,
      agent: agentTurns,
      total: userTurns + agentTurns,
      avgTurnsPerConversation: total > 0 ? Math.round(((userTurns + agentTurns) / total) * 10) / 10 : 0,
      escalatedTurns,
    },
    intents,
    answerSources,
    handoffs: {
      total: handoffs.length,
      byStatus: handoffByStatus,
      byReason: handoffByReason,
      resolveRate: pct(handoffByStatus.resolved, handoffs.length),
      openBacklog: handoffByStatus.open,
    },
    busiestHour: busiest !== undefined ? Number(busiest) : null,
    hourHistogram,
  };
}

/**
 * Human-readable insights + health flags on top of summarize(). Handy for the owner's daily
 * brief. Returns { summary, highlights:[], flags:[], metrics } where flags mark things worth
 * attention (high escalation, handoff backlog, stale sessions, model offline).
 */
function insights(tid = 'default', opts = {}) {
  const s = summarize(tid, opts);
  const highlights = [];
  const flags = [];

  highlights.push(`${s.conversations.total} conversations, ${s.conversations.deflectionRate}% handled by the bot without a human.`);
  if (s.handoffs.total) highlights.push(`${s.handoffs.total} handoffs (${s.handoffs.openBacklog} open, ${s.handoffs.resolveRate}% resolved).`);
  if (s.conversations.byMode.order) highlights.push(`${s.conversations.byMode.order} order conversations (${s.conversations.orderRate}% of chats).`);
  if (s.busiestHour !== null) highlights.push(`Busiest hour is ${String(s.busiestHour).padStart(2, '0')}:00.`);

  const topReason = Object.keys(s.handoffs.byReason).sort((a, b) => s.handoffs.byReason[b] - s.handoffs.byReason[a])[0];
  if (topReason) highlights.push(`Top escalation reason: ${topReason}.`);

  if (s.conversations.escalationRate >= 50 && s.conversations.total >= 5) flags.push({ level: 'warn', msg: `High escalation rate (${s.conversations.escalationRate}%) - knowledge base may have gaps.` });
  if (s.handoffs.openBacklog >= 5) flags.push({ level: 'warn', msg: `${s.handoffs.openBacklog} handoffs waiting for a human.` });
  if (s.conversations.staleActive > 0) flags.push({ level: 'info', msg: `${s.conversations.staleActive} stale active conversations - run /cleanup.` });
  if (s.answerSources && s.answerSources.fallback) flags.push({ level: 'info', msg: `${s.answerSources.fallback} replies used the deterministic fallback (model may be offline).` });

  const summary = `${s.conversations.total} chats \u00b7 ${s.conversations.deflectionRate}% deflected \u00b7 ${s.handoffs.openBacklog} open handoffs`;
  return { summary, highlights, flags, metrics: s };
}

module.exports = { summarize, insights };
