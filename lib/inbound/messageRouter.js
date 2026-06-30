'use strict';
/**
 * messageRouter.js — Inbound Feature #1: the front door for every incoming WhatsApp message.
 *
 * Right now an inbound message has no single brain deciding what to do with it. This is that brain:
 * one handleInbound() that, for every message:
 *   1. records it on the Customer 360 timeline (so the profile is always current),
 *   2. captures a brand-new contact as a lead (top of funnel),
 *   3. handles opt-out/opt-in keywords (compliance),
 *   4. emits 'message_received' for the Workflow Builder (auto-replies, tagging, etc),
 *   5. otherwise hands the message to the AI support agent for an answer/escalation.
 *
 * Everything is injected (no hard deps), so server.js wires the real engines and this stays the thin
 * orchestration layer. It returns what (if anything) to send back, so the caller owns the WA send.
 */

let recordEvent = null;    // (phone, ev) => void           customer360.recordEvent
let captureLead = null;    // (payload) => { lead, isNew }   leadCapture.capture
let profileExists = null;  // (phone) => boolean             !!customer360.getProfile
let aiSupport = null;      // async (phone, text) => { reply, escalated }
let emitEvent = null;      // (event, ctx) => void           workflowEngine.emit
let setOptStatus = null;   // (phone, optedIn:boolean) => void

function configure(h = {}) {
  if (typeof h.recordEvent === 'function') recordEvent = h.recordEvent;
  if (typeof h.captureLead === 'function') captureLead = h.captureLead;
  if (typeof h.profileExists === 'function') profileExists = h.profileExists;
  if (typeof h.aiSupport === 'function') aiSupport = h.aiSupport;
  if (typeof h.emitEvent === 'function') emitEvent = h.emitEvent;
  if (typeof h.setOptStatus === 'function') setOptStatus = h.setOptStatus;
  return true;
}

const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');

let OPT_OUT = ['stop', 'unsubscribe', 'band karo', 'bandh', 'opt out', 'optout'];
let OPT_IN = ['start', 'subscribe', 'opt in', 'optin'];
function configureKeywords(k = {}) {
  if (Array.isArray(k.optOut)) OPT_OUT = k.optOut;
  if (Array.isArray(k.optIn)) OPT_IN = k.optIn;
  return { OPT_OUT, OPT_IN };
}
function matches(text, list) {
  const t = String(text || '').toLowerCase().trim();
  return list.some(w => t === w || t.includes(w));
}

/**
 * Handle one inbound message.
 * @param {Object} msg { phone, text, name?, source? }
 * @returns {Promise<Object>} { action, reply?, escalated?, isNewLead? }
 *   action: 'opted_out' | 'opted_in' | 'lead_captured' | 'support' | 'workflow_only'
 */
async function handleInbound(msg = {}) {
  const phone = normPhone(msg.phone);
  const text = msg.text || '';
  if (!phone) throw new Error('inbound message needs a phone');

  // 1) always record the message on the 360 timeline
  try { if (recordEvent) recordEvent(phone, { type: 'message', text, meta: { direction: 'in', source: msg.source || 'whatsapp' } }); } catch { /* ignore */ }

  // 2) opt-out / opt-in (compliance first — never keep messaging someone who said stop)
  if (matches(text, OPT_OUT)) {
    try { if (setOptStatus) setOptStatus(phone, false); } catch { /* ignore */ }
    try { if (recordEvent) recordEvent(phone, { type: 'optout', text }); } catch { /* ignore */ }
    try { if (emitEvent) emitEvent('opt_out', { phone }); } catch { /* ignore */ }
    return { action: 'opted_out', reply: 'You have been unsubscribed. Reply START anytime to opt back in.' };
  }
  if (matches(text, OPT_IN)) {
    try { if (setOptStatus) setOptStatus(phone, true); } catch { /* ignore */ }
    try { if (recordEvent) recordEvent(phone, { type: 'optin', text }); } catch { /* ignore */ }
    try { if (emitEvent) emitEvent('opt_in', { phone }); } catch { /* ignore */ }
    return { action: 'opted_in', reply: 'You are subscribed again. Welcome back! 🙏' };
  }

  // 3) brand-new contact -> capture as a lead
  let isNewLead = false;
  try {
    const known = profileExists ? profileExists(phone) : true;
    if (!known && captureLead) {
      captureLead({ phone, name: msg.name, source: 'click_to_whatsapp' });
      isNewLead = true;
    }
  } catch { /* ignore */ }

  // 4) let workflows react to the raw message (auto-replies, tagging, keyword campaigns)
  try { if (emitEvent) emitEvent('message_received', { phone, text, isNewLead }); } catch { /* ignore */ }

  // 5) hand to AI support for an actual answer (it escalates if unsure)
  if (aiSupport) {
    try {
      const out = await aiSupport(phone, text);
      return { action: 'support', isNewLead, reply: out.reply, escalated: !!out.escalated };
    } catch { /* fall through */ }
  }

  return { action: 'workflow_only', isNewLead };
}

module.exports = { configure, configureKeywords, handleInbound };
