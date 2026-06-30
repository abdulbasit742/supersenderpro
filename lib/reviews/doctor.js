'use strict';
// #77 Reviews & Ratings — self-diagnostic.
const config = require('./config');
const store = require('./store');

function check() {
  const ok = [], issues = [];
  if (config.minRating >= config.maxRating) issues.push('minRating >= maxRating');
  else ok.push(`rating scale ${config.minRating}..${config.maxRating}`);
  ok.push(config.autoApprove ? 'auto-approve ON' : 'moderation required');
  ok.push(`${config.flagWords.length} flag words`);
  try { require('../adminAlert'); ok.push('alerts bridge available'); } catch (_) { ok.push('alerts bridge absent (advisory)'); }
  let db; try { db = store.load(); ok.push('store readable'); } catch (e) { issues.push('store unreadable: ' + e.message); }
  const total = db ? (db.reviews || []).length : 0;
  const pending = db ? db.reviews.filter(r => r.status === 'pending').length : 0;
  return { dept: 'reviews', enabled: config.enabled, ok, issues, stats: { total, pending }, healthy: issues.length === 0 };
}
module.exports = { check };
