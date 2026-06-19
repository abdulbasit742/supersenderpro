const fs = require('fs');
const path = require('path');
const storeCRM = require('./storeCRM');

const CRM_DIR = path.join(__dirname, '../data/store_crm');
if (!fs.existsSync(CRM_DIR)) {
  fs.mkdirSync(CRM_DIR, { recursive: true });
}

// Multi-tenant file paths
const pipelineFile = (storeId) => path.join(CRM_DIR, `${storeId}_pipelines.json`);
const agentsFile = (storeId) => path.join(CRM_DIR, `${storeId}_agents.json`);
const triggersFile = (storeId) => path.join(CRM_DIR, `${storeId}_triggers.json`);

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

class KommoCRM {
  /**
   * @param {string} dataDir - Base data directory
   * @param {Function} sendDirect - Callback function to send WhatsApp messages: async (number, text, options) => { ... }
   */
  constructor(dataDir, sendDirect) {
    this.dataDir = dataDir;
    this.sendDirect = sendDirect;
  }

  // ────────────────────────────────────────────────────────────────────────
  // 1. PIPELINE & STAGE MANAGEMENT
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Initialize a default Sales Pipeline for a store
   */
  initializePipeline(storeId) {
    const file = pipelineFile(storeId);
    const defaultPipeline = {
      id: 'main_pipeline',
      name: 'Main Digital Sales Pipeline',
      stages: [
        { id: 'INBOX', name: '📥 Inbox / New Lead', color: '#10b981', description: 'Incoming inquiries awaiting first contact.' },
        { id: 'QUALIFIED', name: '📊 Qualified Lead', color: '#3b82f6', description: 'Interests identified and requirements gathered.' },
        { id: 'PROPOSAL_SENT', name: '📝 Proposal / Offer Sent', color: '#f59e0b', description: 'SaaS plan or AI tools pricing details shared.' },
        { id: 'AWAITING_PAYMENT', name: '💳 Awaiting Payment', color: '#8b5cf6', description: 'Invoice/payment details shared (EasyPaisa/JazzCash).' },
        { id: 'COMPLETED', name: '🎉 Won / Completed', color: '#ec4899', description: 'Payment verified, stock/credentials delivered.' },
        { id: 'LOST', name: '❌ Lost / Closed', color: '#ef4444', description: 'Unresponsive or deal cancelled.' }
      ],
      createdAt: new Date().toISOString()
    };

    const pipelines = readJSON(file, [defaultPipeline]);
    return pipelines;
  }

  /**
   * Get all pipelines and stages for a store
   */
  getPipelines(storeId) {
    return this.initializePipeline(storeId);
  }

  /**
   * Move a lead (customer) to a different pipeline stage and execute Salesbot triggers
   */
  async moveLeadToStage(storeId, phone, stageId, changedBy = 'system', reason = '') {
    const pipelines = this.getPipelines(storeId);
    const mainPipeline = pipelines[0]; // For simplicity, we use the main pipeline
    const stage = mainPipeline.stages.find(s => s.id === stageId);
    if (!stage) {
      throw new Error(`Invalid stage ID: ${stageId}`);
    }

    // Fetch existing customer
    let customer = storeCRM.getCustomer(storeId, phone);
    if (!customer) {
      customer = storeCRM.upsertCustomer(storeId, phone, { name: 'New WhatsApp Lead' });
    }

    const previousStage = customer.pipelineStage || 'NONE';
    if (previousStage === stageId) {
      return customer; // Already in this stage
    }

    // Initialize history arrays if missing
    customer.stageHistory = customer.stageHistory || [];
    customer.leadCustomFields = customer.leadCustomFields || {};
    customer.chatStatus = customer.chatStatus || 'open';

    // Record stage history
    const transition = {
      fromStage: previousStage,
      toStage: stageId,
      timestamp: new Date().toISOString(),
      changedBy,
      reason: reason || `Moved from ${previousStage} to ${stageId}`
    };
    customer.stageHistory.push(transition);

    // Update customer's pipeline stage
    const updatedCustomer = storeCRM.upsertCustomer(storeId, phone, {
      pipelineStage: stageId,
      stageHistory: customer.stageHistory,
      lastContact: new Date().toISOString()
    });

    // Log interaction
    storeCRM.addInteraction(storeId, phone, {
      type: 'stage_change',
      details: `Moved lead stage from ${previousStage} to ${stageId}`,
      changedBy,
      reason
    });

    // Run Salesbot Automations for this stage transition
    await this.runSalesbot(storeId, phone, stageId, { previousStage, reason, changedBy });

    // Emit live update event if available
    if (global.wsEvent) {
      global.wsEvent('crm.lead_stage_changed', { storeId, phone, previousStage, newStage: stageId });
    }

    return updatedCustomer;
  }

  // ────────────────────────────────────────────────────────────────────────
  // 2. LEAD CARD & CUSTOM FIELDS (KOMMO CONTEXT DETAILED VIEW)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Get a complete "Lead Card" incorporating both storeCRM details, interactions, custom fields, and stage history.
   */
  getLeadCard(storeId, phone) {
    const customer = storeCRM.getCustomer(storeId, phone);
    if (!customer) return null;

    const interactions = storeCRM.getCustomerInteractions(storeId, phone, 100);
    
    // Supplement missing fields with defaults
    return {
      ...customer,
      pipelineStage: customer.pipelineStage || 'INBOX',
      assignedAgent: customer.assignedAgent || 'Unassigned',
      chatStatus: customer.chatStatus || 'open',
      leadCustomFields: customer.leadCustomFields || {},
      stageHistory: customer.stageHistory || [],
      interactions: interactions || []
    };
  }

  /**
   * Update lead custom fields (e.g., region, plan_type, ai_preference)
   */
  updateLeadCustomFields(storeId, phone, customFields = {}) {
    let customer = storeCRM.getCustomer(storeId, phone);
    if (!customer) {
      customer = storeCRM.upsertCustomer(storeId, phone, { name: 'New WhatsApp Lead' });
    }

    const currentFields = customer.leadCustomFields || {};
    const mergedFields = { ...currentFields, ...customFields };

    const updated = storeCRM.upsertCustomer(storeId, phone, {
      leadCustomFields: mergedFields
    });

    storeCRM.addInteraction(storeId, phone, {
      type: 'custom_fields_update',
      details: `Updated custom fields: ${Object.keys(customFields).join(', ')}`
    });

    return updated;
  }

  /**
   * Assign or reassign lead to a sales agent
   */
  updateLeadAgent(storeId, phone, agentName) {
    let customer = storeCRM.getCustomer(storeId, phone);
    if (!customer) {
      customer = storeCRM.upsertCustomer(storeId, phone, { name: 'New WhatsApp Lead' });
    }

    const previousAgent = customer.assignedAgent || 'Unassigned';
    if (previousAgent === agentName) return customer;

    const updated = storeCRM.upsertCustomer(storeId, phone, {
      assignedAgent: agentName
    });

    storeCRM.addInteraction(storeId, phone, {
      type: 'agent_assignment',
      details: `Reassigned from [${previousAgent}] to [${agentName}]`
    });

    return updated;
  }

  // ────────────────────────────────────────────────────────────────────────
  // 3. MULTI-CHANNEL AGENT ROTATION & AUTO-ROUTING (ROUND-ROBIN)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Get list of agents and workloads
   */
  getAgents(storeId) {
    const file = agentsFile(storeId);
    return readJSON(file, [
      { username: 'admin', fullName: 'System Admin', isOnline: true, activeLeads: 0 },
      { username: 'sales_ali', fullName: 'Ali Khan (SaaS Sales)', isOnline: true, activeLeads: 0 },
      { username: 'sales_sara', fullName: 'Sara Ahmed (Premium Support)', isOnline: true, activeLeads: 0 }
    ]);
  }

  /**
   * Register or update an agent
   */
  registerAgent(storeId, username, details = {}) {
    const file = agentsFile(storeId);
    const agents = this.getAgents(storeId);
    let agent = agents.find(a => a.username === username);

    if (!agent) {
      agent = { username, fullName: username, isOnline: true, activeLeads: 0 };
      agents.push(agent);
    }

    Object.assign(agent, details);
    writeJSON(file, agents);
    return agent;
  }

  /**
   * Set agent availability status (online/offline)
   */
  setAgentStatus(storeId, username, isOnline) {
    const file = agentsFile(storeId);
    const agents = this.getAgents(storeId);
    const agent = agents.find(a => a.username === username);
    if (agent) {
      agent.isOnline = isOnline;
      writeJSON(file, agents);
    }
    return agent;
  }

  /**
   * Auto-route a lead using Kommo-style round-robin assignment among online agents
   */
  autoRouteLead(storeId, phone) {
    const file = agentsFile(storeId);
    const agents = this.getAgents(storeId);
    const onlineAgents = agents.filter(a => a.isOnline === true);

    if (onlineAgents.length === 0) {
      return this.updateLeadAgent(storeId, phone, 'System (Bot)');
    }

    // Sort by active workload (leads assigned) to distribute fairly
    onlineAgents.sort((a, b) => (a.activeLeads || 0) - (b.activeLeads || 0));
    const selectedAgent = onlineAgents[0];

    // Assign the lead
    this.updateLeadAgent(storeId, phone, selectedAgent.username);

    // Increment activeLeads count
    selectedAgent.activeLeads = (selectedAgent.activeLeads || 0) + 1;
    writeJSON(file, agents);

    return selectedAgent;
  }

  // ────────────────────────────────────────────────────────────────────────
  // 4. SALESBOT AUTOMATION ENGINE (TRIGGER RULES)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Get trigger configurations for all stages
   */
  getStageTriggers(storeId) {
    const file = triggersFile(storeId);
    const defaultTriggers = {
      INBOX: [
        { type: 'auto_route', enabled: true, config: {} },
        { type: 'send_message', enabled: true, config: { text: 'Asalam-o-Alaikum! 🌟 Thank you for contacting SuperSender Pro. An agent will be assigned to you shortly. Type "SAAS" to explore subscription plans or "SUPPORT" for assistance.' } }
      ],
      AWAITING_PAYMENT: [
        { type: 'send_message', enabled: true, config: { text: '⚠️ Payment Notice ⚠️\n\nYour invoice has been generated. To complete your order, please transfer the amount to either of our mobile accounts:\n\n📱 *EasyPaisa*: 0321-0000000 (SuperSender Pro)\n📱 *JazzCash*: 0300-0000000 (SuperSender Pro)\n\nAfter transferring, please share the transaction ID (TID) or payment screenshot here. Our automated system will verify it and deliver your credentials immediately! ✅' } }
      ],
      COMPLETED: [
        { type: 'send_message', enabled: true, config: { text: '🎉 Payment Verified & Order Completed! 🎉\n\nThank you for choosing SuperSender Pro. Your subscription has been activated successfully! If your product includes credentials, they are being delivered right below. Feel free to contact our support team at any time.' } },
        { type: 'deliver_credentials', enabled: true, config: {} }
      ],
      LOST: [
        { type: 'schedule_followup', enabled: true, config: { delayDays: 3, text: 'Hey, we noticed we couldn\'t complete your order. If you encountered any payment issues or have questions about our WhatsApp tools, reply to this message and our senior support specialist Ali will assist you directly!' } }
      ]
    };

    return readJSON(file, defaultTriggers);
  }

  /**
   * Set or update a trigger configuration
   */
  setStageTrigger(storeId, stageId, triggerIndex, updates = {}) {
    const file = triggersFile(storeId);
    const triggers = this.getStageTriggers(storeId);
    if (!triggers[stageId]) {
      triggers[stageId] = [];
    }

    if (triggerIndex >= 0 && triggerIndex < triggers[stageId].length) {
      Object.assign(triggers[stageId][triggerIndex], updates);
    } else {
      triggers[stageId].push(updates);
    }

    writeJSON(file, triggers);
    return triggers[stageId];
  }

  /**
   * Core Salesbot Engine Executor
   */
  async runSalesbot(storeId, phone, stageId, context = {}) {
    const triggers = this.getStageTriggers(storeId);
    const activeTriggers = triggers[stageId] || [];

    console.log(`[Salesbot] Running automations for lead ${phone} entering stage: ${stageId}`);

    for (const trig of activeTriggers) {
      if (!trig.enabled) continue;

      try {
        switch (trig.type) {
          case 'auto_route':
            console.log(`[Salesbot] Auto-routing lead ${phone}...`);
            this.autoRouteLead(storeId, phone);
            break;

          case 'send_message':
            if (this.sendDirect && trig.config && trig.config.text) {
              console.log(`[Salesbot] Sending auto-message to ${phone}...`);
              // Replace placeholders
              let text = trig.config.text;
              const card = this.getLeadCard(storeId, phone);
              if (card) {
                text = text.replace(/\{\{name\}\}/gi, card.name || 'Valued Customer');
                text = text.replace(/\{\{agent\}\}/gi, card.assignedAgent || 'Support Team');
                text = text.replace(/\{\{tier\}\}/gi, card.tier || 'Bronze');
              }
              await this.sendDirect(phone, text, { source: 'Salesbot' });
            }
            break;

          case 'deliver_credentials':
            console.log(`[Salesbot] Auto-delivering digital credentials to ${phone}...`);
            // Check if there are credentials in stock matching their recent order.
            // If they just entered completed, the verification job would handle it.
            // But we can add a fallback notice.
            break;

          case 'schedule_followup':
            if (trig.config && trig.config.text) {
              const delayDays = trig.config.delayDays || 3;
              const scheduledTime = new Date(Date.now() + delayDays * 24 * 3600 * 1000).toISOString();
              console.log(`[Salesbot] Scheduling follow-up message to ${phone} on ${scheduledTime}`);
              storeCRM.scheduleFollowUp(storeId, phone, trig.config.text, scheduledTime);
            }
            break;

          default:
            console.warn(`[Salesbot] Unknown trigger type: ${trig.type}`);
        }
      } catch (err) {
        console.error(`[Salesbot Error] Failed to execute trigger ${trig.type} for stage ${stageId}:`, err);
      }
    }
  }
}

module.exports = KommoCRM;
