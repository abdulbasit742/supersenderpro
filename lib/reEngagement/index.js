// lib/reEngagement/index.js — orchestrator: plan + execute (dry-run safe), reuses queueManager + storeCRM.
const engine = require('./engine');
const store = require('./campaignStore');
const storeCRM = require('../storeCRM');
let queueManager = null; try { queueManager = require('../queueManager'); } catch {}
function plan(storeId = 'default_store', settings = {}) { const c = engine.planCampaign(storeId, settings); store.saveCampaign(c); return c; }
function execute(campaignId, { force = false } = {}) { const c = store.getCampaign(campaignId); if (!c) throw new Error('campaign not found'); if (c.status === 'sent') return c; const live = c.mode === 'live' || force; const sent = []; for (const t of c.targets) { if (!live) continue; try { if (queueManager) queueManager.addJob('follow_up', { storeId: c.storeId, phone: t.phone, message: t.message, campaignId: c.id, kind: 're_engagement' }, { source: 'reengagement', maxAttempts: 3 }); storeCRM.scheduleFollowUp(c.storeId, t.phone, t.message, new Date().toISOString()); sent.push(t.phone); } catch (e) { t.error = e.message; } } if (live && sent.length) store.recordSends(c.storeId, sent, c.id); c.status = live ? 'queued' : 'previewed'; c.executedAt = new Date().toISOString(); c.queuedCount = sent.length; store.saveCampaign(c); return c; }
function listCampaigns(storeId) { return store.listCampaigns(storeId); }
function getCampaign(id) { return store.getCampaign(id); }
module.exports = { plan, execute, listCampaigns, getCampaign };
