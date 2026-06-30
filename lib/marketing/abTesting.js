'use strict';
/**
 * abTesting.js — Marketing Feature #6: A/B test your campaign copy.
 *
 * Stop guessing which message converts. Define a test with 2+ variants (different copy), split the
 * audience, send each contact their assigned variant, and measure which wins by conversion rate.
 *
 * Assignment is DETERMINISTIC per contact (hash of phone) so the same person always sees the same
 * variant across sends. Results plug into campaign analytics (#5) shape so reporting is consistent.
 *
 * Storage: JSON (data/ab_tests.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'ab_tests.json');

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { tests: [] }; }
  catch { return { tests: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();

function hashToUnit(s) {
  let h = 0; const str = String(s || '');
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h % 1000) / 1000; // 0..1
}

function emptyMetrics() { return { sent: 0, read: 0, click: 0, conversion: 0, revenue: 0 }; }

/**
 * Create a test.
 * @param {Object} opts { name, variants:[{ key?, body }], split?:[0.5,0.5] }
 */
function createTest(opts = {}) {
  if (!opts.name) throw new Error('test needs a name');
  const variants = Array.isArray(opts.variants) ? opts.variants : [];
  if (variants.length < 2) throw new Error('need at least 2 variants');
  // normalise split
  let split = Array.isArray(opts.split) && opts.split.length === variants.length
    ? opts.split.slice() : variants.map(() => 1 / variants.length);
  const sum = split.reduce((a, b) => a + b, 0) || 1;
  split = split.map(s => s / sum);

  const data = load();
  const test = {
    id: `AB-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    name: opts.name,
    status: 'running',  // running | stopped
    variants: variants.map((v, i) => ({ key: v.key || String.fromCharCode(65 + i), body: v.body, metrics: emptyMetrics() })),
    split,
    createdAt: nowIso()
  };
  data.tests.push(test);
  save(data);
  return test;
}

function getTest(id) { return load().tests.find(t => t.id === id) || null; }
function listTests() { return load().tests; }

/** Deterministically pick a variant for a contact. Returns { key, body } or null. */
function pickVariant(testId, contactKey) {
  const test = getTest(testId);
  if (!test || test.status !== 'running') return null;
  const u = hashToUnit(`${testId}:${contactKey}`);
  let acc = 0;
  for (let i = 0; i < test.variants.length; i++) {
    acc += test.split[i];
    if (u <= acc) return { key: test.variants[i].key, body: test.variants[i].body, variantIndex: i };
  }
  const last = test.variants.length - 1;
  return { key: test.variants[last].key, body: test.variants[last].body, variantIndex: last };
}

/** Record an event for a variant. type: sent|read|click|conversion. */
function record(testId, variantKey, type, revenue = 0) {
  const data = load();
  const test = data.tests.find(t => t.id === testId);
  if (!test) return null;
  const v = test.variants.find(x => x.key === variantKey);
  if (!v) return null;
  if (type === 'conversion') { v.metrics.conversion += 1; v.metrics.revenue += Number(revenue || 0); }
  else if (v.metrics[type] !== undefined) v.metrics[type] += 1;
  save(data);
  return v.metrics;
}

function stopTest(id) {
  const data = load();
  const t = data.tests.find(x => x.id === id);
  if (!t) return null;
  t.status = 'stopped';
  t.stoppedAt = nowIso();
  save(data);
  return t;
}

/** Winner by conversion rate (conversions / sent). Returns { winner, variants } with rates. */
function results(id) {
  const test = getTest(id);
  if (!test) return null;
  const rows = test.variants.map(v => {
    const m = v.metrics;
    const convRate = m.sent ? Math.round((m.conversion / m.sent) * 1000) / 10 : 0;
    const openRate = m.sent ? Math.round((m.read / m.sent) * 1000) / 10 : 0;
    return { key: v.key, ...m, conversionRatePct: convRate, openRatePct: openRate };
  });
  const winner = rows.slice().sort((a, b) => b.conversionRatePct - a.conversionRatePct)[0] || null;
  return { id: test.id, name: test.name, status: test.status, winner: winner ? winner.key : null, variants: rows };
}

module.exports = { createTest, getTest, listTests, pickVariant, record, stopTest, results };
