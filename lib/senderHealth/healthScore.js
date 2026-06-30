// lib/senderHealth/healthScore.js — Compute a 0-100 health score from block/complaint tallies
// relative to volume. Pure function; the stored score (with recovery) is authoritative for gating,
// while this gives an at-a-glance derived rating for the dashboard.

const { config } = require('./config');

function derive(rec) {
 const sent = Math.max(1, rec.totalSent || 0);
 const blockRate = (rec.blocks || 0) / sent;
 const complaintRate = (rec.complaints || 0) / sent;
 let score = 100 - (blockRate * 100 * (config.blockPenalty / 8)) - (complaintRate * 100 * (config.complaintPenalty / 8));
 score = Math.max(0, Math.min(100, score));
 return Math.round(score);
}

function rating(score) {
 if (score >= 80) return 'healthy';
 if (score >= config.denyBelowScore) return 'watch';
 return 'at_risk';
}

module.exports = { derive, rating };
