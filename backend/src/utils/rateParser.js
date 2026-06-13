const TOOL_ALIASES = [
  ['chatgpt', ['chatgpt', 'chat gpt', 'gpt', 'gpt plus', 'gpt team', 'openai']],
  ['claude', ['claude', 'cloude', 'anthropic']],
  ['midjourney', ['midjourney', 'mid journey', 'mid', 'mj']],
  ['cursor', ['cursor']],
  ['gemini', ['gemini', 'google ai', 'bard']],
  ['perplexity', ['perplexity', 'perplex']],
  ['canva', ['canva']],
  ['copilot', ['copilot', 'github copilot']],
  ['turnitin', ['turnitin']],
  ['quillbot', ['quillbot']]
];

const TOOL_LABELS = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  midjourney: 'Midjourney',
  cursor: 'Cursor',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  canva: 'Canva',
  copilot: 'Copilot',
  turnitin: 'Turnitin',
  quillbot: 'Quillbot'
};

const PLAN_ALIASES = [
  ['plus', ['plus']],
  ['pro', ['pro']],
  ['team', ['team']],
  ['max', ['max']],
  ['basic', ['basic']],
  ['standard', ['standard']],
  ['advanced', ['advanced']],
  ['business', ['business']],
  ['monthly', ['monthly', 'month', '1 month', '1month']],
  ['yearly', ['yearly', 'year', 'annual']]
];

function slugify(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'default';
}

function titleCase(value = '') {
  return String(value || '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ') || 'Default';
}

function normalizeTool(raw = '') {
  const text = String(raw || '').toLowerCase();
  for (const [canonical, aliases] of TOOL_ALIASES) {
    if (aliases.some((alias) => new RegExp(`(^|[^a-z0-9])${alias.replace(/\s+/g, '\\s+')}([^a-z0-9]|$)`, 'i').test(text))) {
      return TOOL_LABELS[canonical] || titleCase(canonical);
    }
  }
  return '';
}

function normalizeToolSlug(raw = '') {
  const name = normalizeTool(raw);
  if (!name) return '';
  const found = Object.entries(TOOL_LABELS).find(([, label]) => label.toLowerCase() === name.toLowerCase());
  return found?.[0] || slugify(name);
}

function normalizePrice(raw = '') {
  const text = String(raw || '').toLowerCase().replace(/,/g, '').trim();
  const match = text.match(/(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lac|k)?/i);
  if (!match) return 0;
  const n = Number(match[1]);
  const unit = match[2] || '';
  if (!Number.isFinite(n)) return 0;
  if (unit === 'k') return n * 1000;
  if (unit === 'lakh' || unit === 'lac') return n * 100000;
  if (unit === 'crore' || unit === 'cr') return n * 10000000;
  return n;
}

function detectPlan(line = '') {
  const lower = String(line || '').toLowerCase();
  const found = [];
  for (const [canonical, aliases] of PLAN_ALIASES) {
    if (aliases.some((alias) => new RegExp(`(^|[^a-z0-9])${alias.replace(/\s+/g, '\\s+')}([^a-z0-9]|$)`, 'i').test(lower))) {
      found.push(canonical);
    }
  }
  const withoutDuration = found.filter((item) => !['monthly', 'yearly'].includes(item));
  return titleCase(withoutDuration.length ? withoutDuration.join(' ') : found[0] || 'default');
}

function confidenceFor({ rawText, toolName, planName, price }) {
  let score = 0;
  if (toolName) score += 0.42;
  if (planName && planName !== 'Default') score += 0.18;
  if (price >= 100 && price <= 99999) score += 0.28;
  if (/[=:|\-]/.test(rawText)) score += 0.06;
  if (/\b(rs|pkr|rate|price|hy|hai|aaj|today)\b/i.test(rawText)) score += 0.06;
  return Math.min(0.98, Number(score.toFixed(2)));
}

function normalizeMessage(message = '') {
  return String(message || '')
    .replace(/[₹₨]/g, ' Rs ')
    .replace(/[،؛]/g, ',')
    .replace(/[–—]/g, '-')
    .replace(/\t/g, ' ')
    .replace(/\r/g, '\n');
}

function chunksFromMessage(message = '') {
  const text = normalizeMessage(message);
  const toolPattern = '(?:chat\\s*gpt|chatgpt|gpt|claude|cloude|midjourney|mid\\s*journey|mid|mj|cursor|gemini|bard|perplexity|canva|copilot|turnitin|quillbot)';
  const chunks = [];

  for (const line of text.split(/\n+/).map((row) => row.trim()).filter(Boolean)) {
    if (/^\s*tool\s*\|\s*price/i.test(line)) continue;
    const table = line.match(new RegExp(`(${toolPattern}[^|,;]*)\\|\\s*(\\d[\\d,]{2,5})`, 'i'));
    if (table) {
      chunks.push(`${table[1]} ${table[2]}`);
      continue;
    }
    const parts = line.split(/[,;]+/).map((part) => part.trim()).filter(Boolean);
    for (const part of parts) {
      const starts = [...part.matchAll(new RegExp(`(?=${toolPattern})`, 'ig'))].map((match) => match.index);
      if (starts.length > 1) {
        starts.forEach((start, index) => chunks.push(part.slice(start, starts[index + 1] || part.length).trim()));
      } else {
        chunks.push(part);
      }
    }
  }

  return chunks;
}

function parseChunk(chunk = '') {
  const priceMatch = String(chunk).match(/(?:rs|pkr)?\s*(\d[\d,]{2,5})(?!\s*(?:am|pm|days?|din|hours?|hrs?))/i);
  if (!priceMatch) return null;
  const price = normalizePrice(priceMatch[1]);
  if (price < 100 || price > 99999) return null;

  const beforePrice = chunk.slice(0, priceMatch.index).trim();
  const afterPrice = chunk.slice(priceMatch.index + priceMatch[0].length).trim();
  const context = `${beforePrice} ${afterPrice}`.replace(/\b(hy|hai|aaj|today|rate|price|ka|ki|ke|available|stock|monthly)\b/ig, ' ');
  const toolName = normalizeTool(context || chunk);
  if (!toolName) return null;
  const planName = detectPlan(context || chunk);
  const confidence = confidenceFor({ rawText: chunk, toolName, planName, price });
  return {
    tool: normalizeToolSlug(toolName),
    toolSlug: normalizeToolSlug(toolName),
    toolName,
    plan: slugify(planName),
    planSlug: slugify(planName),
    planName,
    price,
    buyPrice: price,
    confidence,
    rawLine: chunk.trim()
  };
}

function extractRatesFromMessage(message = '', options = {}) {
  const minConfidence = Number(options.minConfidence ?? 0);
  const results = [];
  for (const chunk of chunksFromMessage(message)) {
    const parsed = parseChunk(chunk);
    if (!parsed || parsed.confidence < minConfidence) continue;
    results.push(parsed);
  }
  const seen = new Set();
  return results.filter((row) => {
    const key = `${row.toolSlug}:${row.planSlug}:${row.price}:${row.rawLine.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = {
  TOOL_ALIASES,
  PLAN_ALIASES,
  extractRatesFromMessage,
  normalizePrice,
  normalizeTool,
  normalizeToolSlug,
  detectPlan,
  slugify
};
