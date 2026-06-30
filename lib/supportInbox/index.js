// lib/supportInbox/index.js — Customer Support: shared inbox + tickets + SLA (barrel export).
//
// Turns inbound contact messages into trackable tickets with status lifecycle, priority,
// assignment, tags, deterministic auto-triage, first-response + resolution SLA tracking with
// breach detection, and canned replies with {{merge}} fields.
//
// SAFETY: JSON-backed, PII masked in views. Outbound replies are DRAFT-ONLY until
// SUPPORT_INBOX_LIVE_REPLIES=true AND a notifier is wired via
// require('./lib/supportInbox').setNotifier(fn).

const { config } = require('./config');
const notify = require('./notify');

module.exports = {
 config,
 store: require('./store'),
 privacy: require('./privacy'),
 ticketStore: require('./ticketStore'),
 autoTriage: require('./autoTriage'),
 slaPolicy: require('./slaPolicy'),
 cannedReplies: require('./cannedReplies'),
 notify,
 ticketEngine: require('./ticketEngine'),
 doctor: require('./doctor'),
 setNotifier: notify.setNotifier,
};
