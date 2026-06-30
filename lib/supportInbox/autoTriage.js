// lib/supportInbox/autoTriage.js — Deterministic keyword triage: infer category + priority
// from message text. No external calls. Used at ticket creation to pre-route work.

const RULES = [
 { category: 'billing', priority: 'high', kw: ['refund', 'invoice', 'charge', 'payment', 'paisa', 'paise', 'bill', 'subscription'] },
 { category: 'bug', priority: 'high', kw: ['error', 'crash', 'not working', 'broken', 'bug', 'fail', 'issue'] },
 { category: 'urgent', priority: 'urgent', kw: ['urgent', 'asap', 'immediately', 'emergency', 'down', 'jaldi'] },
 { category: 'sales', priority: 'normal', kw: ['price', 'pricing', 'buy', 'purchase', 'demo', 'trial', 'plan', 'upgrade'] },
 { category: 'account', priority: 'normal', kw: ['login', 'password', 'reset', 'access', 'account', 'signup', 'sign in'] },
];

function triage(text = '') {
 const s = String(text).toLowerCase();
 for (const rule of RULES) {
 if (rule.kw.some((k) => s.includes(k))) return { category: rule.category, priority: rule.priority, matched: true };
 }
 return { category: 'general', priority: 'normal', matched: false };
}

module.exports = { triage, RULES };
