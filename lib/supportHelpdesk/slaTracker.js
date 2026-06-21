'use strict';
const escalation = require('./escalationRules');
const HOURS = { low:72, medium:48, high:12, critical:4 };
function dueAt(ticket) { const h=HOURS[ticket.priority] || 48; return new Date(new Date(ticket.createdAt || Date.now()).getTime()+h*3600000).toISOString(); }
function track(ticket) { const due=dueAt(ticket); const overdue=Date.now() > new Date(due).getTime() && !['resolved','archived'].includes(ticket.status); const esc=escalation.evaluate(ticket); return { ok:true, ticketId:ticket.id, dueAt:due, overdue, priority:ticket.priority, suggestedOwnerAction: (esc.escalationRequired || overdue) ? 'Review and respond now (' + ticket.priority + ')' : 'On track' }; }
module.exports = { HOURS, dueAt, track };
