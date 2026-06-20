// lib/staffPortal/staffPortalModel.js — Standard safe response builders + flags for the Staff Portal.
'use strict';

const { redactStaff } = require('./redactor');

// Flags that MUST appear on every response.
function baseFlags() {
  return { ok: true, dryRun: true, liveActionsEnabled: false };
}

// Wrap a payload with the base safety flags + warnings/blockers defaults.
function safeResponse(extra = {}) {
  return Object.assign(baseFlags(), { warnings: [], blockers: [] }, extra);
}

// Session / status lookup model.
function sessionModel(staff = {}, accessMode = 'demo_preview', status = 'demo_preview') {
  const r = redactStaff(staff);
  const now = new Date().toISOString();
  return {
    id: 'sps_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    staffTokenPreview: 'staff_preview_****',
    staffNameSafe: r.staffNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    roleSafe: 'employee_preview',
    branchSafe: 'branch_preview',
    status,
    accessMode,
    dryRun: true,
    createdAt: now,
    updatedAt: now,
  };
}

const PORTAL_STATUSES = ['active_preview', 'limited_preview', 'inactive_preview', 'blocked_preview', 'demo_preview'];
const EMPLOYMENT_STATUSES = ['active_preview', 'probation_preview', 'on_leave_preview', 'suspended_preview',
  'resigned_preview', 'terminated_preview', 'inactive_preview'];
const ACCESS_MODES = ['preview_token', 'masked_phone_lookup_preview', 'staff_reference_preview',
  'employee_code_preview', 'branch_staff_preview', 'demo_preview'];

module.exports = { baseFlags, safeResponse, sessionModel, PORTAL_STATUSES, EMPLOYMENT_STATUSES, ACCESS_MODES };
