#!/usr/bin/env node
'use strict';
const crypto = require('crypto');

console.log('\n🔐 SuperSender Pro — Secure Secret Generator\n');
console.log('Copy these values into your .env file:\n');
console.log('─'.repeat(60));

const secrets = [
  { key: 'JWT_SECRET',                      value: crypto.randomBytes(48).toString('hex') },
  { key: 'SESSION_SECRET',                  value: crypto.randomBytes(48).toString('hex') },
  { key: 'ENCRYPTION_KEY',                  value: crypto.randomBytes(32).toString('hex') },
  { key: 'N8N_WEBHOOK_SECRET',              value: crypto.randomBytes(32).toString('hex') },
  { key: 'WHATSAPP_CLOUD_VERIFY_TOKEN',     value: 'wa_verify_' + crypto.randomBytes(16).toString('hex') },
  { key: 'WHATSAPP_CLOUD_WEBHOOK_SECRET',   value: crypto.randomBytes(32).toString('hex') },
  { key: 'DEVELOPER_PORTAL_WEBHOOK_SECRET', value: crypto.randomBytes(32).toString('hex') },
  { key: 'ADMIN_AUTH_PASSWORD',             value: 'SP_' + crypto.randomBytes(12).toString('base64url') },
];

for (const { key, value } of secrets) {
  console.log(`${key}=${value}`);
}

console.log('─'.repeat(60));
console.log('\n⚠️  IMPORTANT: Save these values NOW. They cannot be recovered.');
console.log('⚠️  Never commit these to Git.');
console.log('⚠️  Use different values for development and production.\n');
