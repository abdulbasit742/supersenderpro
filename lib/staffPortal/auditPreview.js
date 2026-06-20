// lib/staffPortal/auditPreview.js — In-memory preview audit log. NO real audit-ledger write.
'use strict';
const { safeResponse } = require('./staffPortalModel');
const { maskName, safeText } = require('./redactor');

const MAX = 100;
const buffer = [];

function recordPreview(action, staff = {}, source = 'staff_portal') {
  const entry = {
    id: 'aud_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    action: safeText(action),
    staffMasked: maskName(staff.name),
    source: safeText(source),
    dryRun: true,
    liveAction: false,
    createdAt: new Date().toISOString(),
  };
  buffer.unshift(entry);
  if (buffer.length > MAX) buffer.length = MAX;
  return entry;
}
function getAuditPreview() { return safeResponse({ liveAuditWrite: false, auditPreview: buffer.slice(0, 25) }); }

module.exports = { recordPreview, getAuditPreview };
