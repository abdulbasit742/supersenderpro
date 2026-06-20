const definitions = [
  {
    name: 'get_system_alerts',
    description: 'List active system administrative alerts and order exceptions.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'mark_alert_read',
    description: 'Mark a specific alert as read/resolved.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Alert unique ID' }
      },
      required: ['id']
    }
  }
];

const handlers = {
  get_system_alerts: async () => global.mcpApiCall('GET', '/api/alerts'),
  mark_alert_read: async (a) => global.mcpApiCall('PUT', `/api/alerts/${encodeURIComponent(a.id)}/read`, {})
};

module.exports = { definitions, handlers };
