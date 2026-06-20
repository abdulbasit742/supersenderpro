// lib/securityGateway/securityPolicy.js — Security policy model + CRUD over the store.
const crypto = require('crypto');
const { Store } = require('./store');

const SCOPES = ['public_form','public_api','admin_api','developer_api','webhook','reseller_portal','tenant_portal','billing_preview','support','audit','deployment','approval','generic'];
const BLOCK_MODES = ['report_only','warn','block_preview','block_live_if_enabled'];
const SEVERITIES = ['low','medium','high','critical'];

function now() { return new Date().toISOString(); }
function id() { return `pol_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`; }

function normalize(input = {}) {
  const scope = SCOPES.includes(input.scope) ? input.scope : 'generic';
  const blockMode = BLOCK_MODES.includes(input.blockMode) ? input.blockMode : 'report_only';
  const severity = SEVERITIES.includes(input.severity) ? input.severity : 'low';
  return {
    id: input.id || id(),
    name: String(input.name || `${scope} policy`).slice(0, 80),
    scope,
    targetPattern: String(input.targetPattern || '*').slice(0, 200),
    authRequired: input.authRequired === true,
    allowedRoles: Array.isArray(input.allowedRoles) ? input.allowedRoles.slice(0, 30) : [],
    allowedScopes: Array.isArray(input.allowedScopes) ? input.allowedScopes.slice(0, 30) : [],
    rateLimitKey: String(input.rateLimitKey || scope).slice(0, 60),
    maxRequests: Number.isFinite(Number(input.maxRequests)) ? Number(input.maxRequests) : 60,
    windowSeconds: Number.isFinite(Number(input.windowSeconds)) ? Number(input.windowSeconds) : 600,
    blockMode,
    dryRun: input.dryRun === false ? false : true,
    severity,
    createdAt: input.createdAt || now(),
    updatedAt: now(),
  };
}

function create(input) { return Store.upsertPolicy(normalize(input)); }
function update(idVal, patch) { const cur = Store.getPolicy(idVal); if (!cur) return null; return Store.upsertPolicy(normalize({ ...cur, ...patch, id: idVal, createdAt: cur.createdAt })); }
function list() { return Store.listPolicies(); }
function get(idVal) { return Store.getPolicy(idVal); }

function seedDefaults() {
  if (Store.listPolicies().length) return Store.listPolicies();
  const defs = [
    { name: 'Public form protection', scope: 'public_form', targetPattern: '/api/public-funnel/*', maxRequests: 10, windowSeconds: 600, severity: 'medium' },
    { name: 'Public API protection', scope: 'public_api', targetPattern: '/api/public/*', maxRequests: 60, windowSeconds: 600, severity: 'medium' },
    { name: 'Developer API scope guard', scope: 'developer_api', targetPattern: '/api/developer/*', maxRequests: 300, windowSeconds: 600, authRequired: true, severity: 'medium' },
    { name: 'Webhook abuse guard', scope: 'webhook', targetPattern: '/api/webhooks/*', maxRequests: 30, windowSeconds: 600, severity: 'high' },
    { name: 'Admin route guard (warn-only)', scope: 'admin_api', targetPattern: '/api/admin/*', blockMode: 'warn', maxRequests: 120, windowSeconds: 600, authRequired: true, severity: 'high' },
    { name: 'Tenant isolation guard', scope: 'tenant_portal', targetPattern: '/api/tenant/*', authRequired: true, severity: 'high' },
  ];
  defs.forEach(create);
  return Store.listPolicies();
}

module.exports = { create, update, list, get, normalize, seedDefaults, SCOPES, BLOCK_MODES, SEVERITIES };
