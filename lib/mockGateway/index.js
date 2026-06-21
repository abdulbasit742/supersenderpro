'use strict';


/**
    * Mock Gateway — public entry. Offline-only provider simulator + scenario runner.
    */

const config = require('./mockConfig');
const safety = require('./mockSafety');
const registry = require('./mockRegistry');
const scenarios = require('./mockScenarios');
const runner = require('./mockScenarioRunner');
const sanitizer = require('./mockInputSanitizer');
const eventStore = require('./mockEventStore');


function status() {
  return Object.assign({ ok: true, feature: 'mock-gateway' }, config.get(), { providers: registry.names().length,
scenarios: scenarios.list().length, events: eventStore.status() });
}


module.exports = {
  status,
     config: config.get,
     safety,
     providers: registry,
     scenarios,
     run: runner.runProvider,
     runScenario: runner.runScenario,
     sanitize: sanitizer.sanitize,
     events: eventStore,
};
