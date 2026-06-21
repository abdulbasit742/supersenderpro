// lib/platformControl/routeInventory.js — read-only route inventory by parsing files (no server needed).
'use strict';
const cfg = require('./config');
const { redactRoute, safeText } = require('./redactor');

function parseRouterFile(rel) {
  const txt = cfg.readText(rel);
  const routes = [];
  const re = /router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(txt))) routes.push({ method: m[1].toUpperCase(), path: m[2] });
  return routes;
}

function parseMounts() {
  const server = cfg.readText('server.js');
  const mounts = [];
  const re = /app\.use\(\s*['"`](\/api\/[^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(server))) mounts.push(m[1]);
  return mounts;
}

function getRouteInventory() {
  const ourRoutes = parseRouterFile('routes/platformControlRoutes.js')
    .map((r) => redactRoute({ method: r.method, path: '/api/platform-control' + r.path }));
  const mounts = parseMounts();
  const seen = {};
  const duplicateRoutesPreview = [];
  mounts.forEach((p) => { seen[p] = (seen[p] || 0) + 1; if (seen[p] === 2) duplicateRoutesPreview.push(safeText(p)); });
  const routeFiles = cfg.listFiles('routes', '.js');
  const missingMountsPreview = routeFiles
    .map((f) => f.replace(/\.js$/, ''))
    .filter((name) => name.endsWith('Routes') && !cfg.readText('server.js').includes(name))
    .map(safeText);
  return cfg.safetyFlags({
    routesPreview: ourRoutes,
    routeFilesPreview: routeFiles.map(safeText),
    mountedApiNamespacesPreview: Array.from(new Set(mounts)).map(safeText),
    duplicateRoutesPreview,
    missingMountsPreview,
    totalPreview: ourRoutes.length,
    warnings: [], blockers: [],
  });
}
module.exports = { getRouteInventory, parseRouterFile, parseMounts };
