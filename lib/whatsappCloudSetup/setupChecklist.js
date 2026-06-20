// lib/whatsappCloudSetup/setupChecklist.js — The 14-step WhatsApp Cloud onboarding checklist.
'use strict';

const store = require('./store');

// Each item: key, label, group, and an optional auto() predicate that derives done-state from config.
const ITEMS = [
  { key: 'meta_app_created', label: 'Meta app created', group: 'meta' },
  { key: 'waba_connected', label: 'WhatsApp Business Account connected', group: 'meta',
    auto: (c) => !!c.wabaIdMasked },
  { key: 'phone_number_id_added', label: 'Phone number ID added', group: 'meta',
    auto: (c) => !!c.phoneNumberIdMasked },
  { key: 'display_name_reviewed', label: 'Business display name reviewed', group: 'meta',
    auto: (c) => !!c.businessName },
  { key: 'permanent_token_added', label: 'Permanent token added in .env only (not stored)', group: 'security',
    auto: (c) => !!c.accessTokenConfigured },
  { key: 'webhook_url_configured', label: 'Webhook URL configured', group: 'webhook',
    auto: (c) => !!c.webhookUrl },
  { key: 'verify_token_configured', label: 'Verify token configured', group: 'webhook',
    auto: (c) => !!c.verifyTokenConfigured },
  { key: 'webhook_subscribed_messages', label: 'Webhook subscribed to messages', group: 'webhook',
    auto: (c) => !!c.webhookVerified },
  { key: 'template_namespace_understood', label: 'Template namespace / category understood', group: 'templates' },
  { key: 'first_template_created', label: 'First template created', group: 'templates',
    auto: (c) => !!c.templatesReady },
  { key: 'template_approved', label: 'Template approved', group: 'templates' },
  { key: 'test_send_preview_ready', label: 'Test send preview ready', group: 'templates' },
  { key: 'payment_business_verification', label: 'Payment method / business verification noted', group: 'production',
    auto: (c) => !!(c.paymentMethodConfigured && c.businessVerified) },
  { key: 'production_risk_notes_reviewed', label: 'Production risk notes reviewed', group: 'production' },
];

function getChecklist() {
  const config = store.getConfig();
  const state = store.getChecklistState();
  return ITEMS.map((item) => {
    const manual = state[item.key];
    const auto = typeof item.auto === 'function' ? item.auto(config) : undefined;
    const done = manual !== undefined ? !!manual : !!auto;
    return {
      key: item.key,
      label: item.label,
      group: item.group,
      done,
      source: manual !== undefined ? 'manual' : (auto !== undefined ? 'auto' : 'pending'),
    };
  });
}

function updateItem(key, done) {
  if (!ITEMS.some((i) => i.key === key)) {
    return { ok: false, error: 'unknown_checklist_item' };
  }
  store.setChecklistItem(key, done);
  return { ok: true, checklist: getChecklist() };
}

function summary() {
  const list = getChecklist();
  const done = list.filter((i) => i.done).length;
  return { total: list.length, done, remaining: list.length - done };
}

module.exports = { ITEMS, getChecklist, updateItem, summary };
