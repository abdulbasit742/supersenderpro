'use strict';
/**
 * workflowTemplates.js — Workflow Builder Feature #2: ready-made automations.
 *
 * Feature #1 gives a blank trigger->condition->action engine. Most users don't want a blank canvas —
 * they want proven playbooks working in one click. This is a library of the classics, pre-wired to
 * the events the other departments emit (order, payment_received, optout, stage_change, ...).
 *
 * installTemplate(id, params) fills the template's placeholders (e.g. which drip campaign to enroll
 * in) and creates a real workflow via the engine from #1. No code required.
 */

let engine = null;
try { engine = require('./workflowEngine'); } catch { engine = null; }

// Each template is a workflow blueprint. {{tokens}} are filled from params at install time.
const TEMPLATES = [
  {
    id: 'abandoned_cart',
    name: 'Abandoned cart recovery',
    description: 'When a checkout starts but no payment follows, nudge the customer to complete it.',
    params: ['delayDripCampaignId'],
    blueprint: {
      name: 'Abandoned cart recovery',
      trigger: 'checkout_started',
      match: 'all',
      conditions: [],
      actions: [
        { type: 'add_tag', params: { tag: 'abandoned_cart' } },
        { type: 'enroll_drip', params: { campaignId: '{{delayDripCampaignId}}' } }
      ]
    }
  },
  {
    id: 'welcome_new_customer',
    name: 'Welcome new customer',
    description: 'On first paid order, tag as customer and send a welcome series.',
    params: ['welcomeDripCampaignId'],
    blueprint: {
      name: 'Welcome new customer',
      trigger: 'order',
      match: 'all',
      conditions: [{ field: 'orderCount', op: 'eq', value: 1 }],
      actions: [
        { type: 'add_tag', params: { tag: 'customer' } },
        { type: 'enroll_drip', params: { campaignId: '{{welcomeDripCampaignId}}' } },
        { type: 'send_message', params: { text: 'Welcome aboard! \uD83C\uDF89 Thanks for your first order.' } }
      ]
    }
  },
  {
    id: 'win_back_lapsed',
    name: 'Win back lapsed customers',
    description: 'When a customer has not ordered in a while, send a win-back offer.',
    params: ['winbackDripCampaignId'],
    blueprint: {
      name: 'Win back lapsed customers',
      trigger: 'customer_lapsed',
      match: 'all',
      conditions: [],
      actions: [
        { type: 'add_tag', params: { tag: 'win_back' } },
        { type: 'enroll_drip', params: { campaignId: '{{winbackDripCampaignId}}' } }
      ]
    }
  },
  {
    id: 'vip_upgrade',
    name: 'VIP upgrade on big spend',
    description: 'When a payment is large or lifetime spend crosses a threshold, mark VIP + thank.',
    params: ['minAmount'],
    blueprint: {
      name: 'VIP upgrade on big spend',
      trigger: 'payment_received',
      match: 'all',
      conditions: [{ field: 'amount', op: 'gte', value: '{{minAmount}}' }],
      actions: [
        { type: 'add_tag', params: { tag: 'VIP' } },
        { type: 'send_message', params: { text: 'You\u2019re a VIP now \uD83D\uDC8E thanks for your support! Enjoy priority service.' } }
      ]
    }
  },
  {
    id: 'payment_failed_recovery',
    name: 'Payment failed -> start dunning',
    description: 'When a renewal payment fails, open a dunning case to recover it.',
    params: [],
    blueprint: {
      name: 'Payment failed -> start dunning',
      trigger: 'payment_failed',
      match: 'all',
      conditions: [],
      actions: [
        { type: 'open_dunning', params: {} },
        { type: 'add_tag', params: { tag: 'past_due' } }
      ]
    }
  },
  {
    id: 'optout_cleanup',
    name: 'Opt-out cleanup',
    description: 'When someone opts out, tag them and stop marketing to them.',
    params: [],
    blueprint: {
      name: 'Opt-out cleanup',
      trigger: 'optout',
      match: 'all',
      conditions: [],
      actions: [
        { type: 'add_tag', params: { tag: 'do_not_contact' } }
      ]
    }
  }
];

function listTemplates() {
  return TEMPLATES.map(({ blueprint, ...meta }) => meta);
}
function getTemplate(id) { return TEMPLATES.find(t => t.id === id) || null; }

// Deep-fill {{tokens}} in the blueprint from params.
function fill(obj, params) {
  if (typeof obj === 'string') {
    return obj.replace(/\{\{(\w+)\}\}/g, (_, k) => (params[k] != null ? params[k] : ''));
  }
  if (Array.isArray(obj)) return obj.map(v => fill(v, params));
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = fill(v, params);
    return out;
  }
  return obj;
}

/**
 * Install a template as a real workflow. Fills placeholders from params, then creates it via the
 * engine (#1). Returns the created workflow.
 */
function installTemplate(id, params = {}) {
  if (!engine) throw new Error('workflow engine not available');
  const tpl = getTemplate(id);
  if (!tpl) throw new Error(`unknown template "${id}"`);
  const missing = (tpl.params || []).filter(p => params[p] === undefined || params[p] === '');
  if (missing.length) throw new Error(`missing params: ${missing.join(', ')}`);
  const blueprint = fill(tpl.blueprint, params);
  // coerce numeric-looking condition values that came from params
  for (const c of (blueprint.conditions || [])) {
    if (typeof c.value === 'string' && c.value !== '' && !Number.isNaN(Number(c.value))) c.value = Number(c.value);
  }
  return engine.createWorkflow(blueprint);
}

module.exports = { listTemplates, getTemplate, installTemplate, TEMPLATES };
