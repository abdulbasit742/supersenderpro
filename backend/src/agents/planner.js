const { getMemory } = require('./memory');
const { executeTool, listTools } = require('./tools');

class AgentPlanner {
  constructor(agentId, config) {
    config = config || {};
    this.agentId = agentId;
    this.memory = getMemory(agentId);
    this.config = { maxSteps: config.maxSteps || 10, dryRun: config.dryRun !== false };
    this.executionLog = [];
  }

  async planSteps(goal, context) {
    context = context || {};
    const apiKey = this._getApiKey();
    if (!apiKey) return this._ruleBasedPlan(goal, context);
    try {
      const axios = require('axios');
      const tools = listTools().map(function(t) { return t.name + ': ' + t.description; }).join(', ');
      const prompt = 'You are an agent planner for a Pakistan AI tools store. Break this goal into steps using available tools. Return JSON: { steps: [{step:number, action:string, tool:string, params:object, reason:string}] }' +
        ' Goal: ' + goal + ' Tools: ' + tools;
      const r = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 800
      }, { headers: { Authorization: 'Bearer ' + apiKey } });
      const plan = JSON.parse(r.data.choices[0].message.content);
      return { success: true, goal: goal, steps: plan.steps || [], aiPlanned: true };
    } catch(e) { return this._ruleBasedPlan(goal, context); }
  }

  _ruleBasedPlan(goal, context) {
    const g = goal.toLowerCase();
    let steps = [];
    if (g.includes('customer') && (g.includes('info') || g.includes('lookup'))) {
      steps = [{ step:1, action:'Get customer info', tool:'db.getCustomer', params:{ phone: context.phone||'' }, reason:'Retrieve customer data' }];
    } else if (g.includes('price') || g.includes('rate')) {
      steps = [{ step:1, action:'Get current rates', tool:'db.getRates', params:{}, reason:'Fetch latest pricing' }, { step:2, action:'Search market rates', tool:'web.search', params:{ query:'ChatGPT Claude Cursor pricing 2026' }, reason:'Compare market' }];
    } else if (g.includes('stock') || g.includes('inventory')) {
      steps = [{ step:1, action:'Check stock levels', tool:'db.getStock', params:{}, reason:'View inventory' }];
    } else if (g.includes('sales') || g.includes('revenue') || g.includes('report')) {
      steps = [{ step:1, action:'Today sales', tool:'analytics.salesSummary', params:{ period:'today' }, reason:'Daily summary' }, { step:2, action:'Weekly sales', tool:'analytics.salesSummary', params:{ period:'week' }, reason:'Weekly trend' }];
    } else if (g.includes('notify') || g.includes('alert') || g.includes('admin')) {
      steps = [{ step:1, action:'Notify admin', tool:'notify.admin', params:{ message: goal, priority:'normal' }, reason:'Alert admin' }];
    } else if (g.includes('invoice')) {
      steps = [{ step:1, action:'Create invoice', tool:'invoice.create', params: context.invoiceData||{}, reason:'Generate invoice' }];
    } else {
      steps = [{ step:1, action:'Search knowledge base', tool:'kb.search', params:{ query: goal }, reason:'Find relevant info' }];
    }
    return { success: true, goal: goal, steps: steps, aiPlanned: false, note: 'Rule-based plan. Add OPENAI_API_KEY for AI planning.' };
  }

  async executePlan(plan, opts) {
    opts = opts || {};
    const results = [];
    const dryRun = opts.dryRun !== undefined ? opts.dryRun : this.config.dryRun;
    for (let i = 0; i < (plan.steps || []).length; i++) {
      if (results.length >= this.config.maxSteps) break;
      const step = plan.steps[i];
      const stepLog = { step: step.step, action: step.action, tool: step.tool, startedAt: new Date().toISOString() };
      try {
        if (dryRun) {
          stepLog.result = { dryRun: true, tool: step.tool, params: step.params, wouldExecute: true };
          stepLog.status = 'dry_run';
        } else {
          stepLog.result = await executeTool(step.tool, step.params);
          stepLog.status = stepLog.result.success ? 'completed' : 'failed';
          this.memory.remember('assistant', 'Step ' + step.step + ': ' + step.action + ' done');
        }
      } catch(e) { stepLog.result = { success: false, error: e.message }; stepLog.status = 'error'; }
      stepLog.completedAt = new Date().toISOString();
      results.push(stepLog);
      this.executionLog.push(stepLog);
    }
    return { planGoal: plan.goal, steps: results, dryRun: dryRun, completedAt: new Date().toISOString() };
  }

  _getApiKey() {
    if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
    try { return JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'../../../data/ai_reply_config.json'),'utf8')).apiKey; } catch(e) { return null; }
  }
}

module.exports = { AgentPlanner };