'use strict';

const crypto = require('crypto');
const { config } = require('./config');
const store = require('./store');
const audience = require('./audience');
const composer = require('./composer');
const sendPlan = require('./sendPlan');

function newId() {
  return 'camp_' + crypto.randomBytes(6).toString('hex');
}

// Create + persist a campaign draft. Tenant-scoped. Composes copy variants and
// resolves the target audience, but does NOT build a send plan yet.
async function createCampaign(tenantId, input) {
  if (!tenantId) throw new Error('tenantId is required');
  input = input || {};
  const variants = await composer.compose(input.brief || {}, {
    variants: input.variants,
    context: input.context,
  });
  const aud = audience.target(input.contacts || [], input.audienceRule || {});
  const campaign = {
    id: newId(),
    tenantId: String(tenantId),
    name: input.name || 'Untitled campaign',
    brief: input.brief || {},
    audienceRule: input.audienceRule || {},
    audienceSize: aud.selected,
    variants,
    status: 'draft',
    createdAt: new Date().toISOString(),
  };
  store.saveCampaign(tenantId, campaign);
  return { campaign, audience: { total: aud.total, selected: aud.selected, skipped: aud.skipped } };
}

// Build a dry-run (or live, if explicitly enabled + adapter wired) send plan.
// By default this is DRY-RUN: it returns the plan and marks the campaign
// 'planned' but dispatches nothing.
function planSend(tenantId, campaignId, opts) {
  opts = opts || {};
  const campaign = store.getCampaign(tenantId, campaignId);
  if (!campaign) throw new Error('campaign not found');
  const recipients = Array.isArray(opts.contacts)
    ? audience.target(opts.contacts, campaign.audienceRule).contacts
    : [];
  const plan = sendPlan.build(recipients, opts);
  const dryRun = opts.dryRun != null ? !!opts.dryRun : config.dryRun;
  campaign.lastPlan = { plan, dryRun, plannedAt: new Date().toISOString() };
  campaign.status = dryRun ? 'planned' : 'queued';
  store.saveCampaign(tenantId, campaign);
  return { dryRun, campaignId, plan, message: dryRun ? 'DRY-RUN: nothing sent. Wire a send adapter and set CAMPAIGN_DRY_RUN=false to dispatch.' : 'Queued for dispatch by host adapter.' };
}

function listCampaigns(tenantId) { return store.listCampaigns(tenantId); }
function getCampaign(tenantId, id) { return store.getCampaign(tenantId, id); }

module.exports = { createCampaign, planSend, listCampaigns, getCampaign, audience, composer, sendPlan, config };
