// lib/platformControl/duplicateDetector.js — duplicate routes, dashboard links, server requires.
  'use strict';
  const cfg = require('./config');
  const { routeInventory } = require('./routeInventory');
  const { dashboardRegistry } = require('./dashboardRegistry');


  function duplicateDetector() {
      const r = routeInventory();
      const d = dashboardRegistry();
      const src = cfg.readSafe('server.js') || cfg.readSafe('app.js') || '';
      const reqCounts = {};
      const RE = /require\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
      let m; while ((m = RE.exec(src))) reqCounts[m[1]] = (reqCounts[m[1]] || 0) + 1;
    const duplicateRequiresPreview = Object.keys(reqCounts).filter((k) => reqCounts[k] > 1).map((k) => ({ module: k, count:
  reqCounts[k] }));
      return cfg.base({
        duplicateRoutesPreview: r.duplicateRoutesPreview,
        duplicateDashboardLinksPreview: d.duplicateLinksPreview,
        duplicateRequiresPreview,
      });
  }


  module.exports = { duplicateDetector };
