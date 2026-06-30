'use strict';
/**
 * qualityGuard.js — Sending Feature #6: pre-send message quality / ban-risk check.
 *
 * WhatsApp scores your number's QUALITY; spammy broadcasts tank it and get you blocked. This checks
 * a draft BEFORE it goes out: excessive CAPS (shouting), too many links, known spam trigger words,
 * over-length, and too many emojis. It returns warnings + a 0-100 risk score so the UI can nudge the
 * user to soften copy, and can hard-block above a threshold.
 *
 * Pure function, no I/O. Wire it into the broadcast/compose path.
 */

const SPAM_WORDS = [
  'free money', 'winner', 'congratulations you', 'click here now', 'act now', 'limited time',
  '100% free', 'guaranteed', 'no cost', 'risk free', 'cash bonus', 'earn money fast', 'lottery'
];

function analyze(text, opts = {}) {
  const t = String(text || '');
  const warnings = [];
  let score = 0;

  if (!t.trim()) return { score: 0, risk: 'low', warnings: ['empty message'], block: false };

  // CAPS ratio
  const letters = t.replace(/[^a-zA-Z]/g, '');
  if (letters.length >= 10) {
    const capsRatio = (t.replace(/[^A-Z]/g, '').length) / letters.length;
    if (capsRatio > 0.6) { score += 30; warnings.push('too much UPPERCASE (looks like shouting)'); }
    else if (capsRatio > 0.4) { score += 15; warnings.push('high uppercase ratio'); }
  }

  // links
  const links = (t.match(/https?:\/\/|www\./gi) || []).length;
  if (links >= 3) { score += 30; warnings.push('3+ links (high spam signal)'); }
  else if (links === 2) { score += 12; warnings.push('multiple links'); }

  // spam words
  const lower = t.toLowerCase();
  const hits = SPAM_WORDS.filter(w => lower.includes(w));
  if (hits.length) { score += Math.min(40, hits.length * 15); warnings.push(`spam trigger words: ${hits.join(', ')}`); }

  // length
  if (t.length > 1000) { score += 15; warnings.push('very long message'); }

  // emoji flood
  const emojis = (t.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
  if (emojis > 10) { score += 15; warnings.push('too many emojis'); }

  // exclamation flood
  if ((t.match(/!/g) || []).length > 3) { score += 10; warnings.push('too many exclamation marks'); }

  score = Math.min(100, score);
  const risk = score >= 70 ? 'high' : score >= 35 ? 'medium' : 'low';
  const threshold = Number(opts.blockThreshold || 70);
  return { score, risk, warnings, block: score >= threshold };
}

module.exports = { analyze, SPAM_WORDS };
