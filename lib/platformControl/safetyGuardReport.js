// lib/platformControl/safetyGuardReport.js — read-only aggregate safety posture report.
'use strict';
const cfg = require('./config');
const { getDuplicateReport } = require('./duplicateDetector');
const { getBrokenReferences } = require('./brokenReferenceScanner');
const { getPiiLeakPreview } = require('./piiLeakScannerPreview');
const { getPublicPageSafety } = require('./publicPageSafetyScanner');
const { getRouteInventory } = require('./routeInventory');
const { getPackageScripts } = require('./packageScriptInventory');

function getSafetyGuardReport() {
  const dup = getDuplicateReport();
  const broken = getBrokenReferences();
  const pii = getPiiLeakPreview();
  const pub = getPublicPageSafety();
  const routes = getRouteInventory();
  const scripts = getPackageScripts();

  const signals = [];
  if (dup.duplicateRouteMountsPreview.length) signals.push('duplicate_route_mounts');
  if (dup.duplicateDashboardLinksPreview.length) signals.push('duplicate_dashboard_links');
  if (broken.totalBrokenPreview) signals.push('broken_references');
  if (pii.totalFindingsPreview) signals.push('possible_pii_or_secret_in_public_assets');
  if (pub.totalUnsafePreview) signals.push('unsafe_public_pages');
  if (pub.totalMissingAssetsPreview) signals.push('missing_public_assets');
  if (routes.missingMountsPreview.length) signals.push('possibly_unmounted_route_files');
  if (routes.suspiciousRoutesPreview && routes.suspiciousRoutesPreview.length) signals.push('suspicious_routes');
  if (scripts.dangerousHintPreview.length) signals.push('dangerous_package_scripts');
  const missingSmokeCheck = !cfg.exists('scripts/platform-control-check.js') || !cfg.exists('tests/smoke/platformControlSmoke.js');
  if (missingSmokeCheck) signals.push('missing_platform_control_check_or_smoke');

  return cfg.safetyFlags({
    safetySignalsPreview: signals,
    duplicateRouteMountsPreview: dup.duplicateRouteMountsPreview,
    duplicateDashboardLinksPreview: dup.duplicateDashboardLinksPreview,
    brokenReferencesCountPreview: broken.totalBrokenPreview,
    piiFindingsCountPreview: pii.totalFindingsPreview,
    unsafePublicPagesCountPreview: pub.totalUnsafePreview,
    missingPublicAssetsCountPreview: pub.totalMissingAssetsPreview,
    missingMountsPreview: routes.missingMountsPreview,
    suspiciousRoutesPreview: routes.suspiciousRoutesPreview || [],
    dangerousScriptsPreview: scripts.dangerousHintPreview,
    warnings: signals.length ? ['safety_signals_present_preview'] : [],
    blockers: [],
  });
}
module.exports = { getSafetyGuardReport };
