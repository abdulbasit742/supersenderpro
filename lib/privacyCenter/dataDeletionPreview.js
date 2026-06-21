'use strict';

/**
 * Privacy Center — data deletion PREVIEW. Builds a deletion PLAN only. Never deletes.
    */

const service = require('./privacyRequestService');


const DATA_TYPES = ['leads', 'customers', 'conversations', 'orders', 'payments', 'support_tickets', 'audit_events',
'webhook_events', 'team_members', 'tenant_records'];


// Types that must NEVER be hard-deleted in preview (legal/audit retention).
const PROTECTED = ['payments', 'audit_events', 'tenant_records'];


function run(requestId, opts) {
  const o = opts || {};
     const req = service.get(requestId);
     if (!req) return { ok: false, dryRun: true, liveDelete: false, requestId: requestId, affectedRecordTypes: [],
deletionPlanPreview: [], warnings: [], blockers: ['request not found'] };

  const requested = Array.isArray(o.dataTypes) && o.dataTypes.length ? o.dataTypes.filter(function (t) { return
DATA_TYPES.indexOf(t) !== -1; }) : ['leads', 'customers', 'conversations', 'orders', 'support_tickets'];
     const warnings = ['Deletion plan preview only. Nothing was deleted.'];
     const blockers = [];


     const plan = requested.map(function (type) {
         const protectedType = PROTECTED.indexOf(type) !== -1;
         return {
           dataType: type,
           action: protectedType ? 'retain_or_anonymize' : 'would_delete',
           reason: protectedType ? 'legal/audit retention; anonymize instead of delete' : 'subject request',
           estimatedRecords: 'unknown (preview)',
           wouldDelete: false,
         };
     });


     if (requested.indexOf('payments') !== -1) warnings.push('Payments cannot be hard-deleted; plan anonymizes instead.');
     if (requested.indexOf('audit_events') !== -1) warnings.push('Audit events retained for compliance; excluded from deletion.');
  if (req.status === 'waiting_verification') blockers.push('Identity verification required before any deletion is approved.');

  return { ok: true, dryRun: true, liveDelete: false, requestId: requestId, affectedRecordTypes: requested,
deletionPlanPreview: plan, warnings: warnings, blockers: blockers };
}


module.exports = { run, DATA_TYPES, PROTECTED };
