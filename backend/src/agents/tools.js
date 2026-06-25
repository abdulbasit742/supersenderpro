const fs = require('fs'), path = require('path');
const DATA = path.join(__dirname, '../../../data');
const NL = String.fromCharCode(10);

const TOOLS = {
  'whatsapp.send': {
    name: 'whatsapp.send', description: 'Send a WhatsApp message to a phone number',
    schema: { phone: 'string (required)', message: 'string (required)', session: 'string (optional)' },
    category: 'whatsapp', requiresApproval: false,
    async execute(p) {
      if (!p.phone || !p.message) return { success: false, error: 'phone and message required' };
      if (process.env.WHATSAPP_CLOUD_DRY_RUN !== 'false') return { success: true, dryRun: true, phone: p.phone, preview: p.message.slice(0, 100) };
      try {
        const axios = require('axios');
        const r = await axios.post('http://localhost:' + (process.env.PORT||3001) + '/api/whatsapp/send', p);
        return { success: true, messageId: r.data.messageId, phone: p.phone };
      } catch(e) { return { success: false, error: e.message }; }
    }
  },
  'whatsapp.broadcast': {
    name: 'whatsapp.broadcast', description: 'Broadcast message to all customers or a segment',
    schema: { message: 'string (required)', segment: 'string (all|vip|silver|gold)' },
    category: 'whatsapp', requiresApproval: true,
    async execute(p) { return { success: true, dryRun: true, segment: p.segment||'all', preview: (p.message||'').slice(0, 100), note: 'Queued for approval' }; }
  },
  'db.getCustomer': {
    name: 'db.getCustomer', description: 'Fetch customer info from database by phone',
    schema: { phone: 'string (required)' }, category: 'database', requiresApproval: false,
    async execute(p) {
      try {
        const prisma = require('../services/prisma');
        const c = await prisma.customer.findUnique({ where: { phone: String(p.phone||'') } });
        return c ? { success: true, customer: c } : { success: false, error: 'Customer not found' };
      } catch(e) { return { success: false, error: e.message }; }
    }
  },
  'db.getRates': {
    name: 'db.getRates', description: 'Get latest AI tool rates from database',
    schema: { tool: 'string (optional)' }, category: 'database', requiresApproval: false,
    async execute(p) {
      try {
        const prisma = require('../services/prisma');
        const where = p.tool ? { tool: { contains: p.tool } } : {};
        const rates = await prisma.rateSnapshot.findMany({ where, orderBy: { createdAt: 'desc' }, take: 10 });
        return { success: true, rates };
      } catch(e) { return { success: false, error: e.message }; }
    }
  },
  'db.getStock': {
    name: 'db.getStock', description: 'Check stock availability for AI tools',
    schema: { tool: 'string (optional)' }, category: 'database', requiresApproval: false,
    async execute(p) {
      try {
        const prisma = require('../services/prisma');
        const where = { delivered: false };
        if (p.tool) where.tool = { contains: p.tool };
        const stock = await prisma.stockItem.findMany({ where, take: 20 });
        const grouped = {};
        stock.forEach(function(s) { grouped[s.tool] = (grouped[s.tool]||0)+1; });
        return { success: true, available: grouped, totalItems: stock.length };
      } catch(e) { return { success: false, error: e.message }; }
    }
  },
  'analytics.salesSummary': {
    name: 'analytics.salesSummary', description: 'Get sales summary for a time period',
    schema: { period: 'string (today|week|month)' }, category: 'analytics', requiresApproval: false,
    async execute(p) {
      try {
        const prisma = require('../services/prisma');
        const period = p.period || 'today';
        const from = period === 'today' ? new Date(new Date().setHours(0,0,0,0)) : period === 'week' ? new Date(Date.now()-7*86400000) : new Date(Date.now()-30*86400000);
        const sales = await prisma.saleRecord.findMany({ where: { createdAt: { gte: from } } }).catch(function() { return []; });
        const total = sales.reduce(function(s,x) { return s+(x.amount||0); }, 0);
        return { success: true, period, count: sales.length, totalRevenue: total, avgOrder: sales.length ? Math.round(total/sales.length) : 0 };
      } catch(e) { return { success: false, error: e.message }; }
    }
  },
  'invoice.create': {
    name: 'invoice.create', description: 'Create an invoice for a customer order',
    schema: { customerPhone: 'string', customerName: 'string', items: 'array', paid: 'boolean' },
    category: 'billing', requiresApproval: false,
    async execute(p) {
      try {
        const { v4: uuid } = require('uuid');
        const f = path.join(DATA, 'invoices.json');
        let data = []; try { data = JSON.parse(fs.readFileSync(f, 'utf8')); } catch(e) {}
        const total = (p.items||[]).reduce(function(s,i) { return s+(i.price||0)*(i.qty||1); }, 0);
        const inv = { id: uuid(), number: 'INV-'+Date.now().toString(36).toUpperCase(), date: new Date().toLocaleDateString('en-PK'), createdAt: new Date().toISOString(), ...p, total };
        data.unshift(inv); fs.writeFileSync(f, JSON.stringify(data.slice(0,2000), null, 2));
        return { success: true, invoice: inv };
      } catch(e) { return { success: false, error: e.message }; }
    }
  },
  'kb.search': {
    name: 'kb.search', description: 'Search the business knowledge base for FAQs, policies, tool info',
    schema: { query: 'string (required)' }, category: 'knowledge', requiresApproval: false,
    async execute(p) {
      try {
        const kb = JSON.parse(fs.readFileSync(path.join(DATA, 'knowledge_base.json'), 'utf8'));
        const q = (p.query||'').toLowerCase(); const results = [];
        (kb.faqs||[]).forEach(function(f) { if(f.q.toLowerCase().includes(q)||f.a.toLowerCase().includes(q)) results.push({ type:'faq', ...f }); });
        (kb.tools||[]).forEach(function(t) { if(t.name.toLowerCase().includes(q)) results.push({ type:'tool', ...t }); });
        return { success: true, query: p.query, results };
      } catch(e) { return { success: false, error: e.message }; }
    }
  },
  'web.search': {
    name: 'web.search', description: 'Search the web via Tavily for current AI tool prices or news',
    schema: { query: 'string (required)', maxResults: 'number (default 3)' }, category: 'search', requiresApproval: false,
    async execute(p) {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) return { success: false, error: 'TAVILY_API_KEY not configured', dryRun: true };
      try {
        const axios = require('axios');
        const r = await axios.post('https://api.tavily.com/search', { query: p.query, search_depth: 'basic', max_results: p.maxResults||3 }, { headers: { Authorization: 'Bearer ' + apiKey }, timeout: 8000 });
        return { success: true, query: p.query, results: r.data.results||[] };
      } catch(e) { return { success: false, error: e.message }; }
    }
  },
  'notify.admin': {
    name: 'notify.admin', description: 'Send notification to admin via WhatsApp',
    schema: { message: 'string (required)', priority: 'string (low|normal|high)' }, category: 'notification', requiresApproval: false,
    async execute(p) {
      const adminPhone = process.env.ADMIN_NUMBER;
      if (!adminPhone) return { success: false, error: 'ADMIN_NUMBER not configured' };
      const prefix = p.priority === 'high' ? 'URGENT: ' : p.priority === 'low' ? 'INFO: ' : 'ALERT: ';
      return { success: true, dryRun: true, to: adminPhone, preview: prefix + (p.message||'').slice(0, 100) };
    }
  },
  'schedule.message': {
    name: 'schedule.message', description: 'Schedule a WhatsApp message for a future time',
    schema: { phone: 'string', message: 'string', scheduledAt: 'string (ISO datetime)' }, category: 'scheduling', requiresApproval: false,
    async execute(p) {
      try {
        const { v4: uuid } = require('uuid');
        const f = path.join(DATA, 'scheduled_messages.json');
        let data = []; try { data = JSON.parse(fs.readFileSync(f, 'utf8')); } catch(e) {}
        const item = { id: uuid(), ...p, status: 'pending', createdAt: new Date().toISOString(), createdBy: 'agent' };
        data.unshift(item); fs.writeFileSync(f, JSON.stringify(data, null, 2));
        return { success: true, scheduled: item };
      } catch(e) { return { success: false, error: e.message }; }
    }
  },
  'db.createRenewal': {
    name: 'db.createRenewal', description: 'Track a subscription renewal date for a customer',
    schema: { customerPhone: 'string', tool: 'string', expiryDate: 'string (ISO date)' }, category: 'database', requiresApproval: false,
    async execute(p) {
      try {
        const { v4: uuid } = require('uuid');
        const f = path.join(DATA, 'renewals.json');
        let data = []; try { data = JSON.parse(fs.readFileSync(f, 'utf8')); } catch(e) {}
        const r = { id: uuid(), ...p, createdAt: new Date().toISOString(), reminders: [], renewed: false };
        data.unshift(r); fs.writeFileSync(f, JSON.stringify(data, null, 2));
        return { success: true, renewal: r };
      } catch(e) { return { success: false, error: e.message }; }
    }
  },
};

function listTools(category) {
  const tools = Object.values(TOOLS);
  return category ? tools.filter(function(t) { return t.category === category; }) : tools;
}

async function executeTool(toolName, params, context) {
  const tool = TOOLS[toolName];
  if (!tool) return { success: false, error: 'Unknown tool: ' + toolName };
  try {
    const result = await tool.execute(params || {}, context || {});
    return Object.assign({ tool: toolName, executedAt: new Date().toISOString() }, result);
  } catch(e) { return { success: false, error: e.message, tool: toolName }; }
}

module.exports = { TOOLS, listTools, executeTool };