// lib/reEngagement/index.js
// Orchestrator. Plans a campaign and (when live) executes it by scheduling
// follow-ups through the existing storeCRM follow-up scheduler AND enqueuing
// durable follow_up jobs via queueManager — i.e. it reuses the rails that are
// already wired, instead of inventing a new sender.
//
// Execution is split from planning on purpose: the dashboard previews a plan,
// the founder (or the overnight batch) approves, then execute() runs it.

const engine = require('./engine');
const store = require('./campaignStore');
const storeCRM = require('../storeCRM');

let queueManager = null;
try { queueManager = require('../queueManager'); } catch { /* optional */ }

function plan(storeId = 'default_store', settings = {}) {
  const campaign = engine.planCampaign(storeId, settings);
  store.saveCampaign(campaign);
  return campaign;
}

/**
 * Execute a previously-planned campaign.
 * - dry-run (default): marks targets as previewed, sends nothing.
 * - live (REENGAGE_LIVE=true): schedules a CRM follow-up + enqueues a durable
 *   follow_up job per target, then records the send in the ledger (for cooldown).
 */
function execute(campaignId, { force = false } = {}) {
  const campaign = store.getCampaign(campaignId);
  if (!campaign) throw new Error('campaign not found');
  if (campaign.status === 'sent') return campaign;

  const live = campaign.mode === 'live' || force;
  const phonesSent = [];

  for (const t of campaign.targets) {
    if (!live) continue; // dry-run: nothing leaves the building
    try {
      // 1) durable job (BullMQ if Redis up, JSON fallback otherwise)
      if (queueManager) {
        queueManager.addJob('follow_up', {
          storeId: campaign.storeId,
          phone: t.phone,
          message: t.message,
          campaignId: campaign.id,
          kind: 're_engagement',
        }, { source: 'reengagement', maxAttempts: 3 });
      }
      // 2) CRM follow-up record so it shows on the customer timeline
      storeCRM.scheduleFollowUp(campaign.storeId, t.phone, t.message, new Date().toISOString());
      phonesSent.push(t.phone);
    } catch (e) {
      t.error = e.message;
    }
  }

  if (live && phonesSent.length) store.recordSends(campaign.storeId, phonesSent, campaign.id);

  campaign.status = live ? 'queued' : 'previewed';
  campaign.executedAt = new Date().toISOString();
  campaign.queuedCount = phonesSent.length;
  store.saveCampaign(campaign);
  return campaign;
}

function listCampaigns(storeId) { return store.listCampaigns(storeId); }
function getCampaign(id) { return store.getCampaign(id); }

module.exports = { plan, execute, listCampaigns, getCampaign };
