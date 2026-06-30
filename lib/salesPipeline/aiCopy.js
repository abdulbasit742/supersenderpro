'use strict';
/**
 * lib/salesPipeline/aiCopy.js - persuasive, concise WhatsApp copy for follow-ups & recovery.
 * Prefers the project's self-hosted LLM hub when available (Ollama by default),
 * and ALWAYS falls back to deterministic Urdu/English templates so it works offline / in dry-run.
 */
let hub = null;
for (const p of ['../llmHub', '../../lib/llmHub', '../aiAgent']) {
  try { const m = require(p); if (m) { hub = m; break; } } catch {}
}

async function viaLLM(prompt) {
  if (!hub) return null;
  try {
    const fn = hub.generate || hub.complete || hub.chat || hub.ask || hub.run || hub.reply;
    if (typeof fn !== 'function') return null;
    const out = await fn.call(hub, prompt);
    const text = typeof out === 'string' ? out : (out && (out.text || out.content || out.message || out.reply));
    return text ? String(text).trim() : null;
  } catch { return null; }
}

const firstName = (name) => (String(name || '').trim().split(/\s+/)[0] || 'there');

const followUpTemplate = (deal, step) => {
  const n = firstName(deal.contact && deal.contact.name);
  const t = deal.title ? ' regarding "' + deal.title + '"' : '';
  const lines = {
    NEW_LEAD: 'Hi ' + n + '! Thanks for reaching out' + t + '. Aap ko kis cheez mein interest hai? Main 1 min mein details bhej deta hoon.',
    QUALIFIED: 'Hi ' + n + ', just following up' + t + '. Koi sawaal ho to batayein - main aaj hi best price/plan share kar sakta hoon.',
    NEGOTIATION: 'Hi ' + n + ', regarding our discussion' + t + ' - main aap ke liye ek special offer arrange kar sakta hoon. Shall I send it?',
    PROPOSAL_SENT: 'Hi ' + n + ', did you get a chance to review the proposal' + t + '? Koi clarification chahiye to bata dein, hum aaj close kar sakte hain.',
  };
  const tail = step > 0 ? ' (just a gentle reminder)' : '';
  return (lines[deal.stage] || lines.QUALIFIED) + tail;
};

const cartTemplate = (cart, step) => {
  const n = firstName(cart.contact && cart.contact.name);
  const items = (cart.items || []).map((i) => i.name).filter(Boolean).slice(0, 3).join(', ');
  const what = items ? ' (' + items + ')' : '';
  const steps = [
    'Hi ' + n + '! Aap ke cart mein kuch items reh gaye' + what + '. Checkout complete karna hai? Main link bhej doon?',
    'Hi ' + n + ', still interested' + what + '? Stock limited hai - reserve kar loon aap ke liye?',
    'Hi ' + n + ', last reminder: aap ke order' + what + ' par main ek chhoti si discount de sakta hoon agar aaj order karein.',
  ];
  return steps[Math.min(step, steps.length - 1)];
};

async function followUpCopy(deal, step = 0) {
  const prompt = 'Write ONE short, friendly WhatsApp sales follow-up (max 240 chars, Urdu/English mix) for a lead named ' + (deal.contact && deal.contact.name || 'customer') + ' in stage ' + deal.stage + (deal.title ? ' about ' + deal.title : '') + '. Reminder #' + (step + 1) + '. Be helpful, push gently toward closing.';
  return (await viaLLM(prompt)) || followUpTemplate(deal, step);
}

async function cartRecoveryCopy(cart, step = 0) {
  const prompt = 'Write ONE short WhatsApp cart-recovery message (max 240 chars, Urdu/English mix) for ' + (cart.contact && cart.contact.name || 'customer') + ' who left items in cart. Nudge #' + (step + 1) + ' of 3, escalate urgency slightly each step.';
  return (await viaLLM(prompt)) || cartTemplate(cart, step);
}

module.exports = { followUpCopy, cartRecoveryCopy, hubAvailable: () => !!hub };
