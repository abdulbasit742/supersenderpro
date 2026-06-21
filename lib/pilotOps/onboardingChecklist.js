'use strict';


/**
 * Pilot Ops — onboarding checklist engine. Generates a per-pilot checklist from
 * a fixed section template and persists item states. No external calls.
 */

const crypto = require('crypto');
const store = require('./store');

const STORE_PATH = process.env.PILOT_OPS_STORE_PATH || 'data/pilot-ops.json';

const ITEM_STATUSES = ['not_started', 'in_progress', 'waiting_customer', 'waiting_admin', 'blocked', 'completed',
'skipped'];

// section, title, required, linkedModule, linkedDoc, fixSteps
const TEMPLATE = [
     ['business_profile', 'Capture business profile', true, 'business_setup', 'docs/PILOT_ONBOARDING_CHECKLIST.md'],
     ['industry_preset', 'Select industry preset', true, 'business_setup', null],
     ['admin_contact', 'Confirm admin contact (masked)', true, 'customer_360', null],
     ['whatsapp_setup', 'Connect WhatsApp (Cloud or local)', true, 'whatsapp', 'docs/WHATSAPP_CLOUD_SETUP_WIZARD.md'],
     ['ai_provider', 'Configure AI provider or local KB', false, 'ai_agents', null],
     ['ecommerce_setup', 'Configure ecommerce/catalog', false, 'ecommerce', null],
     ['payment_setup', 'Configure payment validation', true, 'payments', null],
     ['channel_social', 'Connect channel/social', false, 'social', null],
     ['voice_ai', 'Configure Voice AI (optional)', false, 'voice_ai', null],
     ['customer_360', 'Set up Customer 360', false, 'customer_360', null],
     ['owner_briefing', 'Enable Owner daily briefing', false, 'owner_command', null],
     ['playbooks', 'Load playbooks / SOPs', false, 'playbook', null],
     ['compliance', 'Confirm compliance / consent', true, 'compliance', 'docs/INCIDENT_SAFETY.md'],
     ['demo_walkthrough', 'Complete demo walkthrough', true, 'demo_sandbox', null],
     ['success_criteria', 'Agree pilot success criteria', true, null, 'docs/PILOT_SUCCESS_SCORING.md'],
     ['go_live', 'Go-live decision', true, null, 'docs/PILOT_CONVERSION_PLAYBOOK.md'],
];

function now() { return new Date().toISOString(); }
function read() { return store.read(STORE_PATH, { pilots: [], checklists: {} }); }
function write(db) { return store.write(STORE_PATH, db); }

function generate(pilotId) {
  const db = read();
     if (!db.checklists) db.checklists = {};
     const items = TEMPLATE.map(function (t) {
      return {
        id: 'cl_' + crypto.randomBytes(5).toString('hex'),

          pilotId: pilotId, section: t[0], title: t[1], status: 'not_started',
          required: !!t[2], blocker: false, fixSteps: [], linkedModule: t[3] || null, linkedDoc: t[4] || null, updatedAt:
now(),
       };
     });
     db.checklists[pilotId] = items;
     write(db);
     return items;
}

function get(pilotId) {
     const db = read();
     return (db.checklists && db.checklists[pilotId]) || [];
}


function mark(pilotId, itemId, status, extra) {
  if (ITEM_STATUSES.indexOf(status) === -1) return null;
     const db = read();
     const items = (db.checklists && db.checklists[pilotId]) || [];
     const idx = items.findIndex(function (x) { return x.id === itemId; });
     if (idx === -1) return null;
  items[idx] = Object.assign({}, items[idx], extra || {}, { status: status, blocker: status === 'blocked', updatedAt:
now() });
     db.checklists[pilotId] = items;
     write(db);
     return items[idx];
}

module.exports = { ITEM_STATUSES, TEMPLATE, generate, get, mark };
