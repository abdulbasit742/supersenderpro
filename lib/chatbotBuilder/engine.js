'use strict';
/**
 * lib/chatbotBuilder/engine.js - the flow runtime.
 *
 * handleMessage() is the single entry point: it resumes (or starts) a contact's session,
 * captures their reply to any pending question/choice, then walks the flow forward emitting
 * outbound messages until it hits a node that needs input (question/choice) or a terminal
 * node (handoff/end). DRY-RUN by default: replies are PREPARED, not sent.
 */
const cfg = require('./config');
const { config } = cfg;
const flows = require('./flows');
const sessions = require('./sessions');
const ai = require('./aiReply');
const { nowISO, norm, interpolate } = require('./util');

const nodeById = (flow, nid) => (flow.nodes || []).find((n) => n.id === nid) || null;

function evalCondition(node, ctx) {
  const left = ctx[node.variable];
  const right = node.value;
  switch (node.op) {
    case 'eq': return norm(left) === norm(right);
    case 'neq': return norm(left) !== norm(right);
    case 'contains': return norm(left).includes(norm(right));
    case 'gt': return Number(left) > Number(right);
    case 'lt': return Number(left) < Number(right);
    case 'exists': return left != null && String(left) !== '';
    default: return false;
  }
}

/** Match an inbound reply to a choice option: by 1-based index, value, or label (loose). */
function matchOption(node, text) {
  const opts = node.options || [];
  const t = norm(text);
  const idx = parseInt(t, 10);
  if (Number.isInteger(idx) && idx >= 1 && idx <= opts.length) return opts[idx - 1];
  return opts.find((o) => norm(o.value) === t || norm(o.label) === t)
    || opts.find((o) => t && (norm(o.label).includes(t) || t.includes(norm(o.label)))) || null;
}

function renderChoicePrompt(node, ctx) {
  const head = interpolate(node.text || 'Please choose an option:', ctx);
  const lines = (node.options || []).map((o, i) => (i + 1) + '. ' + interpolate(o.label, ctx));
  return [head].concat(lines).join('\n');
}

async function handleMessage(tid, inbound = {}, opts = {}) {
  const dryRun = opts.forceDryRun != null ? !!opts.forceDryRun : config.dryRun;
  const phone = inbound.phone || '';
  const text = inbound.text || '';
  const replies = [];
  const push = (t) => { const m = String(t || '').trim(); if (m) replies.push(m); };

  let session = sessions.getByPhone(tid, phone);
  let flow = session && session.status === 'active' ? flows.get(tid, session.flowId) : null;

  // No live session (or its flow vanished): try to trigger a new flow.
  if (!session || session.status !== 'active' || !flow) {
    flow = flows.match(tid, text);
    if (!flow) return { matched: false, dryRun, replies: [], sent: false, session: null };
    if (inbound.name) inbound.name = inbound.name;
    session = sessions.start(tid, { phone, name: inbound.name }, flow);
  } else if (session.awaiting) {
    // Capture the contact's answer to the pending question/choice node.
    const node = nodeById(flow, session.nodeId);
    session.awaiting = false;
    if (node && node.type === 'question') {
      if (node.saveAs) session.vars[node.saveAs] = text;
      session.nodeId = node.next || null;
    } else if (node && node.type === 'choice') {
      const opt = matchOption(node, text);
      if (opt) { if (node.saveAs) session.vars[node.saveAs] = opt.value != null ? opt.value : opt.label; session.nodeId = opt.next || null; }
      else if (node.fallbackNext) { session.nodeId = node.fallbackNext; }
      else { session.awaiting = true; push(renderChoicePrompt(node, ctxOf(session))); return await finish(tid, session, replies, dryRun); }
    } else {
      session.nodeId = node && node.next || null;
    }
  }

  // Walk forward.
  let steps = 0;
  while (session.nodeId && steps < config.maxStepsPerTurn) {
    steps += 1;
    const node = nodeById(flow, session.nodeId);
    if (!node) { session.nodeId = null; break; }
    const ctx = ctxOf(session);

    if (node.type === 'message') {
      push(interpolate(node.text, ctx));
      session.nodeId = node.next || null;
    } else if (node.type === 'ai') {
      const prompt = interpolate(node.prompt || node.text || '', ctx);
      const out = await ai.resolve(prompt, interpolate(node.fallback || '', ctx));
      if (node.saveAs) session.vars[node.saveAs] = out;
      push(out);
      session.nodeId = node.next || null;
    } else if (node.type === 'condition') {
      session.nodeId = (evalCondition(node, ctx) ? node.ifTrue : node.ifFalse) || null;
    } else if (node.type === 'action') {
      if (node.action === 'set' && node.key) session.vars[node.key] = interpolate(node.value, ctx);
      if (node.action === 'tag') { session.vars._tags = (session.vars._tags || []).concat(node.value).filter(Boolean); }
      session.nodeId = node.next || null;
    } else if (node.type === 'question') {
      push(interpolate(node.text, ctx));
      session.awaiting = true;
      break;
    } else if (node.type === 'choice') {
      push(renderChoicePrompt(node, ctx));
      session.awaiting = true;
      break;
    } else if (node.type === 'handoff') {
      push(interpolate(node.text || 'Aap ko ek human agent se connect kar raha hoon. 🙌', ctx));
      session.status = 'handoff';
      if (global.wsEvent) global.wsEvent('chatbot.handoff', { tenantId: tid, phone, flowId: flow.id });
      break;
    } else if (node.type === 'end') {
      if (node.text) push(interpolate(node.text, ctx));
      session.status = 'completed';
      break;
    } else {
      session.nodeId = null;
    }
  }

  if (!session.nodeId && session.status === 'active' && !session.awaiting) session.status = 'completed';
  session.history.unshift({ in: text, out: replies.slice(), ts: nowISO() });
  if (session.history.length > 100) session.history = session.history.slice(0, 100);
  return await finish(tid, session, replies, dryRun);
}

function ctxOf(session) {
  return Object.assign({}, session.vars, { name: (session.vars && session.vars.name) || (session.contact && session.contact.name) || 'there' });
}

async function finish(tid, session, replies, dryRun) {
  let sent = false;
  if (!dryRun && replies.length && typeof global.sendWhatsApp === 'function' && session.contact && session.contact.phone) {
    try {
      for (const m of replies) await global.sendWhatsApp(session.contact.phone, m, { tenantId: tid, source: 'chatbot_builder' });
      sent = true;
    } catch { sent = false; }
  }
  sessions.save(tid, session);
  return { matched: true, dryRun, sent, replies, awaiting: !!session.awaiting, status: session.status, flowId: session.flowId, sessionId: session.id };
}

module.exports = { handleMessage };
