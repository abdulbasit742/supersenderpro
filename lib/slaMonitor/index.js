'use strict';
// AI-assisted SLA Monitor.
// Deterministic core computes first-response time, resolution time, and breach
// state from conversation event timelines. Ollama only phrases the owner brief.
//
// A 'conversation' record shape:
// {
//   id, tenantId, customer (phone, masked in output),
//   events: [{ t: ISO, dir: 'in'|'out', kind?: 'open'|'resolved' }],
//   resolvedAt?: ISO
// }

const { config } = require('./config');
const store = require('./store');

function maskPhone(p) {
  if (!p) return p;
  const s = String(p);
  if (s.length <= 4) return '****';
  return s.slice(0, 3) + '***' + s.slice(-2);
}

// Count elapsed minutes between two ISO timestamps, optionally pausing time
// that falls outside business hours. Deterministic, no timezone libs.
function elapsedMinutes(startISO, endISO) {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  if (!config.pauseOutsideBusinessHours) return Math.round((end - start) / 60000);

  // Walk in 1-minute steps but in O(hours) by hopping hour boundaries.
  let counted = 0;
  let cur = start;
  const STEP = 60000;
  while (cur < end) {
    const d = new Date(cur);
    const h = d.getHours();
    if (h >= config.businessStartHour && h < config.businessEndHour) counted++;
    cur += STEP;
  }
  return counted;
}

function firstResponseMinutes(conv) {
  const evs = (conv.events || []).slice().sort((a, b) => new Date(a.t) - new Date(b.t));
  const firstIn = evs.find(e => e.dir === 'in');
  if (!firstIn) return null;
  const firstOutAfter = evs.find(e => e.dir === 'out' && new Date(e.t) >= new Date(firstIn.t));
  if (!firstOutAfter) return null;
  return elapsedMinutes(firstIn.t, firstOutAfter.t);
}

function resolutionMinutes(conv) {
  const evs = (conv.events || []).slice().sort((a, b) => new Date(a.t) - new Date(b.t));
  const opened = (evs.find(e => e.kind === 'open') || evs[0]);
  const resolvedAt = conv.resolvedAt || (evs.find(e => e.kind === 'resolved') || {}).t;
  if (!opened || !resolvedAt) return null;
  return elapsedMinutes(opened.t, resolvedAt);
}

function classify(actualMin, targetMin) {
  if (actualMin == null) return 'pending';
  if (actualMin > targetMin) return 'breached';
  if (actualMin >= targetMin * config.warnFraction) return 'at_risk';
  return 'ok';
}

function scoreConversation(conv) {
  const fr = firstResponseMinutes(conv);
  const res = resolutionMinutes(conv);
  const frState = classify(fr, config.firstResponseTargetMin);
  const resState = res == null ? 'pending' : classify(res, config.resolutionTargetMin);
  const breached = frState === 'breached' || resState === 'breached';
  return {
    id: conv.id,
    customer: maskPhone(conv.customer),
    firstResponseMin: fr,
    firstResponseState: frState,
    resolutionMin: res,
    resolutionState: resState,
    breached,
    escalate: breached || frState === 'at_risk'
  };
}

function report(tenantId) {
  const convs = store.listConversations(tenantId);
  const scored = convs.map(scoreConversation);
  const total = scored.length || 1;
  const breaches = scored.filter(s => s.breached);
  const atRisk = scored.filter(s => !s.breached && (s.firstResponseState === 'at_risk' || s.resolutionState === 'at_risk'));
  const frVals = scored.map(s => s.firstResponseMin).filter(v => v != null);
  const avgFirstResponse = frVals.length ? Math.round(frVals.reduce((a, b) => a + b, 0) / frVals.length) : null;
  return {
    targets: {
      firstResponseMin: config.firstResponseTargetMin,
      resolutionMin: config.resolutionTargetMin
    },
    totals: {
      conversations: scored.length,
      breached: breaches.length,
      atRisk: atRisk.length,
      breachRate: Math.round((breaches.length / total) * 100) / 100,
      avgFirstResponseMin: avgFirstResponse
    },
    breaches,
    atRisk,
    conversations: scored
  };
}

// ---- Optional AI brief (Ollama-first, graceful fallback) ----
async function tryOllama(prompt) {
  // aiBrain / llmHub resolver pattern; never throws.
  const candidates = ['../../ai/aiBrain', '../llmHub', '../../lib/llmHub', '../aiAgent'];
  for (const c of candidates) {
    try {
      const mod = require(c);
      const fn = mod.processPrompt || mod.generate || mod.complete || mod.chat || mod.ask || mod.run || mod.reply;
      if (typeof fn === 'function') {
        const out = await fn.call(mod, prompt);
        if (out) return typeof out === 'string' ? out : (out.text || out.content || '');
      }
    } catch (_) { /* try next */ }
  }
  // Direct Ollama as last resort, short timeout, swallow errors.
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch(config.ollamaHost + '/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: config.model, prompt, stream: false }),
      signal: ctrl.signal
    });
    clearTimeout(t);
    if (r.ok) { const j = await r.json(); return j.response || ''; }
  } catch (_) {}
  return '';
}

function deterministicBrief(rep) {
  const t = rep.totals;
  const lines = [];
  lines.push(`SLA report: ${t.conversations} conversations.`);
  lines.push(`Breached: ${t.breached} (${Math.round(t.breachRate * 100)}%). At risk: ${t.atRisk}.`);
  if (t.avgFirstResponseMin != null) lines.push(`Avg first response: ${t.avgFirstResponseMin} min (target ${rep.targets.firstResponseMin} min).`);
  if (rep.breaches.length) {
    lines.push('Action: escalate ' + rep.breaches.slice(0, 5).map(b => b.id).join(', ') + '.');
  } else {
    lines.push('No breaches. Team is within SLA.');
  }
  return lines.join('\n');
}

async function ownerBrief(tenantId) {
  const rep = report(tenantId);
  const fallback = deterministicBrief(rep);
  const prompt = `You are a support ops assistant. Write a 3-line WhatsApp brief in simple English for a store owner.\nData:\n${fallback}\nKeep numbers exact. No emojis.`;
  let ai = '';
  try { ai = await tryOllama(prompt); } catch (_) {}
  return { brief: (ai && ai.trim()) || fallback, aiUsed: Boolean(ai && ai.trim()), report: rep };
}

module.exports = {
  maskPhone,
  elapsedMinutes,
  firstResponseMinutes,
  resolutionMinutes,
  classify,
  scoreConversation,
  report,
  ownerBrief,
  deterministicBrief
};
