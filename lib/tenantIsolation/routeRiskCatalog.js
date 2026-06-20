// lib/tenantIsolation/routeRiskCatalog.js — Heuristics to classify a route file's scope and guards.
function classify(filename, content) {
  const f = filename.toLowerCase();
  let scope = 'generic';
  if (/public|funnel|landing/.test(f)) scope = 'public';
  else if (/admin/.test(f)) scope = 'admin';
  else if (/developer/.test(f)) scope = 'developer';
  else if (/tenant|saas|billing/.test(f)) scope = 'tenant';
  else if (/reseller/.test(f)) scope = 'reseller';
  else if (/support|helpdesk/.test(f)) scope = 'support';
  else if (/audit|compliance/.test(f)) scope = 'audit';
  const authGuard = /req\.session|authorization|requireAuth|isAuthenticated|authGuard|bearer/i.test(content);
  const tenantGuard = /tenantId|workspaceId|resellerId/i.test(content);
  const redactionGuard = /redact|mask|scrub|privacy/i.test(content);
  const hasExport = /export|download|\.csv|raw/i.test(content);
  let leakRisk = 'low';
  if (scope === 'public' && (hasExport || !redactionGuard)) leakRisk = 'high';
  else if (!tenantGuard && /tenant|customer|billing/.test(scope)) leakRisk = 'medium';
  const publicExposureRisk = scope === 'public' && hasExport;
  let recommendedFix = 'ok';
  if (leakRisk !== 'low') recommendedFix = redactionGuard ? 'add tenant/workspace guard' : 'add redaction + tenant guard';
  return { scope, authGuard, tenantGuard, redactionGuard, hasExport, leakRisk, publicExposureRisk, recommendedFix };
}
module.exports = { classify };
