const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = Number(process.env.GPT_CONNECTOR_PORT || 3002);
const BASE_URL = String(process.env.SUPERSENDER_API_BASE || process.env.SUPERSENDER_URL || 'http://localhost:3001').replace(/\/+$/, '');
const PUBLIC_BASE_URL = String(process.env.GPT_CONNECTOR_PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');
const CONNECTOR_TOKEN = String(process.env.GPT_CONNECTOR_API_KEY || process.env.GPT_CONNECTOR_BEARER_TOKEN || '').trim();
const BACKEND_API_KEY = String(process.env.SUPERSENDER_API_KEY || '').trim();
const ACTIONS_ENABLED = /^(1|true|yes)$/i.test(String(process.env.GPT_CONNECTOR_ALLOW_DIRECT_ACTIONS || ''));

app.use(express.json({ limit: '2mb' }));

function mask(value = '') {
  const text = String(value || '');
  if (!text) return '';
  if (text.length <= 8) return `${text.slice(0, 2)}***`;
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

function requestId() {
  return crypto.randomBytes(8).toString('hex');
}

function isLocalRequest(req) {
  const ip = String(req.ip || req.socket?.remoteAddress || '');
  return ip.includes('127.0.0.1') || ip.includes('::1') || ip.includes('localhost');
}

function safeTokenEquals(a = '', b = '') {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function requireAuth(req, res, next) {
  if (!CONNECTOR_TOKEN && isLocalRequest(req)) return next();
  const header = String(req.headers.authorization || '');
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!CONNECTOR_TOKEN) {
    return res.status(401).json({
      success: false,
      error: 'GPT connector token is not configured. Set GPT_CONNECTOR_API_KEY.'
    });
  }
  if (!safeTokenEquals(token, CONNECTOR_TOKEN)) {
    return res.status(401).json({ success: false, error: 'Invalid bearer token' });
  }
  return next();
}

async function backend(method, path, body = null, query = null) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (BACKEND_API_KEY) headers['x-api-key'] = BACKEND_API_KEY;
  const response = await axios({
    method,
    url,
    headers,
    params: query || undefined,
    data: body || undefined,
    timeout: Number(process.env.GPT_CONNECTOR_BACKEND_TIMEOUT_MS || 12000),
    validateStatus: () => true
  });
  if (response.status >= 400) {
    const detail = response.data?.error || response.data?.message || `Backend HTTP ${response.status}`;
    const error = new Error(detail);
    error.status = response.status;
    error.response = response.data;
    throw error;
  }
  return response.data;
}

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value;
}

function requireString(value, name, max = 5000) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${name} is required`);
  if (text.length > max) throw new Error(`${name} is too long`);
  return text;
}

function optionalNumber(value, fallback, min = 1, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function normalizePhone(value = '') {
  return String(value || '').replace(/[^\d]/g, '');
}

function validateActionRequest(body = {}) {
  const payload = requireObject(body, 'request body');
  const action = requireString(payload.action, 'action', 80).toLowerCase();
  const args = payload.args === undefined ? {} : requireObject(payload.args, 'args');
  return { action, args };
}

async function createActionDraft(type, title, payload) {
  return backend('POST', '/api/mcp/action-drafts', { type, title, payload });
}

async function handleAction(action, args) {
  switch (action) {
    case 'health':
      return backend('GET', '/api/health');
    case 'completion_report':
      return backend('GET', '/api/project/completion-report');
    case 'setup_validator':
      return backend('GET', '/api/system/setup-validator');
    case 'whatsapp_status':
      return backend('GET', '/api/health');
    case 'dashboard_summary':
      return backend('GET', '/api/dashboard/summary');
    case 'list_plans':
      return backend('GET', '/api/plans');
    case 'list_customers':
      return backend('GET', '/api/customers', null, { limit: optionalNumber(args.limit, 20, 1, 100) });
    case 'list_orders':
      return backend('GET', '/api/orders', null, { limit: optionalNumber(args.limit, 20, 1, 100) });
    case 'list_inbox':
      return backend('GET', '/api/inbox', null, { limit: optionalNumber(args.limit, 20, 1, 100) });
    case 'list_social_accounts':
      return backend('GET', '/api/social/accounts');
    case 'list_action_drafts':
      return backend('GET', '/api/mcp/action-drafts', null, { limit: optionalNumber(args.limit, 20, 1, 100) });
    case 'create_action_draft': {
      const type = requireString(args.type, 'type', 80);
      const title = requireString(args.title || type, 'title', 200);
      const payload = requireObject(args.payload, 'payload');
      return createActionDraft(type, title, payload);
    }
    case 'send_whatsapp_message': {
      const number = normalizePhone(requireString(args.number || args.phone, 'number', 32));
      const message = requireString(args.message, 'message', 4000);
      if (!/^92\d{10}$/.test(number)) throw new Error('number must be Pakistan format, e.g. 923001234567');
      if (ACTIONS_ENABLED && args.direct === true) {
        return backend('POST', '/api/wa/send-official', { number, message, provider: args.provider || 'auto' });
      }
      return createActionDraft('whatsapp_message', `WhatsApp message to ${number}`, { number, message });
    }
    case 'publish_social_post': {
      const platform = requireString(args.platform, 'platform', 40).toLowerCase();
      const message = requireString(args.message, 'message', 5000);
      const payload = { platform, message, imageUrl: args.imageUrl || args.image_url || '', videoUrl: args.videoUrl || args.video_url || '' };
      if (ACTIONS_ENABLED && args.direct === true) {
        return backend('POST', '/api/social/publish', payload);
      }
      return createActionDraft('social_post', `Social post for ${platform}`, payload);
    }
    case 'search_business_data':
      return backend('GET', '/api/search', null, { q: requireString(args.query || args.q, 'query', 200), limit: optionalNumber(args.limit, 20, 1, 50) });
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

function openApiSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'SuperSender Pro ChatGPT Connector',
      version: '1.0.0',
      description: 'Action server for Custom GPTs to inspect SuperSender Pro and create safe action drafts.'
    },
    servers: [{ url: PUBLIC_BASE_URL }],
    paths: {
      '/health': {
        get: {
          operationId: 'health',
          summary: 'Check connector health',
          responses: { '200': { description: 'Connector health' } }
        }
      },
      '/openapi.json': {
        get: {
          operationId: 'openapi',
          summary: 'Get OpenAPI schema',
          responses: { '200': { description: 'OpenAPI schema' } }
        }
      },
      '/api/gpt/action': {
        post: {
          operationId: 'runSuperSenderAction',
          summary: 'Run a SuperSender Pro action',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ActionRequest' },
                examples: {
                  completion: { value: { action: 'completion_report', args: {} } },
                  draftWhatsApp: { value: { action: 'send_whatsapp_message', args: { number: '923001234567', message: 'Salam, your order is ready.' } } }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Action result', content: { 'application/json': { schema: { $ref: '#/components/schemas/ActionResponse' } } } },
            '400': { description: 'Bad request' },
            '401': { description: 'Unauthorized' }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer' }
      },
      schemas: {
        ActionRequest: {
          type: 'object',
          required: ['action'],
          properties: {
            action: {
              type: 'string',
              enum: [
                'health',
                'completion_report',
                'setup_validator',
                'whatsapp_status',
                'dashboard_summary',
                'list_plans',
                'list_customers',
                'list_orders',
                'list_inbox',
                'list_social_accounts',
                'list_action_drafts',
                'create_action_draft',
                'send_whatsapp_message',
                'publish_social_post',
                'search_business_data'
              ]
            },
            args: { type: 'object', additionalProperties: true }
          }
        },
        ActionResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            action: { type: 'string' },
            requestId: { type: 'string' },
            result: { type: 'object', additionalProperties: true },
            error: { type: 'string' }
          }
        }
      }
    }
  };
}

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    name: 'SuperSender Pro ChatGPT Connector',
    baseUrl: BASE_URL,
    publicBaseUrl: PUBLIC_BASE_URL,
    authConfigured: !!CONNECTOR_TOKEN,
    backendApiKeyConfigured: !!BACKEND_API_KEY,
    directActionsEnabled: ACTIONS_ENABLED,
    tokenMasked: mask(CONNECTOR_TOKEN),
    time: new Date().toISOString()
  });
});

app.get('/', (_req, res) => {
  res.json({
    success: true,
    name: 'SuperSender Pro ChatGPT Connector',
    health: '/health',
    openapi: '/openapi.json',
    action: '/api/gpt/action'
  });
});

app.get('/openapi.json', (_req, res) => res.json(openApiSpec()));

app.post('/api/gpt/action', requireAuth, async (req, res) => {
  const id = requestId();
  try {
    const { action, args } = validateActionRequest(req.body || {});
    const result = await handleAction(action, args);
    res.json({ success: true, action, requestId: id, result });
  } catch (error) {
    const status = error.status && Number(error.status) >= 400 ? Number(error.status) : 400;
    res.status(status).json({
      success: false,
      requestId: id,
      error: error.message,
      backend: error.response || undefined
    });
  }
});

app.listen(PORT, () => {
  console.log(`[GPT Connector] listening on ${PUBLIC_BASE_URL} -> ${BASE_URL}`);
});
