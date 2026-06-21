// lib/platformControl/routeInventory.js — parses route files + server mounts (static read).
  'use strict';
  const cfg = require('./config');
  const { redactRoute } = require('./redactor');


  const METHOD_RE = /\brouter\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  const MOUNT_RE = /app\.use\(\s*['"`]([^'"`]+)['"`]\s*,/g;

  function serverSrc() { return cfg.readSafe('server.js') || cfg.readSafe('app.js') || cfg.readSafe('index.js') || ''; }


  function scanRoutes() {
    const files = cfg.walk('routes', { exts: ['.js'] });
      const routes = [];
      files.forEach((f) => {
       const src = cfg.readSafe(f) || '';
       let m; METHOD_RE.lastIndex = 0;
        while ((m = METHOD_RE.exec(src))) routes.push({ method: m[1].toUpperCase(), path: m[2], file: f });
      });
      return routes;
  }


  function scanMounts() {
      const src = serverSrc();
      const mounts = []; let m; MOUNT_RE.lastIndex = 0;
      while ((m = MOUNT_RE.exec(src))) mounts.push(m[1]);
      return mounts;
  }


  function routeInventory() {
    const routes = scanRoutes();
      const seen = {};
      routes.forEach((r) => { const k = r.method + ' ' + r.path; seen[k] = (seen[k] || 0) + 1; });
      const duplicateRoutesPreview = Object.keys(seen).filter((k) => seen[k] > 1).map((k) => ({ route: k, count: seen[k] }));

     const src = serverSrc();
     const missingMountsPreview = cfg.walk('routes', { exts: ['.js'] })
       .filter((f) => src.indexOf(f.split('/').pop().replace(/\.js$/, '')) === -1)
       .map((f) => ({ file: f, note: 'route file not referenced in server entry' }));


     const suspiciousRoutesPreview = routes
       .filter((r) => /debug|secret|env|token|admin|raw|dump/i.test(r.path))
       .map(redactRoute);

     return cfg.base({
       routesPreview: routes.map(redactRoute),
       duplicateRoutesPreview,
       missingMountsPreview,
       suspiciousRoutesPreview,
       mountsPreview: scanMounts(),
     });
 }

 module.exports = { routeInventory, scanRoutes, scanMounts };
