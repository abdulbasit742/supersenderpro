// lib/tenantIsolation/crossTenantSimulation.js — Runs safe cross-tenant simulations. No real data, no external calls.
const fixtures = require('./simulationFixtures');
const evaluator = require('./isolationEvaluator');
const leakDetector = require('./leakDetector');

function runOne(fx) {
  let actualDecision; let passed; const warnings = []; const blockers = [];
  if (fx.payload) {
    const r = leakDetector.detect(fx.payload, {});
    actualDecision = r.leakFound ? 'leak_blocked' : 'clean';
    passed = fx.expectedBlock ? r.leakFound : !r.leakFound;
    blockers.push(...r.blockers); warnings.push(...r.warnings);
  } else {
    const d = evaluator.decide(fx.ctx || {});
    actualDecision = d.allowed ? 'allowed' : 'blocked';
    passed = fx.expectedBlock ? d.allowed === false : d.allowed === true;
    blockers.push(...d.blockers); warnings.push(...d.warnings);
  }
  return { id: fx.id, name: fx.name, expectedBlock: fx.expectedBlock, actualDecision, passed, warnings, blockers, dryRun: true };
}
function run() {
  const results = fixtures.map(runOne);
  return { total: results.length, passed: results.filter((r) => r.passed).length, failed: results.filter((r) => !r.passed).length, results };
}
function list() { return fixtures.map((f) => ({ id: f.id, name: f.name, expectedBlock: f.expectedBlock })); }
module.exports = { run, list, runOne };
