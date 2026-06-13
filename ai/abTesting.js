// A/B Testing Module - Test message variants for better engagement

const { v4: uuid } = require('uuid');
const path = require('path');
const fs = require('fs');

class ABTesting {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.file = path.join(dataDir, 'ab_tests.json');
    this.resultsFile = path.join(dataDir, 'ab_results.json');
    this.init();
  }

  init() {
    if (!fs.existsSync(this.file)) {
      fs.writeFileSync(this.file, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(this.resultsFile)) {
      fs.writeFileSync(this.resultsFile, JSON.stringify([], null, 2));
    }
  }

  loadTests() {
    try {
      const raw = fs.readFileSync(this.file, 'utf8').trim();
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  saveTests(tests) {
    fs.writeFileSync(this.file, JSON.stringify(tests, null, 2));
  }

  loadResults() {
    try {
      const raw = fs.readFileSync(this.resultsFile, 'utf8').trim();
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  saveResults(results) {
    fs.writeFileSync(this.resultsFile, JSON.stringify(results, null, 2));
  }

  /**
   * Create an A/B test
   * @param {Object} test - { name, type: 'message'|'template'|'campaign', variants: [], audienceSegment, sampleSize }
   */
  createTest(test) {
    const tests = this.loadTests();
    const variants = Array.isArray(test.variants) ? test.variants : [];
    const record = {
      id: test.id || uuid(),
      name: test.name,
      type: test.type || 'message',
      description: test.description || '',
      variants: variants.map((v, idx) => ({
        id: v.id || `variant-${idx + 1}`,
        name: v.name,
        content: v.content,
        metadata: v.metadata || {},
        sentCount: 0,
        responseCount: 0,
        conversionCount: 0
      })),
      audience: test.audience || { segment: 'all', filters: {} },
      sampleSize: test.sampleSize || 100,
      splitRatio: test.splitRatio || 'equal', // 'equal' or custom percentages
      isActive: test.isActive !== undefined ? test.isActive : true,
      status: 'draft', // draft, running, completed
      startDate: test.startDate || null,
      endDate: test.endDate || null,
      winner: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    tests.push(record);
    this.saveTests(tests);
    return record;
  }

  /**
   * Start a test
   */
  startTest(testId) {
    const tests = this.loadTests();
    const t = tests.find(t => t.id === testId);
    if (!t) return null;
    t.status = 'running';
    t.startDate = new Date().toISOString();
    t.updatedAt = new Date().toISOString();
    this.saveTests(tests);
    return t;
  }

  /**
   * Stop a test
   */
  stopTest(testId) {
    const tests = this.loadTests();
    const t = tests.find(t => t.id === testId);
    if (!t) return null;
    t.status = 'completed';
    t.endDate = new Date().toISOString();
    t.updatedAt = new Date().toISOString();
    this.saveTests(tests);
    return t;
  }

  /**
   * Record a message sent as part of an A/B test
   */
  recordSend(testId, variantId, customerId, metadata = {}) {
    const results = this.loadResults();
    results.push({
      id: uuid(),
      testId,
      variantId,
      customerId,
      event: 'sent',
      timestamp: new Date().toISOString(),
      metadata
    });
    this.saveResults(results);

    // Update variant sent count
    const tests = this.loadTests();
    const t = tests.find(t => t.id === testId);
    if (t) {
      const v = t.variants.find(v => v.id === variantId);
      if (v) v.sentCount = (v.sentCount || 0) + 1;
      this.saveTests(tests);
    }
  }

  /**
   * Record a conversion/response event
   */
  recordConversion(testId, variantId, customerId, conversionType = 'response', metadata = {}) {
    const results = this.loadResults();
    results.push({
      id: uuid(),
      testId,
      variantId,
      customerId,
      event: conversionType,
      timestamp: new Date().toISOString(),
      metadata
    });
    this.saveResults(results);

    const tests = this.loadTests();
    const t = tests.find(t => t.id === testId);
    if (t) {
      const v = t.variants.find(v => v.id === variantId);
      if (v) {
        v.responseCount = (v.responseCount || 0) + 1;
        if (conversionType === 'conversion') {
          v.conversionCount = (v.conversionCount || 0) + 1;
        }
      }
      this.saveTests(tests);
    }
  }

  /**
   * Analyze test results and determine winner
   */
  analyzeTest(testId) {
    const tests = this.loadTests();
    const results = this.loadResults();
    const t = tests.find(t => t.id === testId);
    if (!t) return null;

    const testResults = results.filter(r => r.testId === testId);
    const analysis = {};

    t.variants.forEach(v => {
      const sent = testResults.filter(r => r.variantId === v.id && r.event === 'sent').length;
      const responses = testResults.filter(r => r.variantId === v.id && r.event === 'response').length;
      const conversions = testResults.filter(r => r.variantId === v.id && r.event === 'conversion').length;

      analysis[v.id] = {
        name: v.name,
        sent,
        responses,
        conversions,
        responseRate: sent > 0 ? parseFloat((responses / sent * 100).toFixed(2)) : 0,
        conversionRate: sent > 0 ? parseFloat((conversions / sent * 100).toFixed(2)) : 0
      };
    });

    // Determine winner based on primary metric
    let winner = null;
    let bestRate = -1;
    Object.entries(analysis).forEach(([id, stats]) => {
      const rate = stats.responseRate; // Could be conversionRate too
      if (rate > bestRate && stats.sent >= t.sampleSize / 2) {
        bestRate = rate;
        winner = { id, ...stats };
      }
    });

    t.winner = winner ? winner.id : null;
    this.saveTests(tests);

    return { test: t, analysis, winner };
  }

  /**
   * Get test results summary
   */
  getTestResults(testId) {
    const tests = this.loadTests();
    const results = this.loadResults();
    const t = tests.find(t => t.id === testId);
    if (!t) return null;

    const testResults = results.filter(r => r.testId === testId);
    const variants = t.variants.map(v => {
      const sent = testResults.filter(r => r.variantId === v.id && r.event === 'sent').length;
      const responses = testResults.filter(r => r.variantId === v.id && r.event === 'response').length;
      return {
        ...v,
        sent,
        responses,
        responseRate: sent > 0 ? parseFloat((responses / sent * 100).toFixed(2)) : 0
      };
    });

    return {
      test: t,
      variants,
      totalSent: testResults.filter(r => r.event === 'sent').length,
      totalResponses: testResults.filter(r => r.event === 'response').length,
      overallResponseRate: 0
    };
  }

  /**
   * List all A/B tests
   */
  getAllTests() {
    return this.loadTests();
  }

  /**
   * Delete a test
   */
  deleteTest(testId) {
    const tests = this.loadTests();
    const results = this.loadResults();
    const filteredTests = tests.filter(t => t.id !== testId);
    const filteredResults = results.filter(r => r.testId !== testId);
    this.saveTests(filteredTests);
    this.saveResults(filteredResults);
    return true;
  }
}

module.exports = ABTesting;
