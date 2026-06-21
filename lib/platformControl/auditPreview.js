// lib/platformControl/auditPreview.js — read-only, redacted audit trail preview. No real audit data exposed.
'use strict';
const cfg = require('./config');
const { safeText } = require('./redactor');

function getAuditPreview() {
  const auditModulesPreview = cfg.HINTS.audit.filter((p) => cfg.exists(p)).map(safeText);
  const sample = [
    { ts: new Date().toISOString(), actor: 'a***', action: 'view_platform_control_preview', target: 'platform-control', result: 'ok_preview' },
    { ts: new Date().toISOString(), actor: 'a***', action: 'scan_readiness_preview', target: 'readiness', result: 'ok_preview' },
  ];
  return cfg.safetyFlags({
    piiMasked: true,
    auditModulesPreview,
    auditTrailPreview: sample,
    rawAuditExposed: false,
    warnings: [], blockers: [],
  });
}
module.exports = { getAuditPreview };
