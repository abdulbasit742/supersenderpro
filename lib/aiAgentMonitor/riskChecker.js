 'use strict';
 /**
  * riskChecker.js — offline hallucination/risk heuristics. No external AI call.
     * Maps signals to a risk level (low/medium/high/critical). Pure function.
     */
 const SIGNALS = [
   { key: 'overpromise', re: /(guarantee|100%|always works|completely (legal|safe)|definitely)/i, weight: 2 },
      { key: 'legal_policy', re: /(legal|lawsuit|gdpr|policy|regulation|refund policy|terms)/i, weight: 2 },
      { key: 'payment', re: /(payment|charge|invoice|card|bank|transaction)/i, weight: 2 },
      { key: 'refund', re: /(refund|chargeback|money back)/i, weight: 2 },
      { key: 'angry', re: /(angry|terrible|worst|useless|scam|fraud|sue|complain)/i, weight: 2 },
      { key: 'fabrication', re: /(as an ai|i made that up|not sure but|i assume)/i, weight: 1 },
 ];

 function levelFromScore(score) {
      if (score >= 5) return 'critical';
      if (score >= 3) return 'high';
      if (score >= 1) return 'medium';
      return 'low';
 }

 function check(userMessage, reply, confidenceScore) {
   const text = (String(userMessage || '') + ' ' + String(reply || '')).toLowerCase();
      let score = 0;
      const hits = [];
      SIGNALS.forEach((s) => { if (s.re.test(text)) { score += s.weight; hits.push(s.key); } });
      if (typeof confidenceScore === 'number' && confidenceScore < 0.5) { score += 2; hits.push('low_confidence'); }
      const riskLevel = levelFromScore(score);
      const warnings = [];
      if (hits.includes('overpromise')) warnings.push('possible_hallucination_overpromise');
      if (hits.includes('fabrication')) warnings.push('possible_hallucination_fabrication');
      return { riskLevel, score, signals: hits, warnings };
 }

 module.exports = { check, SIGNALS, levelFromScore };
