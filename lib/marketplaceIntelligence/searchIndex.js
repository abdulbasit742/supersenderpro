'use strict';
/** searchIndex.js — simple in-memory search across entities (seller/buyer/sku/product/source). */

function tokens(s) { return String(s || '').toLowerCase().split(/\s+/).filter(Boolean); }

function search(state, query, opts = {}) {
  const q = tokens(query);
  if (!q.length) return [];
  const types = opts.types || null;       // array of entity types to filter
  const results = [];
  for (const e of Object.values(state.entities)) {
    if (types && !types.includes(e.type)) continue;
    if (opts.riskOnly && !(e.riskFlags || []).length) continue;
    if (opts.city && (e.metadataSafe?.city || '').toLowerCase() !== String(opts.city).toLowerCase()) continue;
    if (opts.minConfidence != null && (e.confidence || 0) < opts.minConfidence) continue;
    const hay = `${e.label} ${e.type} ${(e.tags || []).join(' ')} ${e.metadataSafe?.sku || ''} ${e.metadataSafe?.normalizedLabel || ''}`.toLowerCase();
    let score = 0;
    q.forEach(t => { if (hay.includes(t)) score++; });
    if (score > 0) results.push({ id: e.id, type: e.type, label: e.label, confidence: e.confidence, riskFlags: e.riskFlags, score });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, opts.limit || 50);
}

module.exports = { search };
