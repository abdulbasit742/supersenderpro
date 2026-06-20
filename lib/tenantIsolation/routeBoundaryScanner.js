// lib/tenantIsolation/routeBoundaryScanner.js — Scans routes/ source files for boundary/guard risks. Read-only.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const catalog = require('./routeRiskCatalog');

function scan() {
  const dir = path.join(ROOT, 'routes');
  const results = [];
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.js')); } catch (_e) { files = []; }
  files.forEach((f) => {
    let content = '';
    try { content = fs.readFileSync(path.join(dir, f), 'utf8'); } catch (_e) { content = ''; }
    const c = catalog.classify(f, content);
    results.push({ file: `routes/${f}`, ...c });
  });
  const summary = {
    routesScanned: results.length,
    highRisk: results.filter((r) => r.leakRisk === 'high').length,
    mediumRisk: results.filter((r) => r.leakRisk === 'medium').length,
    publicExposure: results.filter((r) => r.publicExposureRisk).length,
  };
  return { summary, routes: results };
}
module.exports = { scan };
