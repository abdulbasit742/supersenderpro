'use strict';
/**
 * lib/demoSandbox/scenarioRunner.js
    * Loads a scenario: builds demo data, sets local demo state, returns tour steps +
    * recommended pages. Never mutates real module data, never calls external APIs.
 */
const registry = require('./scenarioRegistry');
const dataFactory = require('./demoDataFactory');
const tourRegistry = require('./tourRegistry');
const demoConfig = require('./demoConfig');
const store = require('./store');

function start(scenarioId) {
     const sc = registry.get(scenarioId);
     if (!sc) return { ok: false, errors: ['unknown_scenario'] };
     const data = dataFactory.generate(sc.id);
     const tour = tourRegistry.get(sc.tourId);
     // set local demo state only
     const s = store.load();
     s.activeScenario = { id: sc.id, startedAt: new Date().toISOString() };
     s.config = demoConfig.get();
     store.save(s);
     store.appendHistory({ kind: 'scenario_started', id: sc.id });
     return {
       ok: true, demo: true, dryRun: true,
    scenario: { id: sc.id, title: sc.title, description: sc.description, modulesUsed: sc.modulesUsed, expectedOutcome:
sc.expectedOutcome },
       sampleData: data,
       tourSteps: tour ? tour.steps : [],
       recommendedPages: sc.recommendedPages,
       createdAt: new Date().toISOString(),
     };
}
module.exports = { start };
