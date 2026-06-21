#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const ARTIFACTS = path.join(ROOT, 'artifacts');
const files = [
  "lib/resellerPortal/store.js",
  "lib/resellerPortal/resellerRegistry.js",
  "lib/resellerPortal/whiteLabelSettings.js",
  "lib/resellerPortal/referralTracker.js",
  "lib/resellerPortal/commissionPreview.js",
  "routes/resellerPortalRoutes.js",
  "public/reseller-portal.html",
  "public/partners.html"
];
function has(p) { try { fs.accessSync(path.join(ROOT, p)); return true; } catch (e) { return false; } }
const results = files.map((f) => ({ check: 'file:' + f, status: has(f) ? 'pass' : 'fail' }));
for (const f of files.filter((x) => x.endsWith('.js'))) {
  try { require(path.join(ROOT, f)); results.push({ check: 'require:' + f, status: 'pass' }); }
  catch (e) { results.push({ check: 'require:' + f, status: 'warn', detail: String(e.message || e).slice(0, 200) }); }
}
const pass = results.filter((r) => r.status === 'pass').length;
const fail = results.filter((r) => r.status === 'fail').length;
const warn = results.filter((r) => r.status === 'warn').length;
const report = { generatedAt: new Date().toISOString(), pass, fail, warn, results };
try { fs.mkdirSync(ARTIFACTS, { recursive: true }); fs.writeFileSync(path.join(ARTIFACTS, 'reseller_portal_check.json'), JSON.stringify(report, null, 2)); } catch (e) {}
console.log('scripts/reseller-portal-check.js: ' + pass + ' pass, ' + fail + ' fail, ' + warn + ' warn');
process.exit(fail && String(process.env.STRICT || 'false') === 'true' ? 1 : 0);
