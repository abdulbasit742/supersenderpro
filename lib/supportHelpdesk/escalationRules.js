'use strict';
/** Decides whether a ticket should escalate + why. */
const TRIGGERS = [
    { id: 'negative_sentiment', test: (t) => t.sentiment === 'negative' },
    { id: 'billing_payment', test: (t) => ['billing', 'payment'].includes(t.category) },
    { id: 'whatsapp_disconnected', test: (t) => t.category === 'whatsapp_connection' },
    { id: 'pilot_blocked', test: (t) => !!t.pilotId && t.priority === 'critical' },
    { id: 'compliance', test: (t) => t.category === 'compliance' },
    { id: 'critical_priority', test: (t) => t.priority === 'critical' },
];
function evaluate(ticket) {
  const reasons = TRIGGERS.filter((tr) => { try { return tr.test(ticket); } catch { return false; } }).map((tr) =>
tr.id);
    return { escalationRequired: reasons.length > 0, reasons };
}
module.exports = { TRIGGERS, evaluate };
