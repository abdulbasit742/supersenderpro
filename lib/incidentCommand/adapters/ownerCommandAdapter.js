'use strict';

/**
    * Incident Command — Owner Command adapter. Provides owner-facing summaries.
    * Does NOT rebuild Owner Command; it only formats incident data for it. If Owner
    * Command isn't present, this still returns drafts the dashboard can show. */ const incidentStore = require('../incidentStore'); const detector = require('../incidentDetector'); const formatter = require('../alertFormatter'); const guard = require('../safetyGuard'); function topIncidents(limit) { const order = ['info', 'low', 'medium', 'high', 'critical']; return incidentStore.listIncidents().filter(function (i) { return i.state !== 'resolved'; })
         .sort(function (a, b) { return order.indexOf(b.severity) - order.indexOf(a.severity); })
         .slice(0, limit || 10);
}


function ownerDigest() {
  const top = topIncidents(10);
  return guard.safe({ digest: formatter.toOwnerDigestDraft(top), urgent: top.filter(function (i) { return i.severity ===
'critical' || i.severity === 'high'; }).length });
}


function recommendedNextActions() {
  const det = detector.detect();
  return guard.safe({ count: det.candidateCount, actions: det.candidates.slice(0, 10).map(function (c) { return { module:
c.moduleName, fix: c.recommendedFix, severity: c.severity }; }) });
}

function dailyHealthSummary() {
  const health = incidentStore.getHealth();
  return guard.safe({ modules: health.length, summary: 'Daily health summary draft', items: health.map(function (h) {
return { module: h.moduleName, status: h.status }; }) });
}


module.exports = { topIncidents, ownerDigest, recommendedNextActions, dailyHealthSummary };
