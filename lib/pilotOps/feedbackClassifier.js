'use strict';


/**
    * Pilot Ops — heuristic feedback classifier. No AI key required. Pure function.
    */


const TYPE_HINTS = {
    bug: ['error', 'crash', 'broken', 'not working', 'fail', 'bug', 'kaam nahi'],
    feature_request: ['can you add', 'feature', 'would be nice', 'request', 'chahiye feature'],
    confusion: ['confused', 'how do i', 'samajh nahi', 'unclear', 'kaise'],
    pricing_feedback: ['price', 'expensive', 'mehnga', 'cost', 'plan'],
    onboarding_feedback: ['setup', 'onboarding', 'getting started', 'install'],
    praise: ['great', 'love', 'awesome', 'shukria', 'zabardast', 'thanks'],
    complaint: ['angry', 'worst', 'bekaar', 'disappointed', 'complaint'],
    support_question: ['help', 'question', 'how to', 'madad'],
};
const SEV_HINTS = { critical: ['crash', 'data loss', 'cannot login', 'payment failed'], high: ['broken', 'urgent',
'blocked'], medium: ['slow', 'sometimes'], low: [] };


function lc(s) { return String(s || '').toLowerCase(); }

function classify(text) {
  const t = lc(text);
    let type = 'support_question', best = 0;
    Object.keys(TYPE_HINTS).forEach(function (k) {
      const hits = TYPE_HINTS[k].reduce(function (n, w) { return n + (t.indexOf(w) !== -1 ? 1 : 0); }, 0);
      if (hits > best) { best = hits; type = k; }
    });
    let severity = 'low';
    if (SEV_HINTS.critical.some(function (w) { return t.indexOf(w) !== -1; })) severity = 'critical';
    else if (SEV_HINTS.high.some(function (w) { return t.indexOf(w) !== -1; })) severity = 'high';
    else if (SEV_HINTS.medium.some(function (w) { return t.indexOf(w) !== -1; })) severity = 'medium';
    return { type: type, severity: severity, confidence: Math.min(1, best * 0.3) };
}


module.exports = { classify, TYPE_HINTS };
