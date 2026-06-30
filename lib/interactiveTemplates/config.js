'use strict';
/**
 * lib/interactiveTemplates/config.js - config for the WhatsApp Interactive Message builder.
 * Turns the competitorParity stub into a real, validated module (reply buttons / list / CTA-URL).
 * Safe by default: INTERACTIVE_TEMPLATES_DRY_RUN=true builds payloads WITHOUT sending.
 */
const path = require('path');

const bool = (v, def = false) => {
  if (v === undefined || v === null || v === '') return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};

const DATA_DIR = path.join(__dirname, '../../data/interactive_templates');

// WhatsApp Cloud API interactive message spec limits.
const LIMITS = {
  bodyText: 1024,
  footerText: 60,
  headerText: 60,
  buttons: 3,
  buttonTitle: 20,
  listButton: 20,
  listSections: 10,
  listRowsTotal: 10,
  rowTitle: 24,
  rowDescription: 72,
  sectionTitle: 24,
  ctaButtonText: 20,
};

const TYPES = ['buttons', 'list', 'cta_url'];

module.exports = {
  paths: {
    dir: DATA_DIR,
    templates: (tid) => path.join(DATA_DIR, tid + '_templates.json'),
  },
  limits: LIMITS,
  types: TYPES,
  config: {
    enabled: bool(process.env.INTERACTIVE_TEMPLATES_ENABLED, true),
    dryRun: bool(process.env.INTERACTIVE_TEMPLATES_DRY_RUN, true),
    requireAdmin: bool(process.env.INTERACTIVE_TEMPLATES_REQUIRE_ADMIN, true),
  },
};
