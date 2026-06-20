// lib/whatsappCloudSetup/setupValidator.js — Validates a WhatsApp Cloud config draft. Format-only, no secrets touched.
'use strict';

// Validate incoming config fields. Rejects anything that looks like a raw token/secret being submitted.
function validateConfig(input = {}) {
  const errors = [];
  const warnings = [];

  if (!input.businessName || String(input.businessName).trim().length < 2) {
    warnings.push('businessName missing or too short');
  }

  // Refuse raw access tokens in the payload — tokens belong in .env only.
  for (const k of ['accessToken', 'token', 'permanentToken', 'WHATSAPP_CLOUD_ACCESS_TOKEN']) {
    if (input[k]) errors.push(`raw_secret_rejected: "${k}" must live in .env, never submitted here`);
  }

  // Phone number id / waba id may be provided raw (they will be masked) but must look like ids.
  if (input.phoneNumberId && !/^[\w-]{4,}$/.test(String(input.phoneNumberId))) {
    warnings.push('phoneNumberId format looks unusual');
  }
  if (input.wabaId && !/^[\w-]{4,}$/.test(String(input.wabaId))) {
    warnings.push('wabaId format looks unusual');
  }
  if (input.webhookUrl && !/^https?:\/\/|^\//.test(String(input.webhookUrl))) {
    warnings.push('webhookUrl should be an absolute URL or a path starting with /');
  }

  return { ok: errors.length === 0, errors, warnings };
}

module.exports = { validateConfig };
