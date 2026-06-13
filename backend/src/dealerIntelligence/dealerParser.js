const { extractRatesFromMessage, slugify } = require('../utils/rateParser');

function splitCandidates(message = '') {
  const normalized = String(message || '')
    .replace(/\r/g, '\n')
    .replace(/[—–]/g, '-')
    .replace(/\t/g, ' ')
    .trim();
  const candidates = new Set();
  if (normalized) candidates.add(normalized);

  for (const line of normalized.split(/\n+/).map((row) => row.trim()).filter(Boolean)) {
    candidates.add(line);
    for (const part of line.split(/[,;|]+/).map((row) => row.trim()).filter(Boolean)) {
      candidates.add(part);
    }
    for (const part of line.split(/\s+-\s+/).map((row) => row.trim()).filter(Boolean)) {
      candidates.add(part);
    }
  }

  for (const part of normalized.split(/[,;|]+/).map((row) => row.trim()).filter(Boolean)) {
    candidates.add(part);
  }
  return [...candidates];
}

function parseDealerMessage(message = '') {
  const rows = [];
  for (const candidate of splitCandidates(message)) {
    rows.push(...extractRatesFromMessage(candidate, { minConfidence: 0.7 }));
  }
  const seen = new Set();
  return rows
    .map((row) => ({
      tool: row.toolSlug || slugify(row.toolName),
      toolSlug: row.toolSlug || slugify(row.toolName),
      toolName: row.toolName,
      plan: row.planSlug || slugify(row.planName),
      planSlug: row.planSlug || slugify(row.planName),
      planName: row.planName,
      price: Number(row.price || row.buyPrice),
      buyPrice: Number(row.price || row.buyPrice),
      confidence: Number(row.confidence || 0),
      rawLine: row.rawLine
    }))
    .filter((row) => {
      if (!row.price || row.confidence < 0.7) return false;
      const key = `${row.toolSlug}:${row.planSlug}:${row.price}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

module.exports = {
  splitCandidates,
  parseDealerMessage,
  extractDealerRates: parseDealerMessage
};
