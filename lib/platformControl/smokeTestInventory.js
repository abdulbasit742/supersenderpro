// lib/platformControl/smokeTestInventory.js — read-only inventory of smoke tests + check scripts (no execution).
'use strict';
const cfg = require('./config');
const { safeText } = require('./redactor');

function getSmokeTestInventory() {
  const smokeTestsPreview = cfg.listFiles('tests/smoke', '.js').map(safeText);
  const checkScriptsPreview = cfg.listFiles('scripts', '.js').filter((f) => /check|smoke|doctor|readiness|status/i.test(f)).map(safeText);
  return cfg.safetyFlags({
    liveScriptExecution: false,
    smokeTestsPreview,
    checkScriptsPreview,
    totalSmokePreview: smokeTestsPreview.length,
    totalCheckPreview: checkScriptsPreview.length,
    warnings: [], blockers: [],
  });
}
module.exports = { getSmokeTestInventory };
