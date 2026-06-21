'use strict';
const factory = require('../demoDataFactory');
module.exports = { preview: (scenarioId) => ({ demo: true, dryRun: true, briefing: { kpis: factory.kpis(), topActions:
['Review 2 pending payments (demo)', 'Approve 1 campaign draft (demo)'], blocked: [] } }) };
