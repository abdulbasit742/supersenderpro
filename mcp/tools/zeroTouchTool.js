const definitions = [
  {
    name: 'get_zero_touch_summary',
    description: 'Get general statistics and order status summary from the Zero-Touch Automation order engine.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'get_zero_touch_customer',
    description: 'Get automated profile and order histories of a customer by phone number.',
    inputSchema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Customer phone number (e.g. 923XXXXXXXXX)' }
      },
      required: ['phone']
    }
  },
  {
    name: 'get_dynamic_availability',
    description: 'Check dynamic inventory/stock levels automatically via real-time integration.',
    inputSchema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Optional customer phone to customize suggestions' }
      }
    }
  },
  {
    name: 'get_pricing_recommendations',
    description: 'Fetch real-time smart pricing recommendations dynamically optimized for maximum sales velocity.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'run_background_job',
    description: 'Run background automation jobs (sheets_sync, scan_emails, rate_broadcast, crm_cleanup).',
    inputSchema: {
      type: 'object',
      properties: {
        job: { type: 'string', description: 'Job slug: sheets_sync, scan_emails, rate_broadcast, crm_cleanup' },
        params: { type: 'object', description: 'Optional job arguments' }
      },
      required: ['job']
    }
  }
];

const handlers = {
  get_zero_touch_summary: async () => global.mcpApiCall('GET', '/api/zero-touch/summary'),
  get_zero_touch_customer: async (a) => global.mcpApiCall('GET', `/api/zero-touch/customer/${encodeURIComponent(a.phone)}`),
  get_dynamic_availability: async (a) => global.mcpApiCall('GET', `/api/zero-touch/dynamic-availability${a.phone ? '?phone=' + encodeURIComponent(a.phone) : ''}`),
  get_pricing_recommendations: async () => global.mcpApiCall('GET', '/api/zero-touch/pricing-recommendations'),
  run_background_job: async (a) => global.mcpApiCall('POST', `/api/zero-touch/run/${encodeURIComponent(a.job)}`, a.params || {})
};

module.exports = { definitions, handlers };
