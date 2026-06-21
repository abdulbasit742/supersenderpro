'use strict';

/**
 * Privacy Center — privacy request normalization. PII masked at write time.
 */

const crypto = require('crypto');
const redactor = require('./redactor');


const REQUEST_TYPES = ['data_access', 'data_export', 'data_deletion', 'consent_review', 'opt_out', 'correction',
'audit_export'];
const STATUSES = ['new', 'in_review', 'waiting_verification', 'approved_preview', 'rejected_preview',
'completed_preview', 'archived'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];


function id() { return 'preq_' + crypto.randomBytes(7).toString('hex'); }
function now() { return new Date().toISOString(); }


function normalize(input) {
  const i = input || {};
  return {
    id: i.id || id(),
      requestType: REQUEST_TYPES.indexOf(i.requestType) !== -1 ? i.requestType : 'data_access',
      requesterNameSafe: redactor.safeName(i.requesterName || i.requesterNameSafe),
      phoneMasked: redactor.maskPhone(i.phone || i.phoneMasked),

         emailMasked: redactor.maskEmail(i.email || i.emailMasked),
         tenantId: i.tenantId ? String(i.tenantId).slice(0, 64) : null,
         status: STATUSES.indexOf(i.status) !== -1 ? i.status : 'new',
         priority: PRIORITIES.indexOf(i.priority) !== -1 ? i.priority : 'normal',
         dueAt: i.dueAt || defaultDue(),
         assignedTo: i.assignedTo ? String(i.assignedTo).slice(0, 64) : null,
         notesPreview: redactor.safePreview(i.notes || i.notesPreview, 300),
         dryRun: true,
         createdAt: i.createdAt || now(),
         updatedAt: now(),
     };
}

// GDPR-style default: 30 days from creation.
function defaultDue() { return new Date(Date.now() + 30 * 86400000).toISOString(); }


module.exports = { REQUEST_TYPES, STATUSES, PRIORITIES, normalize, defaultDue };
