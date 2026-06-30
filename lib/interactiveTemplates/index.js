'use strict';
/**
 * lib/interactiveTemplates/index.js - real WhatsApp Interactive Message builder.
 *
 * Build, validate, store and render WhatsApp Cloud API interactive messages:
 *   - reply buttons (max 3)
 *   - list menus (sections + rows)
 *   - CTA-URL buttons
 * Replaces the simulation-grade stub in lib/competitorParity.js with a real, spec-validated
 * module. Safe by default: INTERACTIVE_TEMPLATES_DRY_RUN=true builds payloads without sending.
 * Wire the API with: node scripts/wire-interactive-templates.js
 */
const config = require('./config');
const store = require('./store');
const templates = require('./templates');
const payload = require('./payload');

/** Ready-made sample templates (also used by doctor + smoke check). */
function examples() {
  return {
    buttons: {
      name: 'Order confirm buttons', type: 'buttons',
      bodyText: 'Hi {{name}}, aap ka order ready hai. Aage kya karein?',
      footerText: 'SuperSender',
      buttons: [
        { id: 'confirm', title: 'Confirm ✅' },
        { id: 'change', title: 'Change order' },
        { id: 'cancel', title: 'Cancel' },
      ],
    },
    list: {
      name: 'Product menu', type: 'list', listButtonText: 'View menu',
      bodyText: 'Salam {{name}}! Hamare categories dekhein:',
      sections: [
        { title: 'Popular', rows: [
          { id: 'p1', title: 'Starter Plan', description: 'Best for small business' },
          { id: 'p2', title: 'Pro Plan', description: 'Most popular' },
        ] },
        { title: 'Enterprise', rows: [ { id: 'p3', title: 'Agency Plan', description: 'Multi-client' } ] },
      ],
    },
    cta_url: {
      name: 'Visit store CTA', type: 'cta_url',
      bodyText: '{{name}}, naya collection live hai! 🎉',
      cta: { displayText: 'Shop now', url: 'https://example.com/shop' },
    },
  };
}

/**
 * Render a stored template into a send-ready payload for a recipient.
 * DRY-RUN by default: returns the payload but does NOT send.
 */
async function send(tid, tplId, toPhone, ctx = {}, opts = {}) {
  const tpl = templates.get(tid, tplId);
  if (!tpl) throw new Error('template not found');
  const built = payload.build(tpl, toPhone, ctx);
  const dryRun = opts.forceDryRun != null ? !!opts.forceDryRun : config.config.dryRun;
  let sent = false;
  if (!dryRun && typeof global.sendWhatsApp === 'function' && toPhone) {
    try { await global.sendWhatsApp(toPhone, built, { tenantId: tid, source: 'interactive_template', interactive: true }); sent = true; } catch { sent = false; }
  }
  return { dryRun, sent, payload: built };
}

module.exports = {
  config: config.config,
  paths: config.paths,
  limits: config.limits,
  types: config.types,
  store, templates, payload, examples, send,
  validate: payload.validate,
  build: payload.build,
  doctor: require('./doctor'),
};
