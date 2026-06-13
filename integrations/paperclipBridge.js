// ============================================================
//  SuperSender Pro — Paperclip AI Bridge
//  Connects SuperSender with Paperclip agent orchestration
// ============================================================

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

function readJson(file, fallback) {
  try {
    const full = path.join(DATA_DIR, file);
    if (!fs.existsSync(full)) return fallback;
    const raw = fs.readFileSync(full, 'utf8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function getSettings() {
  const settings = readJson('settings.json', {});
  return {
    ...settings,
    paperclip_url: process.env.PAPERCLIP_URL || settings.paperclip_url || 'http://localhost:3000',
    paperclip_api_key: process.env.PAPERCLIP_API_KEY || settings.paperclip_api_key || '',
    paperclip_enabled: settings.paperclip_enabled ?? false,
    paperclip_auto_sync: settings.paperclip_auto_sync ?? false
  };
}

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

function appendLog(type, data = {}) {
  try {
    const logFile = path.join(DATA_DIR, 'paperclip_log.json');
    const logs = readJson('paperclip_log.json', []);
    logs.push({
      type,
      timestamp: new Date().toISOString(),
      ...data
    });
    fs.writeFileSync(logFile, JSON.stringify(logs.slice(-500), null, 2));
  } catch {}
}

function getRecentLogs(limit = 20) {
  try {
    const logs = readJson('paperclip_log.json', []);
    return Array.isArray(logs) ? logs.slice(-limit).reverse() : [];
  } catch {
    return [];
  }
}

async function checkConnection() {
  try {
    const client = getClient();
    const res = await client.get('/api/health');
    return {
      connected: true,
      status: res.data || null,
      url: normalizeBaseUrl(getSettings().paperclip_url)
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      url: normalizeBaseUrl(getSettings().paperclip_url)
    };
  }
}

async function listCompanies() {
  try {
    const client = getClient();
    const res = await client.get('/api/companies');
    return Array.isArray(res.data) ? res.data : (res.data?.items || []);
  } catch (error) {
    appendLog('list_companies_failed', { error: error.message });
    return [];
  }
}

async function ensureCompany() {
  try {
    const settings = getSettings();
    const companies = await listCompanies();
    const preferredName = String(settings.business_name || 'SuperSender Pro').trim().toLowerCase();
    const existing = companies.find((company) => String(company.name || '').trim().toLowerCase() === preferredName)
      || companies[0]
      || null;
    if (existing?.id) return existing;

    const client = getClient();
    const res = await client.post('/api/companies', {
      name: settings.business_name || 'SuperSender Pro',
      description: 'Synced from SuperSender Pro',
      budgetMonthlyCents: 0
    });
    return res.data || null;
  } catch (error) {
    appendLog('ensure_company_failed', { error: error.message });
    return null;
  }
}

async function listAgents(companyId) {
  if (!companyId) return [];
  try {
    const client = getClient();
    const res = await client.get(`/api/companies/${companyId}/agents`);
    return Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.agents || []);
  } catch (error) {
    appendLog('list_agents_failed', { companyId, error: error.message });
    return [];
  }
}

function normalizeSearchKey(value) {
  return String(value || '').trim().toLowerCase();
}

function simplifyAgent(agent) {
  return {
    id: agent.id || null,
    name: agent.name || '',
    title: agent.title || '',
    role: agent.role || 'general',
    status: agent.status || 'idle',
    adapterType: agent.adapterType || '',
    reportsTo: agent.reportsTo || null,
    companyId: agent.companyId || null,
    metadata: agent.metadata || {},
    raw: agent
  };
}

async function resolveAgentId(companyId, desired) {
  if (!companyId || !desired) return null;
  try {
    const agents = await listAgents(companyId);
    const key = normalizeSearchKey(desired);
    if (!key) return null;
    const match = agents.find((agent) => {
      const fields = [
        agent.id,
        agent.name,
        agent.title,
        agent.role,
        agent.metadata?.slug,
        agent.metadata?.name,
        agent.metadata?.role
      ].map(normalizeSearchKey);
      return fields.includes(key);
    });
    return match?.id || null;
  } catch (error) {
    appendLog('resolve_agent_failed', { companyId, desired, error: error.message });
    return null;
  }
}

function buildTaskDescription(task = {}) {
  const contextLines = [];
  if (task.description) contextLines.push(String(task.description).trim());
  if (task.context) {
    const context = typeof task.context === 'string'
      ? task.context
      : JSON.stringify(task.context, null, 2);
    contextLines.push(`Context:\n${context}`);
  }
  if (task.notes) contextLines.push(`Notes:\n${String(task.notes).trim()}`);
  return contextLines.filter(Boolean).join('\n\n').trim();
}

async function sendTaskToPaperclip(task = {}) {
  try {
    const client = getClient();
    const company = await ensureCompany();
    if (!company?.id) {
      throw new Error('No Paperclip company available. Create or sync a company first.');
    }

    const assigneeAgentId = task.assigneeAgentId
      || task.agentId
      || task.assignToAgentId
      || await resolveAgentId(company.id, task.assignToAgent || task.assignee || task.agent || task.targetAgent || task.slug || '');

    const title = String(task.title || 'New Task from SuperSender').trim().slice(0, 180);
    const description = buildTaskDescription(task) || 'Task created from SuperSender Pro.';

    const payload = {
      title,
      description,
      status: task.status || 'backlog',
      priority: task.priority || 'medium',
      ...(assigneeAgentId ? { assigneeAgentId } : {}),
      ...(Number.isFinite(task.requestDepth) ? { requestDepth: task.requestDepth } : {})
    };

    const res = await client.post(`/api/companies/${company.id}/issues`, payload);
    const issue = res.data || null;
    appendLog('task_sent', {
      title,
      companyId: company.id,
      assigneeAgentId: assigneeAgentId || null,
      issueId: issue?.id || null
    });
    return {
      success: true,
      company,
      issue,
      issueId: issue?.id || null
    };
  } catch (error) {
    appendLog('task_send_failed', { error: error.message, task: { title: task?.title || '' } });
    return { success: false, error: error.message };
  }
}

async function getAgentStatus() {
  try {
    const connection = await checkConnection();
    if (!connection.connected) {
      return { success: false, connected: false, agents: [], company: null, error: connection.error };
    }

    const company = await ensureCompany();
    if (!company?.id) {
      return { success: false, connected: true, agents: [], company: null, error: 'No Paperclip company available' };
    }

    const agents = await listAgents(company.id);
    return {
      success: true,
      connected: true,
      company: {
        id: company.id,
        name: company.name || ''
      },
      agents: agents.map(simplifyAgent)
    };
  } catch (error) {
    appendLog('agent_status_failed', { error: error.message });
    return { success: false, connected: false, agents: [], company: null, error: error.message };
  }
}

let agentResultListener = null;

function receiveAgentResult(callback) {
  if (typeof callback === 'function') {
    agentResultListener = callback;
  }
  return agentResultListener;
}

async function syncProductsToPaperclip() {
  try {
    const products = readJson('laptop_products.json', []);
    const activeProducts = Array.isArray(products)
      ? products.filter((product) => product && product.stock !== false && Number(product.price || 0) > 0)
      : [];
    const summary = activeProducts.slice(0, 20).map((product) => [
      `• ${product.name || 'Product'}`,
      product.price ? `Rs. ${Number(product.price).toLocaleString()}` : 'Price unavailable',
      product.condition ? `(${product.condition})` : ''
    ].filter(Boolean).join(' ')).join('\n');

    return await sendTaskToPaperclip({
      title: `Product Catalog Sync — ${activeProducts.length} items`,
      description: [
        'Keep the laptop catalog fresh with the latest inventory from SuperSender Pro.',
        `Total active products: ${activeProducts.length}`,
        summary || 'No active products found.'
      ].join('\n\n'),
      priority: 'low',
      assignToAgent: 'catalog-agent',
      context: {
        productCount: activeProducts.length,
        updatedAt: new Date().toISOString(),
        products: activeProducts
      }
    });
  } catch (error) {
    appendLog('sync_products_failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

async function triggerMarketingAgent(goal = 'Find new businesses in Pakistan that need WhatsApp bots') {
  try {
    return await sendTaskToPaperclip({
      title: `Marketing Goal — ${goal}`,
      description: [
        `Goal: ${goal}`,
        '',
        'Focus on Pakistani businesses that can benefit from WhatsApp automation.',
        'Prioritize real estate, laptop dealers, salons, clinics, shops, and service providers.',
        '',
        'Return a short lead list and next outreach message.'
      ].join('\n'),
      priority: 'high',
      assignToAgent: 'sales-agent',
      context: { goal }
    });
  } catch (error) {
    appendLog('trigger_marketing_failed', { error: error.message, goal });
    return { success: false, error: error.message };
  }
}

async function triggerReportAgent() {
  try {
    const payments = readJson('payments.json', []);
    const customers = readJson('customers.json', []);
    const orders = readJson('orders.json', []);
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const revenue = payments
      .filter((payment) => {
        const stamp = String(payment.date || payment.createdAt || payment.updatedAt || '');
        return stamp.startsWith(todayKey) && ['approved', 'paid', 'completed'].includes(String(payment.status || '').toLowerCase());
      })
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return await sendTaskToPaperclip({
      title: `Daily Business Report — ${todayKey}`,
      description: [
        `Date: ${todayKey}`,
        `Revenue today: Rs. ${revenue.toLocaleString()}`,
        `Customers: ${Array.isArray(customers) ? customers.length : 0}`,
        `Orders: ${Array.isArray(orders) ? orders.length : 0}`,
        `Payments: ${Array.isArray(payments) ? payments.length : 0}`,
        '',
        'Please generate a concise management summary with action points.'
      ].join('\n'),
      priority: 'medium',
      assignToAgent: 'analytics-agent',
      context: {
        todayKey,
        revenue,
        customerCount: Array.isArray(customers) ? customers.length : 0,
        orderCount: Array.isArray(orders) ? orders.length : 0,
        paymentCount: Array.isArray(payments) ? payments.length : 0
      }
    });
  } catch (error) {
    appendLog('trigger_report_failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

module.exports = {
  checkConnection,
  sendTaskToPaperclip,
  getAgentStatus,
  receiveAgentResult,
  syncProductsToPaperclip,
  triggerMarketingAgent,
  triggerReportAgent,
  getRecentLogs,
  appendLog,
  getSettings,
  ensureCompany,
  listCompanies,
  listAgents,
  resolveAgentId
};
