const ACCOUNT_TYPE_CATALOG = [
  {
    name: 'private',
    label: 'Private Account',
    sortOrder: 1,
    limitedLabel: 'LIMITED TIME OFFER',
    fixedPrice: 999,
    sharedLogin: true,
    maxIssueResolutions: 0,
    maxReplacements: 0,
    policySummary: 'Shared login, limited slots only.',
    policyText: 'Private account = shared login. Limited time offer Rs 999. Limited slots remaining.'
  },
  {
    name: 'warranty',
    label: 'Warranty Account',
    sortOrder: 2,
    sharedLogin: false,
    maxIssueResolutions: 2,
    maxReplacements: 1,
    policySummary: '1x replacement + max 2 issue resolutions.',
    policyText: 'Aap ko 1 bar replacement aur 2 bar issue resolution milti hai. Us ke baad support close ho jati hai.'
  },
  {
    name: 'non_warranty',
    label: 'Non-Warranty Account',
    sortOrder: 3,
    sharedLogin: false,
    maxIssueResolutions: 0,
    maxReplacements: 0,
    policySummary: 'No claims accepted after purchase.',
    policyText: 'NON-WARRANTY: kharidari ke baad koi claim ya refund accept nahi hoga. Buyer ki full responsibility hogi.'
  }
];

const TOOL_CATALOG = [
  {
    slug: 'chatgpt',
    name: 'ChatGPT',
    description: 'OpenAI premium access',
    aliases: ['chatgpt', 'chat gpt', 'gpt', 'gpt plus', 'gpt team', 'openai'],
    plans: [
      { planName: 'Plus', planSlug: 'plus', sellPrice: 2999, durationDays: 30, aliases: ['plus', '1 month', 'monthly'] },
      { planName: 'Team', planSlug: 'team', sellPrice: 6999, durationDays: 30, aliases: ['team'] }
    ]
  },
  {
    slug: 'claude',
    name: 'Claude',
    description: 'Anthropic subscription',
    aliases: ['claude', 'cloude', 'anthropic'],
    plans: [
      { planName: 'Pro', planSlug: 'pro', sellPrice: 4999, durationDays: 30, aliases: ['pro', '1 month', 'monthly'] },
      { planName: 'Max', planSlug: 'max', sellPrice: 8999, durationDays: 30, aliases: ['max'] }
    ]
  },
  {
    slug: 'midjourney',
    name: 'Midjourney',
    description: 'Image generation subscription',
    aliases: ['midjourney', 'mid journey', 'mid', 'mj'],
    plans: [
      { planName: 'Basic', planSlug: 'basic', sellPrice: 2499, durationDays: 30, aliases: ['basic', 'base'] },
      { planName: 'Standard', planSlug: 'standard', sellPrice: 3999, durationDays: 30, aliases: ['standard'] }
    ]
  },
  {
    slug: 'cursor',
    name: 'Cursor',
    description: 'Cursor AI coding plan',
    aliases: ['cursor', 'cursor ai'],
    plans: [
      { planName: 'Pro', planSlug: 'pro', sellPrice: 2799, durationDays: 30, aliases: ['pro', '1 month', 'monthly'] }
    ]
  },
  {
    slug: 'gemini',
    name: 'Gemini',
    description: 'Google Gemini premium',
    aliases: ['gemini', 'google ai', 'gemini advanced'],
    plans: [
      { planName: 'Advanced', planSlug: 'advanced', sellPrice: 3199, durationDays: 30, aliases: ['advanced', 'advance', '1 month', 'monthly'] }
    ]
  }
];

function normalizeInput(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findToolByInput(value = '') {
  const normalized = normalizeInput(value);
  return TOOL_CATALOG.find(tool => {
    const candidates = [tool.slug, tool.name, ...(tool.aliases || [])];
    return candidates.some(alias => normalized.includes(normalizeInput(alias)));
  }) || null;
}

function findPlanByInput(toolSlug, value = '') {
  const tool = TOOL_CATALOG.find(item => item.slug === toolSlug);
  if (!tool) return null;
  const normalized = normalizeInput(value);
  return tool.plans.find(plan => {
    const candidates = [plan.planName, plan.planSlug, ...(plan.aliases || [])];
    return candidates.some(alias => normalized.includes(normalizeInput(alias)));
  }) || null;
}

function findAccountTypeByInput(value = '') {
  const normalized = normalizeInput(value);
  return ACCOUNT_TYPE_CATALOG.find(type => {
    const aliases = [
      type.name,
      type.label,
      type.name.replace('_', ' '),
      type.name === 'private' ? 'shared login' : '',
      type.name === 'warranty' ? 'warranty account' : '',
      type.name === 'non_warranty' ? 'non warranty' : '',
      type.name === 'non_warranty' ? 'non-warranty' : ''
    ].filter(Boolean);
    return aliases.some(alias => normalized.includes(normalizeInput(alias)));
  }) || null;
}

function getToolOptionsText() {
  return TOOL_CATALOG.map((tool, index) => `${index + 1}. ${tool.name}`).join('\n');
}

function getDefaultPriceForAccountType(plan = {}, typeName = '') {
  const basePrice = Number(plan.sellPrice || 0);
  if (typeName === 'private') return 999;
  if (typeName === 'warranty') return basePrice;
  if (typeName === 'non_warranty') {
    return Math.max(999, basePrice - Math.max(400, Math.round(basePrice * 0.18)));
  }
  return basePrice;
}

module.exports = {
  ACCOUNT_TYPE_CATALOG,
  TOOL_CATALOG,
  normalizeInput,
  findToolByInput,
  findPlanByInput,
  findAccountTypeByInput,
  getToolOptionsText,
  getDefaultPriceForAccountType
};
