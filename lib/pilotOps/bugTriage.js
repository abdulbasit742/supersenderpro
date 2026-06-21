'use strict';

/**
   * Pilot Ops — bug triage helper. Suggests status + priority order. Pure function.
   */

const order = ['info', 'low', 'medium', 'high', 'critical'];


function triage(feedbackItems) {
 const bugs = (Array.isArray(feedbackItems) ? feedbackItems : []).filter(function (f) { return f.type === 'bug' ||
f.type === 'complaint'; });
   const sorted = bugs.slice().sort(function (a, b) { return order.indexOf(b.severity) - order.indexOf(a.severity); });
   return {
     total: bugs.length,
     critical: bugs.filter(function (b) { return b.severity === 'critical'; }).length,
     high: bugs.filter(function (b) { return b.severity === 'high'; }).length,
     queue: sorted.slice(0, 20).map(function (b) { return { id: b.id, title: b.title, severity: b.severity, status:
b.status, relatedModule: b.relatedModule }; }),
 };
}


module.exports = { triage };
