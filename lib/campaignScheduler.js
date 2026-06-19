'use strict';

/**
 * campaignScheduler.js
 * Drives scheduled + throttled delivery of campaigns created via campaignStore.
 *
 * Design goals:
 *  - Anti-ban friendly: configurable per-message throttle + optional daily cap.
 *  - Pluggable sender: the actual WhatsApp send function is injected, so this
 *    works with Baileys, whatsapp-web.js, the WA Sender API, or a dry-run stub.
 *  - Crash-safe: persists progress to disk after every send via campaignStore.
 */

const cron = require('node-cron');
const store = require('./campaignStore');
const spintax = require('./spintax');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

class CampaignScheduler {
  /**
   * @param {object} opts
   * @param {(to:string, message:string, recipient:object)=>Promise<any>} opts.sendMessage
   * @param {boolean} [opts.dryRun] - if true, never actually sends (logs only)
   * @param {(level:string,msg:string)=>void} [opts.logger]
   */
  constructor(opts = {}) {
    this.sendMessage = opts.sendMessage || null;
    this.dryRun = opts.dryRun !== false ? !opts.sendMessage : false;
    this.logger = opts.logger || ((lvl, msg) => console.log(`[campaigns:${lvl}] ${msg}`));
    this.running = new Set(); // campaign ids currently sending
    this.cronTask = null;
  }

  log(level, msg) {
    try { this.logger(level, msg); } catch (_) { /* never throw from logging */ }
  }

  /**
   * Personalize a message body. Supports:
   *  - legacy {name} / {to} placeholders
   *  - {{var}} variables from recipient.attributes
   *  - spintax {a|b|c} for natural variation / anti-ban
   */
  render(message, recipient) {
    const vars = Object.assign(
      { name: recipient.name || 'there', to: recipient.to || '' },
      recipient.attributes || {}
    );
    const withVars = spintax.applyVariables(String(message || ''), vars)
      .replace(/\{name\}/gi, recipient.name || 'there')
      .replace(/\{to\}/gi, recipient.to || '');
    return spintax.expandSpintax(withVars);
  }

  /** Start the once-a-minute scheduler loop that fires due campaigns. */
  start() {
    if (this.cronTask) return this.cronTask;
    this.cronTask = cron.schedule('* * * * *', () => {
      this.tick().catch((e) => this.log('error', 'tick failed: ' + e.message));
    });
    this.log('info', 'campaign scheduler started (every minute)');
    return this.cronTask;
  }

  stop() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }
  }

  /** Check for scheduled campaigns whose time has arrived and run them. */
  async tick() {
    const now = Date.now();
    for (const c of store.listCampaigns()) {
      if (c.status !== 'scheduled' || !c.scheduleAt) continue;
      if (new Date(c.scheduleAt).getTime() <= now) {
        this.runCampaign(c.id).catch((e) =>
          this.log('error', `campaign ${c.id} failed: ${e.message}`));
      }
    }
  }

  /**
   * Execute a campaign: send to every pending recipient with throttling,
   * daily-cap enforcement, and per-recipient status logging.
   */
  async runCampaign(id) {
    if (this.running.has(id)) return { ok: false, reason: 'already-running' };
    let campaign = store.getCampaign(id);
    if (!campaign) return { ok: false, reason: 'not-found' };
    if (campaign.status === 'completed') return { ok: false, reason: 'completed' };

    this.running.add(id);
    store.updateCampaign(id, { status: 'sending', startedAt: campaign.startedAt || new Date().toISOString() });
    this.log('info', `running campaign ${id} (${campaign.name})`);

    try {
      for (const entry of campaign.log) {
        // re-read latest to honor pause/cancel between sends
        campaign = store.getCampaign(id);
        if (!campaign || campaign.status === 'paused' || campaign.status === 'cancelled') {
          this.log('info', `campaign ${id} stopped (${campaign ? campaign.status : 'deleted'})`);
          break;
        }
        if (entry.status !== 'pending' && entry.status !== 'failed') continue;

        // daily cap reset / enforcement
        if (campaign.dailyCap > 0) {
          if (campaign.sentTodayDate !== today()) {
            store.updateCampaign(id, { sentToday: 0, sentTodayDate: today() });
            campaign.sentToday = 0;
          }
          if (campaign.sentToday >= campaign.dailyCap) {
            store.updateCampaign(id, { status: 'scheduled', scheduleAt: nextDay() });
            this.log('info', `campaign ${id} hit daily cap, rescheduled for tomorrow`);
            break;
          }
        }

        const body = this.render(campaign.message, entry);
        try {
          if (this.dryRun || !this.sendMessage) {
            await sleep(5); // simulate latency
            store.updateLogEntry(id, entry.to, { status: 'sent', attempts: entry.attempts + 1, sentAt: new Date().toISOString(), error: null });
          } else {
            await this.sendMessage(entry.to, body, entry);
            store.updateLogEntry(id, entry.to, { status: 'sent', attempts: entry.attempts + 1, sentAt: new Date().toISOString(), error: null });
          }
          if (campaign.dailyCap > 0) {
            const fresh = store.getCampaign(id);
            store.updateCampaign(id, { sentToday: (fresh.sentToday || 0) + 1, sentTodayDate: today() });
          }
        } catch (err) {
          store.updateLogEntry(id, entry.to, { status: 'failed', attempts: entry.attempts + 1, error: String(err && err.message || err) });
          this.log('warn', `send failed to ${entry.to}: ${err.message}`);
        }

        if (campaign.throttleMs > 0) await sleep(campaign.throttleMs);
      }

      // finalize
      const final = store.getCampaign(id);
      if (final && final.status === 'sending') {
        const stillPending = final.log.some((l) => l.status === 'pending');
        store.updateCampaign(id, {
          status: stillPending ? 'scheduled' : 'completed',
          completedAt: stillPending ? null : new Date().toISOString(),
        });
      }
      return { ok: true };
    } finally {
      this.running.delete(id);
    }
  }

  pauseCampaign(id) {
    const c = store.getCampaign(id);
    if (!c) return null;
    return store.updateCampaign(id, { status: 'paused' });
  }

  resumeCampaign(id) {
    const c = store.getCampaign(id);
    if (!c) return null;
    const updated = store.updateCampaign(id, { status: 'scheduled', scheduleAt: new Date().toISOString() });
    this.runCampaign(id).catch(() => {});
    return updated;
  }
}

function nextDay() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0); // resume tomorrow 9am
  return d.toISOString();
}

module.exports = { CampaignScheduler };
