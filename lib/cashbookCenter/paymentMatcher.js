'use strict';
/**
 * paymentMatcher.js — suggests matches between a cash transaction and candidate
 * invoices/bills/other transactions. Confidence 0..1. Preview-only; no write.
 * Candidates can be supplied by the caller (read-only from receivables/payables).
 */
function scorePair(txn, candidate) {
  let score = 0;
  const amtA = Number(txn.amount) || 0;
  const amtB = Number(candidate.amount) || 0;
  if (amtA && amtB) {
    if (amtA === amtB) score += 0.5;
    else if (Math.abs(amtA - amtB) / Math.max(amtA, amtB) < 0.02) score += 0.35;
  }
  const rA = String(txn.referenceMasked || '').replace(/\*/g, '');
  const rB = String(candidate.referenceMasked || candidate.reference || '').replace(/\*/g, '');
  if (rA && rB && (rA === rB || rA.slice(-2) === rB.slice(-2))) score += 0.3;
  if (txn.transactionDate && candidate.date && txn.transactionDate === candidate.date) score += 0.15;
  if (candidate.direction && txn.direction && candidate.direction === txn.direction) score += 0.05;
  return Math.min(1, Math.round(score * 100) / 100);
}
function match(txn, candidates) {
  const suggested = (candidates || [])
    .map((c) => ({ candidateId: c.id, type: c.type || 'unknown', amount: c.amount, matchConfidencePreview: scorePair(txn, c) }))
    .filter((s) => s.matchConfidencePreview >= 0.5)
    .sort((a, b) => b.matchConfidencePreview - a.matchConfidencePreview);
  const best = suggested[0];
  return {
    ok: true,
    dryRun: true,
    liveWrite: false,
    transactionId: txn.id,
    suggestedMatches: suggested.slice(0, 5),
    matchConfidencePreview: best ? best.matchConfidencePreview : 0,
    warnings: best ? [] : ['no_confident_match'],
    blockers: [],
  };
}
module.exports = { match, scorePair };
