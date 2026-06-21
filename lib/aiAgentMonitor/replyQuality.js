 'use strict';
 /**
  * replyQuality.js — heuristic, offline quality + confidence scoring. No external
     * AI call. Looks for vague/overpromising/unsupported language and length issues.
     * Returns scores in 0..1. Pure function.
  */
 const OVERPROMISE = [/guarantee/i, /100%/, /always works/i, /completely (legal|safe)/i, /no problem at all/i,
 /definitely/i, /\bsurely\b/i];
 const HEDGES = [/probably/i, /i think/i, /maybe/i, /not sure/i, /might be/i];
 const EMPTY = [/^\s*$/, /i (don'?t|do not) know/i]; function scoreConfidence(reply, providedConfidence) { if (typeof providedConfidence === 'number') return Math.max(0, Math.min(1, providedConfidence)); const text = String(reply || ''); let c = 0.7; if (HEDGES.some((re) => re.test(text))) c -= 0.25; if (text.length < 10) c -= 0.2; if (EMPTY.some((re) => re.test(text))) c -= 0.4; return Math.max(0, Math.min(1, c));}
 function scoreQuality(userMessage, reply) {
   const text = String(reply || '');
      let q = 0.8;
      const warnings = [];
      if (OVERPROMISE.some((re) => re.test(text))) { q -= 0.3; warnings.push('overpromising_language'); }
      if (text.length < 10) { q -= 0.3; warnings.push('reply_too_short'); }
      if (EMPTY.some((re) => re.test(text))) { q -= 0.4; warnings.push('non_answer'); }
      if (userMessage && String(userMessage).endsWith('?') && text.indexOf('?') === text.length - 1) { q -= 0.1;
 warnings.push('answered_question_with_question'); }
   return { qualityScore: Math.max(0, Math.min(1, q)), warnings };
 }


 function assess(userMessage, reply, providedConfidence) {
   const confidenceScore = scoreConfidence(reply, providedConfidence);
      const q = scoreQuality(userMessage, reply);
      return { confidenceScore, qualityScore: q.qualityScore, warnings: q.warnings };
 }


 module.exports = { assess, scoreConfidence, scoreQuality, OVERPROMISE, HEDGES };
