const { TOOL_CATALOG, findToolByInput, findPlanByInput, normalizeInput } = require('../../config/tools');

function normalizeDigits(value = '') {
  const eastern = '۰۱۲۳۴۵۶۷۸۹';
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  return String(value || '').replace(/[۰-۹٠-٩]/g, digit => {
    const easternIndex = eastern.indexOf(digit);
    if (easternIndex >= 0) return String(easternIndex);
    const arabicIndex = arabic.indexOf(digit);
    return arabicIndex >= 0 ? String(arabicIndex) : digit;
  });
}

function cleanDealerText(input = '') {
  return normalizeDigits(input)
    .replace(/\r/g, '\n')
    .replace(/[|•·]/g, '\n')
    .replace(/[،؛]/g, '\n')
    .replace(/[–—]/g, '-')
    .replace(/\t+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}

function parsePriceValue(raw = '') {
  const normalized = normalizeDigits(raw).toLowerCase().replace(/,/g, '').trim();
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(k|thousand|lac|lakh|crore|cr)?/i);
  if (!match) return 0;
  const number = Number(match[1]);
  const unit = String(match[2] || '').toLowerCase();
  if (!Number.isFinite(number)) return 0;
  if (unit === 'k' || unit === 'thousand') return Math.round(number * 1000);
  if (unit === 'lac' || unit === 'lakh') return Math.round(number * 100000);
  if (unit === 'crore' || unit === 'cr') return Math.round(number * 10000000);
  return Math.round(number);
}

function splitCandidateSegments(message = '') {
  const text = cleanDealerText(message);
  if (!text) return [];
  const lines = text
    .split(/\n+/)
    .flatMap(line => line.split(/\s{2,}|(?=\b(?:chatgpt|gpt|claude|midjourney|mid|cursor|gemini|canva|turnitin)\b)/i))
    .map(line => line.trim())
    .filter(Boolean);
  return lines.length ? lines : [text];
}

function detectToolAndPlan(text = '') {
  const tool = findToolByInput(text);
  if (!tool) return null;
  const plan = findPlanByInput(tool.slug, text) || tool.plans[0] || null;
  return {
    toolSlug: tool.slug,
    toolName: tool.name,
    planSlug: plan?.planSlug || '',
    planName: plan?.planName || ''
  };
}

function extractEntriesFromSegment(segment = '') {
  const normalized = normalizeInput(segment);
  if (!normalized) return [];

  const entries = [];
  const priceMatches = [...segment.matchAll(/(?:rs\.?|pkr|rate|price|hy|hai|=|:|-|\s)\s*(\d[\d,]*(?:\.\d+)?\s*(?:k|thousand|lac|lakh|crore|cr)?)/ig)];
  const barePriceMatches = priceMatches.length
    ? priceMatches
    : [...segment.matchAll(/\b(\d{3,5}(?:,\d{3})?)\b/g)];

  for (const match of barePriceMatches) {
    const rawPrice = match[1];
    const price = parsePriceValue(rawPrice);
    if (price < 100 || price > 99999) continue;
    const before = segment.slice(0, match.index).trim();
    const after = segment.slice((match.index || 0) + match[0].length).trim();
    const phrase = `${before} ${after}`.trim() || segment;
    const detected = detectToolAndPlan(`${phrase} ${segment}`);
    if (!detected) continue;
    entries.push({
      ...detected,
      price,
      rawSegment: segment
    });
  }

  return entries;
}

function extractRatesFromComposite(message = '') {
  const rows = [];
  const compact = cleanDealerText(message);
  const toolSpans = TOOL_CATALOG.flatMap(tool => {
    const aliases = [tool.slug, tool.name, ...(tool.aliases || [])];
    return aliases.map(alias => ({ tool, alias }));
  });

  const indexHits = [];
  toolSpans.forEach(({ tool, alias }) => {
    const pattern = new RegExp(`\\b${normalizeInput(alias).replace(/\s+/g, '\\s+')}\\b`, 'ig');
    let match;
    while ((match = pattern.exec(normalizeInput(compact)))) {
      indexHits.push({ tool, index: match.index });
    }
  });

  indexHits.sort((a, b) => a.index - b.index);
  for (let i = 0; i < indexHits.length; i += 1) {
    const current = indexHits[i];
    const next = indexHits[i + 1];
    const chunk = compact.slice(current.index, next ? next.index : compact.length).trim();
    if (!chunk) continue;
    rows.push(...extractEntriesFromSegment(chunk));
  }
  return rows;
}

function dedupeEntries(rows = []) {
  const unique = new Map();
  rows.forEach(row => {
    const key = `${row.toolSlug}:${row.planSlug}:${row.price}:${row.rawSegment}`;
    if (!unique.has(key)) unique.set(key, row);
  });
  return [...unique.values()];
}

function parseDealerRates(message = '', senderNumber = '', timestamp = new Date().toISOString()) {
  const directSegments = splitCandidateSegments(message).flatMap(extractEntriesFromSegment);
  const compositeSegments = extractRatesFromComposite(message);
  const rows = dedupeEntries([...directSegments, ...compositeSegments]).map(row => ({
    toolSlug: row.toolSlug,
    toolName: row.toolName,
    tool_name: row.toolName,
    planSlug: row.planSlug,
    planName: row.planName,
    plan: row.planName,
    price: Number(row.price || 0),
    senderNumber,
    sender: senderNumber,
    timestamp,
    rawSegment: row.rawSegment
  }));
  return rows.filter(row => row.toolSlug && row.planSlug && row.price >= 100);
}

function containsRateLikeContent(message = '') {
  return parseDealerRates(message).length > 0;
}

module.exports = {
  cleanDealerText,
  normalizeDigits,
  parsePriceValue,
  parseDealerRates,
  containsRateLikeContent
};
