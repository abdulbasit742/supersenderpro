// lib/teamRouting/index.js — Team Inbox Routing & Assignment (barrel export).
//
// Register agents (skills, capacity, online status, working hours) and auto-assign incoming
// conversations/tickets by strategy: round-robin, least-load (utilization-aware), or skill-match.
// Tracks per-agent load, queues when everyone's full, drains the queue as capacity frees, and
// reassigns an agent's conversations when they go offline. Pairs with the support inbox #3 (assign
// a ticket on open), AI auto-reply #14 (handoff -> assign), and alerts #28 (queue backed up).
//
// SAFETY: JSON-backed; this module decides WHO handles a conversation, it never sends. Conservative
// defaults (online-only, capacity-aware). Agents deactivated, never hard-deleted.

const { config, STRATEGIES } = require('./config');

module.exports = {
 config, STRATEGIES,
 store: require('./store'),
 agentStore: require('./agentStore'),
 strategies: require('./strategies'),
 router: require('./router'),
 doctor: require('./doctor'),
 // convenience
 assign: require('./router').assign,
 release: require('./router').release,
};
