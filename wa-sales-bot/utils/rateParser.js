const { TOOL_CATALOG, findToolByInput, findPlanByInput } = require('../config/tools');

function cleanText(input = '') {
  return String(input || '')
    .replace(/[|•·]/g, '\n')
    .replace(/[،؛]/g, '\n')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePrice(raw = '') {
  const normalized = String(raw || '').toLowerCase().replace(/,/g, '').trim();
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(k|thousand|lac|lakh|crore|cr)?/i);
  if (!match) return 0;
  const number = Number(match[1]);
  const unit = String(match[2] || '').toLowerCase();
  if (unit === 'k' || unit === 'thousand') return Math.round(number * 1000);
  if (unit === 'lac' || unit === 'lakh') return Math.round(number * 100000);
  if (unit === 'crore' || unit === 'cr') return Math.round(number * 10000000);
  return Math.round(number);
}

function extractRateEntries(message = '') {
  const text = cleanText(message);
  const lines = text.split(/\r?\n|(?=\b(?:chatgpt|claude|midjourney|mid|cursor|gemini)\b)/i).map(line => line.trim()).filter(Boolean);
  const results = [];

  const patterns = [
    /([a-zA-Z][a-zA-Z0-9 +._/-]{1,60}?)\s*(?:=|:|-|rs\.?|pkr|rate|price|hai|hy|ka rate|price hai)?\s*(\d[\d,]*(?:\.\d+)?\s*(?:k|thousand|lac|lakh|crore|cr)?)/ig,
    /(\d[\d,]*(?:\.\d+)?\s*(?:k|thousand|lac|lakh|crore|cr)?)\s*(?:for|ka|ki|ke|mein|me|hai|hy)?\s*([a-zA-Z][a-zA-Z0-9 +._/-]{1,60})/ig
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line))) {
        const firstIsPrice = /^\d/.test(String(match[1]).trim());
        const phrase = firstIsPrice ? match[2] : match[1];
        const priceRaw = firstIsPrice ? match[1] : match[2];
        const tool = findToolByInput(`${phrase} ${line}`);
        if (!tool) continue;
        const plan = findPlanByInput(tool.slug, `${phrase} ${line}`) || tool.plans[0];
        const price = parsePrice(priceRaw);
        if (!price || price < 100) continue;
        results.push({
          toolSlug: tool.slug,
          toolName: tool.name,
          planName: plan.planName,
          buyPrice: price,
          rawLine: line
        });
      }
    }
  }

  const unique = new Map();
  results.forEach(item => {
    const key = `${item.toolSlug}:${item.planName}:${item.buyPrice}:${item.rawLine}`;
    if (!unique.has(key)) unique.set(key, item);
  });
  return [...unique.values()];
}

function isToolMention(message = '') {
  return Boolean(findToolByInput(message));
}

function listKnownAliases() {
  return TOOL_CATALOG.flatMap(tool => [tool.name, ...tool.aliases]);
}

module.exports = {
  extractRateEntries,
  parsePrice,
  isToolMention,
  listKnownAliases
};
