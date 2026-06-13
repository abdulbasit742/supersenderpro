#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const API_BASE = (process.env.SUPERSENDER_API_BASE || process.env.MCP_API_BASE || 'http://localhost:3001').replace(/\/+$/, '');
const API_KEY = process.env.SUPERSENDER_MCP_API_KEY || process.env.MCP_API_KEY || '';
const MAX_ROWS = 50;

let inputBuffer = '';
let pendingMessages = 0;
let stdinEnded = false;
let shutdownTimer = null;

function send(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function result(id, value) {
  send({ jsonrpc: '2.0', id, result: value });
}

function error(id, code, message, data) {
  send({ jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } });
}

function textContent(text) {
  return { content: [{ type: 'text', text: typeof text === 'string' ? text : JSON.stringify(text, null, 2) }] };
}

function jsonText(value) {
  return textContent(JSON.stringify(value, null, 2));
}

function maybeShutdown() {
  if (!stdinEnded || pendingMessages > 0 || shutdownTimer) return;
  shutdownTimer = setTimeout(() => {
    process.exitCode = 0;
    process.exit(0);
  }, 250);
}

async function api(method, route, body) {
  const headers = { 'content-type': 'application/json' };
  if (API_KEY) headers.authorization = `Bearer ${API_KEY}`;
  const res = await fetch(`${API_BASE}${route}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(`${method} ${route} failed: ${msg}`);
  }
  return data;
}

function readJsonFile(name) {
  const safe = path.basename(name);
  const file = path.join(DATA_DIR, safe.endsWith('.json') ? safe : `${safe}.json`);
  if (!file.startsWith(DATA_DIR)) throw new Error('Invalid data file');
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8') || '[]');
}

function truncateRows(rows, limit = MAX_ROWS) {
  return Array.isArray(rows) ? rows.slice(0, Math.max(1, Math.min(Number(limit) || MAX_ROWS, 200))) : rows;
}

function normalizeSearchText(value) {
  return JSON.stringify(value || '').toLowerCase();
}

const tools = [
  {
    name: 'supersender_health',
    description: 'Check SuperSender server health, database status, and WhatsApp summary.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'whatsapp_status',
    description: 'Get current WhatsApp connection status.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'dashboard_summary',
    description: 'Get revenue, orders, WhatsApp, and business KPI summary.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'list_customers',
    description: 'List CRM customers from SuperSender.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum rows to return.' },
        search: { type: 'string', description: 'Optional name/number/tag search.' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'list_orders',
    description: 'List orders from SuperSender.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        status: { type: 'string', description: 'Optional order status filter.' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'list_plans',
    description: 'List AI tools plans/catalog pricing.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'list_inbox',
    description: 'List latest unified inbox messages.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        source: { type: 'string', description: 'Optional source like whatsapp, facebook, instagram.' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'send_whatsapp_message',
    description: 'Send a WhatsApp message through SuperSender. Requires WhatsApp to be connected.',
    inputSchema: {
      type: 'object',
      required: ['number', 'message'],
      properties: {
        number: { type: 'string', description: 'Recipient WhatsApp number with country code.' },
        message: { type: 'string', description: 'Message body.' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'reply_inbox',
    description: 'Reply to a customer via the unified inbox reply endpoint.',
    inputSchema: {
      type: 'object',
      required: ['number', 'message'],
      properties: {
        number: { type: 'string' },
        message: { type: 'string' },
        source: { type: 'string', description: 'Default whatsapp.' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'create_broadcast',
    description: 'Create/send a broadcast using SuperSender broadcast endpoint.',
    inputSchema: {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string' },
        targets: { type: 'array', items: { type: 'string' }, description: 'Optional target numbers/groups.' }
      },
      additionalProperties: true
    }
  },
  {
    name: 'list_social_accounts',
    description: 'List connected Facebook, Instagram, LinkedIn, TikTok/social accounts.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'publish_social_post',
    description: 'Publish a text/media post through the configured Social Hub account.',
    inputSchema: {
      type: 'object',
      required: ['platform', 'message'],
      properties: {
        platform: { type: 'string', description: 'facebook, instagram, linkedin, tiktok.' },
        message: { type: 'string' },
        imageUrl: { type: 'string' },
        videoUrl: { type: 'string' },
        accountId: { type: 'string' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'create_action_draft',
    description: 'Create a safe approval-queue draft for WhatsApp, broadcast, or social posting. Does not send anything.',
    inputSchema: {
      type: 'object',
      required: ['type', 'payload'],
      properties: {
        type: { type: 'string', description: 'whatsapp_message, broadcast, or social_post.' },
        title: { type: 'string' },
        payload: { type: 'object', additionalProperties: true }
      },
      additionalProperties: false
    }
  },
  {
    name: 'list_action_drafts',
    description: 'List action drafts waiting for local review.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'pending, approved, executed, rejected, failed, or all.' },
        type: { type: 'string' },
        limit: { type: 'number' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'reject_action_draft',
    description: 'Reject a pending action draft without sending anything.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
        reason: { type: 'string' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'approve_action_draft',
    description: 'Approve and execute a draft through SuperSender. Server must have MCP_ALLOW_ACTIONS=1.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'search_business_data',
    description: 'Search local JSON business data such as customers, orders, inbox, alerts, social posts.',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string' },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional JSON files. Defaults to customers, orders, inbox, alerts, social_posts.'
        },
        limit: { type: 'number' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'read_data_file',
    description: 'Read a safe JSON data file from the project data folder.',
    inputSchema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', description: 'Example: customers.json, orders.json, inbox.json.' },
        limit: { type: 'number' }
      },
      additionalProperties: false
    }
  }
];

async function callTool(name, args = {}) {
  switch (name) {
    case 'supersender_health':
      return jsonText(await api('GET', '/api/health'));
    case 'whatsapp_status':
      return jsonText(await api('GET', '/api/wa/status'));
    case 'dashboard_summary':
      return jsonText(await api('GET', '/api/dashboard/summary'));
    case 'list_customers': {
      let rows = await api('GET', '/api/customers');
      if (args.search) {
        const q = String(args.search).toLowerCase();
        rows = rows.filter(row => normalizeSearchText(row).includes(q));
      }
      return jsonText(truncateRows(rows, args.limit));
    }
    case 'list_orders': {
      let rows = await api('GET', '/api/orders');
      if (args.status) {
        const q = String(args.status).toLowerCase();
        rows = rows.filter(row => String(row.status || '').toLowerCase() === q);
      }
      return jsonText(truncateRows(rows, args.limit));
    }
    case 'list_plans':
      return jsonText(await api('GET', '/api/plans'));
    case 'list_inbox': {
      let rows = await api('GET', '/api/inbox');
      if (args.source) rows = rows.filter(row => String(row.source || '').toLowerCase() === String(args.source).toLowerCase());
      return jsonText(truncateRows(rows, args.limit));
    }
    case 'send_whatsapp_message':
      return jsonText(await api('POST', '/api/wa/send', { number: args.number, message: args.message }));
    case 'reply_inbox':
      return jsonText(await api('POST', '/api/inbox/reply', { number: args.number, message: args.message, source: args.source || 'whatsapp' }));
    case 'create_broadcast':
      return jsonText(await api('POST', '/api/broadcast', args));
    case 'list_social_accounts':
      return jsonText(await api('GET', '/api/social/accounts'));
    case 'publish_social_post':
      return jsonText(await api('POST', '/api/social/publish', args));
    case 'create_action_draft':
      return jsonText(await api('POST', '/api/mcp/action-drafts', args));
    case 'list_action_drafts': {
      const params = new URLSearchParams();
      if (args.status) params.set('status', args.status);
      if (args.type) params.set('type', args.type);
      if (args.limit) params.set('limit', String(args.limit));
      const suffix = params.toString() ? `?${params.toString()}` : '';
      return jsonText(await api('GET', `/api/mcp/action-drafts${suffix}`));
    }
    case 'reject_action_draft':
      return jsonText(await api('POST', `/api/mcp/action-drafts/${encodeURIComponent(args.id)}/reject`, { reason: args.reason || 'Rejected from MCP' }));
    case 'approve_action_draft':
      return jsonText(await api('POST', `/api/mcp/action-drafts/${encodeURIComponent(args.id)}/approve`, {}));
    case 'search_business_data': {
      const files = Array.isArray(args.files) && args.files.length
        ? args.files
        : ['customers.json', 'orders.json', 'inbox.json', 'alerts.json', 'social_posts.json'];
      const q = String(args.query || '').toLowerCase();
      const matches = [];
      for (const file of files) {
        const rows = readJsonFile(file);
        const list = Array.isArray(rows) ? rows : [rows];
        for (const row of list) {
          if (normalizeSearchText(row).includes(q)) matches.push({ file: path.basename(file), row });
          if (matches.length >= (Number(args.limit) || MAX_ROWS)) break;
        }
        if (matches.length >= (Number(args.limit) || MAX_ROWS)) break;
      }
      return jsonText(matches);
    }
    case 'read_data_file':
      return jsonText(truncateRows(readJsonFile(args.file), args.limit));
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function handleMessage(message) {
  pendingMessages++;
  const { id, method, params = {} } = message;
  try {
    if (method === 'initialize') {
      return result(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: 'supersender-pro-mcp', version: '1.0.0' }
      });
    }
    if (method === 'notifications/initialized') return;
    if (method === 'tools/list') return result(id, { tools });
    if (method === 'tools/call') {
      const output = await callTool(params.name, params.arguments || {});
      return result(id, output);
    }
    if (method === 'resources/list') {
      return result(id, {
        resources: [
          { uri: 'supersender://data/customers', name: 'Customers', mimeType: 'application/json' },
          { uri: 'supersender://data/orders', name: 'Orders', mimeType: 'application/json' },
          { uri: 'supersender://data/inbox', name: 'Inbox', mimeType: 'application/json' },
          { uri: 'supersender://data/settings', name: 'Settings', mimeType: 'application/json' }
        ]
      });
    }
    if (method === 'resources/read') {
      const map = {
        'supersender://data/customers': 'customers.json',
        'supersender://data/orders': 'orders.json',
        'supersender://data/inbox': 'inbox.json',
        'supersender://data/settings': 'settings.json'
      };
      const file = map[params.uri];
      if (!file) throw new Error(`Unknown resource: ${params.uri}`);
      return result(id, {
        contents: [{ uri: params.uri, mimeType: 'application/json', text: JSON.stringify(readJsonFile(file), null, 2) }]
      });
    }
    return error(id, -32601, `Unsupported method: ${method}`);
  } catch (err) {
    return error(id, -32000, err.message || 'MCP tool failed');
  } finally {
    pendingMessages--;
    maybeShutdown();
  }
}

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  inputBuffer += chunk;
  let index;
  while ((index = inputBuffer.indexOf('\n')) >= 0) {
    const line = inputBuffer.slice(0, index).trim();
    inputBuffer = inputBuffer.slice(index + 1);
    if (!line) continue;
    try {
      handleMessage(JSON.parse(line));
    } catch (err) {
      error(null, -32700, 'Invalid JSON', err.message);
    }
  }
});

process.stdin.on('end', () => {
  stdinEnded = true;
  maybeShutdown();
});
