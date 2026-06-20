// lib/whatsappCloudTemplates/templateModel.js — WhatsApp Cloud message template model + helpers.
'use strict';

const CATEGORIES = ['marketing', 'utility', 'authentication'];
const STATUSES = ['draft', 'pending', 'approved', 'rejected', 'paused', 'disabled', 'unknown'];
const HEADER_TYPES = ['none', 'text', 'image', 'video', 'document'];

function newTemplateId() {
  return 'wct_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Extract {{1}} positional and {{name}} named variables from a body string.
function extractVariables(body = '') {
  const set = [];
  const re = /\{\{\s*([\w]+)\s*\}\}/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    if (!set.includes(m[1])) set.push(m[1]);
  }
  return set;
}

function buildTemplate(input = {}) {
  const now = new Date().toISOString();
  const body = String(input.body || '');
  const variables = input.variables && input.variables.length ? input.variables : extractVariables(body);
  return {
    id: input.id || newTemplateId(),
    name: String(input.name || '').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 512),
    language: input.language || 'en_US',
    category: CATEGORIES.includes(input.category) ? input.category : 'utility',
    status: STATUSES.includes(input.status) ? input.status : 'draft',
    headerType: HEADER_TYPES.includes(input.headerType) ? input.headerType : 'none',
    body,
    footer: String(input.footer || '').slice(0, 60),
    buttons: Array.isArray(input.buttons) ? input.buttons.slice(0, 10) : [],
    variables,
    sampleValues: input.sampleValues && typeof input.sampleValues === 'object' ? input.sampleValues : {},
    qualityRating: input.qualityRating || 'unknown',
    rejectionReason: input.rejectionReason || null,
    dryRun: input.dryRun !== undefined ? !!input.dryRun : true,
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
}

module.exports = { buildTemplate, extractVariables, newTemplateId, CATEGORIES, STATUSES, HEADER_TYPES };
