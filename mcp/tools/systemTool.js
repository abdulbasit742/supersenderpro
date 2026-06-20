const definitions = [
  {
    name: 'supersender_health',
    description: 'Check SuperSender server health, database status, and WhatsApp summary.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'whatsapp_status',
    description: 'Get current WhatsApp connection status.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'dashboard_summary',
    description: 'Get revenue, orders, WhatsApp, and business KPI summary.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'list_plans',
    description: 'List AI tools plans/catalog pricing.',
    inputSchema: { type: 'object', properties: {} }
  }
];

const handlers = {
  supersender_health: async () => global.mcpApiCall('GET', '/api/health'),
  whatsapp_status: async () => global.mcpApiCall('GET', '/api/wa/status'),
  dashboard_summary: async () => global.mcpApiCall('GET', '/api/dashboard/summary'),
  list_plans: async () => global.mcpApiCall('GET', '/api/plans')
};

module.exports = { definitions, handlers };
