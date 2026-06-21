'use strict';
const b = require('./_base');
const P = 'auditSecurityMock';
function getStatus() { return b.status(P); }
function validateInput(i) { return b.validate(i, []); }
function runPreview(i) {
  i = i || {};
  if (i.action === 'approval') return b.preview(P, 'approval', { action: i.action_name || i.action || 'bulk_send', count:
i.count || 1 }, { approvalId: 'DEMO-APPR-001', status: 'pending_review', wouldExecute: false }, ['Approval required; nothing executed.']);
  return b.preview(P, 'event', { kind: i.kind || 'suspicious_login', severity: i.severity || 'medium' }, { eventId:
'DEMO-AUDIT-001', logged: true, wouldAlertExternally: false }, ['Audit event simulated; no external alert.']);
}
function getSampleScenarios() { return ['audit_warning', 'approval_required']; }
module.exports = { getStatus, runPreview, getSampleScenarios, validateInput };
