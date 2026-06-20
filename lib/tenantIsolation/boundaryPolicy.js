// lib/tenantIsolation/boundaryPolicy.js — Boundary policy model + normalization.
const crypto = require('crypto');
const BOUNDARY_TYPES = ['tenant', 'reseller', 'workspace', 'customer', 'public', 'admin', 'developer_api', 'support', 'billing', 'audit', 'generic'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
function id() { return `bnd_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`; }
function normalize(input = {}) {
  const boundaryType = BOUNDARY_TYPES.includes(input.boundaryType) ? input.boundaryType : 'generic';
  const severity = SEVERITIES.includes(input.severity) ? input.severity : 'medium';
  return {
    id: input.id || id(),
    name: String(input.name || `${boundaryType} boundary`).slice(0, 100),
    boundaryType,
    targetModules: Array.isArray(input.targetModules) ? input.targetModules.slice(0, 40) : [],
    allowedActors: Array.isArray(input.allowedActors) ? input.allowedActors.slice(0, 20) : [],
    requiredFields: Array.isArray(input.requiredFields) ? input.requiredFields.slice(0, 40) : [],
    blockedFields: Array.isArray(input.blockedFields) ? input.blockedFields.slice(0, 60) : [],
    redactionRequired: input.redactionRequired === false ? false : true,
    strictMode: input.strictMode === true,
    dryRun: input.dryRun === false ? false : true,
    severity,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
module.exports = { normalize, BOUNDARY_TYPES, SEVERITIES };
