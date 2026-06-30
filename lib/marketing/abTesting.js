'use strict';
/**
 * abTesting.js — Marketing Feature #6: A/B test your campaign copy.
 *
 * Stop guessing which message converts. Define a test with 2+ variants and a traffic split; each
 * contact is deterministically bucketed (same contact always gets the same variant). Track results
 * per variant and declare a winner by conversion rate once you have enough data.
 *
 * Works with the rest: pickVariant() gives you the text to send (via segment broadcast / drip), and
 * record() takes the same events as campaign analytics (sent/read/click/conversion).
 *
 * Storage: JSON (data/ab_tests.json).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

function emptyStats() { return { sent: 0, read: 0, click: 0, conversion: 0, assigned: 0 }; }

/**
 * Create a test.
 * @param {Object} opts { name, variants:[{ key?, body }], split?: number[] }
 *   split defaults to even. variant keys default to A, B, C...
 */
function createTest(opts = {}) {
  if (!opts.name) throw new Error('test needs a name');
  const variants = Array.isArray(opts.variants) ? opts.variants : [];
  if (variants.length < 2) throw new Error('need at least 2 variants');
  const letters = 'ABCDEFGH';
  const norm = variants.map((v, i) => ({ key: v.key || letters[i] || `V${i}`, body: v.body, stats: emptyStats() }));
  const split = (Array.isArray(opts.split) && opts.split.length === norm.length)
    ? opts.split
    : norm.map(() => Math.round(100 / norm.length));
  const data = load();
  const test = {
    id: `AB-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    name: opts.name,
    status: 'running',   // running | completed
    variants: norm,
    split,
    winner: null,
    createdAt: nowIso()
  };
  data.tests.push(test);
  save(data);
  return test;
}

function getTest(id) { return load().tests.find(t => t.id === id) || null; }
function listTests() { return load().tests; }

// Deterministic bucket 0..99 from testId+contact, so a contact always gets the same variant.
function bucket(testId, contact) {
  const h = crypto.createHash('md5').update(`${testId}:${contact}`).digest('hex');
  return parseInt(h.slice(0, 8), 16) % 100;
}

/**
 * Pick the variant for a contact (deterministic). Returns { key, body }.
 */
function pickVariant(testId, contact) {
  const data = load();
  const test = data.tests.find(t => t.id === testId);
  if (!test) return null;
  if (test.status === 'completed' && test.winner) {
    const w = test.variants.find(v => v.key === test.winner);
    return w ? { key: w.key, body: w.body } : null;
  }
  const b = bucket(testId, String(contact || Math.random()));
  let acc = 0, chosen = test.variants[0];
  for (let i = 0; i < test.variants.length; i++) {
    acc += test.split[i];
    if (b < acc) { chosen = test.variants[i]; break; }
  }
  chosen.stats.assigned = (chosen.stats.assigned || 0) + 1;
  save(data);
  return { key: chosen.key, body: chosen.body };
}

/** Record an event for a variant. type: sent|read|click|conversion */
function record(testId, variantKey, type) {
  if (!['sent', 'read', 'click', 'conversion'].includes(type)) throw new Error('bad event type');
  const data = load();
  const test = data.tests.find(t => t.id === testId);
  if (!test) return null;
  const v = test.variants.find(x => x.key === variantKey);
  if (!v) return null;
  v.stats[type] = (v.stats[type] || 0) + 1;
  save(data);
  return v.stats;
}

function convRate(s) { return s.sent ? (s.conversion / s.sent) : 0; }

/**
 * Compute the current leader + whether it's statistically meaningful enough to call.
 * (Simple heuristic: a clear leader with >=100 sends each and >20% relative lift.)
 */
function analyze(testId) {
  const test = getTest(testId);
  if (!test) return null;
  const ranked = test.variants.map(v => ({ key: v.key, ...v.stats, conversionRatePct: Math.round(convRate(v.stats) * 1000) / 10 }))
    .sort((a, b) => convRate(b) - convRate(a));
  const [top, second] = ranked;
  const enoughData = ranked.every(v => v.sent >= 100);
  const clearLead = top && second ? convRate(top) >= convRate(second) * 1.2 : false;
  return { ranked, leader: top ? top.key : null, confident: !!(enoughData && clearLead) };
}

/** Lock in a winner (manual or after analyze says confident). Future sends use the winner. */
function declareWinner(testId, variantKey) {
  const data = load();
  const test = data.tests.find(t => t.id === testId);
  if (!test) return null;
  const key = variantKey || (analyze(testId) || {}).leader;
  if (!key) return null;
  test.winner = key;
  test.status = 'completed';
  test.completedAt = nowIso();
  save(data);
  return test;
}

module.exports = { createTest, getTest, listTests, pickVariant, record, analyze, declareWinner };
