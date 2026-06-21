 'use strict';
 /**
  * handoffRules.js — decides whether a reply must go to a human, and why.
     * Combines confidence, risk signals, and explicit triggers. No live action.
     */
 const riskChecker = require('./riskChecker');

 const TRIGGERS = [
   'low_confidence', 'possible_hallucination', 'angry_customer', 'payment_issue',
      'refund_request', 'legal_or_policy_question', 'unclear_intent',
      'repeated_failed_answer', 'human_requested',
 ];

 const MIN_CONFIDENCE = 0.6;


 function evaluate(ctx) {
   const c = ctx || {};
      const reasons = [];
      const conf = typeof c.confidenceScore === 'number' ? c.confidenceScore : 1;
      const risk = riskChecker.check(c.userMessage, c.aiReply, conf);

      if (conf < MIN_CONFIDENCE) reasons.push('low_confidence');
      if (risk.warnings.some((w) => w.indexOf('hallucination') > -1)) reasons.push('possible_hallucination');
      if (risk.signals.includes('angry')) reasons.push('angry_customer');
      if (risk.signals.includes('payment')) reasons.push('payment_issue');
      if (risk.signals.includes('refund')) reasons.push('refund_request');
      if (risk.signals.includes('legal_policy')) reasons.push('legal_or_policy_question');
      if (c.unclearIntent) reasons.push('unclear_intent');
      if (c.repeatedFailures && c.repeatedFailures >= 2) reasons.push('repeated_failed_answer');
      if (/\b(human|agent|real person|representative)\b/i.test(String(c.userMessage || ''))) reasons.push('human_requested');

      const handoffRequired = reasons.length > 0 || risk.riskLevel === 'critical' || risk.riskLevel === 'high';
      return {
        handoffRequired,
        riskLevel: risk.riskLevel,
        reasons: reasons.filter((r) => TRIGGERS.includes(r)),
        primaryReason: reasons[0] || (handoffRequired ? 'high_risk' : null),
      };
 }


 module.exports = { evaluate, TRIGGERS, MIN_CONFIDENCE };
