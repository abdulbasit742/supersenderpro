// lib/groupCommerce/fraudScoring.js - Scam / Fraud Risk Scoring
// Scores a group message for scam likelihood (0-100). Dry-run advisory only.

const RISK_PATTERNS = [
  { re: /\b(advance|pay first|pay in advance|100% advance)\b/i, weight: 25, label: 'Advance-payment demand' },
  { re: /\b(double your money|guaranteed profit|investment plan|earn daily)\b/i, weight: 30, label: 'Too-good-to-be-true offer' },
  { re: /\b(whatsapp me|dm me|inbox me|contact admin only)\b/i, weight: 10, label: 'Pushes off-platform contact' },
  { re: /(https?:\/\/(bit\.ly|tinyurl|cutt\.ly|t\.me)\/[^\s]+)/i, weight: 20, label: 'Shortened/suspicious link' },
  { re: /\b(crypto|usdt|binance|trust wallet|gift card)\b/i, weight: 20, label: 'High-risk payment method' },
  { re: /\b(urgent|hurry|limited stock|only today|last piece)\b/i, weight: 8, label: 'Artificial urgency' },
  { re: /\b(account blocked|verify your account|claim your prize|you won)\b/i, weight: 25, label: 'Phishing-style claim' }
];

function scoreMessage(messageText) {
  const text = String(messageText || '');
  let score = 0;
  const signals = [];

  RISK_PATTERNS.forEach(p => {
    if (p.re.test(text)) {
      score += p.weight;
      signals.push(p.label);
    }
  });

  score = Math.min(score, 100);

  let level = 'low';
  if (score >= 60) level = 'high';
  else if (score >= 30) level = 'medium';

  const recommendation = level === 'high'
    ? 'Flag to admin immediately. Do not transact. Dry-run: message would be hidden pending review.'
    : level === 'medium'
      ? 'Caution advised. Verify seller trust score before transacting.'
      : 'No significant scam signals detected.';

  return { success: true, riskScore: score, riskLevel: level, signals, recommendation, dryRun: true };
}

module.exports = { scoreMessage };
