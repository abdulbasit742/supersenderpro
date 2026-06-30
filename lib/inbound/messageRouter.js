'use strict';
/**
 * messageRouter.js — Inbound Feature #1: the unified inbound message router.
 *
 * THE KEYSTONE. Everything built so far reacts to events, but something has to turn a real inbound
 * WhatsApp message into those events. This is that something. For each inbound message it:
 *   1. Records the message on the Customer 360 timeline.
 *   2. Captures a lead if this is a brand-new contact (lead capture #1).
 *   3. Emits a 'message_received' event for the Workflow Builder.
 *   4. Honours opt-out: STOP/unsubscribe sets opt-out and skips auto-reply.
 *   5. Asks the AI support agent for a reply, and returns it so the caller can send it back.
 *
 * Everything downstream is injected (no hard deps), so this works with whatever is wired and is
 * trivially testable. Plug it into the WhatsApp client's on-message handler.
 */

const OPT_OUT_WORDS = ['stop', 'unsubscribe', 'opt out', 'optout', 'band karo', 'rok do'];
const OPT_IN_WORDS = ['start', 'subscribe', 'opt in', 'optin'];

const hooks = {
  recordEvent: null,    // (phone, ev) => void           (customer360.recordEvent)
  upsertProfile: null,  // (phone, fields) => void        (customer360.upsertProfile)
  getProfile: null,     // (phone) => profile | null      (customer360.getProfile)
  captureLead: null,    // (payload) => {lead,isNew}       (leadCapture.capture)
  emit: null,           // (event, ctx) => void           (workflowEngine.emit)
  aiReply: null,        // async (phone, text) => {reply,escalated}  (aiSupportAgent.handleMessage)
  setOptOut: null       // (phone, optedIn:boolean) => void
};
function configure(h = {}) {
  for (const k of Object.keys(hooks)) if (typeof h[k] === 'function') hooks[k] = h[k];
  return Object.keys(hooks).filter(k => hooks[k]);
}

const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');
function matchesAny(text, words) {
  const t = String(text || '').trim().toLowerCase();
  return words.some(w => t === w || t.startsWith(w));
}

/**
 * Handle one inbound message.
 * @param {Object} msg { phone, text, name?, at? }
 * @returns {Promise<Object>} { reply, escalated, optedOut, isNewContact }
 */
async function handleInbound(msg = {}) {
  const phone = normPhone(msg.phone);
  const text = msg.text || '';
  if (!phone) throw new Error('inbound message needs a phone');

  const known = hooks.getProfile ? hooks.getProfile(phone) : null;
  const isNewContact = !known;

  // 1) new contact -> capture as a lead
  if (isNewContact) {
    try { if (hooks.captureLead) hooks.captureLead({ phone, name: msg.name, source: 'click_to_whatsapp' }); } catch { /* ignore */ }
  }

  // 2) record the message on the profile
  try {
    if (hooks.upsertProfile && msg.name) hooks.upsertProfile(phone, { name: msg.name });
    if (hooks.recordEvent) hooks.recordEvent(phone, { type: 'message', text, at: msg.at });
  } catch { /* ignore */ }

  // 3) opt-out / opt-in keywords
  if (matchesAny(text, OPT_OUT_WORDS)) {
    try {
      if (hooks.setOptOut) hooks.setOptOut(phone, false);
      if (hooks.recordEvent) hooks.recordEvent(phone, { type: 'optout', text });
      if (hooks.emit) hooks.emit('opt_out', { phone });
    } catch { /* ignore */ }
    return { reply: 'You have been unsubscribed. Reply START to opt back in anytime.', escalated: false, optedOut: true, isNewContact };
  }
  if (matchesAny(text, OPT_IN_WORDS)) {
    try {
      if (hooks.setOptOut) hooks.setOptOut(phone, true);
      if (hooks.recordEvent) hooks.recordEvent(phone, { type: 'optin', text });
      if (hooks.emit) hooks.emit('opt_in', { phone });
    } catch { /* ignore */ }
    return { reply: 'You are subscribed again. Welcome back! 🎉', escalated: false, optedOut: false, isNewContact };
  }

  // 4) emit workflow event (auto-tag, trigger flows, etc.)
  try { if (hooks.emit) hooks.emit('message_received', { phone, text, isNewContact }); } catch { /* ignore */ }

  // 5) AI support reply
  let reply = null, escalated = false;
  if (hooks.aiReply) {
    try {
      const out = await hooks.aiReply(phone, text);
      reply = out && out.reply ? out.reply : null;
      escalated = !!(out && out.escalated);
    } catch { reply = null; }
  }

  return { reply, escalated, optedOut: false, isNewContact };
}

module.exports = { configure, handleInbound, OPT_OUT_WORDS, OPT_IN_WORDS };
