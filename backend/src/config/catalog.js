const ACCOUNT_TYPES = [
  {
    name: 'private',
    label: 'Private Account',
    policyText: 'Private account shared login hota hai. Rs 999 limited time offer selected plans par apply hoti hai. Limited slots remaining urgency real stock se show hogi.',
    policySummary: 'Shared/private login account. Limited slots remaining.',
    maxIssueResolutions: 0,
    maxReplacements: 0,
    sharedLogin: true,
    sortOrder: 1,
    limitedLabel: 'LIMITED TIME'
  },
  {
    name: 'warranty',
    label: 'Warranty Account',
    policyText: 'Warranty account me 1 replacement aur maximum 2 issue resolutions milti hain. Is limit ke baad further support allowed nahi hoti.',
    policySummary: '1x replacement + max 2x issue resolution.',
    maxIssueResolutions: 2,
    maxReplacements: 1,
    sharedLogin: false,
    sortOrder: 2
  },
  {
    name: 'non_warranty',
    label: 'Non-Warranty Account',
    policyText: 'Non-warranty purchase ke baad koi claim accept nahi hota. Buyer purchase se pehle policy confirm karta hai.',
    policySummary: 'No claims after purchase.',
    maxIssueResolutions: 0,
    maxReplacements: 0,
    sharedLogin: false,
    sortOrder: 3
  }
];

const TOOL_PLANS = [
  { tool: 'ChatGPT', toolSlug: 'chatgpt', plan: 'Plus', planSlug: 'plus', durationDays: 30, prices: { private: 999, warranty: 1800, non_warranty: 1200 } },
  { tool: 'ChatGPT', toolSlug: 'chatgpt', plan: 'Team', planSlug: 'team', durationDays: 30, prices: { private: 1499, warranty: 2800, non_warranty: 2000 } },
  { tool: 'Claude', toolSlug: 'claude', plan: 'Pro', planSlug: 'pro', durationDays: 30, prices: { private: 999, warranty: 1700, non_warranty: 1100 } },
  { tool: 'Claude', toolSlug: 'claude', plan: 'Max', planSlug: 'max', durationDays: 30, prices: { private: 1999, warranty: 4200, non_warranty: 3000 } },
  { tool: 'Midjourney', toolSlug: 'midjourney', plan: 'Basic', planSlug: 'basic', durationDays: 30, prices: { private: 999, warranty: 1500, non_warranty: 1000 } },
  { tool: 'Midjourney', toolSlug: 'midjourney', plan: 'Standard', planSlug: 'standard', durationDays: 30, prices: { private: 1299, warranty: 2200, non_warranty: 1600 } },
  { tool: 'Cursor', toolSlug: 'cursor', plan: 'Pro', planSlug: 'pro', durationDays: 30, prices: { private: 1299, warranty: 2100, non_warranty: 1500 } },
  { tool: 'Gemini', toolSlug: 'gemini', plan: 'Advanced', planSlug: 'advanced', durationDays: 30, prices: { private: 999, warranty: 1600, non_warranty: 1100 } }
];

function slugify(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'default';
}

function findPlanByInput(input = '') {
  const value = String(input || '').toLowerCase();
  return TOOL_PLANS.find((row) => {
    const hay = `${row.tool} ${row.plan} ${row.toolSlug} ${row.planSlug}`.toLowerCase();
    return hay.includes(value) || value.includes(`${row.toolSlug} ${row.planSlug}`);
  }) || null;
}

module.exports = {
  ACCOUNT_TYPES,
  TOOL_PLANS,
  slugify,
  findPlanByInput
};
