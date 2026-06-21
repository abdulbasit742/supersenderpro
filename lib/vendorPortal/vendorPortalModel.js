// lib/vendorPortal/vendorPortalModel.js — Standard safe response builders + flags for the Vendor Portal.
'use strict';

const { redactVendor } = require('./redactor');

function baseFlags() { return { ok: true, dryRun: true, liveActionsEnabled: false }; }

function safeResponse(extra = {}) {
  return Object.assign(baseFlags(), { warnings: [], blockers: [] }, extra);
}

function sessionModel(vendor = {}, accessMode = 'demo_preview', status = 'demo_preview') {
  const r = redactVendor(vendor);
  const now = new Date().toISOString();
  return {
    id: 'vps_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    vendorTokenPreview: 'vendor_preview_****',
    vendorNameSafe: r.vendorNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    tierSafe: 'tier_preview',
    status,
    accessMode,
    dryRun: true,
    createdAt: now,
    updatedAt: now,
  };
}

const PORTAL_STATUSES = ['active_preview', 'limited_preview', 'on_hold_preview', 'blocked_preview', 'demo_preview'];
const ACCOUNT_STATUSES = ['active_preview', 'pending_preview', 'on_hold_preview', 'suspended_preview', 'inactive_preview'];
const TIERS = ['standard_preview', 'preferred_preview', 'strategic_preview'];
const ACCESS_MODES = ['preview_token', 'masked_phone_lookup_preview', 'vendor_reference_preview',
  'vendor_code_preview', 'supplier_account_preview', 'demo_preview'];

module.exports = { baseFlags, safeResponse, sessionModel, PORTAL_STATUSES, ACCOUNT_STATUSES, TIERS, ACCESS_MODES };
