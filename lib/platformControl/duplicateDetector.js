// lib/platformControl/duplicateDetector.js — read-only duplicate route/link/hook detector.
'use strict';
const cfg = require('./config');
const { safeText } = require('./redactor');

function dups(arr) {
  const c = {}; const out = [];
  arr.forEach((x) => { c[x] = (c[x] || 0) + 1; if (c[x] === 2) out.push(x); });
  return out;
}

function getDuplicateReport() {
  const server = cfg.readText('server.js');
  const mounts = [];
  let m; const re = /app\.use\(\s*['"`](\/api\/[^'"`]+)['"`]/g;
  while ((m = re.exec(server))) mounts.push(m[1]);
  const hookRe = /\/\/ BEGIN ([A-Z ]+) HOOK/g; const hooks = [];
  while ((m = hookRe.exec(server))) hooks.push(m[1].trim());

  const index = cfg.readText('public/index.html');
  const links = []; const linkRe = /href=["'](\/[a-z0-9\-]+\.html)["']/gi;
  while ((m = linkRe.exec(index))) links.push(m[1]);

  return cfg.safetyFlags({
    duplicateRouteMountsPreview: dups(mounts).map(safeText),
    duplicateServerHooksPreview: dups(hooks).map(safeText),
    duplicateDashboardLinksPreview: dups(links).map(safeText),
    warnings: [], blockers: [],
  });
}
module.exports = { getDuplicateReport };
