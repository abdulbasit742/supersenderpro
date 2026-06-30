'use strict';
/**
 * lib/contacts/config.js - config for the Contacts CRM + dynamic Segmentation module.
 * The targeting layer that makes broadcasts convert: contacts + attributes + tags + segments.
 * No sending here; segments resolve to recipient lists the broadcast engine consumes.
 */
const path = require('path');

const bool = (v, def = false) => {
  if (v === undefined || v === null || v === '') return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};

const DATA_DIR = path.join(__dirname, '../../data/contacts');

// Operators usable in segment rules.
const OPERATORS = ['eq', 'neq', 'contains', 'gt', 'lt', 'gte', 'lte', 'exists', 'not_exists', 'in', 'has_tag', 'no_tag', 'active_within_days', 'inactive_for_days'];

module.exports = {
  paths: {
    dir: DATA_DIR,
    contacts: (tid) => path.join(DATA_DIR, tid + '_contacts.json'),
    segments: (tid) => path.join(DATA_DIR, tid + '_segments.json'),
  },
  operators: OPERATORS,
  config: {
    enabled: bool(process.env.CONTACTS_ENABLED, true),
    requireAdmin: bool(process.env.CONTACTS_REQUIRE_ADMIN, true),
    maxSegmentPreview: Number(process.env.CONTACTS_MAX_SEGMENT_PREVIEW || 100),
  },
};
