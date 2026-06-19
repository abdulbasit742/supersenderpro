const fs = require('fs');
const path = require('path');
const storeCRM = require('./storeCRM');

class WatiCopilot {
  /**
   * @param {Object} kommoCRM - Instance of KommoCRM class for auto-routing and agent mapping
   * @param {Function} sendDirect - Callback to send WhatsApp messages: async (number, text) => { ... }
   */
  constructor(kommoCRM, sendDirect) {
    this.kommoCRM = kommoCRM;
    this.sendDirect = sendDirect;
  }

  /**
   * Wati AI Copilot: Thread Summarizer
   * Analyzes the customer's interaction history (last 25 messages) and generates an instant
   * cognitive summary (Brief, Intent, Sentiment, Recommended Action) for a taking-over agent.
   */
  generateThreadSummary(storeId, phone) {
    const customer = storeCRM.getCustomer(storeId, phone);
    if (!customer) {
      return { success: false, error: 'Lead not found' };
    }

    const interactions = storeCRM.getCustomerInteractions(storeId, phone, 30);
    if (!interactions || interactions.length === 0) {
      return {
        success: true,
        summary: "This is a brand new lead with no logged chat history. Fresh inquiry.",
        intent: "General Inquiry",
        sentiment: "Neutral",
        nextAction: "Introduce your services, share the subscription catalog, and qualify the lead."
      };
    }

    // Heuristics-based Natural Language and Intent Parsing (Highly optimized, reliable fallback)
    const texts = [];
    let isFrustrated = false;
    let containsPayment = false;
    let containsPricing = false;
    let containsSupport = false;
    let containsError = false;

    // Compile text and identify keywords
    interactions.forEach(inter => {
      const details = (inter.details || inter.message || inter.product || "").toLowerCase();
      if (details) {
        texts.push(details);
        if (details.includes("price") || details.includes("pricing") || details.includes("rate") || details.includes("cost") || details.includes("how much") || details.includes("kitna")) {
          containsPricing = true;
        }
        if (details.includes("pay") || details.includes("payment") || details.includes("easypaisa") || details.includes("jazzcash") || details.includes("bank") || details.includes("transfer") || details.includes("mery paise")) {
          containsPayment = true;
        }
        if (details.includes("help") || details.includes("support") || details.includes("agent") || details.includes("issue") || details.includes("help me") || details.includes("masla")) {
          containsSupport = true;
        }
        if (details.includes("error") || details.includes("bug") || details.includes("failed") || details.includes("not working") || details.includes("invalid") || details.includes("kharab")) {
          containsError = true;
        }
        if (details.includes("angry") || details.includes("slow") || details.includes("late") || details.includes("refund") || details.includes("bad") || details.includes("scam") || details.includes("bakwas")) {
          isFrustrated = true;
        }
      }
    });

    // Determine Intent
    let intent = "General Discussion";
    if (containsError) intent = "Technical Support / System Error";
    else if (containsPayment) intent = "Billing / Payment Verification";
    else if (containsPricing) intent = "Sales / Pricing Inquiry";
    else if (containsSupport) intent = "Customer Support Handoff";

    // Determine Sentiment
    let sentiment = "Neutral";
    if (isFrustrated) sentiment = "⚠️ Frustrated / Urgent";
    else if (containsPayment || containsPricing) sentiment = "High Purchase Intent";

    // Recommended next action
    let nextAction = "Greet the customer and ask how we can help.";
    if (intent === "Technical Support / System Error") {
      nextAction = "Verify their credentials, check system health reports, and provide a quick fix.";
    } else if (intent === "Billing / Payment Verification") {
      nextAction = "Ask for their EasyPaisa/JazzCash transaction ID (TID) and verify via the Gmail payment parser dashboard.";
    } else if (intent === "Sales / Pricing Inquiry") {
      nextAction = "Present the reseller pricing matrix and details on premium WhatsApp sender features.";
    } else if (intent === "Customer Support Handoff") {
      nextAction = "Assign a dedicated representative, take over the chat manually, and answer their custom query.";
    }

    // Generate descriptive brief sentence
    let brief = `Lead ${customer.name || phone} is currently active. `;
    if (interactions.length > 0) {
      brief += `The conversation spans ${interactions.length} recent interactions. `;
      if (containsPayment) brief += "They are asking about payment details or sharing confirmation. ";
      else if (containsPricing) brief += "They are actively discussing pricing and subscription options. ";
      else if (containsError) brief += "They have hit a problem or system exception. ";
      else brief += "They are interacting with the WhatsApp bot flows. ";
    }

    return {
      success: true,
      summary: brief,
      intent,
      sentiment,
      nextAction,
      analysisTimestamp: new Date().toISOString()
    };
  }

  /**
   * Wati Smart Handoff: Mutes bot replies and escalates lead to a dedicated live sales agent.
   */
  async escalateToHuman(storeId, phone, reason = "User requested agent") {
    // 1. Mute the automatic bot replies
    let customer = storeCRM.getCustomer(storeId, phone);
    if (!customer) {
      customer = storeCRM.upsertCustomer(storeId, phone, { name: 'Escalated Lead' });
    }

    // Set botMuted flags in metadata
    storeCRM.upsertCustomer(storeId, phone, {
      botMuted: true,
      botMutedUntil: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // Muted for 24 hours by default
      chatStatus: 'open'
    });

    // 2. Perform Auto-routing (Round-Robin) to find the best available agent
    let assignedAgentName = 'System Queue';
    if (this.kommoCRM) {
      try {
        const agent = this.kommoCRM.autoRouteLead(storeId, phone);
        if (agent) {
          assignedAgentName = agent.fullName || agent.username;
        }
      } catch (err) {
        console.error("[WatiCopilot] Failed to call KommoCRM auto-router:", err.message);
      }
    }

    // 3. Log Handoff in CRM history
    storeCRM.addInteraction(storeId, phone, {
      type: 'bot_escalation',
      details: `Bot muted and chat escalated to Live Agent [${assignedAgentName}]. Reason: "${reason}"`
    });

    // 4. Generate AI Copilot Summary of the conversation
    const copilotSummary = this.generateThreadSummary(storeId, phone);

    // 5. Send automated confirmation over WhatsApp to reassure user
    if (this.sendDirect) {
      const reassuranceMsg = `👋 Thank you for waiting! The automated bot has been muted. Your chat is now escalated to our dedicated specialist, *${assignedAgentName}*.\n\nThey are reviewing your message history right now and will assist you shortly! 🧑‍💻`;
      await this.sendDirect(phone, reassuranceMsg, { source: 'WatiEscalation' })
        .catch(err => console.error(`[WatiCopilot] Handoff message failed to send to ${phone}:`, err.message));
    }

    // Notify agents via WebSocket if active
    if (global.wsEvent) {
      global.wsEvent('crm.bot_escalated', { storeId, phone, assignedAgent: assignedAgentName, copilotBrief: copilotSummary });
    }

    return {
      success: true,
      assignedAgent: assignedAgentName,
      copilotBrief: copilotSummary,
      mutedUntil: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    };
  }

  /**
   * Unmute bot (re-enable auto-bot replies)
   */
  unmuteBot(storeId, phone) {
    storeCRM.upsertCustomer(storeId, phone, {
      botMuted: false,
      botMutedUntil: null
    });

    storeCRM.addInteraction(storeId, phone, {
      type: 'bot_unmuted',
      details: 'Bot auto-reply system has been re-enabled for this chat.'
    });

    return { success: true };
  }
}

module.exports = WatiCopilot;
