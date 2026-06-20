'use strict';
/**
 * skuResolver.js — normalize free-text product mentions into stable SKU candidates,
 * and merge duplicate mentions of the same product.
 */

const STOPWORDS = new Set(['the', 'a', 'an', 'for', 'sale', 'new', 'brand', 'original', 'with', 'and', 'in', 'of', 'pkr', 'rs', 'price', 'rate', 'available', 'stock', 'best', 'good', 'condition']);

/** Slugify a product label into a normalized key. */
function normalizeLabel(label) {
  return String(label || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w && !STOPWORDS.has(w))
    .slice(0, 6)
    .join(' ')
    .trim();
}

/**
 * Resolve a SKU candidate from a product label.
 * Returns { sku, normalizedLabel, tokens }.
 */
function resolveSku(label) {
  const normalized = normalizeLabel(label);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const sku = tokens.length ? 'sku_' + tokens.join('_').slice(0, 48) : 'sku_unknown';
  return { sku, normalizedLabel: normalized || 'unknown', tokens };
}

/** Similarity (token overlap) between two labels — used to merge duplicates. */
function similarity(a, b) {
  const ta = new Set(normalizeLabel(a).split(/\s+/).filter(Boolean));
  const tb = new Set(normalizeLabel(b).split(/\s+/).filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  ta.forEach(t => { if (tb.has(t)) inter++; });
  return inter / Math.max(ta.size, tb.size);
}

/** Given an existing list of skus [{sku,label}], find a match or return the new sku. */
function matchOrCreate(label, existing = []) {
  const r = resolveSku(label);
  let best = null, bestScore = 0;
  for (const e of existing) {
    const s = similarity(label, e.label || e.normalizedLabel || '');
    if (s > bestScore) { bestScore = s; best = e; }
  }
  if (best && bestScore >= 0.6) return { sku: best.sku, merged: true, score: bestScore, normalizedLabel: best.normalizedLabel };
  return { sku: r.sku, merged: false, score: bestScore, normalizedLabel: r.normalizedLabel };
}

module.exports = { normalizeLabel, resolveSku, similarity, matchOrCreate };
