// lib/franchisePortal/franchisePortalModel.js — Standard safe response builders + flags for the Franchise Portal.
'use strict';

const { redactFranchise } = require('./redactor');

function baseFlags() { return { ok: true, dryRun: true, liveActionsEnabled: false }; }
function safeResponse(extra = {}) { return Object.assign(baseFlags(), { warnings: [], blockers: [] }, extra); }

function sessionModel(franchise = {}, accessMode = 'demo_preview', status = 'demo_preview') {
  const r = redactFranchise(franchise);
  const now = new Date().toISOString();
  return {
    id: 'fps_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    franchiseTokenPreview: 'franchise_preview_****',
    franchiseNameSafe: r.franchiseNameSafe,
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
const AGREEMENT_STATUSES = ['active_preview', 'onboarding_preview', 'renewal_due_preview', 'suspended_preview', 'terminated_preview'];
const TIERS = ['unit_preview', 'multi_unit_preview', 'master_preview'];
const ACCESS_MODES = ['preview_token', 'masked_phone_lookup_preview', 'franchise_reference_preview',
  'franchise_code_preview', 'outlet_account_preview', 'demo_preview'];

module.exports = { baseFlags, safeResponse, sessionModel, PORTAL_STATUSES, AGREEMENT_STATUSES, TIERS, ACCESS_MODES };
