// Feedback Collector Module - Automated NPS and feedback collection

const { v4: uuid } = require('uuid');
const path = require('path');
const fs = require('fs');

class FeedbackCollector {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.feedbackFile = path.join(dataDir, 'feedback.json');
    this.npsFile = path.join(dataDir, 'nps.json');
    this.init();
  }

  init() {
    if (!fs.existsSync(this.feedbackFile)) {
      fs.writeFileSync(this.feedbackFile, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(this.npsFile)) {
      fs.writeFileSync(this.npsFile, JSON.stringify([], null, 2));
    }
  }

  loadFeedback() {
    try {
      return require(this.feedbackFile);
    } catch (e) {
      return [];
    }
  }

  saveFeedback(data) {
    fs.writeFileSync(this.feedbackFile, JSON.stringify(data, null, 2));
  }

  loadNPS() {
    try {
      return require(this.npsFile);
    } catch (e) {
      return [];
    }
  }

  saveNPS(data) {
    fs.writeFileSync(this.npsFile, JSON.stringify(data, null, 2));
  }

  /**
   * Send a feedback request message to a customer
   * @param {string} number - Customer phone number
   * @param {string} type - 'nps' or 'custom'
   * @param {Object} options - Additional options
   */
  async requestFeedback(number, type = 'nps', options = {}) {
    const { sendDirect } = require('../server');
    let message = '';

    if (type === 'nps') {
      message = `Hi ${options.name || 'there'}! 🎯\n\nOn a scale of 0-10, how likely are you to recommend our store to a friend?\n\nJust reply with a number between 0 and 10!\n\nThank you! 🙏`;
    } else if (type === 'custom' && options.templateId) {
      const templateManager = require('./templateManager');
      const template = templateManager.getTemplateById(options.templateId);
      message = template ? templateManager.renderTemplate(options.templateId, options.variables || {}) : 'We value your feedback! Please share your thoughts.';
    } else {
      message = 'We value your feedback! Please share your experience with us by replying to this message.';
    }

    try {
      await sendDirect(number, message);
      return { success: true, message: 'Feedback request sent' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Record NPS response (0-10 rating)
   */
  recordNPS(customerId, customerNumber, rating, metadata = {}) {
    const nps = this.loadNPS();
    const record = {
      id: uuid(),
      customerId,
      customerNumber,
      rating: parseInt(rating),
      category: this.categorizeNPS(parseInt(rating)),
      metadata,
      timestamp: new Date().toISOString()
    };
    nps.push(record);
    this.saveNPS(nps);
    return record;
  }

  /**
   * Record custom feedback
   */
  recordFeedback(customerId, customerNumber, feedback, metadata = {}) {
    const all = this.loadFeedback();
    const record = {
      id: uuid(),
      customerId,
      customerNumber,
      feedback,
      metadata,
      timestamp: new Date().toISOString(),
      category: this.categorizeFeedback(feedback)
    };
    all.push(record);
    this.saveFeedback(all);
    return record;
  }

  /**
   * Categorize NPS score
   */
  categorizeNPS(rating) {
    if (rating >= 9) return 'promoter';
    if (rating >= 7) return 'passive';
    return 'detractor';
  }

  /**
   * Categorize feedback text (simple keyword-based)
   */
  categorizeFeedback(text) {
    const lower = text.toLowerCase();
    if (lower.match(/\b(good|great|excellent|amazing|awesome|love|best)\b/)) return 'positive';
    if (lower.match(/\b(bad|poor|terrible|worst|hate|disappointed|slow)\b/)) return 'negative';
    return 'neutral';
  }

  /**
   * Get NPS statistics
   */
  getNPSStats(days = null) {
    let nps = this.loadNPS();
    if (days) {
      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
      nps = nps.filter(r => new Date(r.timestamp).getTime() >= cutoff);
    }

    const total = nps.length;
    if (total === 0) {
      return { nps: 0, promoters: 0, passives: 0, detractors: 0, average: 0, totalResponses: 0 };
    }

    const promoters = nps.filter(r => r.category === 'promoter').length;
    const passives = nps.filter(r => r.category === 'passive').length;
    const detractors = nps.filter(r => r.category === 'detractor').length;
    const sum = nps.reduce((acc, r) => acc + r.rating, 0);

    return {
      totalResponses: total,
      promoters,
      passives,
      detractors,
      average: parseFloat((sum / total).toFixed(2)),
      nps: parseFloat(((promoters - detractors) / total * 100).toFixed(2))
    };
  }

  /**
   * Get feedback statistics
   */
  getFeedbackStats(days = null) {
    let feedback = this.loadFeedback();
    if (days) {
      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
      feedback = feedback.filter(r => new Date(r.timestamp).getTime() >= cutoff);
    }

    const total = feedback.length;
    const positive = feedback.filter(r => r.category === 'positive').length;
    const negative = feedback.filter(r => r.category === 'negative').length;
    const neutral = feedback.filter(r => r.category === 'neutral').length;

    return {
      totalResponses: total,
      positive,
      negative,
      neutral
    };
  }

  /**
   * Get customer's feedback history
   */
  getCustomerFeedback(customerId) {
    const nps = this.loadNPS().filter(r => r.customerId === customerId).slice(-10);
    const feedback = this.loadFeedback().filter(r => r.customerId === customerId).slice(-10);
    return { nps, feedback };
  }

  /**
   * Get recent feedback entries
   */
  getRecentFeedbacks(limit = 50) {
    const nps = this.loadNPS()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit)
      .map(r => ({ ...r, type: 'nps' }));
    const feedback = this.loadFeedback()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit)
      .map(r => ({ ...r, type: 'custom' }));

    return [...nps, ...feedback].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
  }

  /**
   * Auto-request feedback after X days of purchase or interaction
   * Can be called from cron job
   */
  async triggerAutoFeedback(customers, options = {}) {
    const results = [];
    const criteria = options.criteria || { daysSinceLastActive: 7, minMessages: 5 };
    const now = Date.now();
    const cutoff = now - (criteria.daysSinceLastActive * 24 * 60 * 60 * 1000);

    for (const customer of customers) {
      const lastActive = customer.lastActive ? new Date(customer.lastActive).getTime() : 0;
      const messageCount = customer.messageCount || 0;

      if (lastActive >= cutoff && messageCount >= criteria.minMessages) {
        const result = await this.requestFeedback(customer.number, 'nps', { name: customer.name });
        results.push({ customerId: customer.id, success: result.success });
      }
    }

    return results;
  }
}

module.exports = FeedbackCollector;