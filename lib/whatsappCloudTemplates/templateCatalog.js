// lib/whatsappCloudTemplates/templateCatalog.js — Default sample templates (one per category). Dry-run, no PII.
'use strict';

const { buildTemplate } = require('./templateModel');

const DEFAULTS = [
  buildTemplate({
    id: 'wct_sample_order_update',
    name: 'order_update_utility',
    language: 'en_US',
    category: 'utility',
    status: 'draft',
    headerType: 'text',
    body: 'Hi {{name}}, your order {{order_id}} is now {{status}}. Thank you for shopping with us!',
    footer: 'SuperSender Pro',
    buttons: [{ type: 'QUICK_REPLY', text: 'Track order' }],
    sampleValues: { name: 'Ali', order_id: 'A-1029', status: 'shipped' },
  }),
  buildTemplate({
    id: 'wct_sample_promo',
    name: 'seasonal_promo_marketing',
    language: 'en_US',
    category: 'marketing',
    status: 'draft',
    headerType: 'text',
    body: 'Hello {{name}}! Enjoy {{discount}} off this week only. Reply STOP to opt out.',
    footer: 'SuperSender Pro',
    buttons: [{ type: 'URL', text: 'Shop now', url: 'https://example.com/shop' }],
    sampleValues: { name: 'Sara', discount: '20%' },
  }),
  buildTemplate({
    id: 'wct_sample_otp',
    name: 'login_code_authentication',
    language: 'en_US',
    category: 'authentication',
    status: 'draft',
    headerType: 'none',
    body: 'Your verification code is {{code}}. It expires in {{minutes}} minutes.',
    sampleValues: { code: '123456', minutes: '10' },
  }),
];

function seedTemplates() {
  // Return fresh clones so callers can persist without mutating the catalog.
  return DEFAULTS.map((t) => JSON.parse(JSON.stringify(t)));
}

module.exports = { DEFAULTS, seedTemplates };
