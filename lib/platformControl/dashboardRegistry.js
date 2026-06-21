// lib/platformControl/dashboardRegistry.js — read-only dashboard page + nav link registry.
'use strict';
const cfg = require('./config');
const { safeText } = require('./redactor');

function getDashboardRegistry() {
  const pagesPreview = cfg.DASHBOARD_PAGES.map((p) => ({ page: safeText(p), exists: cfg.exists('public/' + p) }));
  const index = cfg.readText('public/index.html');
  const links = [];
  const re = /href=["'](\/[a-z0-9\-]+\.html)["']/gi;
  let m;
  while ((m = re.exec(index))) links.push(m[1]);
  const counts = {};
  links.forEach((l) => { counts[l] = (counts[l] || 0) + 1; });
  const dashboardLinksPreview = Array.from(new Set(links)).map(safeText);
  const duplicateLinksPreview = Object.keys(counts).filter((l) => counts[l] > 1).map(safeText);
  const brokenLinksPreview = Array.from(new Set(links))
    .filter((l) => !cfg.exists('public' + l)).map(safeText);
  return cfg.safetyFlags({
    pagesPreview, dashboardLinksPreview, duplicateLinksPreview, brokenLinksPreview,
    totalPagesPreview: pagesPreview.length, warnings: [], blockers: [],
  });
}
module.exports = { getDashboardRegistry };
