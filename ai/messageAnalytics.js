// Message Analytics and Delivery Tracking System

const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

function normalizeParty(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/@c\.us$/i, '')
    .replace(/^\+/, '');
}

/**
 * Message Analytics System for tracking sent messages, delivery, and engagement
 */
class MessageAnalytics {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.messagesFile = path.join(dataDir, 'message_analytics.json');
    this.initMessagesFile();
  }

  /**
   * Initialize the messages analytics file if it doesn't exist
   */
  initMessagesFile() {
    try {
      const messages = this.loadMessages();
      // File exists, no need to initialize
    } catch (error) {
      // File doesn't exist or is corrupted, create new one
      this.saveMessages([]);
    }
  }

  /**
   * Load messages from the analytics file
   * @returns {Array} - Array of message objects
   */
  loadMessages() {
    try {
      const raw = fs.readFileSync(this.messagesFile, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      // Return empty array if file doesn't exist or is invalid
      return [];
    }
  }

  /**
   * Save messages to the analytics file
   * @param {Array} messages - Array of message objects to save
   */
  saveMessages(messages) {
    fs.writeFileSync(this.messagesFile, JSON.stringify(messages, null, 2));
  }

  /**
   * Record a sent message
   * @param {Object} messageData - Data about the sent message
   * @returns {Object} - The recorded message with ID and timestamp
   */
  recordSentMessage(messageData) {
    const messages = this.loadMessages();
    
    const messageRecord = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      direction: 'outbound',
      ...messageData,
      status: 'sent', // Initial status
      events: [] // Track delivery/read events
    };
    
    messages.push(messageRecord);
    
    // Keep only last 10000 messages to prevent file from growing too large
    if (messages.length > 10000) {
      messages.splice(0, messages.length - 10000);
    }
    
    this.saveMessages(messages);
    return messageRecord;
  }

  /**
   * Record an inbound message for reply-speed tracking and analytics
   * @param {Object} messageData
   * @returns {Object}
   */
  recordInboundMessage(messageData) {
    const messages = this.loadMessages();

    const messageRecord = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      direction: 'inbound',
      status: 'received',
      replied: false,
      events: [],
      ...messageData
    };

    messages.push(messageRecord);

    if (messages.length > 10000) {
      messages.splice(0, messages.length - 10000);
    }

    this.saveMessages(messages);
    return messageRecord;
  }

  /**
   * Update message status based on WhatsApp events
   * @param {string} messageId - ID of the message to update
   * @param {string} eventType - Type of event (delivered, read, etc.)
   * @param {Object} eventData - Additional event data
   */
  updateMessageEvent(messageId, eventType, eventData = {}) {
    const messages = this.loadMessages();
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex !== -1) {
      const event = {
        type: eventType,
        timestamp: new Date().toISOString(),
        ...eventData
      };
      
      messages[messageIndex].events.push(event);
      
      // Update status based on event type
      switch (eventType) {
        case 'delivered':
          messages[messageIndex].status = 'delivered';
          break;
        case 'read':
          messages[messageIndex].status = 'read';
          break;
        case 'failed':
          messages[messageIndex].status = 'failed';
          break;
        // 'sent' remains as initial status
      }
      
      this.saveMessages(messages);
      return messages[messageIndex];
    }
    
    return null;
  }

  /**
   * Mark the latest pending inbound message for a recipient/conversation as replied
   * @param {string} party
   * @param {string|null} sentMessageId
   * @param {Object} extra
   * @returns {Object|null}
   */
  recordReplyForConversation(party, sentMessageId = null, extra = {}) {
    const target = normalizeParty(party);
    if (!target) return null;

    const messages = this.loadMessages();
    const inbound = [...messages]
      .reverse()
      .find(msg => {
        if (msg.direction !== 'inbound' || msg.replied) return false;
        const candidates = [
          msg.from,
          msg.number,
          msg.chatId,
          msg.recipientId
        ].map(normalizeParty).filter(Boolean);
        return candidates.includes(target);
      });

    if (!inbound) return null;

    const index = messages.findIndex(msg => msg.id === inbound.id);
    if (index === -1) return null;

    const now = new Date();
    const inboundTime = new Date(messages[index].timestamp || now.toISOString());
    const replySeconds = Math.max(0, Math.round((now.getTime() - inboundTime.getTime()) / 1000));

    messages[index].replied = true;
    messages[index].replyTimestamp = now.toISOString();
    messages[index].replySeconds = replySeconds;
    messages[index].repliedByMessageId = sentMessageId || null;
    messages[index].replyMeta = extra || {};

    this.saveMessages(messages);
    return messages[index];
  }

  /**
   * Get message analytics for a time period
   * @param {Object} options - Filter options
   * @returns {Object} - Analytics data
   */
  getAnalytics(options = {}) {
    const messages = this.loadMessages();
    const now = new Date();
    
    // Filter by time period
    let filteredMessages = messages;
    if (options.days) {
      const cutoffTime = now.getTime() - (options.days * 24 * 60 * 60 * 1000);
      filteredMessages = messages.filter(msg => 
        new Date(msg.timestamp).getTime() >= cutoffTime
      );
    }
    
    // Filter by direction
    if (options.direction) {
      filteredMessages = filteredMessages.filter(msg => 
        msg.direction === options.direction
      );
    }
    
    // Filter by status
    if (options.status) {
      filteredMessages = filteredMessages.filter(msg => 
        msg.status === options.status
      );
    }
    
    // Calculate analytics
    const total = filteredMessages.length;
    const sent = filteredMessages.filter(m => m.status === 'sent').length;
    const delivered = filteredMessages.filter(m => m.status === 'delivered').length;
    const read = filteredMessages.filter(m => m.status === 'read').length;
    const failed = filteredMessages.filter(m => m.status === 'failed').length;
    
    const deliveryRate = total > 0 ? (delivered / total) * 100 : 0;
    const readRate = delivered > 0 ? (read / delivered) * 100 : 0;
    
    // Group by date for trends
    const dailyStats = {};
    filteredMessages.forEach(msg => {
      const date = new Date(msg.timestamp).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { sent: 0, delivered: 0, read: 0, failed: 0 };
      }
      dailyStats[date][msg.status] = (dailyStats[date][msg.status] || 0) + 1;
    });
    
    // Format daily stats for charting
    const trendData = Object.keys(dailyStats).sort().map(date => ({
      date,
      sent: dailyStats[date].sent || 0,
      delivered: dailyStats[date].delivered || 0,
      read: dailyStats[date].read || 0,
      failed: dailyStats[date].failed || 0
    }));
    
    return {
      totals: {
        total,
        sent,
        delivered,
        read,
        failed
      },
      rates: {
        deliveryRate: parseFloat(deliveryRate.toFixed(2)),
        readRate: parseFloat(readRate.toFixed(2))
      },
      trend: trendData,
      recentMessages: filteredMessages
        .slice(-50) // Last 50 messages
        .map(msg => ({
          id: msg.id,
          timestamp: msg.timestamp,
          to: msg.to,
          status: msg.status,
          contentPreview: msg.content ? 
            msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '') : 
            '(media)'
        }))
    };
  }

  /**
   * Get reply speed summary for inbound conversations
   * @param {Object} options
   * @returns {Object}
   */
  getReplySpeedSummary(options = {}) {
    const now = Date.now();
    const days = Number(options.days || 7);
    const cutoff = days > 0 ? now - (days * 24 * 60 * 60 * 1000) : 0;
    const messages = this.loadMessages().filter(msg => {
      if (msg.direction !== 'inbound') return false;
      if (options.excludeGroups !== false && msg.isGroup) return false;
      const ts = Date.parse(msg.timestamp || 0);
      return !cutoff || ts >= cutoff;
    });

    const replied = messages.filter(msg => Number.isFinite(Number(msg.replySeconds)));
    const unresolved = messages.filter(msg => !msg.replied);
    const replyTimes = replied
      .map(msg => Number(msg.replySeconds || 0))
      .filter(value => Number.isFinite(value))
      .sort((a, b) => a - b);

    const avgReplySeconds = replyTimes.length
      ? Math.round(replyTimes.reduce((sum, value) => sum + value, 0) / replyTimes.length)
      : 0;
    const medianReplySeconds = replyTimes.length
      ? replyTimes[Math.floor(replyTimes.length / 2)]
      : 0;

    return {
      totalInbound: messages.length,
      repliedCount: replied.length,
      unresolvedCount: unresolved.length,
      avgReplySeconds,
      medianReplySeconds,
      under3Seconds: replied.filter(msg => Number(msg.replySeconds || 0) <= 3).length,
      under60Seconds: replied.filter(msg => Number(msg.replySeconds || 0) <= 60).length,
      fastestReplies: replied
        .sort((a, b) => Number(a.replySeconds || 0) - Number(b.replySeconds || 0))
        .slice(0, 10),
      slowestPending: unresolved
        .map(msg => ({
          ...msg,
          waitingSeconds: Math.max(0, Math.round((now - Date.parse(msg.timestamp || 0)) / 1000))
        }))
        .sort((a, b) => Number(b.waitingSeconds || 0) - Number(a.waitingSeconds || 0))
        .slice(0, 15)
    };
  }

  /**
   * Get pending inbound messages that still need a reply
   * @param {number} limit
   * @returns {Array}
   */
  getPendingReplyQueue(limit = 20) {
    const now = Date.now();
    return this.loadMessages()
      .filter(msg => msg.direction === 'inbound' && !msg.replied && !msg.isGroup)
      .map(msg => ({
        ...msg,
        waitingSeconds: Math.max(0, Math.round((now - Date.parse(msg.timestamp || 0)) / 1000))
      }))
      .sort((a, b) => Number(b.waitingSeconds || 0) - Number(a.waitingSeconds || 0))
      .slice(0, Math.max(1, Number(limit || 20)));
  }

  /**
   * Get messages for a specific customer
   * @param {string} customerNumber - Customer phone number
   * @param {Object} options - Filter options
   * @returns {Array} - Messages for the customer
   */
  getCustomerMessages(customerNumber, options = {}) {
    const messages = this.loadMessages();
    
    let filtered = messages.filter(msg => 
      msg.to === customerNumber || msg.from === customerNumber
    );
    
    // Apply additional filters
    if (options.days) {
      const cutoffTime = Date.now() - (options.days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(msg => 
        new Date(msg.timestamp).getTime() >= cutoffTime
      );
    }
    
    if (options.direction) {
      filtered = filtered.filter(msg => 
        msg.direction === options.direction
      );
    }
    
    if (options.status) {
      filtered = filtered.filter(msg => 
        msg.status === options.status
      );
    }
    
    // Sort by timestamp descending (newest first)
    return filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}

module.exports = MessageAnalytics;
