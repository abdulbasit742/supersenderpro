// lib/franchisePortal/auditPreview.js — In-memory preview audit log. NO real audit-ledger write.
'use strict';
const { safeResponse } = require('./franchisePortalModel');
const { maskName, safeText } = require('./redactor');

const MAX = 100;
const buffer = [];

function recordPreview(action, franchise = {}, source = 'franchise_portal') {
  const entry = {
    id: 'aud_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    action: safeText(action),
    franchiseMasked: maskName(franchise.name),
    source: safeText(source),
    dryRun: true,
    liveAction: false,
    createdAt: new Date().toISOString(),
  };
  buffer.unshift(entry);
  if (buffer.length > MAX) buffer.length = MAX;
  return entry;
}

function getAuditPreview() {
  return safeResponse({ liveAuditWrite: false, auditPreview: buffer.slice(0, 25) });
}
module.exports = { recordPreview, getAuditPreview };
