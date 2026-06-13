function checkWarrantyEligibility(order = {}) {
  const typeName = String(order.type_name || '').toLowerCase();
  const replacementsUsed = Number(order.warranty_replacements_used || 0);
  const issuesResolved = Number(order.warranty_issues_resolved || 0);
  const maxReplacements = typeName === 'warranty'
    ? Math.max(1, Number(order.max_replacements || 1))
    : 0;
  const maxIssues = typeName === 'warranty'
    ? Math.max(2, Number(order.max_issue_resolutions || 2))
    : 0;

  if (typeName === 'non_warranty') {
    return {
      accountType: typeName,
      warrantyActive: false,
      canReplace: false,
      canResolveIssue: false,
      replacementsRemaining: 0,
      issueResolutionsRemaining: 0,
      message: 'Non-warranty account hai. Purchase ke baad claims, refunds, aur replacements accept nahi hote.'
    };
  }

  if (typeName === 'private') {
    return {
      accountType: typeName,
      warrantyActive: false,
      canReplace: false,
      canResolveIssue: false,
      replacementsRemaining: 0,
      issueResolutionsRemaining: 0,
      message: 'Private shared login account hai. Is par warranty replacement available nahi hoti.'
    };
  }

  if (typeName !== 'warranty') {
    return {
      accountType: typeName || 'unknown',
      warrantyActive: false,
      canReplace: false,
      canResolveIssue: false,
      replacementsRemaining: 0,
      issueResolutionsRemaining: 0,
      message: 'Order type clear nahi hai. Admin review required hai.'
    };
  }

  const replacementsRemaining = Math.max(0, maxReplacements - replacementsUsed);
  const issueResolutionsRemaining = Math.max(0, maxIssues - issuesResolved);

  return {
    accountType: typeName,
    warrantyActive: true,
    canReplace: replacementsRemaining > 0,
    canResolveIssue: issueResolutionsRemaining > 0,
    replacementsRemaining,
    issueResolutionsRemaining,
    message: issueResolutionsRemaining > 0
      ? `Warranty active hai. ${issueResolutionsRemaining} issue resolution aur ${replacementsRemaining} replacement baki hai.`
      : 'Aap ki warranty support limit puri ho gayi hai. Is order par further issue support available nahi.'
  };
}

function assertReplacementAllowed(order = {}) {
  const eligibility = checkWarrantyEligibility(order);
  if (!eligibility.canReplace) {
    throw new Error(eligibility.message);
  }
  return eligibility;
}

module.exports = {
  checkWarrantyEligibility,
  assertReplacementAllowed
};
