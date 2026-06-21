'use strict';
/** Read-only adapter to the tenant/business-setup layer. Returns unavailable if absent. Never writes tenants. */
const path = require('path');
function tryRequire(rels) { for (const r of rels) { try { return require(path.resolve(process.cwd(), r)); } catch {} }
return null; }
const tenantMod = tryRequire(['lib/tenantPortal/index', 'src/modules/tenant']);
const businessSetup = tryRequire(['lib/businessSetup/profileManager']);
function summary(tenantId) {
  if (tenantMod && typeof tenantMod.getSafe === 'function') { try { return Object.assign({ available: true },
tenantMod.getSafe(tenantId)); } catch {} }
  // fall back to business setup profile if no tenant module
  if (businessSetup && typeof businessSetup.get === 'function') { try { const p = businessSetup.get(); return p ? {
available: true, businessName: p.businessName, businessType: p.businessType, selectedPreset: p.selectedPreset,
setupStatus: p.setupStatus } : { available: false }; } catch {} }
  return { available: false };
}
module.exports = { summary };
