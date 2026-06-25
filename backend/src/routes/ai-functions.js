const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const fs = require('fs'), path = require('path');

const FILE = path.join(__dirname, '../../../data/ai_functions_config.json');
const LOG_FILE = path.join(__dirname, '../../../data/ai_functions_log.json');

function loadCfg() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch(e) { return { enabled: true, autoCallFunctions: true }; }
}
function saveLog(entries) {
  try { fs.writeFileSync(LOG_FILE, JSON.stringify(entries.slice(0, 200), null, 2)); } catch(e) {}
}
function loadLog() { try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch(e) { return []; } }

// Built-in AI functions inspired by wassengerhq RAG pattern
const BUILTIN_FUNCTIONS = [
  {
    id: 'get_tool_pricing',
    name: 'get_tool_pricing',
    description: 'Get current pricing for AI tools (ChatGPT, Claude, Cursor, Gemini, etc)',
    parameters: { type: 'object', properties: { tool: { type: 'string', description: 'Tool name e.g. ChatGPT Plus, Claude Pro' } } },
    builtIn: true,
    handler: async (params, prisma) => {
      try {
        const rates = await prisma.rateSnapshot.findFirst({ orderBy: { createdAt: 'desc' }, where: params.tool ? { tool: { contains: params.tool } } : {} });
        if (!rates) return 'Current pricing not available. Please contact admin for latest rates.';
        return 'Tool: ' + rates.tool + ' | Price: Rs ' + rates.sellPrice + ' | Type: ' + rates.planType;
      } catch(e) { return 'ChatGPT Plus: Rs 1,800 | Claude Pro: Rs 1,900 | Cursor Pro: Rs 2,100 (approximate rates)'; }
    }
  },
  {
    id: 'check_stock_availability',
    name: 'check_stock_availability',
    description: 'Check if a specific AI tool is in stock and available',
    parameters: { type: 'object', properties: { tool: { type: 'string', description: 'AI tool name' } } },
    builtIn: true,
    handler: async (params, prisma) => {
      try {
        const stock = await prisma.stockItem.findFirst({ where: { tool: { contains: params.tool || '' }, delivered: false } });
        if (stock) return params.tool + ' is AVAILABLE in stock. Ready for immediate delivery.';
        return params.tool + ' is currently OUT OF STOCK. We are sourcing it - please check back in 30 minutes.';
      } catch(e) { return 'Stock check temporarily unavailable. Please contact admin on WhatsApp directly.'; }
    }
  },
  {
    id: 'get_payment_info',
    name: 'get_payment_info',
    description: 'Get payment methods and account numbers for JazzCash, EasyPaisa, bank transfer',
    parameters: { type: 'object', properties: {} },
    builtIn: true,
    handler: async (params) => {
      const jc = process.env.JAZZCASH_NUMBER || 'Contact admin';
      const ep = process.env.EASYPAISA_NUMBER || 'Contact admin';
      const bank = process.env.BANK_ACCOUNT || 'Contact admin';
      return ['Payment Methods:', '  JazzCash: '+jc, '  EasyPaisa: '+ep, '  Bank Transfer: '+bank, '', 'After payment, send screenshot or TXN ID to confirm.'].join(String.fromCharCode(10));
    }
  },
  {
    id: 'get_customer_info',
    name: 'get_customer_info',
    description: 'Get customer information, order history and tier based on phone number',
    parameters: { type: 'object', properties: { phone: { type: 'string', description: 'Customer phone number' } } },
    builtIn: true,
    handler: async (params, prisma) => {
      try {
        const customer = await prisma.customer.findUnique({ where: { phone: params.phone || '' } });
        if (!customer) return 'New customer - no previous orders found.';
        return 'Customer: ' + customer.name + ' | Tier: ' + (customer.tier || 'Bronze') + ' | Member since: ' + new Date(customer.createdAt).toLocaleDateString('en-PK');
      } catch(e) { return 'Customer lookup unavailable.'; }
    }
  },
  {
    id: 'get_current_datetime',
    name: 'get_current_datetime',
    description: 'Get the current date and time in Pakistan Standard Time',
    parameters: { type: 'object', properties: {} },
    builtIn: true,
    handler: async () => new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'short' })
  },
  {
    id: 'get_business_hours',
    name: 'get_business_hours',
    description: 'Check if the business is currently open and get business hours',
    parameters: { type: 'object', properties: {} },
    builtIn: true,
    handler: async () => {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
      const hour = now.getHours();
      const day = now.getDay();
      const isOpen = day >= 0 && day <= 6 && hour >= 9 && hour < 23;
      return ['Business Hours: 9 AM - 11 PM (Pakistan Time) - 7 days a week', 'Current Status: ' + (isOpen ? 'OPEN' : 'CLOSED - We will reply when we open')].join(String.fromCharCode(10));
    }
  }
];

// GET /api/ai-functions — list all built-in and custom functions
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json({ builtIn: BUILTIN_FUNCTIONS.map(f => ({ id: f.id, name: f.name, description: f.description, parameters: f.parameters })), total: BUILTIN_FUNCTIONS.length });
}));

// POST /api/ai-functions/execute — execute a function (for testing)
router.post('/execute', requireAuth, asyncHandler(async (req, res) => {
  const { functionName, parameters = {} } = req.body || {};
  if (!functionName) return res.status(400).json({ error: 'functionName required' });
  const fn = BUILTIN_FUNCTIONS.find(f => f.name === functionName);
  if (!fn) return res.status(404).json({ error: 'Function not found: ' + functionName });
  let prisma = null;
  try { prisma = require('../services/prisma'); } catch(e) {}
  const started = Date.now();
  try {
    const result = await fn.handler(parameters, prisma);
    const entry = { ts: new Date().toISOString(), fn: functionName, params: parameters, result, ms: Date.now() - started };
    const log = loadLog(); log.unshift(entry); saveLog(log);
    res.json({ function: functionName, result, executionMs: entry.ms });
  } catch(err) {
    res.status(500).json({ error: 'Function execution failed: ' + err.message });
  }
}));

// POST /api/ai-functions/smart-reply — AI reply WITH function calling (RAG)
router.post('/smart-reply', requireAuth, asyncHandler(async (req, res) => {
  const { message, customerPhone, history = [] } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message required' });
  const cfgFile = path.join(__dirname, '../../../data/ai_reply_config.json');
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8')); } catch(e) {}
  if (!cfg.apiKey || cfg.dryRun) {
    return res.json({ reply: '[DRY RUN] Smart AI reply with function calling. Configure AI Reply API key and set dryRun:false to enable.', functionsUsed: [], dryRun: true });
  }
  try {
    const axios = require('axios');
    const tools = BUILTIN_FUNCTIONS.map(f => ({ type: 'function', function: { name: f.name, description: f.description, parameters: f.parameters } }));
    const messages = [
      { role: 'system', content: (cfg.systemPrompt || 'You are a helpful AI tools store assistant.') + ' Use the available tools/functions to get real-time pricing, stock, and business information when needed.' },
      ...history.slice(-10),
      { role: 'user', content: message }
    ];
    let prisma = null;
    try { prisma = require('../services/prisma'); } catch(e) {}
    // First call with function tools
    const r1 = await axios.post('https://api.openai.com/v1/chat/completions', { model: cfg.model || 'gpt-4o-mini', messages, tools, tool_choice: 'auto', max_tokens: 500 }, { headers: { Authorization: 'Bearer ' + cfg.apiKey } });
    const msg1 = r1.data.choices[0].message;
    const functionsUsed = [];
    if (msg1.tool_calls && msg1.tool_calls.length > 0) {
      const toolMessages = [msg1];
      for (const tc of msg1.tool_calls) {
        const fn = BUILTIN_FUNCTIONS.find(f => f.name === tc.function.name);
        let result = 'Function not found';
        if (fn) {
          try {
            const params = JSON.parse(tc.function.arguments || '{}');
            if (customerPhone && !params.phone) params.phone = customerPhone;
            result = await fn.handler(params, prisma);
            functionsUsed.push({ name: tc.function.name, params });
          } catch(e) { result = 'Error: ' + e.message; }
        }
        toolMessages.push({ role: 'tool', tool_call_id: tc.id, content: String(result) });
      }
      const r2 = await axios.post('https://api.openai.com/v1/chat/completions', { model: cfg.model || 'gpt-4o-mini', messages: [...messages, ...toolMessages], max_tokens: 500 }, { headers: { Authorization: 'Bearer ' + cfg.apiKey } });
      const reply = r2.data.choices[0].message.content;
      const log = loadLog(); log.unshift({ ts: new Date().toISOString(), message, reply, functionsUsed, tokensUsed: r2.data.usage.total_tokens }); saveLog(log);
      return res.json({ reply, functionsUsed, tokensUsed: r2.data.usage.total_tokens, dryRun: false });
    }
    const reply = msg1.content;
    const log = loadLog(); log.unshift({ ts: new Date().toISOString(), message, reply, functionsUsed: [], tokensUsed: r1.data.usage.total_tokens }); saveLog(log);
    res.json({ reply, functionsUsed: [], tokensUsed: r1.data.usage.total_tokens, dryRun: false });
  } catch(err) {
    const msg = err.response && err.response.data && err.response.data.error && err.response.data.error.message || err.message;
    res.status(502).json({ error: 'AI error: ' + msg });
  }
}));

// GET /api/ai-functions/log — execution log
router.get('/log', requireAuth, asyncHandler(async (req, res) => {
  res.json(loadLog().slice(0, Number(req.query.limit || 50)));
}));

module.exports = router;
