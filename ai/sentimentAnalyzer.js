// Sentiment Analysis Module - AI-powered sentiment tracking

const path = require('path');
const fs = require('fs');

class SentimentAnalyzer {
  constructor(dataDir, settings) {
    this.dataDir = dataDir;
    this.settings = settings;
    this.sentimentFile = path.join(dataDir, 'sentiment.json');
    this.init();
  }

  init() {
    if (!fs.existsSync(this.sentimentFile)) {
      fs.writeFileSync(this.sentimentFile, JSON.stringify({}, null, 2));
    }
  }

  loadData() {
    try {
      return require(this.sentimentFile);
    } catch (e) {
      return {};
    }
  }

  saveData(data) {
    fs.writeFileSync(this.sentimentFile, JSON.stringify(data, null, 2));
  }

  /**
   * Analyze sentiment of a message using AI
   * @param {string} message - Message text
   * @returns {Promise<{sentiment: 'positive'|'negative'|'neutral', score: number}>}
   */
  async analyzeMessage(message) {
    const local = this.analyzeMessageLocal(message);
    const aiEnabled = String(process.env.SENTIMENT_AI_ENABLED || this.settings.sentiment_ai_enabled || '').toLowerCase() === 'true';
    if (!aiEnabled || !this.hasAnyProvider()) {
      return local;
    }

    try {
      const timeoutMs = Number(process.env.SENTIMENT_AI_TOTAL_TIMEOUT_MS || 1200);
      const result = (await this.withTimeout(this.callSentimentAI(message), timeoutMs)).trim().toUpperCase();
      let sentiment = 'neutral';
      let score = 0.5;

      if (result.includes('POSITIVE')) {
        sentiment = 'positive';
        score = 0.8;
      } else if (result.includes('NEGATIVE')) {
        sentiment = 'negative';
        score = 0.2;
      }

      return { sentiment, score, mode: 'ai' };
    } catch (err) {
      console.error('Sentiment analysis error:', err.message);
      return { ...local, error: err.message, mode: 'local_fallback' };
    }
  }

  analyzeMessageLocal(message = '') {
    const text = String(message || '').toLowerCase();
    const positiveWords = [
      'thanks', 'thank you', 'great', 'good', 'best', 'awesome', 'perfect', 'love', 'satisfied',
      'shukriya', 'jazak', 'zabardast', 'acha', 'achha', 'behtareen', 'kamal', 'theek', 'ok', 'done'
    ];
    const negativeWords = [
      'bad', 'worst', 'late', 'issue', 'problem', 'angry', 'refund', 'fake', 'scam', 'not working',
      'masla', 'maslay', 'ghalat', 'bekar', 'fraud', 'nahi chal', 'nh chal', 'kaam nhi', 'kaam nahi',
      'wait', 'slow', 'delay', 'late', 'خراب', 'مسئلہ', 'نہیں'
    ];
    let positive = 0;
    let negative = 0;
    for (const word of positiveWords) {
      if (text.includes(word)) positive++;
    }
    for (const word of negativeWords) {
      if (text.includes(word)) negative++;
    }
    if (/[!?]{2,}/.test(text)) negative += 1;
    if (positive > negative) {
      return { sentiment: 'positive', score: Math.min(0.9, 0.62 + positive * 0.07), mode: 'local' };
    }
    if (negative > positive) {
      return { sentiment: 'negative', score: Math.max(0.1, 0.38 - negative * 0.06), mode: 'local' };
    }
    return { sentiment: 'neutral', score: 0.5, mode: 'local' };
  }

  withTimeout(promise, timeoutMs) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`sentiment AI timeout after ${timeoutMs}ms`)), timeoutMs);
      if (timer.unref) timer.unref();
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  normalizeProvider(value = '') {
    const v = String(value || '').toLowerCase();
    if (v.includes('anthropic') || v.includes('claude')) return 'anthropic';
    if (v.includes('gemini') || v.includes('google')) return 'gemini';
    if (v.includes('openai') || v.includes('gpt')) return 'openai';
    return 'groq';
  }

  providerConfig(provider = this.settings.active_ai_provider || process.env.ACTIVE_AI_PROVIDER) {
    const id = this.normalizeProvider(provider);
    const map = {
      groq: { id, key: this.settings.groq_api_key || process.env.GROQ_API_KEY, model: this.settings.groq_model || process.env.GROQ_MODEL || 'llama3-8b-8192' },
      anthropic: { id, key: this.settings.anthropic_api_key || process.env.ANTHROPIC_API_KEY, model: this.settings.anthropic_model || process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest' },
      gemini: { id, key: this.settings.gemini_api_key || process.env.GEMINI_API_KEY, model: this.settings.gemini_model || process.env.GEMINI_MODEL || 'gemini-1.5-flash' },
      openai: { id, key: this.settings.openai_api_key || process.env.OPENAI_API_KEY, model: this.settings.openai_model || process.env.OPENAI_MODEL || 'gpt-4o-mini' }
    };
    return map[id] || map.groq;
  }

  configuredProviders() {
    const active = this.normalizeProvider(this.settings.active_ai_provider || process.env.ACTIVE_AI_PROVIDER);
    return [...new Set([active, 'groq', 'anthropic', 'gemini', 'openai'])]
      .map(provider => this.providerConfig(provider))
      .filter(cfg => !!String(cfg.key || '').trim());
  }

  hasAnyProvider() {
    return this.configuredProviders().length > 0;
  }

  async callSentimentAI(message) {
    const providers = this.configuredProviders();
    const system = 'Analyze customer sentiment. Respond with ONLY: POSITIVE, NEGATIVE, or NEUTRAL';
    const timeoutMs = Number(process.env.SENTIMENT_TIMEOUT_MS || 2500);
    let lastError = null;

    for (const cfg of providers) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      if (timeout.unref) timeout.unref();
      try {
        let result = '';
        if (cfg.id === 'anthropic') {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'x-api-key': cfg.key,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: cfg.model,
              system,
              messages: [{ role: 'user', content: String(message || '').slice(0, 1000) }],
              max_tokens: 10,
              temperature: 0.1
            })
          });
          if (!response.ok) throw new Error(`anthropic ${response.status}`);
          const data = await response.json();
          result = (data.content || []).map(part => part.text || '').join('');
        } else if (cfg.id === 'gemini') {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.key)}`, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents: [{ role: 'user', parts: [{ text: String(message || '').slice(0, 1000) }] }],
              generationConfig: { maxOutputTokens: 10, temperature: 0.1 }
            })
          });
          if (!response.ok) throw new Error(`gemini ${response.status}`);
          const data = await response.json();
          result = (data.candidates?.[0]?.content?.parts || []).map(part => part.text || '').join('');
        } else {
          const endpoint = cfg.id === 'groq'
            ? 'https://api.groq.com/openai/v1/chat/completions'
            : 'https://api.openai.com/v1/chat/completions';
          const response = await fetch(endpoint, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Authorization': `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: cfg.model,
              messages: [
                { role: 'system', content: system },
                { role: 'user', content: String(message || '').slice(0, 1000) }
              ],
              max_tokens: 10,
              temperature: 0.1
            })
          });
          if (!response.ok) throw new Error(`${cfg.id} ${response.status}`);
          const data = await response.json();
          result = data.choices?.[0]?.message?.content || '';
        }
        if (result) return result;
        lastError = new Error(`${cfg.id} empty response`);
      } catch (error) {
        lastError = error;
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError || new Error('sentiment provider failed');
  }

  /**
   * Record sentiment for a conversation
   * @param {string} customerId - Customer ID
   * @param {string} message - Message text
   * @param {string} direction - 'inbound' or 'outbound'
   */
  async recordSentiment(customerId, message, direction = 'inbound') {
    const analysis = await this.analyzeMessage(message);
    const data = this.loadData();

    if (!data[customerId]) {
      data[customerId] = {
        totalMessages: 0,
        sentimentHistory: [],
        currentSentiment: 'neutral',
        sentimentScore: 0.5,
        trends: { positive: 0, negative: 0, neutral: 0 }
      };
    }

    data[customerId].totalMessages++;
    data[customerId].sentimentHistory.push({
      timestamp: new Date().toISOString(),
      sentiment: analysis.sentiment,
      score: analysis.score,
      direction
    });

    // Keep only last 100 entries per customer
    if (data[customerId].sentimentHistory.length > 100) {
      data[customerId].sentimentHistory = data[customerId].sentimentHistory.slice(-100);
    }

    // Recalculate overall sentiment
    const recent = data[customerId].sentimentHistory.slice(-10);
    const avgScore = recent.reduce((sum, r) => sum + r.score, 0) / recent.length;
    data[customerId].sentimentScore = avgScore;
    data[customerId].currentSentiment = avgScore >= 0.6 ? 'positive' : avgScore <= 0.4 ? 'negative' : 'neutral';

    // Update trend counters
    data[customerId].trends[analysis.sentiment]++;

    this.saveData(data);
    return analysis;
  }

  /**
   * Get sentiment report for a customer
   */
  getCustomerSentiment(customerId) {
    const data = this.loadData();
    return data[customerId] || null;
  }

  /**
   * Get overall sentiment statistics
   */
  getOverallStats() {
    const data = this.loadData();
    const customers = Object.keys(data).length;
    let totalPositive = 0, totalNegative = 0, totalNeutral = 0;
    const sentimentScores = [];

    Object.values(data).forEach(c => {
      totalPositive += c.trends.positive || 0;
      totalNegative += c.trends.negative || 0;
      totalNeutral += c.trends.neutral || 0;
      sentimentScores.push(c.sentimentScore);
    });

    const avgSentiment = sentimentScores.length ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length : 0.5;

    return {
      customersAnalyzed: customers,
      totalPositive,
      totalNegative,
      totalNeutral,
      averageSentimentScore: parseFloat(avgSentiment.toFixed(2)),
      distribution: {
        positive: totalPositive,
        negative: totalNegative,
        neutral: totalNeutral
      }
    };
  }

  /**
   * Get customers by sentiment category
   */
  getCustomersBySentiment(sentiment) {
    const data = this.loadData();
    return Object.entries(data)
      .filter(([id, c]) => c.currentSentiment === sentiment)
      .map(([id, c]) => ({ customerId: id, ...c }));
  }
}

module.exports = SentimentAnalyzer;
