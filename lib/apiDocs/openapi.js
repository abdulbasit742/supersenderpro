'use strict';
/**
 * lib/apiDocs/openapi.js - builds an OpenAPI 3.1 description of the SaaS API surface.
 * Hand-curated (not auto-introspected) so it stays accurate and readable for integrators.
 * Served as JSON + Swagger UI by routes/docsRoutes.js.
 */
const json = (props, required) => ({ type: 'object', properties: props, required: required || [] });
const str = { type: 'string' };
const num = { type: 'number' };

function build() {
  const okEnvelope = { type: 'object', properties: { success: { type: 'boolean' } } };
  return {
    openapi: '3.1.0',
    info: { title: 'SuperSender Pro API', version: '1.0.0', description: 'Multi-tenant WhatsApp SaaS API. Human auth via JWT (Bearer); machine auth via x-api-key.' },
    servers: [{ url: process.env.APP_URL || 'http://localhost:3000' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        apiKey: { type: 'apiKey', in: 'header', name: 'x-api-key' },
        tenantHeader: { type: 'apiKey', in: 'header', name: 'x-tenant-id' },
      },
      schemas: {
        Error: json({ success: { type: 'boolean' }, error: str }),
        Signup: json({ email: str, password: str, name: str }, ['email', 'password']),
        Login: json({ email: str, password: str }, ['email', 'password']),
        Deal: json({ title: str, value: num, stage: { type: 'string', enum: ['NEW_LEAD', 'QUALIFIED', 'NEGOTIATION', 'PROPOSAL_SENT', 'WON', 'LOST'] } }),
      },
    },
    paths: {
      '/api/auth/signup': { post: { tags: ['Auth'], summary: 'Sign up (first user becomes owner)', requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Signup' } } } }, responses: { 200: { description: 'created + token' }, 400: { description: 'validation' } } } },
      '/api/auth/login': { post: { tags: ['Auth'], summary: 'Log in', requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Login' } } } }, responses: { 200: { description: 'token' }, 401: { description: 'invalid' } } } },
      '/api/auth/me': { get: { tags: ['Auth'], summary: 'Current user', security: [{ bearerAuth: [] }], responses: { 200: { description: 'user' } } } },
      '/api/billing/plans': { get: { tags: ['Billing'], summary: 'List plans', responses: { 200: { description: 'plans' } } } },
      '/api/billing/subscription': { get: { tags: ['Billing'], summary: 'Current subscription', security: [{ bearerAuth: [] }], responses: { 200: { description: 'subscription + plan' } } } },
      '/api/billing/checkout': { post: { tags: ['Billing'], summary: 'Create Stripe checkout', security: [{ bearerAuth: [] }], responses: { 200: { description: 'checkout session' } } } },
      '/api/billing/webhook/stripe': { post: { tags: ['Billing'], summary: 'Stripe webhook (raw body, signature-verified)', responses: { 200: { description: 'received' } } } },
      '/api/sales-pipeline/deals': { get: { tags: ['Sales'], summary: 'List deals', security: [{ bearerAuth: [] }], responses: { 200: { description: 'deals' } } }, post: { tags: ['Sales'], summary: 'Create deal', security: [{ bearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Deal' } } } }, responses: { 200: { description: 'deal' } } } },
      '/api/sales-pipeline/deals/{dealId}/stage': { post: { tags: ['Sales'], summary: 'Move deal stage', security: [{ bearerAuth: [] }], parameters: [{ name: 'dealId', in: 'path', required: true, schema: str }], responses: { 200: { description: 'deal' } } } },
      '/api/health': { get: { tags: ['Ops'], summary: 'Full health report', responses: { 200: { description: 'ok/degraded' }, 503: { description: 'down' } } } },
      '/api/health/ready': { get: { tags: ['Ops'], summary: 'Readiness', responses: { 200: { description: 'ready' }, 503: { description: 'draining/not ready' } } } },
      '/metrics': { get: { tags: ['Ops'], summary: 'Prometheus metrics', responses: { 200: { description: 'text exposition' } } } },
      '/api/tenants': { get: { tags: ['Platform'], summary: 'List tenants', responses: { 200: { description: 'tenants' } } }, post: { tags: ['Platform'], summary: 'Create tenant', responses: { 200: { description: 'tenant' } } } },
      '/api/api-keys': { get: { tags: ['Auth'], summary: 'List API keys', security: [{ bearerAuth: [] }], responses: { 200: { description: 'keys' } } }, post: { tags: ['Auth'], summary: 'Issue API key (raw shown once)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'apiKey' } } } },
      '/api/audit': { get: { tags: ['Ops'], summary: 'Tenant audit log', security: [{ bearerAuth: [] }], responses: { 200: { description: 'entries' } } } },
      '/api/compliance/export': { get: { tags: ['Compliance'], summary: 'Export tenant data', security: [{ bearerAuth: [] }], responses: { 200: { description: 'bundle' } } } },
      '/api/compliance/erase': { post: { tags: ['Compliance'], summary: 'Erase tenant data (confirm===tenantId)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'counts' } } } },
    },
    tags: [
      { name: 'Auth' }, { name: 'Billing' }, { name: 'Sales' }, { name: 'Ops' }, { name: 'Platform' }, { name: 'Compliance' },
    ],
    _okEnvelope: okEnvelope,
  };
}

module.exports = { build };
