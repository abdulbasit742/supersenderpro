 'use strict';

 /**
     * Group Commerce Inbox — aggregator.
     * Turns already-analyzed group commerce message output into normalized inbox
     * records and ingests them into the store. Does NOT analyze raw text itself
     * (that's messageAnalyzer's job) and never triggers live actions.
     */

 const store = require('./store');

 // Optionally reuse the existing analyzer if the caller passes raw text but no
 // analysis. Loaded lazily + defensively so the inbox works even if core moves.
 function tryAnalyze(text) {
   if (!text) return null;
      try {
        const analyzer = require('../messageAnalyzer');
        if (analyzer && typeof analyzer.analyze === 'function') return analyzer.analyze(text);
      } catch (e) { /* analyzer optional */ }
      return null;
 }

 // Map an analyzed message + envelope into the canonical inbox shape, then store.
 function ingest(payload) {
   const p = payload || {};


      // If caller already provided structured analysis, use it; else attempt analyze.
      const analysis = p.analysis || tryAnalyze(p.message || p.text) || {};

      const type = p.type || inferType(analysis, p);
      const record = {
          id: p.id,
          groupId: p.groupId,
          groupName: p.groupName,
          type: type,
          roleIntent: p.roleIntent || analysis.roleIntent || 'unknown',
          productName: p.productName || analysis.productName || null,
          sku: p.sku || analysis.sku || null,
          quantity: p.quantity != null ? p.quantity : (analysis.quantity != null ? analysis.quantity : null),
          price: p.price != null ? p.price : (analysis.price != null ? analysis.price : null),
          currency: p.currency || analysis.currency || null,
          stockStatus: p.stockStatus || analysis.stockStatus || 'unknown',
          sellerId: p.sellerId || p.sellerHash,
          buyerId: p.buyerId || p.buyerHash,
          confidence: p.confidence != null ? p.confidence : deriveConfidence(analysis),
          riskLevel: p.riskLevel || deriveRisk(analysis, p),
          flags: p.flags || analysis.flags || [],

    // sourcePreview only; raw body is dropped unless STORE_RAW is on (handled in store)
    sourcePreview: p.sourcePreview || p.message || p.text || null,
    suggestedActions: p.suggestedActions || [],
    createdAt: p.createdAt,
  };

  return store.add(record);
}

function ingestMany(payloads) {
const arr = Array.isArray(payloads) ? payloads : [];
  return arr.map(ingest);
}

function inferType(analysis, p) {
  const a = analysis || {};
  if (Array.isArray(a.flags) && a.flags.indexOf('payment_first_claim') !== -1) return 'suspicious_post';
  if (a.roleIntent === 'seller') return 'seller_offer';
  if (a.roleIntent === 'buyer') return 'buyer_request';
  if (a.price != null && a.sku) return 'price_update';
  if (a.stockStatus === 'in_stock' || a.stockStatus === 'out_of_stock') return 'stock_update';
  if (p && p.adminCommand) return 'admin_command';
  return 'ai_suggestion';
}

function deriveConfidence(analysis) {
const a = analysis || {};
  if (typeof a.sellerConfidence === 'number' && a.roleIntent === 'seller') return a.sellerConfidence;
  if (typeof a.buyerConfidence === 'number' && a.roleIntent === 'buyer') return a.buyerConfidence;
  return 0;
}

function deriveRisk(analysis, p) {
  const flags = (analysis && analysis.flags) || (p && p.flags) || [];
  if (flags.indexOf('payment_first_claim') !== -1 || flags.indexOf('scam_like_payment') !== -1) return 'high';
  if (flags.indexOf('price_without_sku') !== -1 || flags.indexOf('stock_without_product') !== -1) return 'medium';
  return 'low';
}

module.exports = { ingest, ingestMany, inferType, deriveConfidence, deriveRisk };
