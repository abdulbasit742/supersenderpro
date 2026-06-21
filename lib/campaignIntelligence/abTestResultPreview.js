// lib/campaignIntelligence/abTestResultPreview.js — A/B result preview from provided counts (or seeded).
 'use strict';
 const cfg = require('./config');
 const { seeded } = require('./config');
 const { maskRef } = require('./redactor');


 function variantStats(v, fallbackSeed) {
     const rnd = seeded(fallbackSeed);
     const sent = Number(v && v.sent) || 600;
     const conv = Number(v && v.conversions);
     const conversions = Number.isFinite(conv) ? conv : Math.floor(sent * (0.05 + rnd() * 0.2));
   return { sentPreview: sent, conversionsPreview: conversions, ratePreview: sent > 0 ? Number((conversions /
 sent).toFixed(4)) : 0 };
 }


 function abTestResult(input) {
   const i = input || {};
     const a = variantStats(i.variantA, 'A:' + (i.testId || 't'));
     const b = variantStats(i.variantB, 'B:' + (i.testId || 't'));
   const winner = a.ratePreview === b.ratePreview ? 'tie_preview' : (a.ratePreview > b.ratePreview ? 'variant_a_preview' :
 'variant_b_preview');
     const diff = Math.abs(a.ratePreview - b.ratePreview);
     const confidence = Number(Math.min(0.99, 0.5 + diff * 4).toFixed(2));
     return cfg.base({
       testIdPreview: maskRef(i.testId || 'ab'), variantAPreview: a, variantBPreview: b,
      winnerPreview: winner, confidencePreview: confidence,
      recommendationPreview: confidence < 0.8 ? 'Inconclusive preview; gather more samples before deciding.' : 'Roll out '
 + winner + ' (preview).',
   });
 }
 module.exports = { abTestResult, variantStats };
