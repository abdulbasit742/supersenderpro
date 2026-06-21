'use strict';
/** SLA windows by priority; computes due time + breach state. */
const SLA_HOURS = { low: 48, normal: 24, high: 8, urgent: 2 };
function dueFor(priority, fromIso) {
  const hrs = SLA_HOURS[priority] || 24;
     const from = fromIso ? new Date(fromIso) : new Date();
     return new Date(from.getTime() + hrs * 3600000).toISOString();
}
function evaluate(conv) {
     if (!conv) return null;
     const due = conv.slaDueAt || dueFor(conv.priority, conv.createdAt);
     const breached = ['resolved', 'archived'].includes(conv.status) ? false : Date.now() > new Date(due).getTime();
     const msLeft = new Date(due).getTime() - Date.now();
     return { dueAt: due, breached, hoursLeft: Math.round(msLeft / 3600000), slaHours: SLA_HOURS[conv.priority] || 24 };
}
module.exports = { SLA_HOURS, dueFor, evaluate };
