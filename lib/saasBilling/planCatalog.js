'use strict';

/**
    * SaaS Billing — plan catalog (preview). Prices are pricePreview only; no real billing.
    * Meters: whatsapp_messages, whatsapp_devices, contacts, team_members, ai_replies,
    * flows, campaigns, integrations, storage_mb, api_requests, webhook_events.
    */

const now = function () { return new Date().toISOString(); };


function plan(id, name, pricePreview, limits, features) {
  return { id: id, name: name, pricePreview: pricePreview, currency: 'PKR', billingCycle: 'monthly', limits: limits,
features: features, status: 'active', dryRun: true, createdAt: now(), updatedAt: now() };
}

const PLANS = [
  plan('free_preview', 'Free (preview)', 0,
    { whatsapp_messages: 200, whatsapp_devices: 1, contacts: 250, team_members: 1, ai_replies: 50, flows: 1, campaigns:
1, integrations: 1, storage_mb: 100, api_requests: 500, webhook_events: 200 },
       ['inbox', 'basic_flows']),
     plan('starter_preview', 'Starter (preview)', 1500,
    { whatsapp_messages: 5000, whatsapp_devices: 2, contacts: 5000, team_members: 3, ai_replies: 1000, flows: 10,
campaigns: 10, integrations: 3, storage_mb: 1000, api_requests: 10000, webhook_events: 5000 },
       ['inbox', 'basic_flows', 'campaigns', 'ai_replies']),
     plan('pro_preview', 'Pro (preview)', 4500,
    { whatsapp_messages: 50000, whatsapp_devices: 5, contacts: 50000, team_members: 10, ai_replies: 20000, flows: 100,
campaigns: 100, integrations: 10, storage_mb: 10000, api_requests: 100000, webhook_events: 50000 },
       ['inbox', 'flows', 'campaigns', 'ai_replies', 'integrations', 'analytics']),
     plan('agency_preview', 'Agency (preview)', 12000,
    { whatsapp_messages: 250000, whatsapp_devices: 15, contacts: 250000, team_members: 30, ai_replies: 100000, flows:
500, campaigns: 500, integrations: 30, storage_mb: 50000, api_requests: 500000, webhook_events: 250000 },
       ['inbox', 'flows', 'campaigns', 'ai_replies', 'integrations', 'analytics', 'white_label', 'reseller']),
     plan('enterprise_preview', 'Enterprise (preview)', 30000,
    { whatsapp_messages: -1, whatsapp_devices: -1, contacts: -1, team_members: -1, ai_replies: -1, flows: -1, campaigns:
-1, integrations: -1, storage_mb: -1, api_requests: -1, webhook_events: -1 },
    ['inbox', 'flows', 'campaigns', 'ai_replies', 'integrations', 'analytics', 'white_label', 'reseller', 'sso',
'priority_support', 'custom_limits']),
];
// limit -1 = unlimited (preview).

const METERS = ['whatsapp_messages', 'whatsapp_devices', 'contacts', 'team_members', 'ai_replies', 'flows', 'campaigns',
'integrations', 'storage_mb', 'api_requests', 'webhook_events'];

function list() { return PLANS.map(function (p) { return Object.assign({}, p); }); }

function get(id) { const p = PLANS.find(function (x) { return x.id === id; }); return p ? Object.assign({}, p) : null; }
function order() { return PLANS.map(function (p) { return p.id; }); }

module.exports = { PLANS, METERS, list, get, order };
