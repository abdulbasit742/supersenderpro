const TOOL_ALIASES = [
  ['ChatGPT', ['chatgpt', 'chat gpt', 'gpt', 'gptplus', 'openai']],
  ['Claude', ['claude', 'cloude', 'anthropic']],
  ['Midjourney', ['midjourney', 'mid journey', 'mid', 'mj']],
  ['Cursor', ['cursor']],
  ['Gemini', ['gemini', 'google ai']],
  ['Perplexity', ['perplexity', 'perplex']],
  ['Canva', ['canva']],
  ['Turnitin', ['turnitin']],
  ['Quillbot', ['quillbot']]
];

const PLAN_ALIASES = [
  ['Plus', ['plus', 'pls']],
  ['Pro', ['pro']],
  ['Team', ['team']],
  ['Go', ['go']],
  ['Basic', ['basic', 'base']],
  ['Standard', ['standard', 'std']],
  ['Advanced', ['advanced', 'advance']],
  ['Business', ['business', 'biz']],
  ['Max', ['max']],
  ['1 Month', ['1 month', 'one month', 'monthly']],
  ['3 Months', ['3 month', '3 months', 'quarter']]
];

function cleanText(value = '') {
  return String(value || '')
    .replace(/[|•·]/g, '\n')
    .replace(/[،؛]/g, '\n')
    .replace(/[₹₨]/g, ' Rs. ')
    .replace(/[–—]/g, '-')
    .replace(/\t/g, ' ');
}

function normalizeTool(text = '') {
  const lower = String(text || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  for (const [name, aliases] of TOOL_ALIASES) {
    if (aliases.some(alias => lower.includes(alias))) return name;
  }
  return '';
}

function normalizePrice(value = '') {
  const lower = String(value || '').toLowerCase().replace(/,/g, '').trim();
  const match = lower.match(/(\d+(?:\.\d+)?)\s*(k|lakh|lac|crore|cr)?/);
  if (!match) return 0;
  const n = Number(match[1]);
  const unit = match[2] || '';
  if (unit === 'k') return n * 1000;
  if (unit === 'lakh' || unit === 'lac') return n * 100000;
  if (unit === 'crore' || unit === 'cr') return n * 10000000;
  return n;
}

function detectPlan(text = '') {
  const lower = String(text || '').toLowerCase();
  const found = [];
  for (const [name, aliases] of PLAN_ALIASES) {
    if (aliases.some(alias => lower.includes(alias))) found.push(name);
  }
  return found.length ? found.join(' ') : 'Default';
}

function splitCandidateLines(message = '') {
  const text = cleanText(message);
  const toolLookahead = TOOL_ALIASES.flatMap(([, aliases]) => aliases).sort((a, b) => b.length - a.length).join('|').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text
    .split(new RegExp(`\\r?\\n|(?=\\b(?:${toolLookahead})\\b)`, 'i'))
    .map(x => x.trim())
    .filter(Boolean);
}

function extractRatesFromMessage(message = '') {
  const lines = splitCandidateLines(message);
  const results = [];
  const patterns = [
    /([a-zA-Z][a-zA-Z0-9 +._-]{1,60}?)\s*(?:=|:|-|rs\.?|pkr|price|rate)?\s*(\d[\d,]*(?:\.\d+)?\s*(?:k|lakh|lac|crore|cr)?)/ig,
    /(?:rs\.?|pkr)?\s*(\d[\d,]*(?:\.\d+)?\s*(?:k|lakh|lac|crore|cr)?)\s*(?:for|ka|ki|ke|mein|me)?\s*([a-zA-Z][a-zA-Z0-9 +._-]{1,60})/ig
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line))) {
        const firstIsPrice = /^\d/.test(String(match[1]).trim());
        const phrase = firstIsPrice ? match[2] : match[1];
        const priceText = firstIsPrice ? match[1] : match[2];
        const toolName = normalizeTool(`${phrase} ${line}`);
        const buyPrice = normalizePrice(priceText);
        if (!toolName || !buyPrice || buyPrice < 50) continue;
        results.push({
          toolName,
          planName: detectPlan(`${phrase} ${line}`),
          buyPrice,
          rawLine: line,
          confidence: toolName && buyPrice ? 0.9 : 0.5
        });
      }
    }
  }

  const seen = new Set();
  return results.filter(row => {
    const key = `${row.toolName}:${row.planName}:${row.buyPrice}:${row.rawLine}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseOrder(text = '') {
  const lower = String(text || '').toLowerCase();
  if (!/(^|\b)(order|buy|chahiye|lena|purchase)(\b|$)/.test(lower)) return null;
  const toolName = normalizeTool(lower) || 'AI Tool';
  const planName = detectPlan(lower);
  return { toolName, planName };
}

module.exports = {
  extractRatesFromMessage,
  normalizeTool,
  normalizePrice,
  detectPlan,
  parseOrder
};
