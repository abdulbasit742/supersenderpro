'use strict';
const b = require('./_base');
// Reuse the existing Incident Command layer (read-only) to learn critical incidents.

function incidents() {
    if (!b.anyExists(['lib/incidentCommand/incidentStore.js'])) return b.unavailable('Incident Command');
    try {
      const store = require(process.cwd() + '/lib/incidentCommand/incidentStore.js');
      const open = store.listIncidents().filter(function (i) { return i.state !== 'resolved'; });
      const critical = open.filter(function (i) { return i.severity === 'critical' || i.severity === 'high'; }).length;
      return b.ok('Incident Command present', { openIncidents: open.length, criticalOrHigh: critical });
    } catch (e) { return b.ok('Incident Command present', { note: 'state unreadable safely' }); }
}
module.exports = { incidents, health: incidents };
