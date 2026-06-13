const TOOL_WORDS = ['chatgpt', 'gpt', 'claude', 'midjourney', 'mid', 'cursor', 'gemini', 'perplexity', 'canva', 'copilot'];

function extractEntities(text = '') {
  const lower = String(text || '').toLowerCase();
  const tool = TOOL_WORDS.find((word) => lower.includes(word)) || '';
  const orderId = (text.match(/\bORD[-\s]?\d{4,}\b/i) || [''])[0].replace(/\s+/g, '-').toUpperCase();
  const accountType = lower.includes('non warranty') || lower.includes('non-warranty')
    ? 'non_warranty'
    : lower.includes('warranty')
      ? 'warranty'
      : lower.includes('private')
        ? 'private'
        : '';
  return { tool, orderId, accountType };
}

function classifyIntent(message = '') {
  const text = String(message || '').toLowerCase();
  const entities = extractEntities(message);
  const rules = [
    ['BOT_SERVICE', /\b(bot banana|automation chahiye|website|system|software|crm|ai agent)\b/i, 0.92],
    ['TRACK_ORDER', /\b(track|status|order id|mera order|delivery)\b/i, 0.86],
    ['PRICE_INQUIRY', /\b(price|rate|rates|kitna|pkr|rs|list)\b/i, 0.88],
    ['AVAILABILITY', /\b(stock|available|availability|slots?|maujood|hai\?)\b/i, 0.86],
    ['ORDER', /\b(order|buy|purchase|lena|chahiye|confirm)\b/i, 0.84],
    ['ISSUE_REPORT', /\b(issue|problem|not working|login|password|expired|complaint|replace|replacement)\b/i, 0.9],
    ['RENEWAL', /\b(renew|renewal|expire|expiry|extend|dobara)\b/i, 0.86]
  ];
  for (const [intent, pattern, confidence] of rules) {
    if (pattern.test(text)) return { intent, confidence, entities };
  }
  if (entities.tool) return { intent: 'PRICE_INQUIRY', confidence: 0.72, entities };
  return { intent: 'UNKNOWN', confidence: 0.3, entities };
}

module.exports = { classifyIntent, extractEntities };
