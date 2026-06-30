'use strict';
// #71 Loyalty & Points — self-diagnostic.
const config = require('./config');
const store = require('./store');

function check() {
  const issues = [];
  const ok = [];
  if (config.pointsPerCurrency <= 0) issues.push('LOYALTY_POINTS_PER_CURRENCY <= 0 — nobody earns');
  else ok.push('earn rate set');
  if (config.pointValue <= 0) issues.push('LOYALTY_POINT_VALUE <= 0 — redemption worthless');
  else ok.push('point value set');
  if (config.maxRedeemRatio <= 0 || config.maxRedeemRatio > 1) issues.push('LOYALTY_MAX_REDEEM_RATIO out of 0..1');
  else ok.push('redeem ratio sane');
  if (!Array.isArray(config.tiers) || config.tiers.length === 0) issues.push('no tiers configured');
  else ok.push(`${config.tiers.length} tiers`);
  let db;
  try { db = store.load(); ok.push('store readable'); } catch (e) { issues.push('store unreadable: ' + e.message); }
  const accounts = db ? Object.keys(db.accounts || {}).length : 0;
  const ledger = db ? (db.ledger || []).length : 0;
  return { dept: 'loyalty', enabled: config.enabled, ok, issues, stats: { accounts, ledgerEntries: ledger }, healthy: issues.length === 0 };
}

module.exports = { check };
