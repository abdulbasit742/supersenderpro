const { AgentPlanner } = require('./planner');
const { getMemory } = require('./memory');
const { executeTool } = require('./tools');

class BaseAgent {
  constructor(id, name, role, config) {
    config = config || {};
    this.id = id; this.name = name; this.role = role;
    this.planner = new AgentPlanner(id, config);
    this.memory = getMemory(id);
    this.config = config;
    this.status = 'idle';
  }
  async run(goal, context) {
    context = context || {};
    this.status = 'running';
    this.memory.remember('user', goal);
    try {
      const plan = await this.planner.planSteps(goal, context);
      const result = await this.planner.executePlan(plan, { dryRun: this.config.dryRun !== false });
      this.memory.remember('assistant', 'Done: ' + goal + ' in ' + result.steps.length + ' steps');
      this.status = 'idle';
      return { agent: this.name, role: this.role, goal: goal, plan: plan, result: result, success: true };
    } catch(e) {
      this.status = 'error';
      return { agent: this.name, goal: goal, success: false, error: e.message };
    }
  }
  toJSON() { return { id: this.id, name: this.name, role: this.role, status: this.status, dryRun: this.config.dryRun !== false }; }
}

class SalesAgent extends BaseAgent {
  constructor(cfg) { super('sales-agent', 'Sales Bot', 'Sales Specialist', cfg || {}); }
  async handleCustomerQuery(phone, message) {
    const ctx = { phone: phone, customerMessage: message };
    const info = await executeTool('db.getCustomer', { phone: phone });
    if (info.success) { ctx.customer = info.customer; this.memory.memorize('cust_' + phone, info.customer.tier || 'Bronze'); }
    return this.run('Handle customer query: ' + message, ctx);
  }
}

class OperationsAgent extends BaseAgent {
  constructor(cfg) { super('ops-agent', 'Operations Bot', 'Operations Manager', cfg || {}); }
  async processPayment(txnId, amount, phone) { return this.run('Verify payment TXN:' + txnId + ' amount:' + amount + ' for ' + phone, { txnId: txnId, amount: amount, customerPhone: phone }); }
}

class MarketingAgent extends BaseAgent {
  constructor(cfg) { super('marketing-agent', 'Marketing Bot', 'Marketing Strategist', cfg || {}); }
  async createCampaign(goal, segment) { return this.run('Create WhatsApp campaign: ' + goal + ' for segment: ' + (segment||'all'), { segment: segment||'all' }); }
}

class AnalyticsAgent extends BaseAgent {
  constructor(cfg) { super('analytics-agent', 'Analytics Bot', 'Business Analyst', cfg || {}); }
  async dailyReport() { return this.run('Generate daily business report with sales, stock and revenue insights', { period: 'today' }); }
}

class SupportAgent extends BaseAgent {
  constructor(cfg) { super('support-agent', 'Support Bot', 'Customer Success Manager', cfg || {}); }
  async handleRenewal(phone, tool, expiryDate) { return this.run('Send renewal reminder for ' + tool + ' expiring ' + expiryDate + ' to ' + phone, { phone: phone, tool: tool, expiryDate: expiryDate }); }
}

class DealerAgent extends BaseAgent {
  constructor(cfg) { super('dealer-agent', 'Dealer Monitor Bot', 'Procurement Specialist', cfg || {}); }
  async monitorRates() { return this.run('Check dealer rates and compare with market, alert if margin drops below 15%', {}); }
}

const AGENT_REGISTRY = {
  'sales-agent': new SalesAgent(),
  'ops-agent': new OperationsAgent(),
  'marketing-agent': new MarketingAgent(),
  'analytics-agent': new AnalyticsAgent(),
  'support-agent': new SupportAgent(),
  'dealer-agent': new DealerAgent(),
};

function getAgent(id) { return AGENT_REGISTRY[id] || null; }
function listAgents() { return Object.values(AGENT_REGISTRY).map(function(a) { return a.toJSON(); }); }

module.exports = { BaseAgent, SalesAgent, OperationsAgent, MarketingAgent, AnalyticsAgent, SupportAgent, DealerAgent, AGENT_REGISTRY, getAgent, listAgents };