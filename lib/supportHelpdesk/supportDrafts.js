'use strict';
const prompts = require('./supportPrompts');
const safety = require('./safetyGuard');
const kb = require('./knowledgeBase');
function build(ticket, opts) {
  const o = opts || {}; const lang = o.language || 'roman_urdu';
  const shortReply = prompts.get(ticket.category, lang);
  const articles = kb.search(ticket.category || ticket.title || '', { limit: 3, visibility: 'public_safe' });
  const escalationNote = ticket.escalationRequired ? 'Escalate: ' + (ticket.priority || 'review') + ' priority.' : 'No escalation required yet.';
  const gate = safety.check('send_reply', { consentOk: o.consentOk !== false });
  return { ok: true, dryRun: true, approvalRequired: true, liveReplyAllowed: gate.allowed, blockedReasons: gate.blockedReasons,
    ticketId: ticket.id, category: ticket.category, shortReply, escalationNote, kbMatches: articles, nextStep: 'Review draft, then approve manually.' };
}
module.exports = { build };
