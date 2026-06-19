const fs = require('fs');
const path = require('path');
const storeCRM = require('./storeCRM');

const CRM_DIR = path.join(__dirname, '../data/store_crm');
if (!fs.existsSync(CRM_DIR)) {
  fs.mkdirSync(CRM_DIR, { recursive: true });
}

const campaignsFile = (storeId) => path.join(CRM_DIR, `${storeId}_campaigns.json`);

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

class WatiBroadcast {
  /**
   * @param {Function} sendDirect - Callback to send WhatsApp messages: async (number, text) => { ... }
   */
  constructor(sendDirect) {
    this.sendDirect = sendDirect;
  }

  /**
   * Check message for Opt-Out (Unsubscribe) keywords like "stop", "unsubscribe", "exit", etc.
   * If found, automatically opt-out the customer in CRM to ensure WhatsApp compliance.
   */
  processOptOut(storeId, phone, messageText) {
    if (!messageText) return false;
    const cleanMsg = messageText.trim().toLowerCase();
    const optOutKeywords = ['stop', 'unsubscribe', 'optout', 'block', 'exit', 'niklo', 'unsub'];

    const matches = optOutKeywords.some(keyword => cleanMsg === keyword || cleanMsg.startsWith(keyword + ' '));
    if (!matches) return false;

    // Retrieve customer
    const customer = storeCRM.getCustomer(storeId, phone);
    if (customer && customer.promoOptIn === false) {
      return true; // Already opted out
    }

    // Opt out customer
    storeCRM.upsertCustomer(storeId, phone, {
      promoOptIn: false
    });

    // Add opted_out tag
    storeCRM.addTag(storeId, phone, 'opted_out');

    // Record interaction
    storeCRM.addInteraction(storeId, phone, {
      type: 'opt_out',
      details: `Customer requested unsubscribe. Message: "${messageText}". Automatically blacklisted from broadcast campaigns.`
    });

    // Send opt-out confirmation over WhatsApp
    if (this.sendDirect) {
      this.sendDirect(phone, 'You have been successfully unsubscribed from our broadcast list. You will no longer receive marketing messages. Type "START" or "SUBSCRIBE" anytime to opt back in. 🙏')
        .catch(err => console.error(`Failed to send opt-out confirmation to ${phone}:`, err));
    }

    return true;
  }

  /**
   * Check if a contact requests to opt back in
   */
  processOptIn(storeId, phone, messageText) {
    if (!messageText) return false;
    const cleanMsg = messageText.trim().toLowerCase();
    const optInKeywords = ['start', 'subscribe', 'optin', 'inbound'];

    const matches = optInKeywords.some(keyword => cleanMsg === keyword || cleanMsg.startsWith(keyword + ' '));
    if (!matches) return false;

    const customer = storeCRM.getCustomer(storeId, phone);
    if (customer && customer.promoOptIn !== false) {
      return true; // Already opted in
    }

    storeCRM.upsertCustomer(storeId, phone, {
      promoOptIn: true
    });

    storeCRM.removeTag(storeId, phone, 'opted_out');

    storeCRM.addInteraction(storeId, phone, {
      type: 'opt_in',
      details: `Customer opted back in for marketing broadcasts.`
    });

    if (this.sendDirect) {
      this.sendDirect(phone, 'Welcome back! 🎉 You have successfully re-subscribed to our broadcast and promotional alerts. Stay tuned!')
        .catch(err => console.error(`Failed to send opt-in confirmation to ${phone}:`, err));
    }

    return true;
  }

  /**
   * Create a new broadcast campaign
   */
  createCampaign(storeId, name, segmentName, messageTemplate) {
    const file = campaignsFile(storeId);
    const campaigns = readJSON(file, []);

    const newCampaign = {
      id: `CAMP-${Date.now()}`,
      name,
      segmentName, // e.g. 'all', 'vip', 'gold', 'inactive_30', 'opted_in'
      messageTemplate,
      status: 'draft', // draft | sending | completed | failed
      metrics: {
        totalTargeted: 0,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
        unsubscribed: 0
      },
      recipients: {}, // { 'phone': { status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' } }
      createdAt: new Date().toISOString()
    };

    campaigns.push(newCampaign);
    writeJSON(file, campaigns);
    return newCampaign;
  }

  /**
   * Execute/Send a broadcast campaign to targeted contacts, automatically skipping opted-out ones.
   */
  async sendCampaignBroadcast(storeId, campaignId) {
    const file = campaignsFile(storeId);
    const campaigns = readJSON(file, []);
    const campaign = campaigns.find(c => c.id === campaignId);

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    if (campaign.status === 'completed' || campaign.status === 'sending') {
      throw new Error(`Campaign is already ${campaign.status}`);
    }

    // Mark campaign as sending
    campaign.status = 'sending';
    campaign.startedAt = new Date().toISOString();
    writeJSON(file, campaigns);

    // Fetch target segment customers
    const rawContacts = storeCRM.getSegment(storeId, campaign.segmentName);
    
    // Filter to active, opted-in contacts only
    const targets = rawContacts.filter(c => c.promoOptIn !== false && c.status === 'active');
    
    campaign.metrics.totalTargeted = rawContacts.length;
    campaign.metrics.unsubscribed = rawContacts.length - targets.length;

    console.log(`[WatiBroadcast] Starting campaign "${campaign.name}" to ${targets.length} opted-in targets (skipped ${campaign.metrics.unsubscribed} opted-out/inactive contacts).`);

    for (const contact of targets) {
      campaign.recipients[contact.phone] = { status: 'sending', timestamp: new Date().toISOString() };
    }
    writeJSON(file, campaigns);

    // Send messages sequentially or in small batches
    for (const contact of targets) {
      try {
        if (this.sendDirect) {
          // Replace name placeholder
          let bodyText = campaign.messageTemplate;
          bodyText = bodyText.replace(/\{\{name\}\}/gi, contact.name || 'Valued Customer');
          bodyText = bodyText.replace(/\{\{tier\}\}/gi, contact.tier || 'Bronze');
          
          await this.sendDirect(contact.phone, bodyText, { source: `Campaign-${campaignId}` });
          
          campaign.recipients[contact.phone].status = 'sent';
          campaign.metrics.sent += 1;
        } else {
          throw new Error('Message sending callback is unavailable');
        }
      } catch (err) {
        console.error(`[WatiBroadcast Error] Failed to send campaign message to ${contact.phone}:`, err.message);
        campaign.recipients[contact.phone].status = 'failed';
        campaign.recipients[contact.phone].error = err.message;
        campaign.metrics.failed += 1;
      }
      // Save campaign state incrementally
      writeJSON(file, campaigns);
    }

    campaign.status = 'completed';
    campaign.completedAt = new Date().toISOString();
    writeJSON(file, campaigns);

    // Record interaction for the store admin
    storeCRM.addInteraction(storeId, 'ADMIN', {
      type: 'broadcast_completed',
      details: `Completed broadcast "${campaign.name}". Sent: ${campaign.metrics.sent}, Failed: ${campaign.metrics.failed}, Opt-outs skipped: ${campaign.metrics.unsubscribed}`
    });

    return campaign;
  }

  /**
   * Track message status updates (useful when webhooks report delivery/read reports)
   */
  updateMessageStatus(storeId, campaignId, phone, status) {
    const file = campaignsFile(storeId);
    const campaigns = readJSON(file, []);
    const campaign = campaigns.find(c => c.id === campaignId);

    if (!campaign || !campaign.recipients[phone]) return null;

    const previousStatus = campaign.recipients[phone].status;
    if (previousStatus === status || previousStatus === 'read') return campaign; // Read is terminal status

    campaign.recipients[phone].status = status;
    campaign.recipients[phone].updatedAt = new Date().toISOString();

    // Re-calculate metrics
    if (status === 'delivered') {
      campaign.metrics.delivered += 1;
    } else if (status === 'read') {
      if (previousStatus === 'delivered') {
        campaign.metrics.delivered = Math.max(0, campaign.metrics.delivered - 1);
      }
      campaign.metrics.read += 1;
    }

    writeJSON(file, campaigns);
    return campaign;
  }

  /**
   * Get all campaigns
   */
  getCampaigns(storeId) {
    return readJSON(campaignsFile(storeId), []);
  }

  /**
   * Get campaign stats details
   */
  getCampaignDetails(storeId, campaignId) {
    const campaigns = this.getCampaigns(storeId);
    return campaigns.find(c => c.id === campaignId) || null;
  }
}

module.exports = WatiBroadcast;
