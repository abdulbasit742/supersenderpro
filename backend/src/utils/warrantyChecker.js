const prisma = require('../services/prisma');

const NON_WARRANTY_MESSAGE = 'یہ Non-warranty account ہے — کوئی claim نہیں ہو سکتا';
const REPLACEMENT_LIMIT_MESSAGE = 'آپ کی warranty replacement limit پوری ہو گئی ہے (1/1 used)';
const ISSUE_LIMIT_MESSAGE = 'آپ کی warranty support limit ختم ہو گئی (2/2 used)';

async function loadOrder(orderIdOrOrder) {
  if (!orderIdOrOrder) return null;
  if (typeof orderIdOrOrder === 'object') return orderIdOrOrder;
  return prisma.businessOrder.findUnique({
    where: { orderId: String(orderIdOrOrder) },
    include: { customer: true, tool: true, plan: true, accountType: true, issues: true }
  });
}

function typeName(order) {
  return order?.accountType?.name || order?.typeName || order?.accountTypeName || '';
}

function maxReplacement(order) {
  return Number(order?.accountType?.maxReplacements ?? order?.maxReplacements ?? (typeName(order) === 'warranty' ? 1 : 0));
}

function maxIssues(order) {
  return Number(order?.accountType?.maxIssueResolutions ?? order?.maxIssueResolutions ?? (typeName(order) === 'warranty' ? 2 : 0));
}

async function checkEligibility(orderIdOrOrder) {
  try {
    const order = await loadOrder(orderIdOrOrder);
    if (!order) {
      return { canClaim: false, eligible: false, replacementsUsed: 0, issuesResolved: 0, message: 'Order not found.' };
    }
    const type = typeName(order);
    const replacementsUsed = Number(order.warrantyReplacementsUsed || 0);
    const issuesResolved = Number(order.warrantyIssuesResolved || 0);
    if (type === 'non_warranty') {
      return { canClaim: false, eligible: false, replacementsUsed, issuesResolved, message: NON_WARRANTY_MESSAGE };
    }
    if (type === 'private') {
      return {
        canClaim: false,
        eligible: false,
        replacementsUsed,
        issuesResolved,
        message: 'Private/shared login account ہے۔ Standard warranty replacement included نہیں، admin manual review کرے گا۔'
      };
    }
    if (replacementsUsed >= maxReplacement(order) && issuesResolved >= maxIssues(order)) {
      return { canClaim: false, eligible: false, replacementsUsed, issuesResolved, message: `${REPLACEMENT_LIMIT_MESSAGE}\n${ISSUE_LIMIT_MESSAGE}` };
    }
    if (issuesResolved >= maxIssues(order)) {
      return { canClaim: replacementsUsed < maxReplacement(order), eligible: replacementsUsed < maxReplacement(order), replacementsUsed, issuesResolved, message: ISSUE_LIMIT_MESSAGE };
    }
    return {
      canClaim: true,
      eligible: true,
      replacementsUsed,
      issuesResolved,
      message: `آپ کے پاس ابھی بھی support available ہے (${issuesResolved}/${maxIssues(order)} used). Replacement ${replacementsUsed}/${maxReplacement(order)} used.`
    };
  } catch (error) {
    console.error('[warranty:checkEligibility]', error);
    return { canClaim: false, eligible: false, replacementsUsed: 0, issuesResolved: 0, message: 'Warranty check failed. Admin ko alert bhej diya gaya hai.' };
  }
}

async function getRemainingSupport(orderId) {
  const order = await loadOrder(orderId);
  if (!order) return { replacements: '0/1', issues: '0/2', replacementsRemaining: 0, issuesRemaining: 0 };
  const usedReplacements = Number(order.warrantyReplacementsUsed || 0);
  const usedIssues = Number(order.warrantyIssuesResolved || 0);
  const repMax = maxReplacement(order);
  const issueMax = maxIssues(order);
  return {
    replacements: `${usedReplacements}/${repMax}`,
    issues: `${usedIssues}/${issueMax}`,
    replacementsRemaining: Math.max(0, repMax - usedReplacements),
    issuesRemaining: Math.max(0, issueMax - usedIssues)
  };
}

async function resolveIssue(orderId, type = 'issue', resolution = 'Resolved by support') {
  try {
    const order = await loadOrder(orderId);
    if (!order) return { success: false, message: 'Order not found.' };
    const eligibility = await checkEligibility(order);
    const kind = String(type || 'issue').toLowerCase();
    if (!eligibility.canClaim) return { success: false, declined: true, message: eligibility.message, remaining: await getRemainingSupport(order.orderId) };
    if (kind.includes('replace') && Number(order.warrantyReplacementsUsed || 0) >= maxReplacement(order)) {
      return { success: false, declined: true, message: REPLACEMENT_LIMIT_MESSAGE, remaining: await getRemainingSupport(order.orderId) };
    }
    if (!kind.includes('replace') && Number(order.warrantyIssuesResolved || 0) >= maxIssues(order)) {
      return { success: false, declined: true, message: ISSUE_LIMIT_MESSAGE, remaining: await getRemainingSupport(order.orderId) };
    }
    const data = kind.includes('replace')
      ? { warrantyReplacementsUsed: { increment: 1 } }
      : { warrantyIssuesResolved: { increment: 1 } };
    await prisma.issue.create({
      data: {
        orderId: order.orderId,
        description: kind.includes('replace') ? 'Replacement issued' : 'Warranty issue resolved',
        status: 'resolved',
        resolution,
        resolvedAt: new Date()
      }
    });
    const updated = await prisma.businessOrder.update({ where: { orderId: order.orderId }, data, include: { accountType: true } });
    return { success: true, order: updated, remaining: await getRemainingSupport(order.orderId), message: 'Warranty record updated successfully.' };
  } catch (error) {
    console.error('[warranty:resolveIssue]', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  NON_WARRANTY_MESSAGE,
  REPLACEMENT_LIMIT_MESSAGE,
  ISSUE_LIMIT_MESSAGE,
  checkEligibility,
  resolveIssue,
  getRemainingSupport
};
