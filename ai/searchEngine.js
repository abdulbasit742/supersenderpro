// Compact full-text search engine.
// Stores each document once and keeps terms as doc-key references to avoid huge duplicate JSON files.

const path = require('path');
const fs = require('fs');

class SearchEngine {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.indexFile = path.join(dataDir, 'search_index.json');
    this.cache = null;
    this.cacheMtimeMs = 0;
    this.maxDocsPerTerm = Number(process.env.SEARCH_MAX_DOCS_PER_TERM || 250);
    this.maxConversationMessages = Number(process.env.SEARCH_MAX_CONVERSATION_MESSAGES || 2500);
    this.maxAnalyticsMessages = Number(process.env.SEARCH_MAX_ANALYTICS_MESSAGES || 1500);
    this.init();
  }

  init() {
    if (!fs.existsSync(this.indexFile)) {
      this.saveIndex(this.emptyIndex());
    }
  }

  emptyIndex() {
    return { version: 2, builtAt: new Date().toISOString(), terms: {}, docs: {} };
  }

  loadIndex() {
    try {
      const stat = fs.statSync(this.indexFile);
      if (this.cache && this.cacheMtimeMs === stat.mtimeMs) return this.cache;
      const parsed = JSON.parse(fs.readFileSync(this.indexFile, 'utf8') || '{}');
      const index = parsed.version === 2 ? parsed : this.migrateLegacyIndex(parsed);
      this.cache = index;
      this.cacheMtimeMs = stat.mtimeMs;
      return index;
    } catch {
      return this.emptyIndex();
    }
  }

  saveIndex(index) {
    const payload = {
      version: 2,
      builtAt: index.builtAt || new Date().toISOString(),
      terms: index.terms || {},
      docs: index.docs || {}
    };
    fs.writeFileSync(this.indexFile, JSON.stringify(payload), 'utf8');
    try {
      const stat = fs.statSync(this.indexFile);
      this.cacheMtimeMs = stat.mtimeMs;
      this.cache = payload;
    } catch {
      this.cache = payload;
    }
  }

  migrateLegacyIndex(legacy = {}) {
    const index = this.emptyIndex();
    for (const [term, docs] of Object.entries(legacy || {})) {
      if (!Array.isArray(docs)) continue;
      for (const doc of docs.slice(0, this.maxDocsPerTerm)) {
        const key = this.docKey(doc.type, doc.id);
        if (!key) continue;
        index.docs[key] = {
          type: doc.type,
          id: doc.id,
          content: doc.content || '',
          metadata: doc.metadata || {}
        };
        if (!index.terms[term]) index.terms[term] = [];
        if (!index.terms[term].includes(key)) index.terms[term].push(key);
      }
    }
    return index;
  }

  docKey(type, id) {
    if (!type || id === undefined || id === null) return '';
    return `${String(type)}:${String(id)}`;
  }

  addDoc(index, type, id, content, metadata = {}) {
    const key = this.docKey(type, id);
    if (!key) return;
    const cleanContent = String(content || '').slice(0, 1200);
    index.docs[key] = { type, id: String(id), content: cleanContent, metadata };
    for (const word of this.tokenize(cleanContent)) {
      if (!index.terms[word]) index.terms[word] = [];
      const bucket = index.terms[word];
      if (!bucket.includes(key)) {
        bucket.push(key);
        if (bucket.length > this.maxDocsPerTerm) bucket.shift();
      }
    }
  }

  buildIndex(customers = [], conversations = {}, analytics = []) {
    const index = this.emptyIndex();

    (Array.isArray(customers) ? customers : []).forEach(customer => {
      const text = `${customer.name || ''} ${customer.number || ''} ${customer.status || ''} ${customer.buyerIntent || ''} ${Array.isArray(customer.tags) ? customer.tags.join(' ') : ''}`;
      this.addDoc(index, 'customer', customer.id || customer.number, text, {
        name: customer.name || '',
        number: customer.number || '',
        status: customer.status || '',
        tags: customer.tags || []
      });
    });

    let messageCount = 0;
    for (const [number, conv] of Object.entries(conversations || {})) {
      const history = Array.isArray(conv.history) ? conv.history.slice(-80) : [];
      for (let idx = 0; idx < history.length; idx += 1) {
        if (messageCount >= this.maxConversationMessages) break;
        const h = history[idx] || {};
        const text = `${h.role || ''} ${h.msg || h.message || ''}`;
        this.addDoc(index, 'message', `${number}-${idx}`, text, {
          number,
          role: h.role || '',
          time: h.time || '',
          messageIndex: idx
        });
        messageCount += 1;
      }
      if (messageCount >= this.maxConversationMessages) break;
    }

    (Array.isArray(analytics) ? analytics.slice(-this.maxAnalyticsMessages) : []).forEach((msg, idx) => {
      const text = `${msg.content || msg.message || ''} ${msg.to || ''}`;
      this.addDoc(index, 'analytics', idx, text, {
        to: msg.to || '',
        status: msg.status || '',
        timestamp: msg.timestamp || msg.time || ''
      });
    });

    this.saveIndex(index);
    return index;
  }

  tokenize(text) {
    return [...new Set(String(text || '')
      .toLowerCase()
      .replace(/[^\w\s@+\-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 80))];
  }

  search(query, options = {}) {
    const { types = ['customer', 'message', 'analytics'], limit = 50 } = options;
    const typeSet = new Set(types);
    const index = this.loadIndex();
    const scores = new Map();
    for (const term of this.tokenize(query)) {
      for (const key of index.terms?.[term] || []) {
        const doc = index.docs?.[key];
        if (!doc || !typeSet.has(doc.type)) continue;
        const current = scores.get(key) || { ...doc, score: 0, terms: [] };
        current.score += 1;
        current.terms.push(term);
        scores.set(key, current);
      }
    }
    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Number(limit || 50)));
  }

  searchCustomers(query) {
    return this.search(query, { types: ['customer'], limit: 50 }).map(row => ({
      id: row.id,
      name: row.metadata.name,
      number: row.metadata.number,
      status: row.metadata.status,
      tags: row.metadata.tags || []
    }));
  }

  searchMessages(query) {
    return this.search(query, { types: ['message'], limit: 100 });
  }

  indexCustomer(customer = {}) {
    const index = this.loadIndex();
    this.removeCustomerFromIndex(index, customer.id || customer.number);
    const text = `${customer.name || ''} ${customer.number || ''} ${customer.status || ''} ${customer.buyerIntent || ''} ${Array.isArray(customer.tags) ? customer.tags.join(' ') : ''}`;
    this.addDoc(index, 'customer', customer.id || customer.number, text, {
      name: customer.name || '',
      number: customer.number || '',
      status: customer.status || '',
      tags: customer.tags || []
    });
    this.saveIndex(index);
  }

  removeCustomerFromIndex(index, customerId) {
    const id = String(customerId || '');
    for (const key of Object.keys(index.docs || {})) {
      const doc = index.docs[key];
      if (doc?.type === 'customer' && String(doc.id) === id) delete index.docs[key];
    }
    for (const term of Object.keys(index.terms || {})) {
      index.terms[term] = index.terms[term].filter(key => index.docs[key]);
      if (!index.terms[term].length) delete index.terms[term];
    }
  }

  removeCustomer(customerId) {
    const index = this.loadIndex();
    this.removeCustomerFromIndex(index, customerId);
    this.saveIndex(index);
  }

  clearIndex() {
    this.saveIndex(this.emptyIndex());
  }

  rebuild(customers, conversations, analytics) {
    return this.buildIndex(customers, conversations, analytics);
  }

  getSuggestions(prefix, limit = 5) {
    const index = this.loadIndex();
    const lower = String(prefix || '').toLowerCase();
    const results = new Set();
    for (const term of Object.keys(index.terms || {})) {
      if (!term.startsWith(lower)) continue;
      for (const key of index.terms[term] || []) {
        const doc = index.docs?.[key];
        if (doc?.type === 'customer') results.add(doc.metadata.name || doc.metadata.number || doc.id);
        if (results.size >= limit) return Array.from(results);
      }
    }
    return Array.from(results).slice(0, limit);
  }

  getStats() {
    const index = this.loadIndex();
    const docs = Object.values(index.docs || {});
    return {
      version: index.version || 1,
      builtAt: index.builtAt || '',
      terms: Object.keys(index.terms || {}).length,
      documents: docs.length,
      customerCount: docs.filter(doc => doc.type === 'customer').length,
      messageCount: docs.filter(doc => doc.type === 'message').length,
      analyticsCount: docs.filter(doc => doc.type === 'analytics').length,
      fileSizeMb: fs.existsSync(this.indexFile)
        ? Math.round(fs.statSync(this.indexFile).size / 1024 / 1024 * 100) / 100
        : 0
    };
  }
}

module.exports = SearchEngine;
