'use strict';
function kbTopics() {
  try {
    const kb = require('../supportHelpdesk/knowledgeBase');
    if (kb && typeof kb.list === 'function') return kb.list().map((a) => String(a.title || a.topic || '').toLowerCase());
  } catch (_) {}
  return ['pricing', 'setup', 'payment methods', 'refund policy', 'account access', 'renewal'];
}
function check(userMessage) {
  const text = String(userMessage || '').toLowerCase();
  const topics = kbTopics();
  const covered = topics.some((t) => t && text.includes(t.split(' ')[0]));
  const lowSignal = text.length < 4;
  const isQuestion = text.includes('?') || /^(how|what|why|when|can|do|does|is|are)\b/.test(text);
  const gap = isQuestion && !covered && !lowSignal;
  return { knowledgeGap: gap, matchedTopics: topics.filter((t) => t && text.includes(t.split(' ')[0])), suggestion: gap ? 'No KB article matches; create one or route to a human.' : 'KB likely covers this.', source: 'knowledge_gap_detector' };
}
function unanswered(replies) {
  return (replies || []).filter((r) => check(r.userMessagePreview).knowledgeGap).map((r) => ({ conversationId: r.conversationId, question: r.userMessagePreview, riskLevel: r.riskLevel }));
}
module.exports = { check, unanswered, kbTopics };
