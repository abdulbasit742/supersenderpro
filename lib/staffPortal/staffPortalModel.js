// lib/staffPortal/staffPortalModel.js — Standard safe response builders + flags for the Staff Portal.
'use strict';

const { redactStaff } = require('./redactor');

function baseFlags() {
  return { ok: true, dryRun: true, liveActionsEnabled: false };
}

function safeResponse(extra = {}) {
  return Object.assign(baseFlags(), { warnings: [], blockers: [] }, extra);
}

const PORTAL_STATUSES = ['active_preview', 'limited_preview', 'expired_preview', 'blocked_preview', 'demo_preview'];
const ACCESS_MODES = ['preview_token', 'masked_phone_lookup_preview', 'employee_code_preview', 'demo_preview'];

function sessionModel(staff = {}, accessMode = 'demo_preview', status = 'demo_preview') {
  const r = redactStaff(staff);
  const now = new Date().toISOString();
  return {
    id: 'sps_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    portalTokenPreview: 'preview_****',
    staffNameSafe: r.staffNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    status,
    accessMode,
    dryRun: true,
    createdAt: now,
    updatedAt: now,
  };
}

module.exports = { baseFlags, safeResponse, sessionModel, PORTAL_STATUSES, ACCESS_MODES };
