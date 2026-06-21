'use strict';
/** Shared helper: pull a slice of fake data from the factory, fault-tolerant. */
const factory = require('../demoDataFactory');
function demoSlice(moduleId, scenarioId) {
  try { const r = factory.forModule(moduleId, scenarioId); return Object.assign({ demo: true, dryRun: true }, r); }
    catch (e) { return { demo: true, dryRun: true, available: false, error: 'demo_slice_failed' }; }
}
module.exports = { demoSlice };
