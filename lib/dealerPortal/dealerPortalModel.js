// lib/dealerPortal/dealerPortalModel.js — Standard safe response builders + flags for the Dealer Portal.
'use strict';

const { redactDealer } = require('./redactor');

// Flags that MUST appear on every response.
function baseFlags() {
  return { ok: true, dryRun: true, liveActionsEnabled: false };
}

// Wrap a payload with the base safety flags + warnings/blockers defaults.
function safeResponse(extra = {}) {
  return Object.assign(baseFlags(), { warnings: [], blockers: [] }, extra);
}

// Session / status lookup model.
function sessionModel(dealer = {}, accessMode = 'demo_preview', status = 'demo_preview') {
  const r = redactDealer(dealer);
  const now = new Date().toISOString();
  return {
    id: 'dps_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    dealerTokenPreview: 'dealer_preview_****',
    dealerNameSafe: r.dealerNameSafe,
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
const TIERS = ['silver_preview', 'gold_preview', 'platinum_preview', 'distributor_preview'];
const ACCESS_MODES = ['preview_token', 'masked_phone_lookup_preview', 'dealer_reference_preview',
  'dealer_code_preview', 'b2b_account_preview', 'demo_preview'];

module.exports = { baseFlags, safeResponse, sessionModel, PORTAL_STATUSES, ACCOUNT_STATUSES, TIERS, ACCESS_MODES };
