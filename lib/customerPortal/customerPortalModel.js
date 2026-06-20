// lib/customerPortal/customerPortalModel.js — Standard safe response builders + flags for the Customer Portal.
'use strict';

const { redactCustomer } = require('./redactor');

// Flags that MUST appear on every response.
function baseFlags() {
  return { ok: true, dryRun: true, liveActionsEnabled: false };
}

// Wrap a payload with the base safety flags + warnings/blockers defaults.
function safeResponse(extra = {}) {
  return Object.assign(baseFlags(), { warnings: [], blockers: [] }, extra);
}

// Session / status lookup model.
function sessionModel(customer = {}, accessMode = 'demo_preview', status = 'demo_preview') {
  const r = redactCustomer(customer);
  const now = new Date().toISOString();
  return {
    id: 'cps_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    portalTokenPreview: 'preview_****',
    customerNameSafe: r.customerNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    status,
    accessMode,
    dryRun: true,
    createdAt: now,
    updatedAt: now,
  };
}

const PORTAL_STATUSES = ['active_preview', 'limited_preview', 'expired_preview', 'blocked_preview', 'demo_preview'];
const ACCESS_MODES = ['preview_token', 'masked_phone_lookup_preview', 'invoice_reference_preview',
  'order_reference_preview', 'ticket_reference_preview', 'demo_preview'];

module.exports = { baseFlags, safeResponse, sessionModel, PORTAL_STATUSES, ACCESS_MODES };
