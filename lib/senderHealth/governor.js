// lib/senderHealth/governor.js — The core decision: gate(number) returns whether a send should
// proceed right now, and if so a recommended human-like delay before it. Decision factors:
//  - health score below denyBelowScore     -> deny (rest/review the number)
//  - hourly cap reached                     -> hold (try later this hour)
//  - warmup/daily cap reached               -> hold (try tomorrow)
//  - min spacing since last send not elapsed -> hold (wait the remaining time)
//  - otherwise                               -> allow + a randomized delay in [minDelayMs,maxDelayMs]
// This module is ADVISORY: it records nothing about the message body and never sends. Call
// recordSend(number) from your sender AFTER a successful send so counters + score stay accurate.

const { config } = require('./config');
const registry = require('./numberRegistry');

function dailyCapFor(rec, refNow) {
 const age = registry.ageDays(rec, refNow);
 const ramped = config.warmupStartCap + age * config.warmupGrowthPerDay;
 return Math.min(config.dailyCapMax, Math.max(config.warmupStartCap, ramped));
}

function _jitter(refNow) {
 const span = Math.max(0, config.maxDelayMs - config.minDelayMs);
 return config.minDelayMs + Math.floor((((refNow % 1000) / 1000) * 0.0 + Math.random()) * span);
}

function gate(number, refNow = Date.now()) {
 if (!config.enabled) return { decision: 'allow', delayMs: 0, reason: 'governor disabled' };
 const rec = registry.get(number, refNow);
 const dailyCap = dailyCapFor(rec, refNow);

 if (rec.status === 'suspended') return { decision: 'deny', reason: 'number suspended', score: Math.round(rec.score), dailyCap };
 if (Math.round(rec.score) < config.denyBelowScore) return { decision: 'deny', reason: `health score ${Math.round(rec.score)} below ${config.denyBelowScore}`, score: Math.round(rec.score), dailyCap };
 if (rec.hourSent >= config.hourlyCap) return { decision: 'hold', retryAfterMs: 3600000, reason: `hourly cap ${config.hourlyCap} reached`, score: Math.round(rec.score), dailyCap };
 if (rec.daySent >= dailyCap) return { decision: 'hold', retryAfterMs: 86400000, reason: `daily cap ${dailyCap} reached (warmup age ${registry.ageDays(rec, refNow)}d)`, score: Math.round(rec.score), dailyCap };

 // Minimum spacing since last send.
 if (rec.lastSendAt) {
 const since = refNow - Date.parse(rec.lastSendAt);
 if (since < config.minDelayMs) return { decision: 'hold', retryAfterMs: config.minDelayMs - since, reason: 'min spacing not elapsed', score: Math.round(rec.score), dailyCap };
 }
 return { decision: 'allow', delayMs: _jitter(refNow), reason: 'ok', score: Math.round(rec.score), remainingToday: dailyCap - rec.daySent, dailyCap };
}

// Convenience: gate + (if allowed) immediately account the send. Returns the gate result.
function gateAndRecord(number, refNow = Date.now()) {
 const g = gate(number, refNow);
 if (g.decision === 'allow') registry.recordSend(number, refNow);
 return g;
}

function overview() {
 const nums = registry.all();
 const round = (n) => Math.round(n);
 return {
 generatedAt: new Date().toISOString(),
 cards: {
 numbers: nums.length,
 active: nums.filter((n) => n.status === 'active').length,
 suspended: nums.filter((n) => n.status === 'suspended').length,
 atRisk: nums.filter((n) => round(n.score) < config.denyBelowScore).length,
 sentToday: nums.reduce((s, n) => s + (n.daySent || 0), 0),
 totalSent: nums.reduce((s, n) => s + (n.totalSent || 0), 0),
 totalBlocks: nums.reduce((s, n) => s + (n.blocks || 0), 0),
 totalComplaints: nums.reduce((s, n) => s + (n.complaints || 0), 0),
 },
 numbers: nums.map(registry.publicView),
 };
}

module.exports = { gate, gateAndRecord, dailyCapFor, overview };
