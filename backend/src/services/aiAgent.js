const { classifyIntent } = require('../aiAgent/classifier');
const { getAnswer } = require('../aiAgent/knowledgeBase');
const { resolveAutomatically } = require('../aiAgent/issueResolver');
const { formatEscalation } = require('../aiAgent/escalation');

function classifyQuery(message = '') {
  return classifyIntent(message).intent;
}

function answerFromKnowledge(message = '') {
  return getAnswer(message).answer;
}

function resolveIssueWithAgent({ order, message }) {
  const issueType = /password/i.test(message) ? 'PASSWORD_WRONG' : /expire/i.test(message) ? 'SUBSCRIPTION_EXPIRED' : 'ACCOUNT_NOT_WORKING';
  const typeName = order?.accountType?.name || '';
  const issues = Number(order?.warrantyIssuesResolved || 0);
  const replacements = Number(order?.warrantyReplacementsUsed || 0);
  const eligible = typeName === 'warranty' && (issues < 2 || replacements < 1);
  return {
    status: eligible ? 'triaged' : 'declined_or_handoff',
    issueType,
    reply: eligible
      ? 'Issue triage ho gaya hai. Warranty active hai; admin ko context bheja ja raha hai.'
      : typeName === 'non_warranty'
        ? 'Non-warranty account — koi claim nahi ho sakta.'
        : 'Is account type par automatic warranty claim available nahi. Admin manual review karega.',
    escalationRequired: eligible || typeName === 'private',
    eligibility: { canClaim: eligible, issuesResolved: issues, replacementsUsed: replacements }
  };
}

function buildAdminEscalation({ customer, order, message, issueType = 'general' }) {
  return formatEscalation({ customer, order, message, issueType, orderId: order?.orderId });
}

module.exports = {
  classifyIntent,
  classifyQuery,
  answerFromKnowledge,
  resolveAutomatically,
  resolveIssueWithAgent,
  buildAdminEscalation
};
