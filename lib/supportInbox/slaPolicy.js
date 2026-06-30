// lib/supportInbox/slaPolicy.js — First-response + resolution SLA tracking and breach detection.
// Pure functions over a ticket; no side effects. Priority scales the SLA target.

const { config } = require('./config');

const PRIORITY_FACTOR = { urgent: 0.25, high: 0.5, normal: 1, low: 2 };
const MIN = 60 * 1000;

function factor(priority) { return PRIORITY_FACTOR[priority] === undefined ? 1 : PRIORITY_FACTOR[priority]; }

function targets(ticket) {
 const f = factor(ticket.priority);
 return {
 firstResponseMins: Math.round(config.firstResponseSlaMins * f),
 resolutionMins: Math.round(config.resolutionSlaMins * f),
 };
}

// Returns SLA status for a ticket relative to now.
function evaluate(ticket, refNow = Date.now()) {
 const t = targets(ticket);
 const created = Date.parse(ticket.createdAt) || refNow;
 const firstRespDueMs = created + t.firstResponseMins * MIN;
 const resolveDueMs = created + t.resolutionMins * MIN;
 const firstRespAt = ticket.firstRespondedAt ? Date.parse(ticket.firstRespondedAt) : null;
 const resolvedAt = ticket.resolvedAt ? Date.parse(ticket.resolvedAt) : null;

 const firstResponse = {
 dueAt: new Date(firstRespDueMs).toISOString(),
 met: firstRespAt !== null && firstRespAt <= firstRespDueMs,
 breached: firstRespAt === null ? refNow > firstRespDueMs : firstRespAt > firstRespDueMs,
 respondedAt: ticket.firstRespondedAt || null,
 };
 const resolution = {
 dueAt: new Date(resolveDueMs).toISOString(),
 met: resolvedAt !== null && resolvedAt <= resolveDueMs,
 breached: resolvedAt === null ? (refNow > resolveDueMs && !['closed', 'resolved'].includes(ticket.status)) : resolvedAt > resolveDueMs,
 resolvedAt: ticket.resolvedAt || null,
 };
 return { targets: t, firstResponse, resolution };
}

function breaches(tickets, refNow = Date.now()) {
 return tickets
 .map((t) => ({ ticket: t, sla: evaluate(t, refNow) }))
 .filter((x) => x.sla.firstResponse.breached || x.sla.resolution.breached)
 .map((x) => ({ id: x.ticket.id, number: x.ticket.number, priority: x.ticket.priority, firstResponseBreached: x.sla.firstResponse.breached, resolutionBreached: x.sla.resolution.breached }));
}

module.exports = { evaluate, breaches, targets, PRIORITY_FACTOR };
