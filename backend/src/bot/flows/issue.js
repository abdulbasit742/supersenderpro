const prisma = require('../../services/prisma');
const { checkEligibility, resolveIssue } = require('../../utils/warrantyChecker');
const { resolveAutomatically } = require('../../aiAgent/issueResolver');
const { sendIssueAlert } = require('../../adminSystem/alerts');

async function handleIssue({ orderId, message }) {
  const order = await prisma.businessOrder.findUnique({
    where: { orderId },
    include: { customer: true, tool: true, plan: true, accountType: true }
  });
  if (!order) return { success: false, reply: 'Order ID nahi mila. Please correct Order ID bhejein.' };
  const eligibility = await checkEligibility(order);
  if (!eligibility.canClaim) return { success: true, reply: eligibility.message, eligibility };
  const issueType = /password/i.test(message) ? 'PASSWORD_WRONG' : /expire/i.test(message) ? 'SUBSCRIPTION_EXPIRED' : 'ACCOUNT_NOT_WORKING';
  const auto = await resolveAutomatically(order, issueType);
  const issue = await prisma.issue.create({
    data: { orderId, description: message, status: auto?.handled ? 'closed' : 'triaged', aiNotes: JSON.stringify(auto || {}) }
  });
  if (!auto?.handled) await sendIssueAlert({ ...issue, order });
  return { success: true, reply: auto?.reply || 'Issue admin ko escalate kar diya gaya hai.', issue, eligibility };
}

module.exports = {
  handleIssue,
  resolveIssue
};
