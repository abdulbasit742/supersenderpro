// ============================================================
//  SuperSender Pro — Paperclip Agent Configs
//  Deploys four Paperclip agents for sales, catalog, support, reports
// ============================================================

const axios = require('axios');
const {
  appendLog,
  ensureCompany,
  getSettings,
  listAgents,
  resolveAgentId
} = require('./paperclipBridge');

function normalizeBaseUrl(value) {
  return String(value || 'http://localhost:3000').replace(/\/+$/, '');
}

function getClient() {
  const settings = getSettings();
  return axios.create({
    baseURL: normalizeBaseUrl(settings.paperclip_url),
    timeout: Number(process.env.PAPERCLIP_TIMEOUT_MS || 3000),
    headers: {
      'Content-Type': 'application/json',
      ...(settings.paperclip_api_key ? { Authorization: `Bearer ${settings.paperclip_api_key}` } : {})
    }
  });
}

const AGENT_CONFIGS = [
  {
    slug: 'sales-agent',
    name: 'SuperSender Sales Agent',
    title: 'SuperSender Sales Agent',
    role: 'cmo',
    icon: 'rocket',
    adapterType: 'external_adapter',
    capabilities: 'Find businesses in Pakistan that need WhatsApp bots and prepare outreach follow-ups.',
    desiredSkills: ['web search', 'lead generation', 'whatsapp outreach'],
    metadata: {
      slug: 'sales-agent',
      reportsToRole: 'ceo',
      reportsToLabel: 'CEO',
      department: 'sales'
    },
    budgetMonthlyCents: 0
  },
  {
    slug: 'catalog-agent',
    name: 'Product Catalog Agent',
    title: 'Product Catalog Agent',
    role: 'cto',
    icon: 'package',
    adapterType: 'external_adapter',
    capabilities: 'Keep the laptop catalog updated from infinitytouchstore.com and imported product feeds.',
    desiredSkills: ['web scraping', 'product import', 'catalog cleanup'],
    metadata: {
      slug: 'catalog-agent',
      reportsToRole: 'ceo',
      reportsToLabel: 'CTO',
      department: 'catalog'
    },
    budgetMonthlyCents: 0
  },
  {
    slug: 'support-agent',
    name: 'Customer Support Agent',
    title: 'Customer Support Agent',
    role: 'general',
    icon: 'message-square',
    adapterType: 'external_adapter',
    capabilities: 'Handle customer queries automatically via WhatsApp and keep the inbox friendly.',
    desiredSkills: ['faq responses', 'whatsapp replies', 'customer support'],
    metadata: {
      slug: 'support-agent',
      reportsToRole: 'ceo',
      reportsToLabel: 'CEO',
      department: 'support'
    },
    budgetMonthlyCents: 0
  },
  {
    slug: 'analytics-agent',
    name: 'Analytics Agent',
    title: 'Analytics Agent',
    role: 'cfo',
    icon: 'radar',
    adapterType: 'external_adapter',
    capabilities: 'Generate daily and weekly business reports with simple recommendations.',
    desiredSkills: ['data analysis', 'report generation', 'business summary'],
    metadata: {
      slug: 'analytics-agent',
      reportsToRole: 'ceo',
      reportsToLabel: 'CEO',
      department: 'analytics'
    },
    budgetMonthlyCents: 0
  }
];

async function upsertAgent(client, companyId, agentConfig, existingAgents = []) {
  const match = existingAgents.find((agent) => {
    const slug = String(agent.metadata?.slug || '').trim().toLowerCase();
    const name = String(agent.name || '').trim().toLowerCase();
    const title = String(agent.title || '').trim().toLowerCase();
    const target = String(agentConfig.slug || agentConfig.name || '').trim().toLowerCase();
    return slug === target || name === target || title === target;
  }) || null;

  const payload = {
    name: agentConfig.name,
    role: agentConfig.role,
    title: agentConfig.title,
    icon: agentConfig.icon,
    capabilities: agentConfig.capabilities,
    desiredSkills: agentConfig.desiredSkills,
    adapterType: agentConfig.adapterType,
    adapterConfig: {
      source: 'supersender-pro',
      adapter: 'paperclip-external',
      slug: agentConfig.slug
    },
    runtimeConfig: {
      modelProfiles: {
        cheap: {
          enabled: true,
          label: 'SuperSender Bridge'
        }
      }
    },
    budgetMonthlyCents: agentConfig.budgetMonthlyCents || 0,
    metadata: {
      ...agentConfig.metadata,
      slug: agentConfig.slug,
      source: 'supersender-pro'
    }
  };

  if (match?.id) {
    const res = await client.patch(`/api/agents/${match.id}`, payload);
    return { action: 'updated', agent: res.data || match };
  }

  const res = await client.post(`/api/companies/${companyId}/agents`, payload);
  return { action: 'created', agent: res.data || null };
}

async function deployAllAgents(payload = {}) {
  try {
    const client = getClient();
    const company = await ensureCompany();
    if (!company?.id) {
      return { success: false, error: 'No Paperclip company available' };
    }

    const existingAgents = await listAgents(company.id);
    const deployed = [];

    for (const config of AGENT_CONFIGS) {
      const result = await upsertAgent(client, company.id, config, existingAgents);
      deployed.push({
        slug: config.slug,
        name: config.name,
        action: result.action,
        id: result.agent?.id || null,
        status: result.agent?.status || 'idle'
      });
    }

    const ceoAgentId = await resolveAgentId(company.id, 'ceo');

    appendLog('deploy_all_agents', {
      companyId: company.id,
      count: deployed.length,
      ceoAgentId,
      trigger: payload?.trigger || 'manual'
    });

    return {
      success: true,
      company,
      deployed
    };
  } catch (error) {
    appendLog('deploy_all_agents_failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

module.exports = {
  AGENT_CONFIGS,
  deployAllAgents
};
