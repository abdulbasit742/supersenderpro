const definitions = [
  {
    name: 'list_dealers',
    description: 'List all suppliers and dealers in the system.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'add_new_dealer',
    description: 'Add a new supplier/dealer record.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Dealer full name' },
        phone: { type: 'string', description: 'Dealer phone number' },
        code: { type: 'string', description: 'Unique dealer code' },
        status: { type: 'string', description: 'active, inactive' }
      },
      required: ['name', 'phone', 'code']
    }
  },
  {
    name: 'get_dealer_performance_stats',
    description: 'Get response performance metrics for a specific dealer.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Dealer unique ID' }
      },
      required: ['id']
    }
  }
];

const handlers = {
  list_dealers: async () => global.mcpApiCall('GET', '/api/dealers'),
  add_new_dealer: async (a) => global.mcpApiCall('POST', '/api/dealers', a),
  get_dealer_performance_stats: async (a) => global.mcpApiCall('GET', `/api/dealers/${encodeURIComponent(a.id)}/performance`)
};

module.exports = { definitions, handlers };
