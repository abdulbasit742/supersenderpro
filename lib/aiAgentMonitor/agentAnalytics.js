'use strict';
/**
* agentAnalytics.js — preview-only AI performance analytics derived from
  * monitored replies. All values clearly labeled as preview/estimates.
  */
const knowledgeGapDetector = require('./knowledgeGapDetector');

function overview(replies) {
const list = replies || [];
   const total = list.length || 1;
   const handoffs = list.filter((r) => r.handoffRequired).length;
   const approved = list.filter((r) => r.status === 'approved').length;
   const escalated = list.filter((r) => r.status === 'escalated').length;
   const avg = (sel) => Math.round((list.reduce((a, r) => a + (r[sel] || 0), 0) / total) * 100) / 100;
   const resolutionRate = Math.round(((total - handoffs) / total) * 100);


   return {
     note: 'Preview values only. No live AI calls measured.',
     cards: [
        { key: 'replies_monitored', label: 'Replies monitored', value: list.length },
        { key: 'ai_resolution_rate', label: 'Est. AI resolution rate', value: resolutionRate + '%', estimate: true },
        { key: 'handoff_rate', label: 'Handoff rate', value: Math.round((handoffs / total) * 100) + '%', estimate: true },
        { key: 'avg_confidence', label: 'Avg confidence', value: avg('confidenceScore') },
        { key: 'avg_quality', label: 'Avg quality', value: avg('qualityScore') },
        { key: 'escalated', label: 'Escalated', value: escalated },
        { key: 'approved', label: 'Approved', value: approved },
     ],
  riskBreakdown: ['low', 'medium', 'high', 'critical'].map((lvl) => ({ riskLevel: lvl, count: list.filter((r) =>
r.riskLevel === lvl).length })),
     knowledgeGaps: knowledgeGapDetector.unanswered(list).slice(0, 10),
   };
}


module.exports = { overview };
