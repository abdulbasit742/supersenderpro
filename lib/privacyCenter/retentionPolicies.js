'use strict';


/**
    * Privacy Center — data retention policies (JSON file). Run = PREVIEW only; never
    * deletes or anonymizes real data.
    */

const crypto = require('crypto');
const store = require('./store');

const STORE_PATH = process.env.PRIVACY_CENTER_RETENTION_PATH || 'data/privacy-retention.json';
const DATA_TYPES = ['leads', 'customers', 'conversations', 'orders', 'payments', 'support_tickets', 'audit_events',
'webhook_events', 'team_members', 'tenant_records'];
const ACTIONS = ['anonymize', 'delete_preview', 'archive', 'retain'];

function id() { return 'ret_' + crypto.randomBytes(6).toString('hex'); }
function now() { return new Date().toISOString(); }
function read() { return store.read(STORE_PATH, { policies: defaults() }); }
function write(db) { return store.write(STORE_PATH, db); }

function defaults() {
     return [
       { id: 'ret_leads', name: 'Leads retention', dataType: 'leads', retentionDays: 365, action: 'anonymize', dryRun: true,
enabled: true, updatedAt: now() },
    { id: 'ret_convos', name: 'Conversations retention', dataType: 'conversations', retentionDays: 180, action:
'anonymize', dryRun: true, enabled: true, updatedAt: now() },
    { id: 'ret_audit', name: 'Audit retention', dataType: 'audit_events', retentionDays: 730, action: 'retain', dryRun:
true, enabled: true, updatedAt: now() },
    { id: 'ret_payments', name: 'Payments retention', dataType: 'payments', retentionDays: 2555, action: 'retain',
dryRun: true, enabled: true, updatedAt: now() },
  ];
}

function normalize(input) {
  const i = input || {};
     return {
       id: i.id || id(),
         name: i.name ? String(i.name).slice(0, 120) : 'Untitled policy',
         dataType: DATA_TYPES.indexOf(i.dataType) !== -1 ? i.dataType : 'leads',
         retentionDays: Math.max(1, parseInt(i.retentionDays, 10) || 365),
         action: ACTIONS.indexOf(i.action) !== -1 ? i.action : 'anonymize',
         dryRun: true,
         enabled: i.enabled !== false,
         updatedAt: now(),
     };

}

function list() { return read().policies; }
function create(input) { const db = read(); const rec = normalize(input); db.policies.push(rec); write(db); return rec; }
function get(pid) { return read().policies.find(function (p) { return p.id === pid; }) || null; }

// Run a policy as a PREVIEW: describe what WOULD happen. Never acts.
function runPreview(pid) {
 const p = get(pid);
    if (!p) return { ok: false, dryRun: true, blockers: ['policy not found'] };
    const warnings = ['Preview only. No records were anonymized or deleted.'];
 if (p.action === 'delete_preview' && ['payments', 'audit_events', 'tenant_records'].indexOf(p.dataType) !== -1)
warnings.push('Protected data type; would retain/anonymize instead of delete.');
    return {
      ok: true, dryRun: true, liveActionsEnabled: false, policyId: pid,
   plan: { dataType: p.dataType, olderThanDays: p.retentionDays, action: p.action, wouldAffect: 'unknown (preview)',
wouldExecute: false },
        warnings: warnings, blockers: [],
    };
}

module.exports = { DATA_TYPES, ACTIONS, list, create, get, runPreview, normalize };
