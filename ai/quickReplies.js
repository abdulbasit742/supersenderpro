// Quick Replies / Canned Responses Module

const { v4: uuid } = require('uuid');
const path = require('path');
const fs = require('fs');

class QuickReplies {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.file = path.join(dataDir, 'quick_replies.json');
    this.init();
  }

  init() {
    if (!fs.existsSync(this.file)) {
      // Default quick replies
      const defaults = [
        {
          id: '1',
          title: 'Welcome',
          content: 'Welcome to our store! How can I help you today?',
          category: 'greeting',
          tags: ['welcome', 'greeting'],
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Thank You',
          content: 'Thank you for contacting us!',
          category: 'greeting',
          tags: ['thanks'],
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: '3',
          title: 'Price Inquiry Response',
          content: 'Our laptop prices start from Rs. 30,000 and go up to Rs. 150,000 depending on specs. Which budget range are you looking at?',
          category: 'sales',
          tags: ['price', 'inquiry'],
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: '4',
          title: 'Out of Office',
          content: 'I\'m currently away but will get back to you within 24 hours. For urgent queries, please call +92-300-1234567',
          category: 'autoresponder',
          tags: ['away', 'busy'],
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ];
      fs.writeFileSync(this.file, JSON.stringify(defaults, null, 2));
    }
  }

  load() {
    try {
      const data = require(this.file);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  save(data) {
    fs.writeFileSync(this.file, JSON.stringify(data, null, 2));
  }

  /**
   * Create a new quick reply
   */
  create(data) {
    const all = this.load();
    const reply = {
      id: data.id || uuid(),
      title: data.title,
      content: data.content,
      category: data.category || 'general',
      tags: data.tags || [],
      variables: data.variables || [],
      isActive: data.isActive !== undefined ? data.isActive : true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    all.push(reply);
    this.save(all);
    return reply;
  }

  /**
   * Update a quick reply
   */
  update(id, updates) {
    const all = this.load();
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save(all);
    return all[idx];
  }

  /**
   * Delete a quick reply
   */
  delete(id) {
    const all = this.load();
    const filtered = all.filter(r => r.id !== id);
    this.save(filtered);
    return true;
  }

  /**
   * Get all quick replies, optionally filtered
   */
  getAll(filters = {}) {
    let all = this.load();
    if (filters.category) {
      all = all.filter(r => r.category === filters.category);
    }
    if (filters.isActive !== undefined) {
      all = all.filter(r => r.isActive === filters.isActive);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      all = all.filter(r => 
        r.title.toLowerCase().includes(q) || 
        r.content.toLowerCase().includes(q) ||
        (r.tags && r.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
    return all;
  }

  /**
   * Get a single quick reply by ID
   */
  getById(id) {
    return this.load().find(r => r.id === id) || null;
  }

  /**
   * Increment usage count when quick reply is used
   */
  recordUsage(id) {
    const all = this.load();
    const r = all.find(r => r.id === id);
    if (r) {
      r.usageCount = (r.usageCount || 0) + 1;
      this.save(all);
    }
  }

  /**
   * Get most-used quick replies
   */
  getMostUsed(limit = 5) {
    return this.load()
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, limit);
  }

  /**
   * Bulk create multiple quick replies
   */
  bulkCreate(replies) {
    const all = this.load();
    const created = replies.map(r => ({
      id: r.id || uuid(),
      title: r.title,
      content: r.content,
      category: r.category || 'general',
      tags: r.tags || [],
      variables: r.variables || [],
      isActive: r.isActive !== undefined ? r.isActive : true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    all.push(...created);
    this.save(all);
    return created;
  }

  /**
   * Export quick replies as JSON
   */
  export() {
    return this.load();
  }

  /**
   * Import quick replies from array
   */
  import(replies) {
    const all = this.load();
    const toAdd = replies.map(r => ({
      id: r.id || uuid(),
      title: r.title,
      content: r.content,
      category: r.category || 'general',
      tags: r.tags || [],
      variables: r.variables || [],
      isActive: r.isActive !== undefined ? r.isActive : true,
      usageCount: r.usageCount || 0,
      createdAt: r.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    all.push(...toAdd);
    this.save(all);
    return toAdd;
  }
}

module.exports = QuickReplies;