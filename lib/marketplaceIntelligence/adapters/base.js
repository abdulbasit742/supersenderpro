'use strict';
/** base.js — shared signal builder used by all adapters (no circular deps). */
const normalizer = require('../normalizer');
const skuResolver = require('../skuResolver');

function fromText(input, existingSkus = []) {
  const text = input.text || '';
  const intent = input.intent || normalizer.detectIntent(text);
  const match = skuResolver.matchOrCreate(input.productLabel || text, existingSkus);
  const flags = normalizer.riskFlags(text);
  return {
    intent,
    actorIdMasked: normalizer.maskId(input.who, intent === 'demand' ? 'b' : 's'),
    actorNameSafe: normalizer.maskName(input.name || input.who),
    actorCity: input.city || null,
    productLabel: input.productLabel || normalizer.safeText(text, 60),
    sku: input.sku || match.sku,
    normalizedLabel: input.normalizedLabel || match.normalizedLabel,
    price: input.price || normalizer.extractPrice(text),
    stockSignal: input.stockSignal || normalizer.extractStockSignal(text),
    quantity: input.quantity || normalizer.extractQuantity(text),
    budget: input.budget != null ? input.budget : (normalizer.extractPrice(text)?.value || null),
    urgency: input.urgency || (/urgent|jaldi|asap|today|abhi/i.test(text) ? 'high' : 'medium'),
    sourceType: input.sourceType || 'unknown',
    sourceId: input.sourceId ? normalizer.maskId(input.sourceId, 'src') : null,
    sourceName: input.sourceName ? normalizer.maskName(input.sourceName) : (input.sourceType || null),
    riskFlags: flags,
    confidence: input.confidence != null ? input.confidence : (intent === 'unknown' ? 0.4 : 0.65),
    safeSnippet: normalizer.safeText(text, 140)
  };
}

module.exports = { fromText, normalizer, skuResolver };
